import { loadStripe } from "@stripe/stripe-js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_STATUS,
} from "../lib/subscriptionTiers";

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Collection names
const SUBSCRIPTIONS_COLLECTION = "userSubscriptions";
const CUSTOMERS_COLLECTION = "stripeCustomers";
const PAYMENTS_COLLECTION = "paymentHistory";
const USAGE_COLLECTION = "subscriptionUsage";

/**
 * Stripe Service - Handles all subscription and payment operations
 */
export class StripeService {
  constructor() {
    this.stripe = null;
    this.listeners = new Map();
    this.initializeStripe();
  }

  async initializeStripe() {
    try {
      this.stripe = await stripePromise;
      if (!this.stripe) {
        throw new Error("Failed to initialize Stripe");
      }
    } catch (error) {
      console.error("Stripe initialization error:", error);
      throw error;
    }
  }

  // Customer Management
  async createCustomer(userId, email, name = "") {
    try {
      // Create customer in Stripe via Cloud Function
      const response = await fetch("/api/stripe/create-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          userId,
          email,
          name,
          metadata: {
            userId,
            source: "pokemon_binder_app",
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create Stripe customer");
      }

      const { customerId } = await response.json();

      // Store customer data in Firestore
      await setDoc(doc(db, CUSTOMERS_COLLECTION, userId), {
        userId,
        stripeCustomerId: customerId,
        email,
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return customerId;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async getCustomer(userId) {
    try {
      const customerDoc = await getDoc(doc(db, CUSTOMERS_COLLECTION, userId));

      if (!customerDoc.exists()) {
        return null;
      }

      return customerDoc.data();
    } catch (error) {
      console.error("Error getting customer:", error);
      throw new Error(`Failed to get customer: ${error.message}`);
    }
  }

  // Subscription Management
  async createSubscription(
    userId,
    priceId,
    paymentMethodId,
    billingInterval = "monthly"
  ) {
    try {
      if (!this.stripe) {
        await this.initializeStripe();
      }

      const customer = await this.getCustomer(userId);
      if (!customer) {
        throw new Error("Customer not found. Please create an account first.");
      }

      // Create subscription via Cloud Function
      const response = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          customerId: customer.stripeCustomerId,
          priceId,
          paymentMethodId,
          userId,
          billingInterval,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create subscription");
      }

      const { subscription, clientSecret } = await response.json();

      // Handle payment confirmation if needed
      if (clientSecret) {
        const { error, paymentIntent } = await this.stripe.confirmCardPayment(
          clientSecret
        );

        if (error) {
          throw new Error(error.message);
        }

        if (paymentIntent.status !== "succeeded") {
          throw new Error("Payment failed");
        }
      }

      return subscription;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async updateSubscription(userId, updates) {
    try {
      const response = await fetch("/api/stripe/update-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          userId,
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update subscription");
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating subscription:", error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  async cancelSubscription(userId, cancelAtPeriodEnd = true) {
    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          userId,
          cancelAtPeriodEnd,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      const result = await response.json();

      // Update local subscription status
      await this.updateSubscriptionStatus(userId, {
        cancelAtPeriodEnd,
        status: cancelAtPeriodEnd
          ? SUBSCRIPTION_STATUS.ACTIVE
          : SUBSCRIPTION_STATUS.CANCELED,
        updatedAt: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      console.error("Error canceling subscription:", error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  async reactivateSubscription(userId) {
    try {
      const response = await fetch("/api/stripe/reactivate-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to reactivate subscription");
      }

      return await response.json();
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      throw new Error(`Failed to reactivate subscription: ${error.message}`);
    }
  }

  // Payment Methods
  async createPaymentMethod(cardElement, billingDetails) {
    try {
      if (!this.stripe) {
        await this.initializeStripe();
      }

      const { error, paymentMethod } = await this.stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: billingDetails,
      });

      if (error) {
        throw new Error(error.message);
      }

      return paymentMethod;
    } catch (error) {
      console.error("Error creating payment method:", error);
      throw new Error(`Failed to create payment method: ${error.message}`);
    }
  }

  async attachPaymentMethod(userId, paymentMethodId) {
    try {
      const customer = await this.getCustomer(userId);
      if (!customer) {
        throw new Error("Customer not found");
      }

      const response = await fetch("/api/stripe/attach-payment-method", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          customerId: customer.stripeCustomerId,
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to attach payment method");
      }

      return await response.json();
    } catch (error) {
      console.error("Error attaching payment method:", error);
      throw new Error(`Failed to attach payment method: ${error.message}`);
    }
  }

  async getPaymentMethods(userId) {
    try {
      const customer = await this.getCustomer(userId);
      if (!customer) {
        return [];
      }

      const response = await fetch(
        `/api/stripe/payment-methods?customerId=${customer.stripeCustomerId}`,
        {
          headers: {
            Authorization: `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get payment methods");
      }

      const { paymentMethods } = await response.json();
      return paymentMethods;
    } catch (error) {
      console.error("Error getting payment methods:", error);
      return [];
    }
  }

  // Subscription Data Management
  async getUserSubscription(userId) {
    try {
      const subscriptionDoc = await getDoc(
        doc(db, SUBSCRIPTIONS_COLLECTION, userId)
      );

      if (!subscriptionDoc.exists()) {
        // Return default free subscription
        return {
          userId,
          tier: "free",
          status: SUBSCRIPTION_STATUS.ACTIVE,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(), // 1 year from now
          cancelAtPeriodEnd: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return subscriptionDoc.data();
    } catch (error) {
      console.error("Error getting user subscription:", error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  async updateSubscriptionStatus(userId, updates) {
    try {
      const subscriptionRef = doc(db, SUBSCRIPTIONS_COLLECTION, userId);
      await updateDoc(subscriptionRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error("Error updating subscription status:", error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  // Real-time subscription listening
  subscribeToUserSubscription(userId, callback) {
    try {
      const subscriptionRef = doc(db, SUBSCRIPTIONS_COLLECTION, userId);

      const unsubscribe = onSnapshot(
        subscriptionRef,
        (doc) => {
          if (doc.exists()) {
            callback(doc.data(), null);
          } else {
            // Return default free subscription
            callback(
              {
                userId,
                tier: "free",
                status: SUBSCRIPTION_STATUS.ACTIVE,
                currentPeriodStart: new Date().toISOString(),
                currentPeriodEnd: new Date(
                  Date.now() + 365 * 24 * 60 * 60 * 1000
                ).toISOString(),
                cancelAtPeriodEnd: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              null
            );
          }
        },
        (error) => {
          console.error("Subscription listener error:", error);
          callback(null, error);
        }
      );

      const listenerId = Date.now().toString();
      this.listeners.set(listenerId, unsubscribe);
      return listenerId;
    } catch (error) {
      console.error("Error subscribing to subscription:", error);
      throw new Error(`Failed to subscribe to subscription: ${error.message}`);
    }
  }

  unsubscribeFromUserSubscription(listenerId) {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
    }
  }

  // Usage Tracking
  async trackFeatureUsage(userId, feature, increment = 1) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // "2024-01"
      const usageRef = doc(db, USAGE_COLLECTION, `${userId}_${currentMonth}`);

      const usageDoc = await getDoc(usageRef);

      if (usageDoc.exists()) {
        const currentUsage = usageDoc.data().usage || {};
        await updateDoc(usageRef, {
          [`usage.${feature}`]: (currentUsage[feature] || 0) + increment,
          lastUpdated: serverTimestamp(),
        });
      } else {
        await setDoc(usageRef, {
          userId,
          period: currentMonth,
          usage: {
            [feature]: increment,
          },
          lastUpdated: serverTimestamp(),
        });
      }

      return true;
    } catch (error) {
      console.error("Error tracking feature usage:", error);
      return false;
    }
  }

  async getFeatureUsage(userId, feature, period = null) {
    try {
      const targetPeriod = period || new Date().toISOString().slice(0, 7);
      const usageRef = doc(db, USAGE_COLLECTION, `${userId}_${targetPeriod}`);

      const usageDoc = await getDoc(usageRef);

      if (!usageDoc.exists()) {
        return 0;
      }

      const usage = usageDoc.data().usage || {};
      return usage[feature] || 0;
    } catch (error) {
      console.error("Error getting feature usage:", error);
      return 0;
    }
  }

  // Billing Portal
  async createBillingPortalSession(userId, returnUrl) {
    try {
      const customer = await this.getCustomer(userId);
      if (!customer) {
        throw new Error("Customer not found");
      }

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          customerId: customer.stripeCustomerId,
          returnUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create billing portal session");
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error("Error creating billing portal session:", error);
      throw new Error(`Failed to create billing portal: ${error.message}`);
    }
  }

  // Payment History
  async getPaymentHistory(userId, limit = 10) {
    try {
      const paymentsQuery = query(
        collection(db, PAYMENTS_COLLECTION),
        where("userId", "==", userId)
        // orderBy('createdAt', 'desc'),
        // limit(limit)
      );

      const snapshot = await getDocs(paymentsQuery);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting payment history:", error);
      return [];
    }
  }

  // Utility methods
  async getAuthToken() {
    // Get Firebase Auth token for API calls
    const auth = await import("firebase/auth");
    const user = auth.getAuth().currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    return await user.getIdToken();
  }

  getTierFromPriceId(priceId) {
    for (const [tierId, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
      if (
        tier.stripePriceId === priceId ||
        tier.yearlyStripePriceId === priceId
      ) {
        return tierId;
      }
    }
    return "free";
  }

  isValidSubscriptionStatus(subscription) {
    if (!subscription) return false;

    const validStatuses = [
      SUBSCRIPTION_STATUS.ACTIVE,
      SUBSCRIPTION_STATUS.TRIALING,
    ];

    return validStatuses.includes(subscription.status);
  }

  // Cleanup
  destroy() {
    // Clean up all listeners
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }
}

// Create singleton instance
export const stripeService = new StripeService();

// Export for direct use
export default stripeService;

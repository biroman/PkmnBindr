import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { stripeService } from "../services/StripeService";
import {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_STATUS,
  hasFeatureAccess,
  getFeatureLimit,
  checkFeatureLimitReached,
  getRemainingFeatureUsage,
  getUpgradeSuggestion,
  isUpgrade,
  calculateYearlySavings,
} from "../lib/subscriptionTiers";
import { toast } from "react-hot-toast";

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listenerId, setListenerId] = useState(null);

  // Initialize subscription data
  useEffect(() => {
    if (!user) {
      // Reset state when user logs out
      setSubscription(null);
      setCustomer(null);
      setPaymentMethods([]);
      setPaymentHistory([]);
      setUsage({});
      setLoading(false);
      return;
    }

    const initializeSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get or create customer
        let customerData = await stripeService.getCustomer(user.uid);
        if (!customerData) {
          customerData = await stripeService.createCustomer(
            user.uid,
            user.email,
            user.displayName || ""
          );
        }
        setCustomer(customerData);

        // Subscribe to real-time subscription updates
        const subscriptionListenerId =
          stripeService.subscribeToUserSubscription(
            user.uid,
            (subscriptionData, error) => {
              if (error) {
                console.error("Subscription subscription error:", error);
                setError(error.message);
              } else {
                setSubscription(subscriptionData);
              }
              setLoading(false);
            }
          );
        setListenerId(subscriptionListenerId);

        // Load payment methods
        const paymentMethodsData = await stripeService.getPaymentMethods(
          user.uid
        );
        setPaymentMethods(paymentMethodsData);

        // Load payment history
        const historyData = await stripeService.getPaymentHistory(user.uid);
        setPaymentHistory(historyData);

        // Load current usage
        await loadCurrentUsage();
      } catch (error) {
        console.error("Failed to initialize subscription:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    initializeSubscription();

    return () => {
      if (listenerId) {
        stripeService.unsubscribeFromUserSubscription(listenerId);
      }
    };
  }, [user]);

  // Load current usage data
  const loadCurrentUsage = useCallback(async () => {
    if (!user) return;

    try {
      const currentUsage = {};
      const features = [
        "binderCreation",
        "cardAddition",
        "exports",
        "apiCalls",
        "storageUsed",
        "imageUploads",
      ];

      for (const feature of features) {
        currentUsage[feature] = await stripeService.getFeatureUsage(
          user.uid,
          feature
        );
      }

      setUsage(currentUsage);
    } catch (error) {
      console.error("Failed to load usage data:", error);
    }
  }, [user]);

  // Subscription management
  const subscribe = useCallback(
    async (tierId, billingInterval = "monthly", paymentMethodId) => {
      if (!user || !customer) {
        throw new Error("User or customer not found");
      }

      try {
        const tier = SUBSCRIPTION_TIERS[tierId];
        if (!tier) {
          throw new Error("Invalid subscription tier");
        }

        const priceId =
          billingInterval === "yearly"
            ? tier.yearlyStripePriceId
            : tier.stripePriceId;

        if (!priceId) {
          throw new Error("Price ID not found for this tier");
        }

        const subscriptionData = await stripeService.createSubscription(
          user.uid,
          priceId,
          paymentMethodId,
          billingInterval
        );

        toast.success(`Successfully subscribed to ${tier.name}!`);
        return subscriptionData;
      } catch (error) {
        console.error("Failed to subscribe:", error);
        toast.error(error.message || "Failed to create subscription");
        throw error;
      }
    },
    [user, customer]
  );

  const updateSubscription = useCallback(
    async (updates) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        const result = await stripeService.updateSubscription(
          user.uid,
          updates
        );
        toast.success("Subscription updated successfully");
        return result;
      } catch (error) {
        console.error("Failed to update subscription:", error);
        toast.error(error.message || "Failed to update subscription");
        throw error;
      }
    },
    [user]
  );

  const cancelSubscription = useCallback(
    async (cancelAtPeriodEnd = true) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        const result = await stripeService.cancelSubscription(
          user.uid,
          cancelAtPeriodEnd
        );

        const message = cancelAtPeriodEnd
          ? "Subscription will cancel at the end of the current period"
          : "Subscription canceled immediately";

        toast.success(message);
        return result;
      } catch (error) {
        console.error("Failed to cancel subscription:", error);
        toast.error(error.message || "Failed to cancel subscription");
        throw error;
      }
    },
    [user]
  );

  const reactivateSubscription = useCallback(async () => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      const result = await stripeService.reactivateSubscription(user.uid);
      toast.success("Subscription reactivated successfully");
      return result;
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
      toast.error(error.message || "Failed to reactivate subscription");
      throw error;
    }
  }, [user]);

  // Payment methods
  const addPaymentMethod = useCallback(
    async (cardElement, billingDetails) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        // Create payment method
        const paymentMethod = await stripeService.createPaymentMethod(
          cardElement,
          billingDetails
        );

        // Attach to customer
        await stripeService.attachPaymentMethod(user.uid, paymentMethod.id);

        // Refresh payment methods list
        const updatedPaymentMethods = await stripeService.getPaymentMethods(
          user.uid
        );
        setPaymentMethods(updatedPaymentMethods);

        toast.success("Payment method added successfully");
        return paymentMethod;
      } catch (error) {
        console.error("Failed to add payment method:", error);
        toast.error(error.message || "Failed to add payment method");
        throw error;
      }
    },
    [user]
  );

  // Billing portal
  const openBillingPortal = useCallback(
    async (returnUrl = window.location.href) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        const portalUrl = await stripeService.createBillingPortalSession(
          user.uid,
          returnUrl
        );
        window.open(portalUrl, "_blank");
      } catch (error) {
        console.error("Failed to open billing portal:", error);
        toast.error(error.message || "Failed to open billing portal");
        throw error;
      }
    },
    [user]
  );

  // Feature access utilities
  const hasFeature = useCallback(
    (featureName) => {
      if (!subscription) return hasFeatureAccess("free", featureName);
      return hasFeatureAccess(subscription.tier, featureName);
    },
    [subscription]
  );

  const getLimit = useCallback(
    (featureName) => {
      if (!subscription) return getFeatureLimit("free", featureName);
      return getFeatureLimit(subscription.tier, featureName);
    },
    [subscription]
  );

  const isLimitReached = useCallback(
    (featureName, currentUsage = null) => {
      if (!subscription) return false;

      const actualUsage =
        currentUsage !== null ? currentUsage : usage[featureName] || 0;
      return checkFeatureLimitReached(
        subscription.tier,
        featureName,
        actualUsage
      );
    },
    [subscription, usage]
  );

  const getRemainingUsage = useCallback(
    (featureName, currentUsage = null) => {
      if (!subscription)
        return getRemainingFeatureUsage("free", featureName, currentUsage || 0);

      const actualUsage =
        currentUsage !== null ? currentUsage : usage[featureName] || 0;
      return getRemainingFeatureUsage(
        subscription.tier,
        featureName,
        actualUsage
      );
    },
    [subscription, usage]
  );

  const getUpgradeInfo = useCallback(
    (requestedFeature) => {
      if (!subscription) return getUpgradeSuggestion("free", requestedFeature);
      return getUpgradeSuggestion(subscription.tier, requestedFeature);
    },
    [subscription]
  );

  // Usage tracking
  const trackUsage = useCallback(
    async (feature, increment = 1) => {
      if (!user) return false;

      try {
        await stripeService.trackFeatureUsage(user.uid, feature, increment);

        // Update local usage state
        setUsage((prev) => ({
          ...prev,
          [feature]: (prev[feature] || 0) + increment,
        }));

        return true;
      } catch (error) {
        console.error("Failed to track usage:", error);
        return false;
      }
    },
    [user]
  );

  // Subscription validation
  const isSubscriptionActive = useCallback(() => {
    if (!subscription) return false;
    return stripeService.isValidSubscriptionStatus(subscription);
  }, [subscription]);

  const isSubscriptionCanceled = useCallback(() => {
    if (!subscription) return false;
    return (
      subscription.status === SUBSCRIPTION_STATUS.CANCELED ||
      subscription.cancelAtPeriodEnd
    );
  }, [subscription]);

  const getDaysUntilRenewal = useCallback(() => {
    if (!subscription || !subscription.currentPeriodEnd) return null;

    const endDate = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }, [subscription]);

  // Get current tier info
  const getCurrentTier = useCallback(() => {
    if (!subscription) return SUBSCRIPTION_TIERS.free;
    return SUBSCRIPTION_TIERS[subscription.tier] || SUBSCRIPTION_TIERS.free;
  }, [subscription]);

  // Check if upgrade is available
  const canUpgradeTo = useCallback(
    (targetTier) => {
      if (!subscription) return true;
      return isUpgrade(subscription.tier, targetTier);
    },
    [subscription]
  );

  // Get savings for yearly billing
  const getYearlySavings = useCallback((tierId) => {
    const tier = SUBSCRIPTION_TIERS[tierId];
    if (!tier) return null;

    return calculateYearlySavings(tier);
  }, []);

  const value = {
    // State
    subscription,
    customer,
    paymentMethods,
    paymentHistory,
    usage,
    loading,
    error,

    // Subscription management
    subscribe,
    updateSubscription,
    cancelSubscription,
    reactivateSubscription,

    // Payment methods
    addPaymentMethod,
    openBillingPortal,

    // Feature access
    hasFeature,
    getLimit,
    isLimitReached,
    getRemainingUsage,
    getUpgradeInfo,

    // Usage tracking
    trackUsage,
    loadCurrentUsage,

    // Subscription utilities
    isSubscriptionActive,
    isSubscriptionCanceled,
    getDaysUntilRenewal,
    getCurrentTier,
    canUpgradeTo,
    getYearlySavings,

    // Constants
    SUBSCRIPTION_TIERS,
    SUBSCRIPTION_STATUS,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Hook for checking feature access in components
export const useFeatureAccess = (featureName) => {
  const { hasFeature, isLimitReached, getRemainingUsage, getUpgradeInfo } =
    useSubscription();

  return {
    hasAccess: hasFeature(featureName),
    isLimitReached: isLimitReached(featureName),
    remainingUsage: getRemainingUsage(featureName),
    upgradeInfo: getUpgradeInfo(featureName),
  };
};

// Hook for usage tracking
export const useUsageTracker = () => {
  const { trackUsage, isLimitReached, getRemainingUsage } = useSubscription();

  const trackFeatureUsage = useCallback(
    async (feature, increment = 1) => {
      // Check if limit would be exceeded
      const remaining = getRemainingUsage(feature);
      if (remaining !== Infinity && remaining < increment) {
        throw new Error(`Feature limit exceeded for ${feature}`);
      }

      // Track the usage
      await trackUsage(feature, increment);
      return true;
    },
    [trackUsage, getRemainingUsage]
  );

  return {
    trackFeatureUsage,
    isLimitReached,
    getRemainingUsage,
  };
};

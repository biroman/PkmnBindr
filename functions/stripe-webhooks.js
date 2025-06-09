const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(functions.config().stripe.secret_key);

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Collection names
const SUBSCRIPTIONS_COLLECTION = "userSubscriptions";
const CUSTOMERS_COLLECTION = "stripeCustomers";
const PAYMENTS_COLLECTION = "paymentHistory";
const USAGE_COLLECTION = "subscriptionUsage";

/**
 * Stripe Webhook Handler
 * Handles all Stripe events and updates Firestore accordingly
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = functions.config().stripe.webhook_secret;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("Processing Stripe event:", event.type);

  try {
    switch (event.type) {
      case "customer.created":
        await handleCustomerCreated(event.data.object);
        break;

      case "customer.updated":
        await handleCustomerUpdated(event.data.object);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object);
        break;

      case "payment_method.attached":
        await handlePaymentMethodAttached(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle customer created
 */
async function handleCustomerCreated(customer) {
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.warn("Customer created without userId metadata");
    return;
  }

  await db
    .collection(CUSTOMERS_COLLECTION)
    .doc(userId)
    .set({
      userId,
      stripeCustomerId: customer.id,
      email: customer.email,
      name: customer.name || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log(`Customer created for user: ${userId}`);
}

/**
 * Handle customer updated
 */
async function handleCustomerUpdated(customer) {
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.warn("Customer updated without userId metadata");
    return;
  }

  await db
    .collection(CUSTOMERS_COLLECTION)
    .doc(userId)
    .update({
      email: customer.email,
      name: customer.name || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log(`Customer updated for user: ${userId}`);
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.warn("Subscription created for customer without userId metadata");
    return;
  }

  const tier = getTierFromPriceId(subscription.items.data[0].price.id);

  const subscriptionData = {
    userId,
    tier,
    status: subscription.status,
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    currentPeriodEnd: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db
    .collection(SUBSCRIPTIONS_COLLECTION)
    .doc(userId)
    .set(subscriptionData);

  // Apply tier-based rules if needed
  await applyTierRules(userId, tier);

  console.log(`Subscription created for user: ${userId}, tier: ${tier}`);
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.warn("Subscription updated for customer without userId metadata");
    return;
  }

  const tier = getTierFromPriceId(subscription.items.data[0].price.id);

  const updates = {
    tier,
    status: subscription.status,
    currentPeriodStart: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    currentPeriodEnd: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection(SUBSCRIPTIONS_COLLECTION).doc(userId).update(updates);

  // Update tier-based rules if tier changed
  const currentSubscription = await db
    .collection(SUBSCRIPTIONS_COLLECTION)
    .doc(userId)
    .get();
  const currentTier = currentSubscription.data()?.tier;

  if (currentTier !== tier) {
    await applyTierRules(userId, tier);
  }

  console.log(`Subscription updated for user: ${userId}, new tier: ${tier}`);
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.warn("Subscription deleted for customer without userId metadata");
    return;
  }

  // Update subscription to free tier
  await db.collection(SUBSCRIPTIONS_COLLECTION).doc(userId).update({
    tier: "free",
    status: "canceled",
    cancelAtPeriodEnd: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Apply free tier rules
  await applyTierRules(userId, "free");

  console.log(`Subscription canceled for user: ${userId}, downgraded to free`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.warn("Payment succeeded for customer without userId metadata");
    return;
  }

  // Record payment in history
  const paymentData = {
    userId,
    stripeInvoiceId: invoice.id,
    stripeCustomerId: invoice.customer,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    description: invoice.lines.data[0]?.description || "Subscription payment",
    status: "succeeded",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection(PAYMENTS_COLLECTION).add(paymentData);

  // Reset usage counters for the new billing period if this is a subscription renewal
  if (invoice.subscription) {
    await resetUsageCounters(userId);
  }

  console.log(
    `Payment succeeded for user: ${userId}, amount: ${invoice.amount_paid}`
  );
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.warn("Payment failed for customer without userId metadata");
    return;
  }

  // Record failed payment
  const paymentData = {
    userId,
    stripeInvoiceId: invoice.id,
    stripeCustomerId: invoice.customer,
    amount: invoice.amount_due,
    currency: invoice.currency,
    description: invoice.lines.data[0]?.description || "Subscription payment",
    status: "failed",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection(PAYMENTS_COLLECTION).add(paymentData);

  // You might want to send an email notification here
  console.log(
    `Payment failed for user: ${userId}, amount: ${invoice.amount_due}`
  );
}

/**
 * Handle trial ending soon
 */
async function handleTrialWillEnd(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.warn("Trial ending for customer without userId metadata");
    return;
  }

  // You might want to send an email notification here
  console.log(`Trial ending soon for user: ${userId}`);
}

/**
 * Handle payment method attached
 */
async function handlePaymentMethodAttached(paymentMethod) {
  console.log(
    `Payment method attached: ${paymentMethod.id} to customer: ${paymentMethod.customer}`
  );
}

/**
 * Helper function to get tier from price ID
 */
function getTierFromPriceId(priceId) {
  const priceTierMapping = {
    [functions.config().stripe.supporter_price_id]: "supporter",
    [functions.config().stripe.supporter_yearly_price_id]: "supporter",
    [functions.config().stripe.collector_price_id]: "collector",
    [functions.config().stripe.collector_yearly_price_id]: "collector",
    [functions.config().stripe.enthusiast_price_id]: "enthusiast",
    [functions.config().stripe.enthusiast_yearly_price_id]: "enthusiast",
  };

  return priceTierMapping[priceId] || "free";
}

/**
 * Apply tier-based rules when subscription changes
 */
async function applyTierRules(userId, tier) {
  // This function would integrate with your rules system
  // For now, we'll just log the tier change
  console.log(`Applying ${tier} tier rules for user: ${userId}`);

  // You could call your rules service here to update user limits
  // Example:
  // await rulesService.applyUserTierRules(userId, tier);
}

/**
 * Reset usage counters for new billing period
 */
async function resetUsageCounters(userId) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const usageRef = db
    .collection(USAGE_COLLECTION)
    .doc(`${userId}_${currentMonth}`);

  await usageRef.set({
    userId,
    period: currentMonth,
    usage: {},
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(
    `Usage counters reset for user: ${userId} for period: ${currentMonth}`
  );
}

// Export additional Stripe functions
exports.createCustomer = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { email, name } = data;
  const userId = context.auth.uid;

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
        source: "pokemon_binder_app",
      },
    });

    return { customerId: customer.id };
  } catch (error) {
    console.error("Error creating customer:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.createSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { customerId, priceId, paymentMethodId } = data;

  try {
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_options: {
          card: {
            request_three_d_secure: "if_required",
          },
        },
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent?.client_secret,
    };
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.createPortalSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { customerId, returnUrl } = data;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    console.error("Error creating portal session:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

# Subscription System Setup Guide

This guide will help you set up a simple, cost-recovery subscription system using Stripe and Firebase. The system focuses on sustainability rather than profit.

## 💡 Cost-Recovery Philosophy

This subscription model is designed to:

- **Cover Firebase costs**: Help offset storage, reads/writes, and function costs
- **Keep prices low**: Simple, affordable tiers focused on actual usage costs
- **No feature gating**: All users get the same features, just different storage limits
- **Transparent pricing**: Clear connection between what users pay and infrastructure costs

### Subscription Tiers

- **Free (0$)**: 2 binders, 1,000 total cards, 100MB storage
- **Supporter ($2.99/month)**: 5 binders, 2,500 total cards, 500MB storage
- **Collector ($6.99/month)**: 15 binders, 7,500 total cards, 1.5GB storage
- **Enthusiast ($12.99/month)**: 30 binders, 22,500 total cards, 5GB storage

All tiers include all features (no premium gating) - users just pay for the storage they need.

## 🏗️ Architecture Overview

The subscription system consists of:

- **Frontend**: React components for pricing, subscription management
- **Backend**: Firebase Functions for Stripe webhook handling
- **Database**: Firestore for subscription and usage data
- **Payments**: Stripe for payment processing
- **Rules**: Feature gating and usage limits

## 📋 Prerequisites

- Firebase project with Firestore enabled
- Stripe account (test mode for development)
- Node.js and npm installed
- Firebase CLI installed (`npm install -g firebase-tools`)

## 🔧 Setup Steps

### 1. Stripe Configuration

#### Create Stripe Products & Prices

```bash
# Install Stripe CLI for testing
# https://stripe.com/docs/stripe-cli

# Create products in Stripe Dashboard or via CLI:
stripe products create --name="Hobby Plan" --description="For serious collectors"
stripe prices create --product=prod_xxx --unit-amount=499 --currency=usd --recurring[interval]=month
stripe prices create --product=prod_xxx --unit-amount=4999 --currency=usd --recurring[interval]=year

# Repeat for Pro and Enterprise tiers
```

#### Get Stripe Keys

```javascript
// Add to your .env file:
REACT_APP_STRIPE_PUBLISHABLE_KEY = pk_test_xxx;
STRIPE_SECRET_KEY = sk_test_xxx;
STRIPE_WEBHOOK_SECRET = whsec_xxx;

// Add price IDs for simplified tiers:
REACT_APP_STRIPE_SUPPORTER_PRICE_ID = price_xxx;
REACT_APP_STRIPE_SUPPORTER_YEARLY_PRICE_ID = price_xxx;
REACT_APP_STRIPE_COLLECTOR_PRICE_ID = price_xxx;
REACT_APP_STRIPE_COLLECTOR_YEARLY_PRICE_ID = price_xxx;
REACT_APP_STRIPE_ENTHUSIAST_PRICE_ID = price_xxx;
REACT_APP_STRIPE_ENTHUSIAST_YEARLY_PRICE_ID = price_xxx;
```

### 2. Firebase Functions Setup

#### Initialize Functions

```bash
# Navigate to your project root
firebase init functions

# Install dependencies
cd functions
npm install stripe firebase-admin firebase-functions
```

#### Configure Stripe in Functions

```bash
# Set Stripe configuration for Firebase Functions
firebase functions:config:set stripe.secret_key="sk_test_xxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxx"
firebase functions:config:set stripe.supporter_price_id="price_xxx"
firebase functions:config:set stripe.supporter_yearly_price_id="price_xxx"
firebase functions:config:set stripe.collector_price_id="price_xxx"
firebase functions:config:set stripe.collector_yearly_price_id="price_xxx"
firebase functions:config:set stripe.enthusiast_price_id="price_xxx"
firebase functions:config:set stripe.enthusiast_yearly_price_id="price_xxx"
```

#### Deploy Functions

```bash
# Deploy the webhook function
firebase deploy --only functions
```

### 3. Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-project.cloudfunctions.net/stripeWebhook`
3. Select these events:
   - `customer.created`
   - `customer.updated`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
   - `payment_method.attached`

### 4. Frontend Integration

#### Install Dependencies

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

#### Add Context Providers

```javascript
// In your App.jsx
import { SubscriptionProvider } from "./contexts/SubscriptionContext";

function App() {
  return (
    <AuthProvider>
      <RulesProvider>
        <SubscriptionProvider>
          <BinderProvider>{/* Your app content */}</BinderProvider>
        </SubscriptionProvider>
      </RulesProvider>
    </AuthProvider>
  );
}
```

#### Add Pricing Page

```javascript
// Create src/pages/PricingPage.jsx
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../contexts/SubscriptionContext";
import PricingTable from "../components/subscription/PricingTable";

const PricingPage = () => {
  const navigate = useNavigate();
  const { subscribe } = useSubscription();

  const handlePlanSelection = async (tierId, billingInterval) => {
    try {
      // This would open a payment modal or redirect to checkout
      console.log("Selected plan:", tierId, billingInterval);
      // Implementation depends on your payment flow preference
    } catch (error) {
      console.error("Subscription failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-600">
            Unlock more features and expand your Pokemon collection
          </p>
        </div>

        <PricingTable onSelectPlan={handlePlanSelection} />
      </div>
    </div>
  );
};

export default PricingPage;
```

### 5. Feature Gating Integration

#### Update Binder Context

The BinderContext has already been updated to check subscription limits. Make sure to use the subscription context:

```javascript
// In components that create binders or add cards
import { useFeatureAccess } from "../contexts/SubscriptionContext";

const SomeComponent = () => {
  const { hasAccess, isLimitReached, upgradeInfo } = useFeatureAccess(
    "features.maxBinders"
  );

  const handleCreateBinder = () => {
    if (isLimitReached) {
      // Show upgrade modal or message
      toast.error(`You've reached your binder limit. ${upgradeInfo?.reason}`);
      return;
    }

    // Proceed with binder creation
  };
};
```

### 6. Database Schema

The system will automatically create these Firestore collections:

```
userSubscriptions/
├── {userId}
│   ├── tier: "hobby" | "pro" | "enterprise" | "free"
│   ├── status: "active" | "canceled" | "past_due" | etc.
│   ├── stripeCustomerId: string
│   ├── stripeSubscriptionId: string
│   ├── currentPeriodStart: timestamp
│   ├── currentPeriodEnd: timestamp
│   └── ...

stripeCustomers/
├── {userId}
│   ├── stripeCustomerId: string
│   ├── email: string
│   └── name: string

paymentHistory/
├── {paymentId}
│   ├── userId: string
│   ├── amount: number
│   ├── status: "succeeded" | "failed"
│   └── createdAt: timestamp

subscriptionUsage/
├── {userId}_{period}
│   ├── userId: string
│   ├── period: "2024-01"
│   ├── usage: { binderCreation: 5, cardAddition: 150, ... }
│   └── lastUpdated: timestamp
```

## 🧪 Testing

### Test with Stripe CLI

```bash
# Listen to webhooks locally
stripe listen --forward-to localhost:5001/your-project/us-central1/stripeWebhook

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

### Test Cards

Use Stripe's test card numbers:

- Success: `4242424242424242`
- Decline: `4000000000000002`
- 3D Secure: `4000002500003155`

## 🚀 Production Deployment

### 1. Switch to Live Stripe Keys

Update all environment variables with live Stripe keys:

```bash
# Update .env with live keys
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx

# Update Firebase Functions config
firebase functions:config:set stripe.secret_key="sk_live_xxx"
firebase functions:config:set stripe.webhook_secret="whsec_live_xxx"
```

### 2. Update Webhook Endpoint

Create a new webhook in Stripe Dashboard pointing to your production function URL.

### 3. Deploy

```bash
# Deploy functions
firebase deploy --only functions

# Deploy frontend
npm run build
firebase deploy --only hosting
```

## 🔒 Security Considerations

### 1. Validate Webhooks

The webhook handler validates Stripe signatures to ensure authenticity.

### 2. User Authentication

All functions require Firebase Authentication.

### 3. Rate Limiting

Consider implementing rate limiting for subscription changes.

## 📊 Monitoring

### 1. Stripe Dashboard

Monitor payments, subscriptions, and failures in Stripe Dashboard.

### 2. Firebase Console

Monitor function executions and Firestore usage.

### 3. Error Tracking

Consider adding error tracking like Sentry for production.

## 🎯 Feature Roadmap

### Phase 1: Basic Subscriptions ✅

- [x] Subscription tiers
- [x] Feature gating
- [x] Stripe integration
- [x] Webhook handling

### Phase 2: Advanced Features

- [ ] Subscription analytics
- [ ] Usage notifications
- [ ] Prorated upgrades/downgrades
- [ ] Team subscriptions

### Phase 3: Enterprise Features

- [ ] Custom pricing
- [ ] SSO integration
- [ ] Advanced billing
- [ ] API access tiers

## 🆘 Troubleshooting

### Common Issues

1. **Webhook not receiving events**

   - Check webhook URL is correct
   - Verify endpoint secret matches
   - Check function logs for errors

2. **Payment methods not saving**

   - Ensure customer creation is working
   - Check Stripe customer ID is stored correctly

3. **Feature limits not enforcing**
   - Verify subscription data is updating
   - Check rules context integration

### Debug Commands

```bash
# Check function logs
firebase functions:log

# Test webhook locally
stripe listen --forward-to localhost:5001/project/us-central1/stripeWebhook

# View Stripe events
stripe events list
```

## 💰 Cost Optimization

### Stripe Costs

- 2.9% + $0.30 per successful transaction
- No monthly fees for basic plan

### Firebase Costs

- Functions: Pay per invocation
- Firestore: Pay per read/write/storage

### Optimization Tips

- Cache subscription data locally
- Batch Firestore operations
- Use efficient webhook event filtering

---

**Ready to launch your subscription system!** 🚀

This setup provides a production-ready subscription system with proper error handling, security, and scalability built in.

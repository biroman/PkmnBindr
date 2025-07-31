import { z } from "zod";
import { GLOBAL_CARD_LIMIT } from "./globalRules.js";

// =====================================
// ROLE SYSTEM (What you can DO)
// =====================================

export const USER_ROLES = {
  USER: "user",
  MODERATOR: "moderator",
  ADMIN: "admin",
  OWNER: "owner",
};

// Role-based permissions (what features each role can access)
export const ROLE_PERMISSIONS = {
  [USER_ROLES.USER]: {
    canModerateContent: false,
    canViewAllBinders: false,
    canManageUsers: false,
    canManageSystem: false,
    canViewAnalytics: false,
    maxSupportPriority: "normal",
  },
  [USER_ROLES.MODERATOR]: {
    canModerateContent: true,
    canViewAllBinders: false, // Can see reported content only
    canManageUsers: false,
    canManageSystem: false,
    canViewAnalytics: false,
    maxSupportPriority: "high",
  },
  [USER_ROLES.ADMIN]: {
    canModerateContent: true,
    canViewAllBinders: true,
    canManageUsers: true,
    canManageSystem: true,
    canViewAnalytics: true,
    maxSupportPriority: "urgent",
  },
  [USER_ROLES.OWNER]: {
    canModerateContent: true,
    canViewAllBinders: true,
    canManageUsers: true,
    canManageSystem: true,
    canViewAnalytics: true,
    canManageRoles: true,
    canEmergencyControls: true,
    maxSupportPriority: "critical",
  },
};

// =====================================
// SUBSCRIPTION SYSTEM (What LIMITS you have)
// =====================================

// Simple subscription tiers focused on covering Firebase costs
export const SUBSCRIPTION_TIERS = {
  free: {
    id: "free",
    name: "Free",
    description: "Great for casual collectors getting started",
    price: 0,
    interval: null,
    stripePriceId: null,
    features: {
      // Core limits
      maxBinders: 2,
      maxCardsPerBinder: 500,
      totalCardsLimit: GLOBAL_CARD_LIMIT, // 2 binders × 500 cards

      // Storage (covers basic Firebase usage)
      storageLimit: 100 * 1024 * 1024, // 100MB

      // All users get same features - no premium gating
      availableGridSizes: ["3x3", "4x4", "5x5", "6x6"],
      customThemes: true,
      advancedSorting: true,
      publicSharing: true,
      shareableLinks: true,
      bulkOperations: true,
      exportFormats: ["basic", "pdf", "excel"],
    },
    restrictions: {
      // Very generous limits for free users
      binderCreation: 2,
      cardAddition: GLOBAL_CARD_LIMIT,
      exports: 10,
    },
    badges: ["🆓", "Perfect for starters"],
    highlight: false,
  },

  supporter: {
    id: "supporter",
    name: "Supporter",
    description: "Help cover server costs + get more storage space",
    price: 2.99,
    interval: "month",
    stripePriceId: process.env.REACT_APP_STRIPE_SUPPORTER_PRICE_ID,
    yearlyPrice: 29.99, // ~17% discount
    yearlyStripePriceId: process.env.REACT_APP_STRIPE_SUPPORTER_YEARLY_PRICE_ID,
    features: {
      // Increased limits
      maxBinders: 5,
      maxCardsPerBinder: 500,
      totalCardsLimit: 2500, // 5 binders × 500 cards

      // More storage
      storageLimit: 500 * 1024 * 1024, // 500MB

      // Same features as free - just more capacity
      availableGridSizes: ["3x3", "4x4", "5x5", "6x6"],
      customThemes: true,
      advancedSorting: true,
      publicSharing: true,
      shareableLinks: true,
      bulkOperations: true,
      exportFormats: ["basic", "pdf", "excel"],
    },
    restrictions: {
      binderCreation: 5,
      cardAddition: 2500,
      exports: 25,
    },
    badges: ["💙", "Most Popular"],
    highlight: true,
  },

  collector: {
    id: "collector",
    name: "Collector",
    description: "For serious collectors with large collections",
    price: 6.99,
    interval: "month",
    stripePriceId: process.env.REACT_APP_STRIPE_COLLECTOR_PRICE_ID,
    yearlyPrice: 69.99, // ~17% discount
    yearlyStripePriceId: process.env.REACT_APP_STRIPE_COLLECTOR_YEARLY_PRICE_ID,
    features: {
      // Larger collection support
      maxBinders: 15,
      maxCardsPerBinder: 500,
      totalCardsLimit: 7500, // 15 binders × 500 cards

      // Generous storage
      storageLimit: 1.5 * 1024 * 1024 * 1024, // 1.5GB

      // Same features - just more space
      availableGridSizes: ["3x3", "4x4", "5x5", "6x6"],
      customThemes: true,
      advancedSorting: true,
      publicSharing: true,
      shareableLinks: true,
      bulkOperations: true,
      exportFormats: ["basic", "pdf", "excel", "csv", "json"],
    },
    restrictions: {
      binderCreation: 15,
      cardAddition: 7500,
      exports: 50,
    },
    badges: ["⭐", "Best Value"],
    highlight: false,
  },

  enthusiast: {
    id: "enthusiast",
    name: "Enthusiast",
    description: "For massive collections and power users",
    price: 12.99,
    interval: "month",
    stripePriceId: process.env.REACT_APP_STRIPE_ENTHUSIAST_PRICE_ID,
    yearlyPrice: 129.99, // ~17% discount
    yearlyStripePriceId:
      process.env.REACT_APP_STRIPE_ENTHUSIAST_YEARLY_PRICE_ID,
    features: {
      // Large collection support
      maxBinders: 30,
      maxCardsPerBinder: 750, // Slightly more per binder
      totalCardsLimit: 22500, // 30 binders × 750 cards

      // Lots of storage
      storageLimit: 5 * 1024 * 1024 * 1024, // 5GB

      // All features included
      availableGridSizes: ["3x3", "4x4", "5x5", "6x6"],
      customThemes: true,
      advancedSorting: true,
      publicSharing: true,
      shareableLinks: true,
      bulkOperations: true,
      exportFormats: ["basic", "pdf", "excel", "csv", "json"],
    },
    restrictions: {
      binderCreation: 30,
      cardAddition: 22500,
      exports: 100,
    },
    badges: ["🚀", "Power User"],
    highlight: false,
  },
};

// =====================================
// COMBINED ROLE + SUBSCRIPTION UTILITIES
// =====================================

/**
 * Get effective user permissions combining role + subscription
 * @param {Object} user - User object with role and subscription info
 * @returns {Object} - Combined permissions and limits
 */
export const getUserEffectivePermissions = (user) => {
  const role = user?.role || USER_ROLES.USER;
  const subscriptionTier = user?.subscriptionTier || "free";

  const rolePermissions =
    ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[USER_ROLES.USER];
  const subscriptionLimits =
    SUBSCRIPTION_TIERS[subscriptionTier] || SUBSCRIPTION_TIERS.free;

  return {
    // Role-based permissions (what you can do)
    role: role,
    permissions: rolePermissions,

    // Subscription-based limits (how much you can do)
    subscription: subscriptionTier,
    limits: subscriptionLimits.features,
    restrictions: subscriptionLimits.restrictions,

    // Special overrides for staff
    isStaff: role !== USER_ROLES.USER,
    hasUnlimitedLimits: role === USER_ROLES.ADMIN || role === USER_ROLES.OWNER,
  };
};

// Subscription status definitions
export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  UNPAID: "unpaid",
  INCOMPLETE: "incomplete",
  INCOMPLETE_EXPIRED: "incomplete_expired",
  TRIALING: "trialing",
  PAUSED: "paused",
};

// Feature access utilities
export const hasFeatureAccess = (userTier, featureName) => {
  const tier = SUBSCRIPTION_TIERS[userTier] || SUBSCRIPTION_TIERS.free;

  // Handle nested feature paths like "features.maxBinders"
  const featurePath = featureName.split(".");
  let currentValue = tier;

  for (const path of featurePath) {
    if (
      currentValue &&
      typeof currentValue === "object" &&
      path in currentValue
    ) {
      currentValue = currentValue[path];
    } else {
      return false;
    }
  }

  return currentValue === true || currentValue > 0;
};

export const getFeatureLimit = (userTier, featureName) => {
  const tier = SUBSCRIPTION_TIERS[userTier] || SUBSCRIPTION_TIERS.free;
  const featurePath = featureName.split(".");
  let currentValue = tier;

  for (const path of featurePath) {
    if (
      currentValue &&
      typeof currentValue === "object" &&
      path in currentValue
    ) {
      currentValue = currentValue[path];
    } else {
      return 0;
    }
  }

  return typeof currentValue === "number" ? currentValue : 0;
};

export const checkFeatureLimitReached = (
  userTier,
  featureName,
  currentUsage
) => {
  const limit = getFeatureLimit(userTier, featureName);

  // If limit is Infinity, never reached
  if (limit === Infinity) return false;

  return currentUsage >= limit;
};

export const getRemainingFeatureUsage = (
  userTier,
  featureName,
  currentUsage
) => {
  const limit = getFeatureLimit(userTier, featureName);

  if (limit === Infinity) return Infinity;

  return Math.max(0, limit - currentUsage);
};

export const getUpgradeSuggestion = (currentTier, requestedFeature) => {
  const tierOrder = ["free", "supporter", "collector", "enthusiast"];
  const currentIndex = tierOrder.indexOf(currentTier);

  // Find the next tier that has the requested feature
  for (let i = currentIndex + 1; i < tierOrder.length; i++) {
    const tierKey = tierOrder[i];
    const tier = SUBSCRIPTION_TIERS[tierKey];

    if (hasFeatureAccess(tierKey, requestedFeature)) {
      return {
        suggestedTier: tierKey,
        tierName: tier.name,
        price: tier.price,
        savings: tier.yearlyPrice
          ? (
              ((tier.price * 12 - tier.yearlyPrice) / (tier.price * 12)) *
              100
            ).toFixed(0)
          : 0,
      };
    }
  }

  return null;
};

export const compareTiers = (tier1, tier2) => {
  const tierOrder = ["free", "supporter", "collector", "enthusiast"];
  return tierOrder.indexOf(tier1) - tierOrder.indexOf(tier2);
};

export const isUpgrade = (fromTier, toTier) => {
  return compareTiers(fromTier, toTier) < 0;
};

export const isDowngrade = (fromTier, toTier) => {
  return compareTiers(fromTier, toTier) > 0;
};

export const calculateYearlySavings = (tier) => {
  if (!tier.yearlyPrice) return 0;

  const monthlyTotal = tier.price * 12;
  const savings = monthlyTotal - tier.yearlyPrice;
  const percentSaved = (savings / monthlyTotal) * 100;

  return {
    amount: savings,
    percentage: Math.round(percentSaved),
    monthlyPrice: tier.price,
    yearlyPrice: tier.yearlyPrice,
  };
};

// Simple cost-recovery messaging
export const getCostRecoveryMessage = (tierKey) => {
  const messages = {
    free: "Perfect for getting started! No costs, just some limits on storage.",
    supporter:
      "Help us cover basic server costs! Your $2.99/month helps keep the lights on.",
    collector:
      "Support our growing infrastructure! Perfect for serious collectors.",
    enthusiast:
      "Help us scale for power users! Your support keeps the platform growing.",
  };

  return messages[tierKey] || messages.free;
};

// Get realistic Firebase cost estimate for a tier
export const getFirebaseCostEstimate = (tierKey) => {
  const tier = SUBSCRIPTION_TIERS[tierKey];
  if (!tier) return 0;

  // Rough Firebase cost calculation
  // Based on: storage, reads/writes, functions
  const storageGB = tier.features.storageLimit / (1024 * 1024 * 1024);
  const estimatedReads = tier.features.totalCardsLimit * 10; // 10 reads per card per month
  const estimatedWrites = tier.features.totalCardsLimit * 2; // 2 writes per card per month

  const storageCost = storageGB * 0.026; // $0.026/GB/month
  const readsCost = (estimatedReads / 100000) * 0.06; // $0.06 per 100K reads
  const writesCost = (estimatedWrites / 100000) * 0.18; // $0.18 per 100K writes

  return Math.round((storageCost + readsCost + writesCost) * 100) / 100; // Round to 2 decimals
};

// Validation schemas
export const SubscriptionTierSchema = z.enum([
  "free",
  "supporter",
  "collector",
  "enthusiast",
]);

export const SubscriptionStatusSchema = z.enum([
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "paused",
]);

export default {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_STATUS,
  hasFeatureAccess,
  getFeatureLimit,
  checkFeatureLimitReached,
  getRemainingFeatureUsage,
  getUpgradeSuggestion,
  getCostRecoveryMessage,
  getFirebaseCostEstimate,
};

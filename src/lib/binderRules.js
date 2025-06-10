import { RULE_TEMPLATES } from "./rules";

// Binder-specific rule templates
export const BINDER_RULE_TEMPLATES = {
  // User can have maximum X binders
  max_binders_per_user: {
    name: "Max Binders per User",
    description: "Limit the number of binders a user can create",
    type: "feature_limit",
    config: {
      feature: "binders",
      limit: 5, // Default: 5 binders per user
      scope: "user",
    },
  },

  // Maximum cards per binder
  max_cards_per_binder: {
    name: "Max Cards per Binder",
    description: "Limit the number of cards in a single binder",
    type: "feature_limit",
    config: {
      feature: "cards_per_binder",
      limit: 500, // Default: 500 cards per binder
      scope: "user",
    },
  },

  // Maximum pages per binder
  max_pages_per_binder: {
    name: "Max Pages per Binder",
    description: "Limit the number of pages in a single binder",
    type: "feature_limit",
    config: {
      feature: "pages_per_binder",
      limit: 50, // Default: 50 pages per binder
      scope: "user",
    },
  },

  // Rate limit for creating binders
  binder_creation_rate_limit: {
    name: "Binder Creation Rate Limit",
    description: "Limit how often users can create new binders",
    type: "rate_limit",
    config: {
      limit: 10, // 10 binders per day
      window: "day",
      resource: "binder_creation",
    },
  },

  // Rate limit for adding cards to binders
  card_addition_rate_limit: {
    name: "Card Addition Rate Limit",
    description: "Limit how many cards can be added per hour",
    type: "rate_limit",
    config: {
      limit: 100, // 100 cards per hour
      window: "hour",
      resource: "card_addition",
    },
  },

  // Restrict binder sharing feature
  binder_sharing_access: {
    name: "Binder Sharing Access",
    description: "Control who can share binders publicly",
    type: "access_control",
    config: {
      feature: "binder_sharing",
      allowedRoles: ["premium", "owner"],
      requiredPermissions: ["share_binders"],
    },
  },

  // Premium grid sizes (5x5, 6x6)
  premium_grid_sizes: {
    name: "Premium Grid Sizes",
    description: "Restrict large grid sizes to premium users",
    type: "access_control",
    config: {
      feature: "premium_grid_sizes",
      allowedRoles: ["premium", "owner"],
      requiredPermissions: ["large_grid_access"],
    },
  },

  // Binder export rate limit
  binder_export_rate_limit: {
    name: "Binder Export Rate Limit",
    description: "Limit how often users can export binders",
    type: "rate_limit",
    config: {
      limit: 5, // 5 exports per day
      window: "day",
      resource: "binder_export",
    },
  },

  // PDF export rate limit
  pdf_export_rate_limit: {
    name: "PDF Export Rate Limit",
    description: "Limit how often users can export binders as PDF",
    type: "rate_limit",
    config: {
      limit: 10, // 10 PDF exports per day
      window: "day",
      resource: "pdf_export",
    },
  },

  // Maximum collaborators per binder
  max_collaborators_per_binder: {
    name: "Max Collaborators per Binder",
    description: "Limit how many people can collaborate on a binder",
    type: "feature_limit",
    config: {
      feature: "collaborators_per_binder",
      limit: 3, // Default: 3 collaborators per binder
      scope: "user",
    },
  },

  // Total storage limit per user (for card images, etc.)
  user_storage_limit: {
    name: "User Storage Limit",
    description: "Limit total storage space per user",
    type: "content_limit",
    config: {
      contentType: "user_storage",
      maxSize: 100 * 1024 * 1024, // 100MB per user
    },
  },
};

// Action mappings for binder operations
export const BINDER_ACTION_MAPPINGS = {
  // Binder CRUD operations
  create_binder: { type: "feature_limit", resource: "binders" },
  add_card_to_binder: { type: "feature_limit", resource: "cards_per_binder" },
  add_page_to_binder: { type: "feature_limit", resource: "pages_per_binder" },

  // Rate-limited operations
  create_binder_rate: { type: "rate_limit", resource: "binder_creation" },
  add_cards_rate: { type: "rate_limit", resource: "card_addition" },
  export_binder: { type: "rate_limit", resource: "binder_export" },
  pdf_export: { type: "rate_limit", resource: "pdf_export" },

  // Access-controlled features
  share_binder: { type: "access_control", resource: "binder_sharing" },
  use_large_grid: { type: "access_control", resource: "premium_grid_sizes" },
  add_collaborator: {
    type: "feature_limit",
    resource: "collaborators_per_binder",
  },

  // Storage operations
  upload_card_image: { type: "content_limit", resource: "user_storage" },
};

// Helper functions for binder-specific rule checks
export const checkBinderLimits = {
  // Check if user can create a new binder
  canCreateBinder: async (rulesContext, userId, userBinderCount) => {
    return await rulesContext.canPerformAction("create_binder", {
      currentCount: userBinderCount,
    });
  },

  // Check if user can add cards to binder
  canAddCardsToBinder: async (rulesContext, userId, binder, cardsToAdd = 1) => {
    const currentCardCount = Object.keys(binder.cards || {}).length;

    // Check feature limit
    const featureCheck = await rulesContext.canPerformAction(
      "add_card_to_binder",
      {
        currentCount: currentCardCount + cardsToAdd,
      }
    );

    if (!featureCheck.allowed) return featureCheck;

    // Check rate limit
    const rateCheck = await rulesContext.canPerformAction("add_cards_rate", {
      increment: cardsToAdd,
    });

    return rateCheck;
  },

  // Check if user can add pages to binder
  canAddPagesToBinder: async (rulesContext, userId, binder, pagesToAdd = 1) => {
    const currentPageCount = binder.settings?.pageCount || 1;

    return await rulesContext.canPerformAction("add_page_to_binder", {
      currentCount: currentPageCount + pagesToAdd,
    });
  },

  // Check if user can use specific grid size
  canUseGridSize: async (rulesContext, userId, gridSize) => {
    const largeGridSizes = ["5x5", "6x6"];

    if (largeGridSizes.includes(gridSize)) {
      return await rulesContext.canPerformAction("use_large_grid");
    }

    return { allowed: true };
  },

  // Check if user can share binders
  canShareBinder: async (rulesContext, userId) => {
    return await rulesContext.canPerformAction("share_binder");
  },

  // Check if user can export binder
  canExportBinder: async (rulesContext, userId) => {
    return await rulesContext.canPerformAction("export_binder");
  },

  // Check if user can export PDF
  canExportPdf: async (rulesContext, userId) => {
    return await rulesContext.canPerformAction("pdf_export");
  },

  // Check if user can add collaborators
  canAddCollaborator: async (rulesContext, userId, binder) => {
    const currentCollaborators = binder.permissions?.collaborators?.length || 0;

    return await rulesContext.canPerformAction("add_collaborator", {
      currentCount: currentCollaborators + 1,
    });
  },
};

// Predefined rule sets for different user tiers
export const USER_TIER_RULES = {
  free: {
    name: "Free Tier",
    rules: [
      {
        ...BINDER_RULE_TEMPLATES.max_binders_per_user,
        config: {
          ...BINDER_RULE_TEMPLATES.max_binders_per_user.config,
          limit: 3,
        },
      },
      {
        ...BINDER_RULE_TEMPLATES.max_cards_per_binder,
        config: {
          ...BINDER_RULE_TEMPLATES.max_cards_per_binder.config,
          limit: 200,
        },
      },
      {
        ...BINDER_RULE_TEMPLATES.max_pages_per_binder,
        config: {
          ...BINDER_RULE_TEMPLATES.max_pages_per_binder.config,
          limit: 20,
        },
      },
      BINDER_RULE_TEMPLATES.binder_creation_rate_limit,
      BINDER_RULE_TEMPLATES.card_addition_rate_limit,
      {
        ...BINDER_RULE_TEMPLATES.user_storage_limit,
        config: {
          ...BINDER_RULE_TEMPLATES.user_storage_limit.config,
          maxSize: 50 * 1024 * 1024,
        },
      },
    ],
  },

  premium: {
    name: "Premium Tier",
    rules: [
      {
        ...BINDER_RULE_TEMPLATES.max_binders_per_user,
        config: {
          ...BINDER_RULE_TEMPLATES.max_binders_per_user.config,
          limit: 10,
        },
      },
      {
        ...BINDER_RULE_TEMPLATES.max_cards_per_binder,
        config: {
          ...BINDER_RULE_TEMPLATES.max_cards_per_binder.config,
          limit: 1000,
        },
      },
      {
        ...BINDER_RULE_TEMPLATES.max_pages_per_binder,
        config: {
          ...BINDER_RULE_TEMPLATES.max_pages_per_binder.config,
          limit: 100,
        },
      },
      BINDER_RULE_TEMPLATES.binder_sharing_access,
      BINDER_RULE_TEMPLATES.premium_grid_sizes,
      {
        ...BINDER_RULE_TEMPLATES.user_storage_limit,
        config: {
          ...BINDER_RULE_TEMPLATES.user_storage_limit.config,
          maxSize: 500 * 1024 * 1024,
        },
      },
    ],
  },

  unlimited: {
    name: "Unlimited Tier",
    rules: [
      // No limits for unlimited tier users
    ],
  },
};

// Helper to apply tier-based rules for a user
export const applyUserTierRules = async (
  rulesService,
  userId,
  tier = "free"
) => {
  const tierRules = USER_TIER_RULES[tier];
  if (!tierRules) {
    throw new Error(`Unknown user tier: ${tier}`);
  }

  const results = [];

  for (const ruleTemplate of tierRules.rules) {
    try {
      const ruleId = await rulesService.createRule(
        {
          ...ruleTemplate,
          name: `${tierRules.name} - ${ruleTemplate.name}`,
          description: `${ruleTemplate.description} (${tierRules.name})`,
          metadata: {
            userTier: tier,
            autoGenerated: true,
          },
        },
        "system"
      );

      results.push({ success: true, ruleId, ruleName: ruleTemplate.name });
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        ruleName: ruleTemplate.name,
      });
    }
  }

  return results;
};

export default {
  BINDER_RULE_TEMPLATES,
  BINDER_ACTION_MAPPINGS,
  checkBinderLimits,
  USER_TIER_RULES,
  applyUserTierRules,
};

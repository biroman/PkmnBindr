import { rulesService } from "../services/rulesService";
import { BINDER_RULE_TEMPLATES } from "../lib/binderRules";

export const setupDefaultBinderLimits = async (ownerId) => {
  try {
    console.log("🚀 Setting up default binder limits...");

    const results = [];

    // Default limits configuration
    const defaultLimits = {
      maxBinders: 5,
      maxCardsPerBinder: 500,
      maxPagesPerBinder: 50,
    };

    // Check if rules already exist
    const existingRules = await rulesService.getAllRules();
    const binderRules = existingRules.filter(
      (rule) =>
        rule.type === "feature_limit" &&
        (rule.config?.feature === "binders" ||
          rule.config?.feature === "cards_per_binder" ||
          rule.config?.feature === "pages_per_binder")
    );

    if (binderRules.length > 0) {
      console.log("⚠️ Binder limit rules already exist:");
      binderRules.forEach((rule) => {
        console.log(`  - ${rule.name}: ${rule.config.limit}`);
      });
      return {
        success: true,
        message: "Binder limit rules already exist",
        existing: binderRules,
      };
    }

    // Create Max Binders per User rule
    try {
      const maxBindersRule = await rulesService.createRule(
        {
          ...BINDER_RULE_TEMPLATES.max_binders_per_user,
          config: {
            ...BINDER_RULE_TEMPLATES.max_binders_per_user.config,
            limit: defaultLimits.maxBinders,
          },
          enabled: true,
        },
        ownerId
      );

      results.push({
        success: true,
        ruleId: maxBindersRule,
        ruleName: "Max Binders per User",
        limit: defaultLimits.maxBinders,
      });
      console.log(
        `✅ Created Max Binders per User: ${defaultLimits.maxBinders}`
      );
    } catch (error) {
      results.push({
        success: false,
        ruleName: "Max Binders per User",
        error: error.message,
      });
      console.error("❌ Failed to create Max Binders rule:", error);
    }

    // Create Max Cards per Binder rule
    try {
      const maxCardsRule = await rulesService.createRule(
        {
          ...BINDER_RULE_TEMPLATES.max_cards_per_binder,
          config: {
            ...BINDER_RULE_TEMPLATES.max_cards_per_binder.config,
            limit: defaultLimits.maxCardsPerBinder,
          },
          enabled: true,
        },
        ownerId
      );

      results.push({
        success: true,
        ruleId: maxCardsRule,
        ruleName: "Max Cards per Binder",
        limit: defaultLimits.maxCardsPerBinder,
      });
      console.log(
        `✅ Created Max Cards per Binder: ${defaultLimits.maxCardsPerBinder}`
      );
    } catch (error) {
      results.push({
        success: false,
        ruleName: "Max Cards per Binder",
        error: error.message,
      });
      console.error("❌ Failed to create Max Cards rule:", error);
    }

    // Create Max Pages per Binder rule
    try {
      const maxPagesRule = await rulesService.createRule(
        {
          ...BINDER_RULE_TEMPLATES.max_pages_per_binder,
          config: {
            ...BINDER_RULE_TEMPLATES.max_pages_per_binder.config,
            limit: defaultLimits.maxPagesPerBinder,
          },
          enabled: true,
        },
        ownerId
      );

      results.push({
        success: true,
        ruleId: maxPagesRule,
        ruleName: "Max Pages per Binder",
        limit: defaultLimits.maxPagesPerBinder,
      });
      console.log(
        `✅ Created Max Pages per Binder: ${defaultLimits.maxPagesPerBinder}`
      );
    } catch (error) {
      results.push({
        success: false,
        ruleName: "Max Pages per Binder",
        error: error.message,
      });
      console.error("❌ Failed to create Max Pages rule:", error);
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `🎯 Setup complete: ${successCount} created, ${failureCount} failed`
    );

    return {
      success: successCount > 0,
      message: `Created ${successCount} binder limit rules`,
      results,
      limits: defaultLimits,
    };
  } catch (error) {
    console.error("❌ Setup failed:", error);
    return {
      success: false,
      message: "Failed to setup default binder limits",
      error: error.message,
    };
  }
};

export default setupDefaultBinderLimits;

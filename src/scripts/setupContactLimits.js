import { rulesService } from "../services/rulesService";
import { RULE_TEMPLATES } from "../lib/rules";

/**
 * Setup default contact rate limit rules
 */
export const setupDefaultContactLimits = async (ownerId) => {
  if (!ownerId) {
    return { success: false, message: "Owner ID is required" };
  }

  try {
    console.log("Setting up default contact rate limits...");

    // Define the contact rate limit rules to create
    const contactRules = [
      {
        ...RULE_TEMPLATES.contact_message_rate_limit,
        id: "contact_message_rate_limit",
        createdBy: ownerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        ...RULE_TEMPLATES.feature_request_rate_limit,
        id: "feature_request_rate_limit",
        createdBy: ownerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        ...RULE_TEMPLATES.bug_report_rate_limit,
        id: "bug_report_rate_limit",
        createdBy: ownerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const results = [];

    for (const rule of contactRules) {
      try {
        // Check if rule already exists
        const existingRules = await rulesService.getAllRules();
        const existingRule = existingRules.find(
          (r) =>
            r.config.resource === rule.config.resource && r.type === rule.type
        );

        if (existingRule) {
          console.log(
            `Contact rate limit rule for ${rule.config.resource} already exists`
          );
          results.push({
            rule: rule.config.resource,
            action: "skipped",
            message: "Already exists",
          });
        } else {
          // Create the rule
          const ruleId = await rulesService.createRule(rule);
          console.log(
            `Created contact rate limit rule for ${rule.config.resource}: ${ruleId}`
          );
          results.push({
            rule: rule.config.resource,
            action: "created",
            ruleId,
            limit: rule.config.limit,
            window: rule.config.window,
          });
        }
      } catch (error) {
        console.error(
          `Error setting up rule for ${rule.config.resource}:`,
          error
        );
        results.push({
          rule: rule.config.resource,
          action: "failed",
          error: error.message,
        });
      }
    }

    const createdCount = results.filter((r) => r.action === "created").length;
    const skippedCount = results.filter((r) => r.action === "skipped").length;
    const failedCount = results.filter((r) => r.action === "failed").length;

    return {
      success: true,
      message: `Contact rate limits setup complete. Created: ${createdCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`,
      results,
      limits: {
        directMessages: contactRules[0].config,
        featureRequests: contactRules[1].config,
        bugReports: contactRules[2].config,
      },
    };
  } catch (error) {
    console.error("Error setting up contact rate limits:", error);
    return {
      success: false,
      message: `Failed to setup contact rate limits: ${error.message}`,
      error: error.message,
    };
  }
};

/**
 * Check current contact rate limit rules
 */
export const checkContactLimits = async () => {
  try {
    const rules = await rulesService.getAllRules();

    const contactRules = rules.filter(
      (rule) =>
        rule.type === "rate_limit" &&
        ["direct_messages", "feature_requests", "bug_reports"].includes(
          rule.config.resource
        )
    );

    const summary = {
      directMessages: contactRules.find(
        (r) => r.config.resource === "direct_messages"
      ),
      featureRequests: contactRules.find(
        (r) => r.config.resource === "feature_requests"
      ),
      bugReports: contactRules.find((r) => r.config.resource === "bug_reports"),
    };

    return {
      success: true,
      rules: contactRules,
      summary,
      hasAllRules: Object.values(summary).every((rule) => rule !== undefined),
    };
  } catch (error) {
    console.error("Error checking contact limits:", error);
    return {
      success: false,
      message: `Failed to check contact limits: ${error.message}`,
      error: error.message,
    };
  }
};

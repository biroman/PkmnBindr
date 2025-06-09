import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { rulesService } from "../services/rulesService";
import {
  checkRateLimit,
  checkFeatureLimit,
  checkAccessControl,
  RULE_TYPES,
} from "../lib/rules";
import { BINDER_ACTION_MAPPINGS, checkBinderLimits } from "../lib/binderRules";

const RulesContext = createContext();

export const useRules = () => {
  const context = useContext(RulesContext);
  if (!context) {
    throw new Error("useRules must be used within a RulesProvider");
  }
  return context;
};

export const RulesProvider = ({ children }) => {
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listenerId, setListenerId] = useState(null);

  // Subscribe to rules changes
  useEffect(() => {
    if (!user) {
      setRules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const subscriptionId = rulesService.subscribeToRules(
      (rulesData, error) => {
        if (error) {
          console.error("Rules subscription error:", error);
          setError(error.message);
        } else {
          setRules(rulesData || []);
        }
        setLoading(false);
      },
      { enabled: true } // Only subscribe to enabled rules
    );

    setListenerId(subscriptionId);

    return () => {
      if (subscriptionId) {
        rulesService.unsubscribeFromRules(subscriptionId);
      }
    };
  }, [user]);

  // Local limits for non-authenticated users
  const enforceLocalLimits = useCallback((ruleType, resource, data = {}) => {
    // Define generous local limits for non-authenticated users
    const localLimits = {
      feature_limit: {
        binders: { limit: 10 }, // Allow up to 10 local binders
        cards_per_binder: { limit: 500 }, // Allow up to 500 cards per binder
        pages_per_binder: { limit: 50 }, // Allow up to 50 pages per binder
        collaborators_per_binder: { limit: 0 }, // No collaborators for local
      },
      access_control: {
        // Allow most features for local use
        premium_grid_sizes: { allowed: true },
        binder_sharing: { allowed: false }, // Sharing requires authentication
      },
      rate_limit: {
        // No rate limits for local usage
        binder_creation: { allowed: true },
        card_addition: { allowed: true },
        binder_export: { allowed: true },
        api_calls: { allowed: true },
        pokemon_searches: { allowed: true },
      },
      content_limit: {
        // Allow reasonable content limits for local use
        user_storage: { allowed: true },
      },
    };

    const typeLimit = localLimits[ruleType];
    if (!typeLimit) {
      return { allowed: true }; // No limits for unknown types
    }

    const resourceLimit = typeLimit[resource];
    if (!resourceLimit) {
      return { allowed: true }; // No limits for unknown resources
    }

    // Check feature limits
    if (ruleType === "feature_limit" && resourceLimit.limit !== undefined) {
      const currentCount = data.currentCount || 0;
      if (currentCount > resourceLimit.limit) {
        return {
          allowed: false,
          reason: `Local limit exceeded: maximum ${resourceLimit.limit} allowed`,
        };
      }
    }

    // Check access control
    if (ruleType === "access_control") {
      return {
        allowed: resourceLimit.allowed,
        reason: resourceLimit.allowed
          ? undefined
          : "Feature requires authentication",
      };
    }

    // Rate limits are disabled for local usage
    if (ruleType === "rate_limit") {
      return { allowed: true };
    }

    // Content limits are generally allowed for local usage
    if (ruleType === "content_limit") {
      return { allowed: resourceLimit.allowed || true };
    }

    return { allowed: true };
  }, []);

  // Rule enforcement functions
  const enforceRule = useCallback(
    async (ruleType, resource, data = {}) => {
      // For non-authenticated users, apply basic local limits
      if (!user) {
        return enforceLocalLimits(ruleType, resource, data);
      }

      try {
        // Find applicable rules
        const applicableRules = rules.filter(
          (rule) => rule.type === ruleType && rule.enabled
        );

        if (applicableRules.length === 0) {
          return { allowed: true }; // No rules to enforce
        }

        // Check each rule
        for (const rule of applicableRules) {
          let result = { allowed: true };

          switch (rule.type) {
            case "rate_limit":
              if (rule.config.resource === resource) {
                const usage = await rulesService.checkUserRuleUsage(
                  user.uid,
                  rule.id,
                  resource
                );
                result = checkRateLimit(usage, rule);
              }
              break;

            case "feature_limit":
              if (rule.config.feature === resource) {
                const currentCount = data.currentCount || 0;
                result = checkFeatureLimit(currentCount, rule);
              }
              break;

            case "access_control":
              if (rule.config.feature === resource) {
                result = checkAccessControl(user, rule);
              }
              break;

            case "content_limit":
              if (rule.config.contentType === resource) {
                result = checkContentLimit(data, rule);
              }
              break;

            case "time_based":
              if (rule.config.feature === resource) {
                result = checkTimeBasedRule(rule);
              }
              break;

            default:
              console.warn(`Unknown rule type: ${rule.type}`);
          }

          // If any rule fails, return failure
          if (!result.allowed) {
            return { ...result, rule };
          }
        }

        return { allowed: true };
      } catch (error) {
        console.error("Error enforcing rule:", error);
        return { allowed: false, reason: "Rule enforcement error" };
      }
    },
    [user, rules]
  );

  // Track rule usage
  const trackUsage = useCallback(
    async (ruleType, resource, increment = 1) => {
      if (!user) return true; // No tracking needed for non-authenticated users

      try {
        const applicableRules = rules.filter(
          (rule) =>
            rule.type === ruleType &&
            rule.enabled &&
            (rule.config.resource === resource ||
              rule.config.feature === resource)
        );

        for (const rule of applicableRules) {
          await rulesService.updateUserRuleUsage(
            user.uid,
            rule.id,
            resource,
            increment
          );
        }

        return true;
      } catch (error) {
        console.error("Error tracking usage:", error);
        return false;
      }
    },
    [user, rules]
  );

  // Get user's current usage for a specific rule
  const getUserUsage = useCallback(
    async (ruleId, resource) => {
      if (!user) return null;

      try {
        return await rulesService.checkUserRuleUsage(
          user.uid,
          ruleId,
          resource
        );
      } catch (error) {
        console.error("Error getting user usage:", error);
        return null;
      }
    },
    [user]
  );

  // Check if user can perform an action
  const canPerformAction = useCallback(
    async (action, data = {}) => {
      const actionMappings = {
        // API actions
        make_api_call: { type: "rate_limit", resource: "api_calls" },
        search_pokemon: { type: "rate_limit", resource: "pokemon_searches" },

        // Feature actions
        create_collection: { type: "feature_limit", resource: "collections" },
        add_pokemon_to_collection: {
          type: "feature_limit",
          resource: "pokemon_per_collection",
        },

        // Access actions
        access_admin_panel: { type: "access_control", resource: "admin_panel" },
        access_api_explorer: {
          type: "access_control",
          resource: "api_explorer",
        },

        // Content actions
        upload_file: { type: "content_limit", resource: "file_upload" },
        create_text_content: { type: "content_limit", resource: "text_input" },

        // Binder actions
        ...BINDER_ACTION_MAPPINGS,
      };

      const mapping = actionMappings[action];
      if (!mapping) {
        console.warn(`No rule mapping found for action: ${action}`);
        return { allowed: true };
      }

      return await enforceRule(mapping.type, mapping.resource, data);
    },
    [enforceRule]
  );

  // Admin functions (only for owner)
  const isOwner = user && rulesService.isOwner(user);

  const createRule = useCallback(
    async (ruleData) => {
      if (!isOwner) {
        throw new Error("Only owner can create rules");
      }

      try {
        return await rulesService.createRule(ruleData, user.uid);
      } catch (error) {
        console.error("Error creating rule:", error);
        throw error;
      }
    },
    [user, isOwner]
  );

  const updateRule = useCallback(
    async (ruleId, updates) => {
      if (!isOwner) {
        throw new Error("Only owner can update rules");
      }

      try {
        return await rulesService.updateRule(ruleId, updates, user.uid);
      } catch (error) {
        console.error("Error updating rule:", error);
        throw error;
      }
    },
    [user, isOwner]
  );

  const deleteRule = useCallback(
    async (ruleId) => {
      if (!isOwner) {
        throw new Error("Only owner can delete rules");
      }

      try {
        return await rulesService.deleteRule(ruleId);
      } catch (error) {
        console.error("Error deleting rule:", error);
        throw error;
      }
    },
    [isOwner]
  );

  const toggleRule = useCallback(
    async (ruleId, enabled) => {
      if (!isOwner) {
        throw new Error("Only owner can toggle rules");
      }

      try {
        return await rulesService.enableRule(ruleId, enabled);
      } catch (error) {
        console.error("Error toggling rule:", error);
        throw error;
      }
    },
    [isOwner]
  );

  const getRuleStats = useCallback(
    async (ruleId) => {
      if (!isOwner) {
        throw new Error("Only owner can view rule stats");
      }

      try {
        return await rulesService.getRuleUsageStats(ruleId);
      } catch (error) {
        console.error("Error getting rule stats:", error);
        return null;
      }
    },
    [isOwner]
  );

  // Helper functions for specific rule types
  const getRulesOfType = useCallback(
    (type) => {
      return rules.filter((rule) => rule.type === type && rule.enabled);
    },
    [rules]
  );

  const hasActiveRules = useCallback(() => {
    return rules.some((rule) => rule.enabled);
  }, [rules]);

  const value = {
    // State
    rules,
    loading,
    error,
    isOwner,

    // Rule enforcement
    enforceRule,
    trackUsage,
    canPerformAction,
    getUserUsage,

    // Admin functions
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    getRuleStats,

    // Helpers
    getRulesOfType,
    hasActiveRules,
    RULE_TYPES,

    // Binder-specific helpers
    checkBinderLimits,
  };

  return (
    <RulesContext.Provider value={value}>{children}</RulesContext.Provider>
  );
};

// Helper functions for complex rule checks
const checkContentLimit = (data, rule) => {
  const { config } = rule;

  // Check file size
  if (config.maxSize && data.size > config.maxSize) {
    return {
      allowed: false,
      reason: `File size exceeds limit of ${formatFileSize(config.maxSize)}`,
    };
  }

  // Check file type
  if (config.allowedTypes && !config.allowedTypes.includes(data.type)) {
    return {
      allowed: false,
      reason: `File type ${data.type} is not allowed`,
    };
  }

  // Check count limit
  if (config.maxCount && data.count >= config.maxCount) {
    return {
      allowed: false,
      reason: `Maximum count of ${config.maxCount} exceeded`,
    };
  }

  return { allowed: true };
};

const checkTimeBasedRule = (rule) => {
  const { config } = rule;
  const now = new Date();
  const startTime = new Date(config.schedule.startTime);
  const endTime = new Date(config.schedule.endTime);

  let isInSchedule = false;

  if (config.schedule.recurring === "none") {
    isInSchedule = now >= startTime && now <= endTime;
  } else {
    // Handle recurring schedules
    const currentHour = now.getHours();
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();

    switch (config.schedule.recurring) {
      case "daily":
        isInSchedule = currentHour >= startHour && currentHour <= endHour;
        break;
      case "weekly":
        const currentDay = now.getDay();
        const startDay = startTime.getDay();
        const endDay = endTime.getDay();
        isInSchedule =
          currentDay >= startDay &&
          currentDay <= endDay &&
          currentHour >= startHour &&
          currentHour <= endHour;
        break;
      // Add more recurring patterns as needed
    }
  }

  const allowed = config.action === "enable" ? isInSchedule : !isInSchedule;

  return {
    allowed,
    reason: allowed
      ? undefined
      : `Feature is ${config.action}d during scheduled time`,
  };
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

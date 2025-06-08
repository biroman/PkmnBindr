import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { rulesService } from "../services/rulesService";
import {
  RULE_TYPES,
  checkRateLimit,
  checkFeatureLimit,
  checkAccessControl,
} from "../lib/rules";

export const useRulesStore = create()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // State
      rules: [],
      loading: false,
      error: null,
      initialized: false,
      unsubscribe: null,

      // Actions
      setRules: (rules) => set({ rules }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Initialize real-time subscription
      initialize: async () => {
        try {
          set({ loading: true, error: null });

          const unsubscribe = rulesService.subscribeToRules((rules) => {
            set({ rules, loading: false, initialized: true });
          });

          set({ unsubscribe });
          return unsubscribe;
        } catch (error) {
          console.error("Error initializing rules:", error);
          set({ error: error.message, loading: false, initialized: true });
        }
      },

      // Cleanup subscription
      cleanup: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
          unsubscribe();
          set({ unsubscribe: null });
        }
      },

      // CRUD Operations (owner only)
      createRule: async (ruleData) => {
        try {
          set({ loading: true, error: null });
          await rulesService.createRule(ruleData);
        } catch (error) {
          set({ error: error.message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateRule: async (ruleId, updates) => {
        try {
          set({ loading: true, error: null });
          await rulesService.updateRule(ruleId, updates);
        } catch (error) {
          set({ error: error.message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteRule: async (ruleId) => {
        try {
          set({ loading: true, error: null });
          await rulesService.deleteRule(ruleId);
        } catch (error) {
          set({ error: error.message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      bulkUpdateRules: async (updates) => {
        try {
          set({ loading: true, error: null });
          await rulesService.bulkUpdateRules(updates);
        } catch (error) {
          set({ error: error.message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Rule Enforcement
      checkRateLimit: (userId, action, limit = null) => {
        const { rules } = get();
        const rateLimitRules = rules.filter(
          (rule) => rule.enabled && rule.type === RULE_TYPES.RATE_LIMIT
        );
        return checkRateLimit(userId, action, rateLimitRules, limit);
      },

      checkFeatureLimit: (userId, feature, currentCount, limit = null) => {
        const { rules } = get();
        const featureLimitRules = rules.filter(
          (rule) => rule.enabled && rule.type === RULE_TYPES.FEATURE_LIMIT
        );
        return checkFeatureLimit(
          userId,
          feature,
          currentCount,
          featureLimitRules,
          limit
        );
      },

      checkAccessControl: (userId, resource, action, userRole = "user") => {
        const { rules } = get();
        const accessControlRules = rules.filter(
          (rule) => rule.enabled && rule.type === RULE_TYPES.ACCESS_CONTROL
        );
        return checkAccessControl(
          userId,
          resource,
          action,
          accessControlRules,
          userRole
        );
      },

      // Usage tracking
      trackUsage: async (userId, action, metadata = {}) => {
        try {
          await rulesService.trackUsage(userId, action, metadata);
        } catch (error) {
          console.error("Error tracking usage:", error);
        }
      },

      // Analytics
      getUsageAnalytics: async (timeRange = "24h") => {
        try {
          return await rulesService.getUsageAnalytics(timeRange);
        } catch (error) {
          console.error("Error getting usage analytics:", error);
          throw error;
        }
      },

      getRuleAnalytics: async (ruleId, timeRange = "24h") => {
        try {
          return await rulesService.getRuleAnalytics(ruleId, timeRange);
        } catch (error) {
          console.error("Error getting rule analytics:", error);
          throw error;
        }
      },

      // Helper methods
      getRulesByType: (type) => {
        const { rules } = get();
        return rules.filter((rule) => rule.type === type && rule.enabled);
      },

      isActionAllowed: (userId, action, userRole = "user") => {
        const state = get();

        // Check access control
        const accessResult = state.checkAccessControl(
          userId,
          action,
          "execute",
          userRole
        );
        if (!accessResult.allowed) {
          return { allowed: false, reason: accessResult.reason };
        }

        // Check rate limits
        const rateLimitResult = state.checkRateLimit(userId, action);
        if (!rateLimitResult.allowed) {
          return { allowed: false, reason: rateLimitResult.reason };
        }

        return { allowed: true };
      },

      // Computed values
      getActiveRulesCount: () => {
        const { rules } = get();
        return rules.filter((rule) => rule.enabled).length;
      },

      getRulesCountByType: () => {
        const { rules } = get();
        return rules.reduce((acc, rule) => {
          acc[rule.type] = (acc[rule.type] || 0) + 1;
          return acc;
        }, {});
      },
    })),
    {
      name: "rules-store",
    }
  )
);

import { useCallback } from "react";
import { useRules } from "../contexts/RulesContext";

/**
 * Custom hook for rule enforcement
 * Provides easy-to-use functions for checking permissions and tracking usage
 */
export const useRuleEnforcement = () => {
  const { canPerformAction, trackUsage, enforceRule } = useRules();

  // API Rate Limiting
  const checkApiLimit = useCallback(async () => {
    return await canPerformAction("make_api_call");
  }, [canPerformAction]);

  const trackApiCall = useCallback(async () => {
    return await trackUsage("rate_limit", "api_calls");
  }, [trackUsage]);

  // Pokemon Search Limiting
  const checkSearchLimit = useCallback(async () => {
    return await canPerformAction("search_pokemon");
  }, [canPerformAction]);

  const trackSearch = useCallback(async () => {
    return await trackUsage("rate_limit", "pokemon_searches");
  }, [trackUsage]);

  // Collection Management
  const checkCanCreateCollection = useCallback(
    async (currentCount) => {
      return await canPerformAction("create_collection", { currentCount });
    },
    [canPerformAction]
  );

  const checkCanAddPokemon = useCallback(
    async (currentCount) => {
      return await canPerformAction("add_pokemon_to_collection", {
        currentCount,
      });
    },
    [canPerformAction]
  );

  // File Upload
  const checkFileUpload = useCallback(
    async (file) => {
      return await canPerformAction("upload_file", {
        size: file.size,
        type: file.type,
      });
    },
    [canPerformAction]
  );

  // Access Control
  const checkAdminAccess = useCallback(async () => {
    return await canPerformAction("access_admin_panel");
  }, [canPerformAction]);

  const checkApiExplorerAccess = useCallback(async () => {
    return await canPerformAction("access_api_explorer");
  }, [canPerformAction]);

  // Generic enforcement
  const checkRule = useCallback(
    async (ruleType, resource, data = {}) => {
      return await enforceRule(ruleType, resource, data);
    },
    [enforceRule]
  );

  // Combined check and track for common actions
  const performApiCall = useCallback(
    async (apiFunction, ...args) => {
      const check = await checkApiLimit();
      if (!check.allowed) {
        throw new Error(check.reason || "API call not allowed");
      }

      try {
        const result = await apiFunction(...args);
        await trackApiCall();
        return result;
      } catch (error) {
        // Don't track usage if the API call failed
        throw error;
      }
    },
    [checkApiLimit, trackApiCall]
  );

  const performSearch = useCallback(
    async (searchFunction, ...args) => {
      const check = await checkSearchLimit();
      if (!check.allowed) {
        throw new Error(check.reason || "Search not allowed");
      }

      try {
        const result = await searchFunction(...args);
        await trackSearch();
        return result;
      } catch (error) {
        // Don't track usage if the search failed
        throw error;
      }
    },
    [checkSearchLimit, trackSearch]
  );

  return {
    // Individual checks
    checkApiLimit,
    checkSearchLimit,
    checkCanCreateCollection,
    checkCanAddPokemon,
    checkFileUpload,
    checkAdminAccess,
    checkApiExplorerAccess,

    // Tracking
    trackApiCall,
    trackSearch,

    // Generic
    checkRule,

    // Combined operations
    performApiCall,
    performSearch,
  };
};

export default useRuleEnforcement;

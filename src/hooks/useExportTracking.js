import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useRules } from "../contexts/RulesContext";

const STORAGE_KEY = "export_usage";

/**
 * Hook to track export usage for users
 * Tracks different types of exports (PDF, Excel, JSON, etc.)
 */
const useExportTracking = () => {
  const { user } = useAuth();
  const { trackUsage } = useRules();
  const [exportCounts, setExportCounts] = useState({
    pdf: 0,
    excel: 0,
    json: 0,
    basic: 0,
  });

  // Load export counts from localStorage for anonymous users
  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setExportCounts(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load export usage:", error);
      }
    }
  }, [user]);

  // Save export counts to localStorage for anonymous users
  const saveLocalCounts = useCallback(
    (counts) => {
      if (!user) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
        } catch (error) {
          console.error("Failed to save export usage:", error);
        }
      }
    },
    [user]
  );

  // Track an export
  const trackExport = useCallback(
    async (exportType = "basic") => {
      try {
        // For authenticated users, use the rules system
        if (user) {
          await trackUsage("rate_limit", `${exportType}_export`, 1);
        } else {
          // For anonymous users, use local tracking
          setExportCounts((prev) => {
            const newCounts = {
              ...prev,
              [exportType]: (prev[exportType] || 0) + 1,
            };
            saveLocalCounts(newCounts);
            return newCounts;
          });
        }

        return true;
      } catch (error) {
        console.error("Failed to track export:", error);
        return false;
      }
    },
    [user, trackUsage, saveLocalCounts]
  );

  // Reset daily counts (for local users)
  const resetDailyCounts = useCallback(() => {
    if (!user) {
      const resetCounts = {
        pdf: 0,
        excel: 0,
        json: 0,
        basic: 0,
      };
      setExportCounts(resetCounts);
      saveLocalCounts(resetCounts);
    }
  }, [user, saveLocalCounts]);

  // Get export count for a specific type
  const getExportCount = useCallback(
    (exportType) => {
      return exportCounts[exportType] || 0;
    },
    [exportCounts]
  );

  // Check if export limit is reached for local users
  const isExportLimitReached = useCallback(
    (exportType, limit = 10) => {
      if (user) {
        // For authenticated users, the rules system handles this
        return false;
      }

      return getExportCount(exportType) >= limit;
    },
    [user, getExportCount]
  );

  return {
    exportCounts,
    trackExport,
    resetDailyCounts,
    getExportCount,
    isExportLimitReached,
  };
};

export default useExportTracking;

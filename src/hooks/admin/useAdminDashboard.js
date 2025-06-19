import { useState, useEffect, useCallback, useMemo } from "react";
import { loadOptimizedDashboardData } from "../../services/AdminOptimizedService";

/**
 * Custom hook for managing admin dashboard state and operations
 *
 * This hook handles:
 * - System statistics (users, binders, cards, rules)
 * - Dashboard refresh functionality
 * - Cache management
 * - Error handling
 *
 * @returns {Object} Dashboard state and operations
 */
export const useAdminDashboard = () => {
  // Dashboard state
  const [systemStats, setSystemStats] = useState({
    totalUsers: 1,
    totalBinders: 0,
    totalCards: 0,
    activeRules: 0,
  });

  const [lastRefresh, setLastRefresh] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Calculate system statistics from provided data
   * @param {Object} data - Dashboard data containing users, rules, etc.
   * @returns {Object} Calculated system statistics
   */
  const calculateSystemStats = useCallback((data) => {
    try {
      const { users = [], rules = [], userStats = {} } = data;

      // Calculate totals from user data
      const totalBinders = users.reduce(
        (sum, user) => sum + (user.binderCount || 0),
        0
      );
      const totalCards = users.reduce(
        (sum, user) => sum + (user.cardCount || 0),
        0
      );
      const activeRules = rules.filter((rule) => rule.enabled).length;

      return {
        totalUsers: userStats.total || users.length || 1,
        totalBinders,
        totalCards,
        activeRules,
      };
    } catch (error) {
      console.error("Error calculating system stats:", error);
      return {
        totalUsers: 1,
        totalBinders: 0,
        totalCards: 0,
        activeRules: 0,
      };
    }
  }, []);

  /**
   * Refresh dashboard data
   * @param {boolean} forceRefresh - Force refresh ignoring cache
   * @returns {Promise<Object>} Dashboard data
   */
  const refreshDashboard = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsRefreshing(true);
        setDashboardError(null);

        // Load optimized dashboard data
        const dashboardData = await loadOptimizedDashboardData(forceRefresh);

        if (!dashboardData) {
          throw new Error("No dashboard data received");
        }

        // Calculate and update system statistics
        const newStats = calculateSystemStats(dashboardData);
        setSystemStats(newStats);

        // Update refresh timestamp
        setLastRefresh(new Date());

        // Mark as initialized after first successful load
        if (!isInitialized) {
          setIsInitialized(true);
        }

        console.log("✅ Dashboard refreshed successfully", {
          stats: newStats,
          timestamp: new Date().toISOString(),
          forceRefresh,
        });

        return dashboardData;
      } catch (error) {
        console.error("Error refreshing dashboard:", error);
        setDashboardError(error.message || "Failed to refresh dashboard");
        throw error;
      } finally {
        setIsRefreshing(false);
      }
    },
    [calculateSystemStats, isInitialized]
  );

  /**
   * Initialize dashboard on mount
   */
  useEffect(() => {
    if (!isInitialized) {
      refreshDashboard(false).catch((error) => {
        console.warn("Initial dashboard load failed:", error);
      });
    }
  }, [refreshDashboard, isInitialized]);

  /**
   * Auto-refresh dashboard periodically (every 5 minutes)
   */
  useEffect(() => {
    if (!isInitialized) return;

    const autoRefreshInterval = setInterval(() => {
      refreshDashboard(false).catch((error) => {
        console.warn("Auto-refresh failed:", error);
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(autoRefreshInterval);
  }, [refreshDashboard, isInitialized]);

  /**
   * Formatted last refresh time
   */
  const formattedLastRefresh = useMemo(() => {
    if (!lastRefresh) return null;

    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(lastRefresh);
    } catch (error) {
      return lastRefresh.toLocaleTimeString();
    }
  }, [lastRefresh]);

  /**
   * Dashboard status indicator
   */
  const dashboardStatus = useMemo(() => {
    if (isRefreshing) return "refreshing";
    if (dashboardError) return "error";
    if (!isInitialized) return "initializing";
    return "ready";
  }, [isRefreshing, dashboardError, isInitialized]);

  /**
   * Clear dashboard error
   */
  const clearError = useCallback(() => {
    setDashboardError(null);
  }, []);

  /**
   * Manual refresh with force option
   */
  const forceRefresh = useCallback(() => {
    return refreshDashboard(true);
  }, [refreshDashboard]);

  return {
    // State
    systemStats,
    lastRefresh,
    formattedLastRefresh,
    isRefreshing,
    dashboardError,
    isInitialized,
    dashboardStatus,

    // Actions
    refreshDashboard,
    forceRefresh,
    clearError,
    calculateSystemStats,
  };
};

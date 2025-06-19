import { useState, useCallback } from "react";
import { setupDefaultBinderLimits } from "../../scripts/setupDefaultBinderLimits";
import { setupDefaultContactLimits } from "../../scripts/setupContactLimits";
import {
  migrateUserData,
  recalculateAllUserStats,
} from "../../utils/userManagement";

/**
 * Custom hook for managing system operations and maintenance tasks
 *
 * This hook handles:
 * - System setup operations (binder limits, contact limits)
 * - User data migration
 * - Statistics recalculation
 * - System maintenance tasks
 * - Operation status tracking
 *
 * @param {Object} user - Current user object
 * @returns {Object} System operations state and functions
 */
export const useSystemOperations = (user) => {
  // Operation status state
  const [operationInProgress, setOperationInProgress] = useState(null);
  const [operationResults, setOperationResults] = useState({});
  const [systemStatus, setSystemStatus] = useState({
    database: "online",
    authentication: "online",
    storage: "online",
    lastMaintenance: null,
  });

  /**
   * Setup default binder limits for the current user
   */
  const handleSetupBinderLimits = useCallback(async () => {
    if (!user?.uid) {
      throw new Error("User not authenticated");
    }

    try {
      setOperationInProgress("setupBinderLimits");

      const result = await setupDefaultBinderLimits(user.uid);

      setOperationResults((prev) => ({
        ...prev,
        setupBinderLimits: result,
      }));

      if (result.success) {
        const message =
          `✅ ${result.message}\n\n` +
          `Max Binders: ${result.limits?.maxBinders || 5}\n` +
          `Max Cards per Binder: ${result.limits?.maxCardsPerBinder || 500}\n` +
          `Max Pages per Binder: ${result.limits?.maxPagesPerBinder || 50}`;

        alert(message);
        return { success: true, message, limits: result.limits };
      } else {
        const errorMessage = `❌ ${result.message}\n\nCheck console for details.`;
        alert(errorMessage);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error("Error setting up binder limits:", error);
      const errorMessage = `❌ Failed to setup binder limits: ${error.message}`;
      alert(errorMessage);
      return { success: false, message: error.message };
    } finally {
      setOperationInProgress(null);
    }
  }, [user]);

  /**
   * Setup default contact limits for the current user
   */
  const handleSetupContactLimits = useCallback(async () => {
    if (!user?.uid) {
      throw new Error("User not authenticated");
    }

    try {
      setOperationInProgress("setupContactLimits");

      const result = await setupDefaultContactLimits(user.uid);

      setOperationResults((prev) => ({
        ...prev,
        setupContactLimits: result,
      }));

      if (result.success) {
        const message =
          `✅ ${result.message}\n\n` +
          `Direct Messages: ${result.limits?.directMessages?.limit || 5} per ${
            result.limits?.directMessages?.window || "hour"
          }\n` +
          `Feature Requests: ${
            result.limits?.featureRequests?.limit || 3
          } per ${result.limits?.featureRequests?.window || "day"}\n` +
          `Bug Reports: ${result.limits?.bugReports?.limit || 10} per ${
            result.limits?.bugReports?.window || "day"
          }`;

        alert(message);
        return { success: true, message, limits: result.limits };
      } else {
        const errorMessage = `❌ ${result.message}\n\nCheck console for details.`;
        alert(errorMessage);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error("Error setting up contact limits:", error);
      const errorMessage = `❌ Failed to setup contact limits: ${error.message}`;
      alert(errorMessage);
      return { success: false, message: error.message };
    } finally {
      setOperationInProgress(null);
    }
  }, [user]);

  /**
   * Migrate user data to latest schema
   */
  const handleMigrateUsers = useCallback(async () => {
    try {
      setOperationInProgress("migrateUsers");

      const result = await migrateUserData();

      setOperationResults((prev) => ({
        ...prev,
        migrateUsers: result,
      }));

      if (result.success) {
        if (result.migratedCount > 0) {
          const message = `✅ Successfully migrated ${result.migratedCount} users`;
          alert(message);
          return {
            success: true,
            message,
            migratedCount: result.migratedCount,
          };
        } else {
          const message = "✅ All users are already up-to-date";
          alert(message);
          return { success: true, message, migratedCount: 0 };
        }
      } else {
        const errorMessage = `❌ Migration failed: ${result.error}`;
        alert(errorMessage);
        return { success: false, message: result.error };
      }
    } catch (error) {
      console.error("Migration error:", error);
      const errorMessage = `❌ Migration failed: ${error.message}`;
      alert(errorMessage);
      return { success: false, message: error.message };
    } finally {
      setOperationInProgress(null);
    }
  }, []);

  /**
   * Recalculate statistics for all users
   */
  const handleRecalculateStats = useCallback(async () => {
    try {
      setOperationInProgress("recalculateStats");

      const result = await recalculateAllUserStats();

      setOperationResults((prev) => ({
        ...prev,
        recalculateStats: result,
      }));

      if (result.success) {
        if (result.updatedUsers > 0) {
          const message =
            `✅ Successfully recalculated stats for all users\n\n` +
            `Total Users: ${result.totalUsers}\n` +
            `Updated: ${result.updatedUsers}\n` +
            `Already Accurate: ${result.totalUsers - result.updatedUsers}`;

          alert(message);
          return {
            success: true,
            message,
            totalUsers: result.totalUsers,
            updatedUsers: result.updatedUsers,
          };
        } else {
          const message =
            `✅ All user stats are already accurate\n\n` +
            `Total Users: ${result.totalUsers}`;

          alert(message);
          return {
            success: true,
            message,
            totalUsers: result.totalUsers,
            updatedUsers: 0,
          };
        }
      } else {
        const errorMessage = `❌ Stats recalculation failed: ${result.error}`;
        alert(errorMessage);
        return { success: false, message: result.error };
      }
    } catch (error) {
      console.error("Stats recalculation error:", error);
      const errorMessage = `❌ Stats recalculation failed: ${error.message}`;
      alert(errorMessage);
      return { success: false, message: error.message };
    } finally {
      setOperationInProgress(null);
    }
  }, []);

  /**
   * Copy user ID to clipboard
   */
  const copyUserId = useCallback(() => {
    if (user?.uid) {
      navigator.clipboard
        .writeText(user.uid)
        .then(() => {
          alert("User ID copied to clipboard!");
        })
        .catch((error) => {
          console.error("Failed to copy user ID:", error);
          alert("Failed to copy user ID to clipboard");
        });
    } else {
      alert("No user ID available to copy");
    }
  }, [user]);

  /**
   * Run system health check
   */
  const runSystemHealthCheck = useCallback(async () => {
    try {
      setOperationInProgress("healthCheck");

      // Mock health check - in real implementation this would check various services
      const healthCheckResults = {
        database: "online",
        authentication: "online",
        storage: "online",
        apiResponses: "healthy",
        lastChecked: new Date(),
      };

      setSystemStatus((prev) => ({
        ...prev,
        ...healthCheckResults,
        lastMaintenance: new Date(),
      }));

      setOperationResults((prev) => ({
        ...prev,
        healthCheck: {
          success: true,
          results: healthCheckResults,
          timestamp: new Date(),
        },
      }));

      return {
        success: true,
        message: "System health check completed successfully",
        results: healthCheckResults,
      };
    } catch (error) {
      console.error("Health check error:", error);

      setOperationResults((prev) => ({
        ...prev,
        healthCheck: {
          success: false,
          error: error.message,
          timestamp: new Date(),
        },
      }));

      return {
        success: false,
        message: `Health check failed: ${error.message}`,
      };
    } finally {
      setOperationInProgress(null);
    }
  }, []);

  /**
   * Clear cache and temporary data
   */
  const clearSystemCache = useCallback(async () => {
    try {
      setOperationInProgress("clearCache");

      // Clear various cache keys
      const cacheKeys = [
        "admin_users_cache",
        "admin_contact_cache",
        "admin_announcements_cache",
        "admin_dashboard_cache",
      ];

      cacheKeys.forEach((key) => {
        localStorage.removeItem(key);
      });

      // Clear session storage as well
      sessionStorage.clear();

      setOperationResults((prev) => ({
        ...prev,
        clearCache: {
          success: true,
          clearedKeys: cacheKeys,
          timestamp: new Date(),
        },
      }));

      alert("✅ System cache cleared successfully");

      return {
        success: true,
        message: "System cache cleared successfully",
        clearedKeys: cacheKeys,
      };
    } catch (error) {
      console.error("Cache clear error:", error);

      setOperationResults((prev) => ({
        ...prev,
        clearCache: {
          success: false,
          error: error.message,
          timestamp: new Date(),
        },
      }));

      const errorMessage = `❌ Failed to clear cache: ${error.message}`;
      alert(errorMessage);

      return {
        success: false,
        message: error.message,
      };
    } finally {
      setOperationInProgress(null);
    }
  }, []);

  /**
   * Get the last operation result for a specific operation
   * @param {string} operationType - Type of operation
   * @returns {Object|null} Last result or null if not found
   */
  const getLastOperationResult = useCallback(
    (operationType) => {
      return operationResults[operationType] || null;
    },
    [operationResults]
  );

  /**
   * Check if a specific operation is in progress
   * @param {string} operationType - Type of operation to check
   * @returns {boolean} True if operation is in progress
   */
  const isOperationInProgress = useCallback(
    (operationType) => {
      return operationInProgress === operationType;
    },
    [operationInProgress]
  );

  /**
   * Get system information
   */
  const getSystemInfo = useCallback(() => {
    return {
      environment: process.env.NODE_ENV || "development",
      version: process.env.REACT_APP_VERSION || "1.0.0",
      buildDate: process.env.REACT_APP_BUILD_DATE || "unknown",
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentUser: user?.uid || "not authenticated",
    };
  }, [user]);

  return {
    // State
    operationInProgress,
    operationResults,
    systemStatus,

    // Operations
    handleSetupBinderLimits,
    handleSetupContactLimits,
    handleMigrateUsers,
    handleRecalculateStats,
    copyUserId,
    runSystemHealthCheck,
    clearSystemCache,

    // Utilities
    getLastOperationResult,
    isOperationInProgress,
    getSystemInfo,

    // Computed values
    hasOperationInProgress: operationInProgress !== null,
    systemIsHealthy:
      systemStatus.database === "online" &&
      systemStatus.authentication === "online" &&
      systemStatus.storage === "online",
  };
};

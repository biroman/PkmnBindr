import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchAllUsersWithStatsAsAdmin,
  updateUserRole,
  updateUserStatus,
  updateUserStats,
  migrateUserData,
  recalculateAllUserStats,
} from "../../utils/userManagement";

// Cache utilities (these should eventually be moved to useAdminCache)
const CACHE_KEYS = {
  USERS: "admin_users_cache",
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error reading cache:", error);
    localStorage.removeItem(key);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error("Error setting cache:", error);
  }
};

/**
 * Custom hook for managing user operations in admin panel
 *
 * This hook handles:
 * - User data loading and caching
 * - User statistics calculation
 * - User actions (ban, suspend, role changes, etc.)
 * - Filtering and pagination
 * - Error handling and loading states
 *
 * @returns {Object} User management state and operations
 */
export const useUserManagement = () => {
  // User data state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userError, setUserError] = useState(null);

  // User statistics
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    lastWeekSignups: 0,
  });

  // UI state
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [recalculatingStats, setRecalculatingStats] = useState(false);

  /**
   * Calculate user statistics from user array
   * @param {Array} allUsers - Array of all users
   * @returns {Object} Calculated statistics
   */
  const calculateUserStats = useCallback((allUsers) => {
    try {
      return {
        total: allUsers.length,
        active: allUsers.filter((u) => u.status === "active").length,
        inactive: allUsers.filter((u) => u.status !== "active").length,
        admins: allUsers.filter((u) => u.role === "admin" || u.role === "owner")
          .length,
        lastWeekSignups: allUsers.filter((u) => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(u.createdAt) > weekAgo;
        }).length,
      };
    } catch (error) {
      console.error("Error calculating user stats:", error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        admins: 0,
        lastWeekSignups: 0,
      };
    }
  }, []);

  /**
   * Load users with caching and filtering
   * @param {Object} options - Loading options
   * @returns {Promise<Array>} Loaded users
   */
  const loadUsers = useCallback(
    async (options = {}) => {
      const { forceRefresh = false, resetStats = false } = options;

      try {
        setUsersLoading(true);
        setUserError(null);

        // Check cache first (unless force refresh)
        let allUsers = null;
        if (!forceRefresh) {
          allUsers = getCachedData(CACHE_KEYS.USERS);
        }

        // If no cached data or force refresh, fetch from server
        if (!allUsers) {
          allUsers = await fetchAllUsersWithStatsAsAdmin();
          setCachedData(CACHE_KEYS.USERS, allUsers);
        }

        // Calculate user statistics
        const stats = calculateUserStats(allUsers);

        if (resetStats || !userStats.total) {
          setUserStats(stats);
        }

        // Store all users (filtering will be done in useMemo)
        setUsers(allUsers);

        // Run migration if needed (only on first load)
        if (!forceRefresh && allUsers.length > 0) {
          const migrationResult = await migrateUserData();
          if (migrationResult.success && migrationResult.migratedCount > 0) {
            console.log(`Migrated ${migrationResult.migratedCount} users`);
            // Reload after migration
            return loadUsers({ forceRefresh: true });
          }
        }

        return allUsers;
      } catch (error) {
        console.error("Error fetching users:", error);
        setUserError(error.message || "Failed to load users");
        setUsers([]);
        return [];
      } finally {
        setUsersLoading(false);
      }
    },
    [calculateUserStats, userStats.total]
  );

  /**
   * Handle user actions (ban, suspend, role changes, etc.)
   * @param {string} userId - User ID
   * @param {string} action - Action to perform
   * @param {*} additionalData - Additional data for the action
   */
  const handleUserAction = useCallback(
    async (userId, action, additionalData = null) => {
      const userData = users.find((u) => u.uid === userId);
      if (!userData) {
        console.error("User not found:", userId);
        return;
      }

      const confirmMessages = {
        ban: `Ban ${userData.displayName}? This will prevent them from accessing the application.`,
        unban: `Unban ${userData.displayName}? This will restore their access.`,
        suspend: `Suspend ${userData.displayName} for ${
          additionalData || "7 days"
        }?`,
        unsuspend: `Remove suspension from ${userData.displayName}?`,
        resetPassword: `Send password reset email to ${userData.displayName}?`,
        deleteAccount: `DELETE account for ${userData.displayName}? This action cannot be undone and will remove all their data.`,
        makeAdmin: `Grant administrator privileges to ${userData.displayName}?`,
        removeAdmin: `Remove administrator privileges from ${userData.displayName}?`,
        sendNotification: `Send notification to ${userData.displayName}?`,
        exportData: `Export all data for ${userData.displayName}?`,
      };

      if (confirmMessages[action] && !window.confirm(confirmMessages[action])) {
        setActiveDropdown(null);
        return;
      }

      try {
        setActionLoading(`${userId}-${action}`);

        switch (action) {
          case "ban":
            await updateUserStatus(userId, "banned");
            break;
          case "unban":
            await updateUserStatus(userId, "active");
            break;
          case "suspend":
            await updateUserStatus(userId, "suspended");
            break;
          case "unsuspend":
            await updateUserStatus(userId, "active");
            break;
          case "resetPassword":
            // Mock implementation - in real app would trigger Firebase password reset
            console.log(`Password reset triggered for ${userData.email}`);
            break;
          case "deleteAccount":
            // Mock implementation - in real app would trigger account deletion
            console.log(
              `Account deletion triggered for ${userData.displayName}`
            );
            break;
          case "makeAdmin":
            await updateUserRole(userId, "admin");
            break;
          case "removeAdmin":
            await updateUserRole(userId, "user");
            break;
          case "sendNotification":
            const message = prompt("Enter notification message:");
            if (message) {
              console.log(
                `Notification sent to ${userData.displayName}: "${message}"`
              );
            }
            break;
          case "exportData":
            console.log(`Data export initiated for ${userData.displayName}`);
            break;
          case "refreshStats":
            await handleRefreshUserStats(userId);
            return; // Early return to avoid reload
          case "impersonate":
            if (
              window.confirm(
                `Impersonate ${userData.displayName}? This will log you in as this user for support purposes.`
              )
            ) {
              console.log(`Impersonating ${userData.displayName}`);
            }
            break;
          default:
            console.warn("Unknown action:", action);
            return;
        }

        // Reload users to reflect changes
        await loadUsers({ forceRefresh: true });
        setActiveDropdown(null);
      } catch (error) {
        console.error("User action error:", error);
        setUserError(`Action failed: ${error.message}`);
      } finally {
        setActionLoading(null);
      }
    },
    [users, loadUsers]
  );

  /**
   * Refresh stats for a specific user
   * @param {string} userId - User ID
   */
  const handleRefreshUserStats = useCallback(
    async (userId) => {
      try {
        const userData = users.find((u) => u.uid === userId);
        if (!userData) {
          throw new Error("User not found");
        }

        setActionLoading(`${userId}-refreshStats`);

        // Import the required function for admin stats calculation
        const { calculateUserStatsAsAdmin } = await import(
          "../../utils/userManagement"
        );

        // Recalculate stats for the specific user
        const newStats = await calculateUserStatsAsAdmin(userId);

        if (newStats) {
          // Update the user's stats in Firestore
          const updateSuccess = await updateUserStats(
            userId,
            newStats.binderCount,
            newStats.cardCount
          );

          if (updateSuccess) {
            // Update local user data
            const updatedUsers = users.map((u) => {
              if (u.uid === userId) {
                return {
                  ...u,
                  binderCount: newStats.binderCount,
                  cardCount: newStats.cardCount,
                  usingStoredStats: false,
                  storedBinderCount: newStats.binderCount,
                  storedCardCount: newStats.cardCount,
                };
              }
              return u;
            });

            setUsers(updatedUsers);

            console.log(`✅ Stats refreshed for ${userData.displayName}`, {
              binders: newStats.binderCount,
              cards: newStats.cardCount,
            });
          } else {
            throw new Error("Failed to save updated stats to database");
          }
        } else {
          throw new Error(
            "Failed to calculate user stats - permission denied or user has no data"
          );
        }

        setActiveDropdown(null);
      } catch (error) {
        console.error("Error refreshing user stats:", error);
        setUserError(`Failed to refresh stats: ${error.message}`);
      } finally {
        setActionLoading(null);
      }
    },
    [users]
  );

  /**
   * Recalculate stats for all users
   */
  const handleRecalculateAllStats = useCallback(async () => {
    try {
      setRecalculatingStats(true);
      setUserError(null);

      const result = await recalculateAllUserStats();

      if (result.success) {
        console.log(`✅ Recalculated stats for all users`, {
          totalUsers: result.totalUsers,
          updatedUsers: result.updatedUsers,
        });

        // Reload users with fresh stats
        await loadUsers({ forceRefresh: true, resetStats: true });
      } else {
        throw new Error(result.error || "Failed to recalculate stats");
      }
    } catch (error) {
      console.error("Stats recalculation error:", error);
      setUserError(`Stats recalculation failed: ${error.message}`);
    } finally {
      setRecalculatingStats(false);
    }
  }, [loadUsers]);

  /**
   * View user details in modal
   * @param {string} userId - User ID
   */
  const handleViewUserDetails = useCallback(
    async (userId) => {
      const userData = users.find((u) => u.uid === userId);
      if (userData) {
        // Mock additional user details that would be fetched
        const detailedUser = {
          ...userData,
          loginHistory: [
            { date: new Date(), ip: "192.168.1.1", location: "Oslo, Norway" },
            {
              date: new Date(Date.now() - 86400000),
              ip: "10.0.0.1",
              location: "Bergen, Norway",
            },
          ],
          recentActivity: [
            {
              action: "Created binder",
              timestamp: new Date(),
              details: '"My Pokemon Collection"',
            },
            {
              action: "Added cards",
              timestamp: new Date(Date.now() - 3600000),
              details: '15 cards to "Rare Collection"',
            },
          ],
          deviceInfo: {
            lastDevice: "Windows 11 - Chrome 120",
            platforms: ["Web", "Mobile"],
          },
        };
        setSelectedUserDetails(detailedUser);
        setShowUserModal(true);
      }
    },
    [users]
  );

  /**
   * Close user details modal
   */
  const closeUserModal = useCallback(() => {
    setShowUserModal(false);
    setSelectedUserDetails(null);
  }, []);

  /**
   * Clear user error
   */
  const clearUserError = useCallback(() => {
    setUserError(null);
  }, []);

  /**
   * Load users on mount
   */
  useEffect(() => {
    loadUsers({ resetStats: true });
  }, []);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        activeDropdown &&
        !event.target.closest("[data-dropdown-container]")
      ) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  return {
    // State
    users,
    usersLoading,
    userError,
    userStats,
    selectedUserDetails,
    showUserModal,
    actionLoading,
    activeDropdown,
    recalculatingStats,

    // Actions
    loadUsers,
    handleUserAction,
    handleRefreshUserStats,
    handleRecalculateAllStats,
    handleViewUserDetails,
    closeUserModal,
    clearUserError,
    setActiveDropdown,

    // Computed values
    hasUsers: users.length > 0,
    isActionInProgress: actionLoading !== null,
  };
};

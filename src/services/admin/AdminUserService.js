import {
  fetchAllUsersWithStatsAsAdmin,
  updateUserRole,
  updateUserStatus,
  updateUserStats,
  migrateUserData,
  recalculateAllUserStats,
} from "../../utils/userManagement";
import { AdminCacheService, CACHE_KEYS } from "./AdminCacheService";
import { AdminOptimizedService } from "../AdminOptimizedService";

/**
 * AdminUserService - Centralized user management operations
 *
 * Features:
 * - User CRUD operations with caching
 * - Advanced filtering and pagination
 * - Batch operations for multiple users
 * - User statistics calculation
 * - Data migration and repair tools
 */

export class AdminUserService {
  /**
   * Load users with advanced filtering and pagination
   */
  static async loadUsers(options = {}) {
    const {
      page = 1,
      limit = 20,
      searchTerm = "",
      filterRole = "all",
      filterStatus = "all",
      sortBy = "createdAt",
      sortOrder = "desc",
      forceRefresh = false,
      resetStats = false,
    } = options;

    try {
      // Check cache first (unless force refresh)
      let allUsers = null;
      if (!forceRefresh) {
        allUsers = AdminCacheService.getCachedData(CACHE_KEYS.USERS);
      }

      // If no cached data or force refresh, fetch from server
      if (!allUsers) {
        allUsers = await fetchAllUsersWithStatsAsAdmin();
        AdminCacheService.setCachedData(CACHE_KEYS.USERS, allUsers);
      }

      // Calculate user statistics
      const stats = this.calculateUserStats(allUsers);

      // Apply filters
      const filteredUsers = this.applyFilters(allUsers, {
        searchTerm,
        filterRole,
        filterStatus,
      });

      // Apply sorting
      const sortedUsers = this.applySorting(filteredUsers, sortBy, sortOrder);

      // Apply pagination
      const paginatedResult = this.applyPagination(sortedUsers, page, limit);

      return {
        users: paginatedResult.users,
        totalUsers: filteredUsers.length,
        totalPages: paginatedResult.totalPages,
        currentPage: page,
        stats: resetStats ? stats : undefined,
      };
    } catch (error) {
      console.error("Error loading users:", error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive user statistics
   */
  static calculateUserStats(users) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      inactive: users.filter((u) => u.status !== "active").length,
      admins: users.filter((u) => u.role === "admin" || u.role === "owner")
        .length,
      lastWeekSignups: users.filter((u) => {
        const createdAt = new Date(u.createdAt?.toDate?.() || u.createdAt);
        return createdAt > weekAgo;
      }).length,
      lastMonthSignups: users.filter((u) => {
        const createdAt = new Date(u.createdAt?.toDate?.() || u.createdAt);
        return createdAt > monthAgo;
      }).length,
      totalBinders: users.reduce((sum, u) => sum + (u.binderCount || 0), 0),
      totalCards: users.reduce((sum, u) => sum + (u.cardCount || 0), 0),
    };
  }

  /**
   * Apply advanced filters to user list
   */
  static applyFilters(users, { searchTerm, filterRole, filterStatus }) {
    return users.filter((user) => {
      // Search filter
      const matchesSearch =
        searchTerm === "" ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.uid.toLowerCase().includes(searchTerm.toLowerCase());

      // Role filter
      const matchesRole = filterRole === "all" || user.role === filterRole;

      // Status filter
      const matchesStatus =
        filterStatus === "all" || user.status === filterStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  /**
   * Apply sorting to user list
   */
  static applySorting(users, sortBy, sortOrder) {
    return [...users].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date fields
      if (sortBy === "createdAt" || sortBy === "lastLogin") {
        aValue = new Date(aValue?.toDate?.() || aValue || 0);
        bValue = new Date(bValue?.toDate?.() || bValue || 0);
      }

      // Handle string fields
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = (bValue || "").toLowerCase();
      }

      // Handle numeric fields
      if (typeof aValue === "number") {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }

  /**
   * Apply pagination to user list
   */
  static applyPagination(users, page, limit) {
    const totalPages = Math.ceil(users.length / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      totalPages,
    };
  }

  /**
   * Perform user action (role change, status toggle, etc.)
   */
  static async performUserAction(userId, action, additionalData = null) {
    try {
      let result = null;

      switch (action) {
        case "changeRole":
          result = await updateUserRole(userId, additionalData.newRole);
          break;
        case "toggleStatus":
          result = await updateUserStatus(userId, additionalData.newStatus);
          break;
        case "refreshStats":
          result = await this.refreshUserStats(userId, additionalData.user);
          break;
        case "viewDetails":
          // This will be handled by the UI component
          result = { success: true };
          break;
        case "migrateData":
          result = await migrateUserData(userId);
          break;
        default:
          throw new Error(`Unknown user action: ${action}`);
      }

      // Update cache with the modified user data
      if (result && action !== "viewDetails") {
        this.updateUserInCache(userId, result);
      }

      return result;
    } catch (error) {
      console.error(`Error performing user action ${action}:`, error);
      throw error;
    }
  }

  /**
   * Update specific user in cache
   */
  static updateUserInCache(userId, updatedData) {
    AdminCacheService.updateCachedData(CACHE_KEYS.USERS, (cachedUsers) => {
      return cachedUsers.map((user) =>
        user.uid === userId ? { ...user, ...updatedData } : user
      );
    });
  }

  /**
   * Batch operations for multiple users
   */
  static async performBatchUserAction(userIds, action, additionalData = null) {
    try {
      const results = [];
      const errors = [];

      // Process in chunks to avoid overwhelming the server
      const chunkSize = 10;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);

        const chunkPromises = chunk.map(async (userId) => {
          try {
            const result = await this.performUserAction(
              userId,
              action,
              additionalData
            );
            return { userId, success: true, result };
          } catch (error) {
            return { userId, success: false, error: error.message };
          }
        });

        const chunkResults = await Promise.all(chunkPromises);

        chunkResults.forEach((result) => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
          }
        });
      }

      return { results, errors };
    } catch (error) {
      console.error("Error performing batch user action:", error);
      throw error;
    }
  }

  /**
   * Refresh individual user statistics
   */
  static async refreshUserStats(userId, userData) {
    try {
      // Import the required function for admin stats calculation
      const { calculateUserStatsAsAdmin, updateUserStats } = await import(
        "../../utils/userManagement"
      );

      // Recalculate stats for the specific user using admin privileges
      const newStats = await calculateUserStatsAsAdmin(userId);

      if (newStats) {
        // Update the user's stats in Firestore
        const updateSuccess = await updateUserStats(
          userId,
          newStats.binderCount,
          newStats.cardCount
        );

        if (updateSuccess) {
          const updatedUser = {
            binderCount: newStats.binderCount,
            cardCount: newStats.cardCount,
            usingStoredStats: false, // Mark as fresh stats
            storedBinderCount: newStats.binderCount,
            storedCardCount: newStats.cardCount,
          };

          // Update cache
          this.updateUserInCache(userId, updatedUser);

          return {
            success: true,
            message: `Stats refreshed for ${userData.displayName}\n\nBinders: ${
              newStats.binderCount
            }\nCards: ${
              newStats.cardCount
            }\nLast Updated: ${new Date().toLocaleString()}`,
            updatedUser,
          };
        } else {
          return {
            success: false,
            error: "Failed to save updated stats to database",
          };
        }
      } else {
        return {
          success: false,
          error:
            "Failed to calculate user stats - permission denied or user has no data",
        };
      }
    } catch (error) {
      console.error("Error refreshing user stats:", error);
      return {
        success: false,
        error: `Failed to refresh stats: ${error.message}`,
      };
    }
  }

  /**
   * Recalculate all user statistics
   */
  static async recalculateAllUserStats() {
    try {
      const result = await recalculateAllUserStats();

      // Clear cache to force fresh data on next load
      AdminCacheService.clearCache(CACHE_KEYS.USERS);

      return result;
    } catch (error) {
      console.error("Error recalculating user stats:", error);
      throw error;
    }
  }

  /**
   * Export user data for backup/analysis
   */
  static async exportUserData(userId = null, format = "json") {
    try {
      let users;

      if (userId) {
        // Export single user
        const allUsers = await this.loadUsers({ forceRefresh: true });
        users = allUsers.users.filter((u) => u.uid === userId);
      } else {
        // Export all users
        const result = await this.loadUsers({
          forceRefresh: true,
          limit: 10000, // Large limit to get all users
        });
        users = result.users;
      }

      if (format === "csv") {
        return this.convertToCSV(users);
      }

      return JSON.stringify(users, null, 2);
    } catch (error) {
      console.error("Error exporting user data:", error);
      throw error;
    }
  }

  /**
   * Convert user data to CSV format
   */
  static convertToCSV(users) {
    if (users.length === 0) return "";

    const headers = [
      "uid",
      "email",
      "displayName",
      "role",
      "status",
      "createdAt",
      "lastLogin",
      "binderCount",
      "cardCount",
    ];

    const csvData = users.map((user) => {
      return headers.map((header) => {
        let value = user[header];

        if (header === "createdAt" || header === "lastLogin") {
          value = value
            ? new Date(value.toDate?.() || value).toISOString()
            : "";
        }

        // Escape commas and quotes
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value || "";
      });
    });

    return [headers.join(","), ...csvData.map((row) => row.join(","))].join(
      "\n"
    );
  }

  /**
   * Get user activity insights
   */
  static async getUserActivityInsights() {
    try {
      const { users } = await this.loadUsers({
        forceRefresh: true,
        limit: 10000,
      });
      const now = new Date();

      const insights = {
        dailySignups: this.getSignupsByPeriod(users, 1),
        weeklySignups: this.getSignupsByPeriod(users, 7),
        monthlySignups: this.getSignupsByPeriod(users, 30),
        activeUsers: users.filter((u) => u.status === "active").length,
        inactiveUsers: users.filter((u) => u.status !== "active").length,
        topUsersByBinders: users
          .sort((a, b) => (b.binderCount || 0) - (a.binderCount || 0))
          .slice(0, 10),
        topUsersByCards: users
          .sort((a, b) => (b.cardCount || 0) - (a.cardCount || 0))
          .slice(0, 10),
      };

      return insights;
    } catch (error) {
      console.error("Error getting user activity insights:", error);
      throw error;
    }
  }

  /**
   * Get signups by period (last N days)
   */
  static getSignupsByPeriod(users, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return users.filter((user) => {
      const createdAt = new Date(user.createdAt?.toDate?.() || user.createdAt);
      return createdAt > cutoff;
    }).length;
  }
}

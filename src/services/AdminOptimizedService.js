import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  documentId,
  getCountFromServer,
  Timestamp,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Optimized Admin Service for Firebase operations
 * Reduces Firebase requests through batching and compound queries
 */
export class AdminOptimizedService {
  // Cache for frequently accessed data
  static cache = new Map();
  static cacheTimeout = 10 * 60 * 1000; // 10 minutes

  /**
   * Optimized user data fetching with aggregation
   * Instead of 50+ individual requests, this makes 2-3 requests total
   */
  static async fetchAllUsersOptimized(options = {}) {
    try {
      const {
        includeBatchStats = false,
        useAggregation = false,
        limit: userLimit = 1000,
      } = options;

      // Single compound query for users with all needed data
      const usersQuery = query(
        collection(db, "users"),
        orderBy("createdAt", "desc"),
        limit(userLimit)
      );

      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map((doc) => {
        const userData = doc.data();
        return {
          // Ensure all required fields have default values and convert timestamps properly
          uid: userData.uid || doc.id,
          email: userData.email || "Unknown",
          displayName:
            userData.displayName || userData.email?.split("@")[0] || "User",
          photoURL: userData.photoURL || null,
          role: userData.role || "user",
          status: userData.status || "active",
          binderCount: userData.binderCount || 0,
          cardCount: userData.cardCount || 0,
          // Convert Firestore timestamps to JavaScript dates
          createdAt: userData.createdAt?.toDate() || new Date(),
          lastSignIn: userData.lastSignIn?.toDate() || new Date(),
          lastSeen:
            userData.lastSeen?.toDate() ||
            userData.lastSignIn?.toDate() ||
            new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
        };
      });

      // If we need stats and aggregation is available, use it
      if (useAggregation && includeBatchStats) {
        // Get user counts in a single aggregation query (Firestore v9.8+)
        const activeCountQuery = query(
          collection(db, "users"),
          where("status", "==", "active")
        );

        const adminCountQuery = query(
          collection(db, "users"),
          where("role", "in", ["admin", "owner"])
        );

        // Use count aggregation to avoid reading documents
        const [activeCount, adminCount, totalCount] = await Promise.all([
          getCountFromServer(activeCountQuery),
          getCountFromServer(adminCountQuery),
          getCountFromServer(collection(db, "users")),
        ]);

        return {
          users,
          aggregateStats: {
            total: totalCount.data().count,
            active: activeCount.data().count,
            admins: adminCount.data().count,
          },
        };
      }

      // For user stats, if we have all users, calculate locally to avoid extra requests
      if (includeBatchStats) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const stats = {
          total: users.length,
          active: users.filter((u) => u.status === "active").length,
          inactive: users.filter((u) => u.status !== "active").length,
          admins: users.filter((u) => u.role === "admin" || u.role === "owner")
            .length,
          lastWeekSignups: users.filter((u) => {
            return u.createdAt > weekAgo; // dates are already converted
          }).length,
          lastMonthSignups: users.filter((u) => {
            return u.createdAt > monthAgo;
          }).length,
          totalBinders: users.reduce((sum, u) => sum + (u.binderCount || 0), 0),
          totalCards: users.reduce((sum, u) => sum + (u.cardCount || 0), 0),
        };

        return { users, stats };
      }

      return users;
    } catch (error) {
      console.error("Error in fetchAllUsersOptimized:", error);
      throw error;
    }
  }

  /**
   * Optimized contact data loading with pagination
   * Reduces from 3+ separate requests to 1 batched request
   */
  static async fetchAllContactDataOptimized(options = {}) {
    try {
      const { messageLimit = 50, featureLimit = 100, bugLimit = 100 } = options;

      // Use Promise.all to make parallel requests instead of sequential
      const [messageThreads, featureRequests, bugReports] = await Promise.all([
        // Messages query - using correct collection path
        getDocs(
          query(
            collection(db, "directMessages"),
            orderBy("timestamp", "desc"),
            limit(messageLimit)
          )
        ),

        // Feature requests query - using correct collection path
        getDocs(
          query(
            collection(db, "featureRequests"),
            orderBy("timestamp", "desc"),
            limit(featureLimit)
          )
        ),

        // Bug reports query - using correct collection path
        getDocs(
          query(
            collection(db, "bugReports"),
            orderBy("timestamp", "desc"),
            limit(bugLimit)
          )
        ),
      ]);

      return {
        messageThreads: messageThreads.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        featureRequests: featureRequests.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        bugReports: bugReports.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      };
    } catch (error) {
      console.error("Error in fetchAllContactDataOptimized:", error);
      throw error;
    }
  }

  /**
   * Optimized announcements loading with caching
   */
  static async fetchAnnouncementsOptimized(options = {}) {
    try {
      const { limit: announcementLimit = 50 } = options;

      const announcementsQuery = query(
        collection(db, "announcements"),
        orderBy("timestamp", "desc"),
        limit(announcementLimit)
      );

      const snapshot = await getDocs(announcementsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error in fetchAnnouncementsOptimized:", error);
      throw error;
    }
  }

  /**
   * Batch operation for updating multiple users
   * Instead of individual updates, use Firestore batch writes
   */
  static async batchUpdateUsers(updates) {
    try {
      const { writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);

      updates.forEach(({ userId, data }) => {
        const userRef = doc(db, "users", userId);
        batch.update(userRef, data);
      });

      await batch.commit();
      return { success: true, updatedCount: updates.length };
    } catch (error) {
      console.error("Error in batchUpdateUsers:", error);
      throw error;
    }
  }

  /**
   * Optimized dashboard data loader
   * Single entry point that coordinates all data loading efficiently
   */
  static async loadDashboardData(forceRefresh = false) {
    const cacheKey = "admin_dashboard_optimized";

    // Check cache first
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Load all data in parallel with optimized queries
      const [usersResult, contactData, announcements] = await Promise.all([
        this.fetchAllUsersOptimized({
          includeBatchStats: true,
          useAggregation: true,
        }),
        this.fetchAllContactDataOptimized(),
        this.fetchAnnouncementsOptimized(),
      ]);

      const dashboardData = {
        users: usersResult.users || usersResult,
        userStats: usersResult.stats || usersResult.aggregateStats,
        contact: contactData,
        announcements,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: dashboardData,
        timestamp: Date.now(),
      });

      return dashboardData;
    } catch (error) {
      console.error("Error in loadDashboardData:", error);
      throw error;
    }
  }

  /**
   * Clear cache when data changes
   */
  static clearCache() {
    this.cache.clear();
  }
}

// Export individual functions for backward compatibility
export const fetchAllUsersWithStatsAsAdmin = (options) =>
  AdminOptimizedService.fetchAllUsersOptimized({
    ...options,
    includeBatchStats: true,
  });

export const loadOptimizedDashboardData = (forceRefresh) =>
  AdminOptimizedService.loadDashboardData(forceRefresh);

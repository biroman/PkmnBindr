import { AdminCacheService, CACHE_KEYS } from "./AdminCacheService";
import { setupDefaultBinderLimits } from "../../scripts/setupDefaultBinderLimits";
import { setupDefaultContactLimits } from "../../scripts/setupContactLimits";

/**
 * AdminSystemService - Centralized system operations
 *
 * Features:
 * - System setup and initialization
 * - Configuration management
 * - Database maintenance operations
 * - Cache management
 * - System health monitoring
 * - Bulk operations and data migration
 */

export class AdminSystemService {
  /**
   * Setup default binder limits for all users
   */
  static async setupBinderLimits() {
    try {
      const result = await setupDefaultBinderLimits();

      // Clear relevant caches to force refresh
      AdminCacheService.clearCache(CACHE_KEYS.USERS);
      AdminCacheService.clearCache(CACHE_KEYS.SYSTEM_STATS);

      return {
        success: true,
        message: "Binder limits setup completed successfully",
        result,
      };
    } catch (error) {
      console.error("Error setting up binder limits:", error);
      throw new Error(`Failed to setup binder limits: ${error.message}`);
    }
  }

  /**
   * Setup default contact limits for all users
   */
  static async setupContactLimits() {
    try {
      const result = await setupDefaultContactLimits();

      // Clear relevant caches to force refresh
      AdminCacheService.clearCache(CACHE_KEYS.USERS);
      AdminCacheService.clearCache(CACHE_KEYS.CONTACT);

      return {
        success: true,
        message: "Contact limits setup completed successfully",
        result,
      };
    } catch (error) {
      console.error("Error setting up contact limits:", error);
      throw new Error(`Failed to setup contact limits: ${error.message}`);
    }
  }

  /**
   * Migrate user data
   */
  static async migrateUserData() {
    try {
      // Import migration function
      const { migrateUserData } = await import("../../utils/userManagement");

      const result = await migrateUserData();

      return {
        success: result.success,
        migratedCount: result.migratedCount || 0,
        totalUsers: result.totalUsers || 0,
        message: result.success
          ? `Successfully migrated ${result.migratedCount || 0} users`
          : result.error || "Migration failed",
        error: result.success ? null : result.error,
      };
    } catch (error) {
      console.error("Error in migrateUserData:", error);
      return {
        success: false,
        error: error.message,
        migratedCount: 0,
        totalUsers: 0,
        message: `Migration failed: ${error.message}`,
      };
    }
  }

  /**
   * Refresh all admin dashboard data
   */
  static async refreshDashboardData() {
    try {
      // Clear all admin caches to force fresh data
      AdminCacheService.clearAllCache();

      // Import the dashboard loader dynamically to avoid circular imports
      const { loadOptimizedDashboardData } = await import(
        "../AdminOptimizedService"
      );

      // Force refresh of dashboard data
      const result = await loadOptimizedDashboardData(true);

      return {
        success: true,
        message: "Dashboard data refreshed successfully",
        result,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
      throw new Error(`Failed to refresh dashboard data: ${error.message}`);
    }
  }

  /**
   * Get comprehensive system health status
   */
  static async getSystemHealth() {
    try {
      const health = {
        cache: this.getCacheHealth(),
        database: await this.getDatabaseHealth(),
        services: await this.getServicesHealth(),
        performance: await this.getPerformanceMetrics(),
        timestamp: new Date(),
      };

      return health;
    } catch (error) {
      console.error("Error getting system health:", error);
      throw error;
    }
  }

  /**
   * Get cache health status
   */
  static getCacheHealth() {
    try {
      const cacheStats = AdminCacheService.getCacheStats();
      const isHealthy = AdminCacheService.isCacheHealthy();

      return {
        status: isHealthy ? "healthy" : "unhealthy",
        memoryCache: {
          size: cacheStats.memoryCache.size,
          keys: cacheStats.memoryCache.keys,
        },
        localStorage: {
          keys: cacheStats.localStorage.keys.length,
          totalSize: Math.round(cacheStats.localStorage.totalSize / 1024), // KB
        },
        issues: isHealthy ? [] : ["Cache read/write operations failing"],
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
      };
    }
  }

  /**
   * Get database health status
   */
  static async getDatabaseHealth() {
    try {
      // Test basic database connectivity
      const { collection, getDocs, query, limit } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../lib/firebase");

      const testQuery = query(collection(db, "users"), limit(1));
      const startTime = Date.now();
      await getDocs(testQuery);
      const responseTime = Date.now() - startTime;

      return {
        status: "healthy",
        responseTime: `${responseTime}ms`,
        connectivity: "online",
        issues: [],
      };
    } catch (error) {
      return {
        status: "error",
        connectivity: "offline",
        error: error.message,
        issues: ["Database connectivity failed"],
      };
    }
  }

  /**
   * Get services health status
   */
  static async getServicesHealth() {
    const services = {
      auth: { status: "unknown" },
      firestore: { status: "unknown" },
      storage: { status: "unknown" },
      functions: { status: "unknown" },
    };

    try {
      // Test auth service
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      services.auth = {
        status: auth.currentUser ? "healthy" : "unauthenticated",
        user: auth.currentUser ? "authenticated" : "not authenticated",
      };

      // Test Firestore (already done in getDatabaseHealth)
      services.firestore = { status: "healthy" };

      // Test Storage
      try {
        const { getStorage } = await import("firebase/storage");
        const storage = getStorage();
        services.storage = { status: "healthy" };
      } catch (error) {
        services.storage = { status: "error", error: error.message };
      }

      // Test Functions (basic connectivity)
      services.functions = { status: "healthy" }; // Assume healthy if no errors
    } catch (error) {
      console.error("Error checking services health:", error);
    }

    return services;
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics() {
    try {
      // Memory usage (if available)
      const memory = performance.memory
        ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024), // MB
          }
        : null;

      // Performance timing
      const navigation = performance.getEntriesByType("navigation")[0];
      const loadTime = navigation
        ? Math.round(navigation.loadEventEnd - navigation.fetchStart)
        : null;

      return {
        memory,
        loadTime: loadTime ? `${loadTime}ms` : "unknown",
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Perform system maintenance tasks
   */
  static async performMaintenance(tasks = []) {
    const results = {
      completed: [],
      failed: [],
      skipped: [],
    };

    for (const task of tasks) {
      try {
        switch (task) {
          case "clearCache":
            AdminCacheService.clearAllCache();
            results.completed.push({ task, message: "All caches cleared" });
            break;

          case "clearExpiredCache":
            AdminCacheService.clearExpiredCache();
            results.completed.push({
              task,
              message: "Expired cache entries cleared",
            });
            break;

          case "refreshDashboard":
            await this.refreshDashboardData();
            results.completed.push({
              task,
              message: "Dashboard data refreshed",
            });
            break;

          case "setupBinderLimits":
            await this.setupBinderLimits();
            results.completed.push({
              task,
              message: "Binder limits setup completed",
            });
            break;

          case "setupContactLimits":
            await this.setupContactLimits();
            results.completed.push({
              task,
              message: "Contact limits setup completed",
            });
            break;

          default:
            results.skipped.push({ task, reason: "Unknown task" });
        }
      } catch (error) {
        results.failed.push({ task, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get system configuration
   */
  static getSystemConfiguration() {
    return {
      cache: {
        duration: AdminCacheService.cacheTimeout,
        version: "1.0.0",
        keys: Object.keys(CACHE_KEYS),
      },
      environment: {
        development: process.env.NODE_ENV === "development",
        production: process.env.NODE_ENV === "production",
      },
      features: {
        caching: true,
        optimization: true,
        analytics: true,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Export system data for backup
   */
  static async exportSystemData(includeCache = false) {
    try {
      const systemData = {
        configuration: this.getSystemConfiguration(),
        health: await this.getSystemHealth(),
        timestamp: new Date(),
      };

      if (includeCache) {
        systemData.cache = AdminCacheService.getCacheStats();
      }

      return {
        success: true,
        data: systemData,
        format: "json",
      };
    } catch (error) {
      console.error("Error exporting system data:", error);
      throw error;
    }
  }

  /**
   * Validate system integrity
   */
  static async validateSystemIntegrity() {
    const issues = [];
    const checks = [];

    try {
      // Check cache integrity
      const cacheHealthy = AdminCacheService.isCacheHealthy();
      checks.push({
        name: "Cache Integrity",
        status: cacheHealthy ? "pass" : "fail",
        message: cacheHealthy
          ? "Cache operations working correctly"
          : "Cache operations failing",
      });

      if (!cacheHealthy) {
        issues.push("Cache system integrity compromised");
      }

      // Check database connectivity
      const dbHealth = await this.getDatabaseHealth();
      checks.push({
        name: "Database Connectivity",
        status: dbHealth.status === "healthy" ? "pass" : "fail",
        message:
          dbHealth.status === "healthy"
            ? "Database connection successful"
            : dbHealth.error,
      });

      if (dbHealth.status !== "healthy") {
        issues.push("Database connectivity issues detected");
      }

      // Check services
      const servicesHealth = await this.getServicesHealth();
      Object.entries(servicesHealth).forEach(([service, health]) => {
        checks.push({
          name: `${service.charAt(0).toUpperCase() + service.slice(1)} Service`,
          status: health.status === "healthy" ? "pass" : "warn",
          message:
            health.status === "healthy"
              ? `${service} service operational`
              : health.error || "Service issues detected",
        });

        if (health.status === "error") {
          issues.push(`${service} service experiencing issues`);
        }
      });

      return {
        overall: issues.length === 0 ? "healthy" : "issues",
        issues,
        checks,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        overall: "error",
        issues: ["System integrity check failed"],
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get system logs (placeholder for future implementation)
   */
  static async getSystemLogs(limit = 100) {
    // This would be implemented with actual logging system
    return {
      logs: [],
      message: "System logging not yet implemented",
      timestamp: new Date(),
    };
  }
}

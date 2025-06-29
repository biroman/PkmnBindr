/**
 * Admin Services - Centralized business logic for admin operations
 *
 * This module exports all admin services that handle:
 * - User management operations
 * - Contact management operations
 * - System operations and maintenance
 * - Advanced caching with versioning
 * - Batch operations and optimization
 * - Form validation and business rules
 */

export { AdminCacheService, CACHE_KEYS } from "./AdminCacheService";
export { AdminUserService } from "./AdminUserService";
export { AdminContactService } from "./AdminContactService";
export { AdminSystemService } from "./AdminSystemService";
export { AdminBatchService } from "./AdminBatchService";
export { AdminValidationService } from "./AdminValidationService";

/**
 * Convenience object for accessing all services
 */
export const AdminServices = {
  Cache: () => import("./AdminCacheService").then((m) => m.AdminCacheService),
  User: () => import("./AdminUserService").then((m) => m.AdminUserService),
  Contact: () =>
    import("./AdminContactService").then((m) => m.AdminContactService),
  System: () =>
    import("./AdminSystemService").then((m) => m.AdminSystemService),
  Batch: () => import("./AdminBatchService").then((m) => m.AdminBatchService),
  Validation: () =>
    import("./AdminValidationService").then((m) => m.AdminValidationService),
};

/**
 * Service initialization and setup
 */
export const initializeAdminServices = async () => {
  try {
    // Import services dynamically to avoid circular dependencies
    const { AdminCacheService } = await import("./AdminCacheService");
    const { AdminSystemService } = await import("./AdminSystemService");

    // Check cache health
    const cacheHealthy = AdminCacheService.isCacheHealthy();
    if (!cacheHealthy) {
      AdminCacheService.clearAllCache();
    }

    // Get system health
    const systemHealth = await AdminSystemService.getSystemHealth();

    return {
      success: true,
      cacheHealthy,
      systemHealth,
    };
  } catch (error) {
    console.error("Failed to initialize admin services:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Service cleanup and teardown
 */
export const cleanupAdminServices = () => {
  try {
    // Clear any active operations
    const { AdminBatchService } = require("./AdminBatchService");
    AdminBatchService.requestQueue = [];
    AdminBatchService.activeOperations.clear();

    // Clear cache
    const { AdminCacheService } = require("./AdminCacheService");
    AdminCacheService.clearExpiredCache();

    return true;
  } catch (error) {
    console.error("Error cleaning up admin services:", error);
    return false;
  }
};

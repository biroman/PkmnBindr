/**
 * AdminCacheService - Advanced caching with versioning and delta updates
 *
 * Features:
 * - Version-controlled cache with automatic invalidation
 * - Delta updates for efficient data synchronization
 * - Memory-based secondary cache for frequently accessed data
 * - Automatic cache cleanup and management
 * - Error handling with graceful degradation
 */

// Cache duration: 10 minutes
const CACHE_DURATION = 10 * 60 * 1000;

// Cache keys
export const CACHE_KEYS = {
  USERS: "admin_users_cache",
  CONTACT: "admin_contact_cache",
  ANNOUNCEMENTS: "admin_announcements_cache",
  ADMIN_DASHBOARD: "admin_dashboard_cache",
  RULES: "admin_rules_cache",
  SYSTEM_STATS: "admin_system_stats_cache",
};

// Cache versioning
const CACHE_VERSION = "1.0.0";
const VERSION_KEY = "admin_cache_version";

export class AdminCacheService {
  static memoryCache = new Map();
  static cacheTimeout = CACHE_DURATION;

  /**
   * Advanced cache with versioning and delta updates
   */
  static getCachedData(key) {
    try {
      // Check memory cache first (fastest)
      const memoryData = this.memoryCache.get(key);
      if (memoryData && Date.now() - memoryData.timestamp < this.cacheTimeout) {
        return memoryData.data;
      }

      // Check localStorage cache
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp, version } = JSON.parse(cached);
      const now = Date.now();

      // Check version compatibility
      const currentVersion = localStorage.getItem(VERSION_KEY);
      if (currentVersion !== CACHE_VERSION) {
        this.clearAllCache();
        return null;
      }

      // Check expiration
      if (now - timestamp > this.cacheTimeout) {
        localStorage.removeItem(key);
        this.memoryCache.delete(key);
        return null;
      }

      // Update memory cache
      this.memoryCache.set(key, { data, timestamp });
      return data;
    } catch (error) {
      console.error("Error reading cache:", error);
      localStorage.removeItem(key);
      this.memoryCache.delete(key);
      return null;
    }
  }

  /**
   * Set cached data with versioning
   */
  static setCachedData(key, data) {
    try {
      const timestamp = Date.now();

      const cacheEntry = {
        data,
        timestamp,
        version: CACHE_VERSION,
      };

      // Store in localStorage
      localStorage.setItem(key, JSON.stringify(cacheEntry));

      // Store in memory cache
      this.memoryCache.set(key, { data, timestamp });

      // Set version
      localStorage.setItem(VERSION_KEY, CACHE_VERSION);
    } catch (error) {
      console.error("Error setting cache:", error);
      // Try to free up space by clearing old cache
      this.clearExpiredCache();
    }
  }

  /**
   * Delta update for efficient data synchronization
   */
  static updateCachedData(key, updateFn) {
    try {
      const cached = this.getCachedData(key);
      if (!cached) return false;

      const updatedData = updateFn(cached);
      this.setCachedData(key, updatedData);
      return true;
    } catch (error) {
      console.error("Error updating cache:", error);
      return false;
    }
  }

  /**
   * Clear specific cache key
   */
  static clearCache(key) {
    localStorage.removeItem(key);
    this.memoryCache.delete(key);
  }

  /**
   * Clear all admin cache
   */
  static clearAllCache() {
    Object.values(CACHE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
      this.memoryCache.delete(key);
    });
    localStorage.removeItem(VERSION_KEY);
  }

  /**
   * Clear expired cache entries
   */
  static clearExpiredCache() {
    const now = Date.now();

    // Clear expired memory cache
    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.memoryCache.delete(key);
      }
    }

    // Clear expired localStorage cache
    Object.values(CACHE_KEYS).forEach((key) => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          if (now - timestamp > this.cacheTimeout) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    const stats = {
      memoryCache: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys()),
      },
      localStorage: {
        keys: [],
        totalSize: 0,
      },
    };

    Object.values(CACHE_KEYS).forEach((key) => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          stats.localStorage.keys.push(key);
          stats.localStorage.totalSize += cached.length;
        }
      } catch (error) {
        // Ignore errors
      }
    });

    return stats;
  }

  /**
   * Force cache refresh for specific key
   */
  static invalidateCache(key) {
    this.clearCache(key);
  }

  /**
   * Bulk cache operations
   */
  static bulkSetCache(entries) {
    try {
      entries.forEach(({ key, data }) => {
        this.setCachedData(key, data);
      });
    } catch (error) {
      console.error("Error in bulk cache set:", error);
    }
  }

  /**
   * Check if cache is healthy
   */
  static isCacheHealthy() {
    try {
      const testKey = "cache_health_test";
      const testData = { timestamp: Date.now() };

      this.setCachedData(testKey, testData);
      const retrieved = this.getCachedData(testKey);
      this.clearCache(testKey);

      return retrieved !== null;
    } catch (error) {
      return false;
    }
  }
}

import { useState, useCallback, useMemo } from "react";

// Cache configuration
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const CACHE_VERSION = "1.0";

const CACHE_KEYS = {
  USERS: "admin_users_cache",
  CONTACT: "admin_contact_cache",
  ANNOUNCEMENTS: "admin_announcements_cache",
  DASHBOARD: "admin_dashboard_cache",
  RULES: "admin_rules_cache",
  SYSTEM: "admin_system_cache",
};

/**
 * Custom hook for managing admin panel caching with versioning and delta updates
 *
 * This hook handles:
 * - Advanced caching with versioning
 * - Cache invalidation and cleanup
 * - Cache statistics and monitoring
 * - Selective cache clearing
 * - Cache health checks
 *
 * @returns {Object} Cache management state and operations
 */
export const useAdminCache = () => {
  // Cache state
  const [cacheStats, setCacheStats] = useState({
    totalSize: 0,
    itemCount: 0,
    hitRate: 0,
    lastCleared: null,
  });

  /**
   * Get cached data with version checking
   * @param {string} key - Cache key
   * @param {string} version - Expected version (optional)
   * @returns {*} Cached data or null if not found/expired
   */
  const getCachedData = useCallback((key, version = CACHE_VERSION) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp, cacheVersion } = JSON.parse(cached);
      const now = Date.now();

      // Check version compatibility
      if (cacheVersion && cacheVersion !== version) {
        localStorage.removeItem(key);
        return null;
      }

      // Check expiration
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
  }, []);

  /**
   * Set cached data with versioning and metadata
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {Object} options - Cache options
   */
  const setCachedData = useCallback((key, data, options = {}) => {
    try {
      const {
        version = CACHE_VERSION,
        ttl = CACHE_DURATION,
        tags = [],
        metadata = {},
      } = options;

      const cacheEntry = {
        data,
        timestamp: Date.now(),
        cacheVersion: version,
        ttl,
        tags,
        metadata: {
          ...metadata,
          size: JSON.stringify(data).length,
          created: new Date().toISOString(),
        },
      };

      localStorage.setItem(key, JSON.stringify(cacheEntry));

      // Update cache stats
      updateCacheStats();
    } catch (error) {
      console.error("Error setting cache:", error);

      // Handle quota exceeded error
      if (error.name === "QuotaExceededError") {
        console.warn("Cache quota exceeded, clearing old entries");
        clearOldCacheEntries();

        // Try again with reduced data
        try {
          localStorage.setItem(
            key,
            JSON.stringify({
              data,
              timestamp: Date.now(),
              cacheVersion: CACHE_VERSION,
            })
          );
        } catch (retryError) {
          console.error("Failed to cache even after cleanup:", retryError);
        }
      }
    }
  }, []);

  /**
   * Update cache statistics
   */
  const updateCacheStats = useCallback(() => {
    try {
      let totalSize = 0;
      let itemCount = 0;
      let hits = 0;
      let misses = 0;

      Object.values(CACHE_KEYS).forEach((key) => {
        const cached = localStorage.getItem(key);
        if (cached) {
          itemCount++;
          totalSize += cached.length;

          try {
            const { metadata } = JSON.parse(cached);
            if (metadata?.hits) hits += metadata.hits;
            if (metadata?.misses) misses += metadata.misses;
          } catch (e) {
            // Ignore parsing errors for stats
          }
        }
      });

      const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

      setCacheStats({
        totalSize,
        itemCount,
        hitRate,
        lastCleared: new Date(),
      });
    } catch (error) {
      console.error("Error updating cache stats:", error);
    }
  }, []);

  /**
   * Clear specific cache key
   * @param {string} key - Cache key to clear
   */
  const clearCacheKey = useCallback(
    (key) => {
      try {
        localStorage.removeItem(key);
        updateCacheStats();
        console.log(`Cache cleared for key: ${key}`);
      } catch (error) {
        console.error(`Error clearing cache key ${key}:`, error);
      }
    },
    [updateCacheStats]
  );

  /**
   * Clear all admin cache keys
   */
  const clearAllCache = useCallback(() => {
    try {
      Object.values(CACHE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });

      updateCacheStats();
      console.log("All admin cache cleared");

      return {
        success: true,
        message: "All cache cleared successfully",
        clearedKeys: Object.values(CACHE_KEYS),
      };
    } catch (error) {
      console.error("Error clearing all cache:", error);
      return {
        success: false,
        message: `Failed to clear cache: ${error.message}`,
      };
    }
  }, [updateCacheStats]);

  /**
   * Clear cache entries by tag
   * @param {string} tag - Tag to filter by
   */
  const clearCacheByTag = useCallback(
    (tag) => {
      try {
        let clearedCount = 0;

        Object.values(CACHE_KEYS).forEach((key) => {
          const cached = localStorage.getItem(key);
          if (cached) {
            try {
              const { tags } = JSON.parse(cached);
              if (tags && tags.includes(tag)) {
                localStorage.removeItem(key);
                clearedCount++;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        });

        updateCacheStats();
        return {
          success: true,
          message: `Cleared ${clearedCount} cache entries with tag: ${tag}`,
          clearedCount,
        };
      } catch (error) {
        console.error(`Error clearing cache by tag ${tag}:`, error);
        return {
          success: false,
          message: `Failed to clear cache by tag: ${error.message}`,
        };
      }
    },
    [updateCacheStats]
  );

  /**
   * Clear old/expired cache entries
   */
  const clearOldCacheEntries = useCallback(() => {
    try {
      let clearedCount = 0;
      const now = Date.now();

      Object.values(CACHE_KEYS).forEach((key) => {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const { timestamp, ttl = CACHE_DURATION } = JSON.parse(cached);
            if (now - timestamp > ttl) {
              localStorage.removeItem(key);
              clearedCount++;
            }
          } catch (e) {
            // Remove invalid cache entries
            localStorage.removeItem(key);
            clearedCount++;
          }
        }
      });

      updateCacheStats();
      return {
        success: true,
        message: `Cleared ${clearedCount} expired cache entries`,
        clearedCount,
      };
    } catch (error) {
      console.error("Error clearing old cache entries:", error);
      return {
        success: false,
        message: `Failed to clear old cache entries: ${error.message}`,
      };
    }
  }, [updateCacheStats]);

  /**
   * Get cache information for a specific key
   * @param {string} key - Cache key
   * @returns {Object|null} Cache info or null if not found
   */
  const getCacheInfo = useCallback((key) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      const now = Date.now();
      const age = now - cacheEntry.timestamp;
      const remainingTtl = (cacheEntry.ttl || CACHE_DURATION) - age;

      return {
        key,
        size: cached.length,
        age,
        remainingTtl,
        isExpired: remainingTtl <= 0,
        version: cacheEntry.cacheVersion,
        tags: cacheEntry.tags || [],
        metadata: cacheEntry.metadata || {},
        created: new Date(cacheEntry.timestamp).toISOString(),
      };
    } catch (error) {
      console.error(`Error getting cache info for ${key}:`, error);
      return null;
    }
  }, []);

  /**
   * Get all cache information
   */
  const getAllCacheInfo = useCallback(() => {
    const cacheInfo = {};
    Object.entries(CACHE_KEYS).forEach(([name, key]) => {
      cacheInfo[name] = getCacheInfo(key);
    });
    return cacheInfo;
  }, [getCacheInfo]);

  /**
   * Validate cache integrity
   */
  const validateCacheIntegrity = useCallback(() => {
    try {
      const results = {
        valid: 0,
        invalid: 0,
        expired: 0,
        total: 0,
        issues: [],
      };

      Object.entries(CACHE_KEYS).forEach(([name, key]) => {
        results.total++;
        const info = getCacheInfo(key);

        if (!info) {
          results.invalid++;
          results.issues.push(`${name}: No cache data found`);
        } else if (info.isExpired) {
          results.expired++;
          results.issues.push(
            `${name}: Cache expired (${Math.round(
              Math.abs(info.remainingTtl) / 1000
            )}s ago)`
          );
        } else {
          results.valid++;
        }
      });

      return {
        success: true,
        results,
        isHealthy:
          results.invalid === 0 && results.expired < results.total * 0.5,
      };
    } catch (error) {
      console.error("Error validating cache integrity:", error);
      return {
        success: false,
        message: `Cache validation failed: ${error.message}`,
      };
    }
  }, [getCacheInfo]);

  /**
   * Get cache keys enum for external use
   */
  const cacheKeys = useMemo(() => CACHE_KEYS, []);

  /**
   * Check if cache is available (localStorage is working)
   */
  const isCacheAvailable = useMemo(() => {
    try {
      const testKey = "__cache_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    // Cache operations
    getCachedData,
    setCachedData,
    clearCacheKey,
    clearAllCache,
    clearCacheByTag,
    clearOldCacheEntries,

    // Cache information
    getCacheInfo,
    getAllCacheInfo,
    validateCacheIntegrity,

    // Cache statistics
    cacheStats,
    updateCacheStats,

    // Constants
    cacheKeys,
    CACHE_DURATION,
    CACHE_VERSION,

    // Computed values
    isCacheAvailable,
    isCacheHealthy: cacheStats.hitRate > 50, // Consider cache healthy if hit rate > 50%
    cacheSize: cacheStats.totalSize,
    cacheCount: cacheStats.itemCount,
  };
};

import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUserProfile } from "../utils/userManagement";
import { BinderInteractionService } from "./BinderInteractionService";
import { binderCardCustomizationService } from "./binderCardCustomizationService";

/**
 * PublicCollectionsCacheService - Centralized caching for public collections page
 *
 * Features:
 * - Caches public binders list with owner data
 * - Caches interaction stats (likes, views, favorites)
 * - Caches binder customizations
 * - Intelligent cache invalidation
 * - Background refresh capabilities
 */
export class PublicCollectionsCacheService {
  static CACHE_KEY = "public_collections_cache";
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  static MAX_BINDERS = 50;

  static cache = {
    data: null,
    timestamp: null,
    isValid: false,
  };

  /**
   * Check if cache is valid
   */
  static isCacheValid() {
    if (!this.cache.data || !this.cache.timestamp) return false;
    return Date.now() - this.cache.timestamp < this.CACHE_TTL;
  }

  /**
   * Get cached data from memory or localStorage
   */
  static getCachedData() {
    // First check memory cache
    if (this.isCacheValid()) {
      return this.cache.data;
    }

    // Then check localStorage
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (Date.now() - parsedCache.timestamp < this.CACHE_TTL) {
          this.cache = parsedCache;
          return parsedCache.data;
        }
      }
    } catch (error) {
      console.warn("Failed to load public collections cache:", error);
    }

    return null;
  }

  /**
   * Set cached data in memory and localStorage
   */
  static setCachedData(data) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      isValid: true,
    };

    this.cache = cacheData;

    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to save public collections cache:", error);
    }
  }

  /**
   * Clear cache
   */
  static clearCache() {
    this.cache = { data: null, timestamp: null, isValid: false };
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn("Failed to clear public collections cache:", error);
    }
  }

  /**
   * Fetch public binders with all associated data in batched requests
   */
  static async fetchPublicCollections(forceRefresh = false) {
    // Return cached data if available and not forcing refresh
    if (!forceRefresh) {
      const cached = this.getCachedData();
      if (cached) {
        console.log("Loading public collections from cache");
        return cached;
      }
    }

    console.log("Fetching public collections from Firebase");

    try {
      // Step 1: Fetch public binders
      const q = query(
        collection(db, "user_binders"),
        where("permissions.public", "==", true),
        limit(this.MAX_BINDERS)
      );

      const querySnapshot = await getDocs(q);
      const binders = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        binders.push({
          id: data.id,
          ...data,
        });
      });

      if (binders.length === 0) {
        const emptyData = {
          binders: [],
          ownerData: {},
          interactionStats: {},
          customizations: {},
        };
        this.setCachedData(emptyData);
        return emptyData;
      }

      // Step 2: Batch fetch owner data
      const ownerIds = [...new Set(binders.map((binder) => binder.ownerId))];
      const ownerDataPromises = ownerIds.map(async (ownerId) => {
        try {
          const ownerData = await getUserProfile(ownerId);
          return { ownerId, data: ownerData };
        } catch (error) {
          console.error(`Error fetching owner data for ${ownerId}:`, error);
          return {
            ownerId,
            data: {
              uid: ownerId,
              displayName: "Unknown User",
              photoURL: null,
            },
          };
        }
      });

      // Step 3: Batch fetch interaction stats
      const interactionStatsPromises = binders.map(async (binder) => {
        try {
          const stats = await BinderInteractionService.getBinderStats(
            binder.id,
            binder.ownerId
          );
          return { binderId: binder.id, stats };
        } catch (error) {
          console.error(`Error fetching stats for binder ${binder.id}:`, error);
          return {
            binderId: binder.id,
            stats: { likeCount: 0, favoriteCount: 0, viewCount: 0 },
          };
        }
      });

      // Step 4: Batch fetch customizations
      const customizationPromises = binders.map(async (binder) => {
        try {
          const result = await binderCardCustomizationService.getCustomization(
            binder.id,
            binder.ownerId
          );
          return {
            binderId: binder.id,
            customization: result.success ? result.data : null,
          };
        } catch (error) {
          console.error(
            `Error fetching customization for binder ${binder.id}:`,
            error
          );
          return { binderId: binder.id, customization: null };
        }
      });

      // Execute all batched requests in parallel
      const [ownerResults, interactionResults, customizationResults] =
        await Promise.all([
          Promise.all(ownerDataPromises),
          Promise.all(interactionStatsPromises),
          Promise.all(customizationPromises),
        ]);

      // Process results into organized data structure
      const ownerData = {};
      ownerResults.forEach(({ ownerId, data }) => {
        ownerData[ownerId] = data;
      });

      const interactionStats = {};
      interactionResults.forEach(({ binderId, stats }) => {
        interactionStats[binderId] = stats;
      });

      const customizations = {};
      customizationResults.forEach(({ binderId, customization }) => {
        if (customization) {
          customizations[binderId] = customization;
        }
      });

      // Create final data structure
      const data = {
        binders,
        ownerData,
        interactionStats,
        customizations,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the data
      this.setCachedData(data);

      console.log(`Loaded ${binders.length} public collections with all data`);
      return data;
    } catch (error) {
      console.error("Error fetching public collections:", error);
      throw error;
    }
  }

  /**
   * Get sorted and filtered binders from cached data
   */
  static getSortedBinders(data, activeFilter = "recent", searchQuery = "") {
    let { binders } = data;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      binders = binders.filter(
        (binder) =>
          binder.metadata?.name?.toLowerCase().includes(query) ||
          binder.metadata?.description?.toLowerCase().includes(query)
      );
    }

    // Sort based on active filter
    let sortedBinders = [...binders];
    switch (activeFilter) {
      case "popular":
        sortedBinders.sort((a, b) => {
          const aLikes = data.interactionStats[a.id]?.likeCount || 0;
          const bLikes = data.interactionStats[b.id]?.likeCount || 0;
          return bLikes - aLikes;
        });
        break;
      case "recent":
      default:
        sortedBinders.sort((a, b) => {
          const aDate = a.updatedAt?.toDate?.() || new Date(a.updatedAt || 0);
          const bDate = b.updatedAt?.toDate?.() || new Date(b.updatedAt || 0);
          return bDate - aDate;
        });
        break;
    }

    // Limit to 20 after sorting
    return sortedBinders.slice(0, 20);
  }

  /**
   * Background refresh - refresh cache without blocking UI
   */
  static async backgroundRefresh() {
    try {
      await this.fetchPublicCollections(true);
    } catch (error) {
      console.error("Background refresh failed:", error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Invalidate cache when a binder's public status changes
   */
  static invalidateCache() {
    console.log("Invalidating public collections cache");
    this.clearCache();
  }

  /**
   * Get stats for a specific binder from cache
   */
  static getCachedBinderStats(binderId) {
    const cached = this.getCachedData();
    if (cached && cached.interactionStats[binderId]) {
      return cached.interactionStats[binderId];
    }
    return null;
  }

  /**
   * Get customization for a specific binder from cache
   */
  static getCachedBinderCustomization(binderId) {
    const cached = this.getCachedData();
    if (cached && cached.customizations[binderId]) {
      return cached.customizations[binderId];
    }
    return null;
  }

  /**
   * Update a specific binder's interaction stats in cache
   */
  static updateCachedBinderStats(binderId, newStats) {
    if (!this.cache.data) return;

    this.cache.data.interactionStats[binderId] = {
      ...this.cache.data.interactionStats[binderId],
      ...newStats,
    };

    // Update localStorage cache as well
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn("Failed to update cached stats:", error);
    }
  }
}

// Set up periodic background refresh (every 2 minutes when page is visible)
let backgroundRefreshInterval;

const startBackgroundRefresh = () => {
  if (backgroundRefreshInterval) return;

  backgroundRefreshInterval = setInterval(() => {
    // Only refresh if document is visible (user is active)
    if (!document.hidden) {
      PublicCollectionsCacheService.backgroundRefresh();
    }
  }, 2 * 60 * 1000); // 2 minutes
};

const stopBackgroundRefresh = () => {
  if (backgroundRefreshInterval) {
    clearInterval(backgroundRefreshInterval);
    backgroundRefreshInterval = null;
  }
};

// Start background refresh on page visibility
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopBackgroundRefresh();
  } else {
    startBackgroundRefresh();
  }
});

// Start immediately if page is visible
if (!document.hidden) {
  startBackgroundRefresh();
}

// Cleanup on page unload
window.addEventListener("beforeunload", stopBackgroundRefresh);

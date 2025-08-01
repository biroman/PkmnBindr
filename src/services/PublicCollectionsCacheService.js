import {
  collection,
  query,
  where,
  limit,
  getDocs,
  orderBy,
  startAfter,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUserProfile } from "../utils/userManagement";
import { BinderInteractionService } from "./BinderInteractionService";
import { binderCardCustomizationService } from "./binderCardCustomizationService";

/**
 * PublicCollectionsCacheService - Centralized caching for public collections page
 *
 * Features:
 * - Paginated loading of public binders with owner data
 * - Caches interaction stats (likes, views, favorites)
 * - Caches binder customizations
 * - Intelligent cache invalidation
 * - Background refresh capabilities
 */
export class PublicCollectionsCacheService {
  static CACHE_KEY = "public_collections_cache";
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  static PAGE_SIZE = 6; // Show 6 binders per page

  static cache = {
    data: new Map(), // Store data by page number and filter
    pageInfo: new Map(), // Store pagination metadata
    timestamp: null,
    isValid: false,
  };

  /**
   * Generate cache key for specific page and filter
   */
  static getCacheKey(page, filter, searchQuery = "") {
    return `${filter}_${page}_${searchQuery}`;
  }

  /**
   * Check if cache is valid for specific page
   */
  static isCacheValid(cacheKey) {
    if (!this.cache.data.has(cacheKey) || !this.cache.timestamp) return false;
    return Date.now() - this.cache.timestamp < this.CACHE_TTL;
  }

  /**
   * Get cached data for specific page
   */
  static getCachedPage(page, filter, searchQuery = "") {
    const cacheKey = this.getCacheKey(page, filter, searchQuery);

    if (this.isCacheValid(cacheKey)) {
      return {
        data: this.cache.data.get(cacheKey),
        pageInfo: this.cache.pageInfo.get(cacheKey),
      };
    }

    return null;
  }

  /**
   * Set cached data for specific page
   */
  static setCachedPage(page, filter, searchQuery, data, pageInfo) {
    const cacheKey = this.getCacheKey(page, filter, searchQuery);

    this.cache.data.set(cacheKey, data);
    this.cache.pageInfo.set(cacheKey, pageInfo);
    this.cache.timestamp = Date.now();
    this.cache.isValid = true;
  }

  /**
   * Clear all cache
   */
  static clearCache() {
    this.cache = {
      data: new Map(),
      pageInfo: new Map(),
      timestamp: null,
      isValid: false,
    };
  }

  /**
   * Fetch paginated public binders with all associated data
   */
  static async fetchPaginatedCollections(
    page = 1,
    activeFilter = "recent",
    searchQuery = "",
    forceRefresh = false
  ) {
    const cacheKey = this.getCacheKey(page, activeFilter, searchQuery);

    // Return cached data if available and not forcing refresh
    if (!forceRefresh) {
      const cached = this.getCachedPage(page, activeFilter, searchQuery);
      if (cached) {
        console.log(`Loading public collections page ${page} from cache`);
        return cached;
      }
    }

    console.log(`Fetching public collections page ${page} from Firebase`);

    try {
      // Build query - fetch more data than needed for client-side sorting and pagination
      // This avoids the need for composite indexes
      const fetchSize = Math.max(50, page * this.PAGE_SIZE + this.PAGE_SIZE); // Fetch enough for current page + some buffer

      const q = query(
        collection(db, "user_binders"),
        where("permissions.public", "==", true),
        limit(fetchSize)
      );

      const querySnapshot = await getDocs(q);
      const allBinders = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allBinders.push({
          id: data.id,
          ...data,
        });
      });

      // Apply search filter if provided
      let filteredBinders = allBinders;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredBinders = allBinders.filter(
          (binder) =>
            binder.metadata?.name?.toLowerCase().includes(query) ||
            binder.metadata?.description?.toLowerCase().includes(query)
        );
      }

      // Pre-fetch interaction stats for ALL filtered binders if using popular filter
      // This prevents duplicate fetching later
      let allBinderStats = {};

      if (activeFilter === "popular") {
        console.log(
          `Pre-fetching stats for ${filteredBinders.length} binders for popular sorting`
        );

        const statsPromises = filteredBinders.map(async (binder) => {
          try {
            const stats = await BinderInteractionService.getBinderStats(
              binder.id,
              binder.ownerId
            );
            return {
              binderId: binder.id,
              stats,
              likeCount: stats.likeCount || 0,
            };
          } catch (error) {
            console.error(
              `Error fetching stats for binder ${binder.id}:`,
              error
            );
            return {
              binderId: binder.id,
              stats: { likeCount: 0, favoriteCount: 0, viewCount: 0 },
              likeCount: 0,
            };
          }
        });

        const statsResults = await Promise.all(statsPromises);

        // Store stats in lookup object for reuse
        statsResults.forEach(({ binderId, stats }) => {
          allBinderStats[binderId] = stats;
        });

        // Sort by like count using pre-fetched stats
        filteredBinders.sort((a, b) => {
          const aLikes = allBinderStats[a.id]?.likeCount || 0;
          const bLikes = allBinderStats[b.id]?.likeCount || 0;
          return bLikes - aLikes;
        });
      } else {
        // Default to recent (sort by updatedAt)
        filteredBinders.sort((a, b) => {
          const aDate = a.updatedAt?.toDate?.() || new Date(a.updatedAt || 0);
          const bDate = b.updatedAt?.toDate?.() || new Date(b.updatedAt || 0);
          return bDate - aDate;
        });
      }

      // Apply pagination to sorted results
      const startIndex = (page - 1) * this.PAGE_SIZE;
      const endIndex = startIndex + this.PAGE_SIZE;
      const paginatedBinders = filteredBinders.slice(startIndex, endIndex);

      // Determine if there are more pages based on total filtered results
      const hasNextPage = filteredBinders.length > endIndex;
      const totalFilteredItems = filteredBinders.length;

      if (paginatedBinders.length === 0) {
        const emptyResult = {
          data: {
            binders: [],
            ownerData: {},
            interactionStats: {},
            customizations: {},
          },
          pageInfo: {
            currentPage: page,
            totalItems: totalFilteredItems,
            hasNextPage: false,
            hasPreviousPage: page > 1,
            totalPages: Math.ceil(totalFilteredItems / this.PAGE_SIZE),
          },
        };

        this.setCachedPage(
          page,
          activeFilter,
          searchQuery,
          emptyResult.data,
          emptyResult.pageInfo
        );
        return emptyResult;
      }

      // Fetch associated data for current page binders only
      const ownerIds = [
        ...new Set(paginatedBinders.map((binder) => binder.ownerId)),
      ];

      // Batch fetch owner data
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

      // Fetch interaction stats for page binders (reuse pre-fetched stats if available)
      const interactionStatsPromises = paginatedBinders.map(async (binder) => {
        // If we already fetched stats for popular sorting, reuse them
        if (allBinderStats[binder.id]) {
          console.log(`Reusing pre-fetched stats for binder ${binder.id}`);
          return { binderId: binder.id, stats: allBinderStats[binder.id] };
        }

        // Otherwise fetch stats normally
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

      // Batch fetch customizations
      const customizationPromises = paginatedBinders.map(async (binder) => {
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
        binders: paginatedBinders,
        ownerData,
        interactionStats,
        customizations,
        lastUpdated: new Date().toISOString(),
      };

      const pageInfo = {
        currentPage: page,
        totalItems: totalFilteredItems,
        hasNextPage: hasNextPage,
        hasPreviousPage: page > 1,
        totalPages: Math.ceil(totalFilteredItems / this.PAGE_SIZE),
      };

      // Cache the data
      this.setCachedPage(page, activeFilter, searchQuery, data, pageInfo);

      const readsCount =
        1 + // Initial binder query
        (activeFilter === "popular" ? filteredBinders.length : 0) + // Popular filter stats (if used)
        paginatedBinders.filter((b) => !allBinderStats[b.id]).length + // Additional stats (only if not pre-fetched)
        paginatedBinders.length + // Customizations
        ownerIds.length; // Owner profiles

      console.log(
        `✅ Loaded ${paginatedBinders.length} public collections with optimized reads`,
        {
          estimatedReads: readsCount,
          breakdown: {
            initialQuery: 1,
            popularFilterStats:
              activeFilter === "popular" ? filteredBinders.length : 0,
            additionalStats: paginatedBinders.filter(
              (b) => !allBinderStats[b.id]
            ).length,
            customizations: paginatedBinders.length,
            ownerProfiles: ownerIds.length,
          },
          reusedStats:
            activeFilter === "popular"
              ? paginatedBinders.filter((b) => allBinderStats[b.id]).length
              : 0,
          totalBinders: filteredBinders.length,
          filter: activeFilter,
          page: page,
          optimization:
            activeFilter === "popular" ? "STATS_REUSED" : "STANDARD",
        }
      );

      return { data, pageInfo };
    } catch (error) {
      console.error("Error fetching public collections:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses pagination
   */
  static async fetchPublicCollections(forceRefresh = false) {
    const result = await this.fetchPaginatedCollections(
      1,
      "recent",
      "",
      forceRefresh
    );
    return result.data;
  }

  /**
   * Legacy method - now handled by pagination
   * @deprecated Use fetchPaginatedCollections instead
   */
  static getSortedBinders(data, activeFilter = "recent", searchQuery = "") {
    // This method is now handled by the pagination system
    return data.binders || [];
  }

  /**
   * Background refresh - refresh cache without blocking UI
   */
  static async backgroundRefresh() {
    try {
      await this.fetchPaginatedCollections(1, "recent", "", true);
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
   * Get stats for a specific binder from cache (searches all cached pages)
   */
  static getCachedBinderStats(binderId) {
    for (const [cacheKey, cachedData] of this.cache.data) {
      if (cachedData && cachedData.interactionStats[binderId]) {
        return cachedData.interactionStats[binderId];
      }
    }
    return null;
  }

  /**
   * Get customization for a specific binder from cache (searches all cached pages)
   */
  static getCachedBinderCustomization(binderId) {
    for (const [cacheKey, cachedData] of this.cache.data) {
      if (cachedData && cachedData.customizations[binderId]) {
        return cachedData.customizations[binderId];
      }
    }
    return null;
  }

  /**
   * Update a specific binder's interaction stats in all relevant caches
   */
  static updateCachedBinderStats(binderId, newStats) {
    for (const [cacheKey, cachedData] of this.cache.data) {
      if (cachedData && cachedData.interactionStats[binderId]) {
        cachedData.interactionStats[binderId] = {
          ...cachedData.interactionStats[binderId],
          ...newStats,
        };
      }
    }
  }
}

// Background refresh is now only triggered manually when needed
// Removed automatic periodic refresh to prevent unnecessary API calls

/**
 * Manual background refresh - only call when explicitly needed
 * (e.g., when user views a binder, likes/favorites something, etc.)
 */
export const triggerBackgroundRefresh = () => {
  // Only refresh if cache is getting stale (older than 3 minutes)
  const STALE_THRESHOLD = 3 * 60 * 1000; // 3 minutes

  if (
    PublicCollectionsCacheService.cache.timestamp &&
    Date.now() - PublicCollectionsCacheService.cache.timestamp < STALE_THRESHOLD
  ) {
    return; // Cache is still fresh, no need to refresh
  }

  PublicCollectionsCacheService.backgroundRefresh();
};

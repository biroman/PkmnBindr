import { AdminCacheService, CACHE_KEYS } from "./AdminCacheService";
import { AdminOptimizedService } from "../AdminOptimizedService";

/**
 * AdminBatchService - Batch operations and optimization
 *
 * Features:
 * - Request batching and deduplication
 * - Parallel execution with concurrency control
 * - Bulk operations for users, contacts, and system tasks
 * - Performance optimization
 * - Progress tracking for long-running operations
 */

export class AdminBatchService {
  static activeOperations = new Map();
  static requestQueue = [];
  static batchTimeout = null;
  static isProcessing = false;

  /**
   * Create a batched data loader with request deduplication
   */
  static createBatchedDataLoader() {
    const processBatch = async () => {
      if (this.requestQueue.length === 0 || this.isProcessing) return;

      this.isProcessing = true;
      const currentBatch = [...this.requestQueue];
      this.requestQueue = [];

      try {
        // Group requests by type to minimize Firebase calls
        const userRequests = currentBatch.filter((req) => req.type === "users");
        const contactRequests = currentBatch.filter(
          (req) => req.type === "contact"
        );
        const announcementRequests = currentBatch.filter(
          (req) => req.type === "announcements"
        );

        // Execute in parallel with proper batching
        const results = await Promise.allSettled([
          userRequests.length > 0 ? this.loadUsersOptimized() : null,
          contactRequests.length > 0 ? this.loadContactDataOptimized() : null,
          announcementRequests.length > 0
            ? this.loadAnnouncementsOptimized()
            : null,
        ]);

        // Resolve all pending requests
        currentBatch.forEach((request, index) => {
          const resultIndex =
            request.type === "users" ? 0 : request.type === "contact" ? 1 : 2;

          if (results[resultIndex]?.status === "fulfilled") {
            request.resolve(results[resultIndex].value);
          } else {
            request.reject(
              results[resultIndex]?.reason ||
                new Error("Batch operation failed")
            );
          }
        });
      } catch (error) {
        currentBatch.forEach((request) => request.reject(error));
      } finally {
        this.isProcessing = false;
      }
    };

    return {
      addToQueue: (type) => {
        return new Promise((resolve, reject) => {
          // Check for duplicate requests
          const existingRequest = this.requestQueue.find(
            (req) => req.type === type
          );
          if (existingRequest) {
            // Return the existing promise instead of creating a new one
            return existingRequest.promise;
          }

          const request = { type, resolve, reject };
          this.requestQueue.push(request);

          // Clear existing timeout and set a new one
          if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
          }

          this.batchTimeout = setTimeout(processBatch, 50); // 50ms debounce
        });
      },
    };
  }

  /**
   * Optimized user loading with caching
   */
  static async loadUsersOptimized() {
    try {
      return await AdminOptimizedService.fetchAllUsersOptimized({
        includeBatchStats: true,
        useAggregation: true,
      });
    } catch (error) {
      console.error("Optimized user loading failed:", error);
      throw error;
    }
  }

  /**
   * Optimized contact data loading
   */
  static async loadContactDataOptimized() {
    try {
      return await AdminOptimizedService.fetchAllContactDataOptimized();
    } catch (error) {
      console.error("Optimized contact loading failed:", error);
      throw error;
    }
  }

  /**
   * Optimized announcements loading
   */
  static async loadAnnouncementsOptimized() {
    try {
      return await AdminOptimizedService.fetchAnnouncementsOptimized();
    } catch (error) {
      console.error("Optimized announcements loading failed:", error);
      throw error;
    }
  }

  /**
   * Execute batch operations with concurrency control
   */
  static async executeBatchOperation(items, operation, options = {}) {
    const {
      concurrency = 5,
      onProgress = null,
      onError = null,
      retryAttempts = 2,
      retryDelay = 1000,
    } = options;

    const operationId = this.generateOperationId();
    const progress = {
      id: operationId,
      total: items.length,
      completed: 0,
      failed: 0,
      errors: [],
      results: [],
      startTime: Date.now(),
    };

    this.activeOperations.set(operationId, progress);

    try {
      // Process items in chunks with concurrency control
      const chunks = this.chunkArray(items, concurrency);

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (item, index) => {
          return this.executeWithRetry(
            async () => await operation(item, index),
            retryAttempts,
            retryDelay
          );
        });

        const chunkResults = await Promise.allSettled(chunkPromises);

        chunkResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            progress.completed++;
            progress.results.push(result.value);
          } else {
            progress.failed++;
            progress.errors.push({
              item: chunk[index],
              error: result.reason.message,
            });

            if (onError) {
              onError(result.reason, chunk[index]);
            }
          }

          if (onProgress) {
            onProgress(progress);
          }
        });
      }

      progress.endTime = Date.now();
      progress.duration = progress.endTime - progress.startTime;

      return {
        operationId,
        completed: progress.completed,
        failed: progress.failed,
        total: progress.total,
        results: progress.results,
        errors: progress.errors,
        duration: progress.duration,
      };
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Execute operation with retry logic
   */
  static async executeWithRetry(operation, maxAttempts, delay) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          await this.delay(delay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay helper function
   */
  static delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate unique operation ID
   */
  static generateOperationId() {
    return `batch_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active operation status
   */
  static getOperationStatus(operationId) {
    return this.activeOperations.get(operationId);
  }

  /**
   * Get all active operations
   */
  static getAllActiveOperations() {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Cancel operation (if possible)
   */
  static cancelOperation(operationId) {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      operation.cancelled = true;
      this.activeOperations.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * Batch user operations
   */
  static async batchUserOperations(userIds, operation, additionalData = {}) {
    const operationFunction = async (userId) => {
      const { AdminUserService } = await import("./AdminUserService");
      return AdminUserService.performUserAction(
        userId,
        operation,
        additionalData
      );
    };

    return this.executeBatchOperation(userIds, operationFunction, {
      concurrency: 3, // Lower concurrency for user operations
      onProgress: (progress) => {
        console.log(
          `User batch operation progress: ${progress.completed}/${progress.total}`
        );
      },
    });
  }

  /**
   * Batch contact operations
   */
  static async batchContactOperations(
    contactItems,
    operation,
    additionalData = {}
  ) {
    const operationFunction = async (item) => {
      const { AdminContactService } = await import("./AdminContactService");

      switch (operation) {
        case "updateStatus":
          if (item.type === "message") {
            return AdminContactService.replyToMessage(
              item.id,
              additionalData.message,
              additionalData.user
            );
          } else if (item.type === "feature") {
            return AdminContactService.updateFeatureStatus(
              item.id,
              additionalData.status,
              additionalData.notes
            );
          } else if (item.type === "bug") {
            return AdminContactService.updateBugStatus(
              item.id,
              additionalData.status,
              additionalData.notes
            );
          }
          break;
        case "delete":
          if (item.type === "message") {
            return AdminContactService.deleteMessageThread(item.id);
          } else if (item.type === "feature") {
            return AdminContactService.deleteFeatureRequest(item.id);
          } else if (item.type === "bug") {
            return AdminContactService.deleteBugReport(item.id);
          }
          break;
        default:
          throw new Error(`Unknown contact operation: ${operation}`);
      }
    };

    return this.executeBatchOperation(contactItems, operationFunction, {
      concurrency: 3,
      onProgress: (progress) => {
        console.log(
          `Contact batch operation progress: ${progress.completed}/${progress.total}`
        );
      },
    });
  }

  /**
   * Batch cache refresh operations
   */
  static async batchCacheRefresh(cacheKeys = []) {
    const keys = cacheKeys.length > 0 ? cacheKeys : Object.values(CACHE_KEYS);

    const operationFunction = async (key) => {
      AdminCacheService.clearCache(key);
      return { key, cleared: true };
    };

    return this.executeBatchOperation(keys, operationFunction, {
      concurrency: 10, // Higher concurrency for cache operations
      onProgress: (progress) => {
        console.log(
          `Cache refresh progress: ${progress.completed}/${progress.total}`
        );
      },
    });
  }

  /**
   * Optimize data loading with intelligent caching
   */
  static async optimizeDataLoading(
    dataTypes = ["users", "contact", "announcements"]
  ) {
    const operations = [];

    // Check which data needs refreshing
    dataTypes.forEach((type) => {
      const cacheKey = CACHE_KEYS[type.toUpperCase()];
      if (cacheKey) {
        const cachedData = AdminCacheService.getCachedData(cacheKey);
        if (!cachedData) {
          operations.push({ type, priority: 1 });
        }
      }
    });

    // Sort by priority and execute
    operations.sort((a, b) => a.priority - b.priority);

    const batchLoader = this.createBatchedDataLoader();

    const promises = operations.map((op) => batchLoader.addToQueue(op.type));

    try {
      const results = await Promise.allSettled(promises);
      return {
        success: true,
        operations: operations.length,
        results: results.map((r, i) => ({
          type: operations[i].type,
          status: r.status,
          data: r.status === "fulfilled" ? r.value : null,
          error: r.status === "rejected" ? r.reason.message : null,
        })),
      };
    } catch (error) {
      console.error("Error in optimized data loading:", error);
      throw error;
    }
  }

  /**
   * Performance monitoring for batch operations
   */
  static getPerformanceMetrics() {
    const activeOps = this.getAllActiveOperations();

    return {
      activeOperations: activeOps.length,
      queuedRequests: this.requestQueue.length,
      isProcessing: this.isProcessing,
      averageOperationTime: this.calculateAverageOperationTime(activeOps),
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Calculate average operation time
   */
  static calculateAverageOperationTime(operations) {
    if (operations.length === 0) return 0;

    const completedOps = operations.filter((op) => op.endTime);
    if (completedOps.length === 0) return 0;

    const totalTime = completedOps.reduce(
      (sum, op) => sum + (op.endTime - op.startTime),
      0
    );
    return Math.round(totalTime / completedOps.length);
  }

  /**
   * Get memory usage information
   */
  static getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024), // MB
      };
    }
    return null;
  }

  /**
   * Perform batch refresh of admin data with optimized loading
   * Main entry point for AdminPage refresh operations
   */
  static async performBatchRefresh(options = {}) {
    const {
      userFilters = {},
      includeContact = false,
      includeAnnouncements = false,
      forceRefresh = false,
    } = options;

    const operationId = this.generateOperationId();
    const startTime = Date.now();

    try {
      // Clear cache if force refresh is requested
      if (forceRefresh) {
        AdminCacheService.clearCache();
      }

      // Determine what data to load
      const dataTypes = ["users"];
      if (includeContact) dataTypes.push("contact");
      if (includeAnnouncements) dataTypes.push("announcements");

      // Use direct data loading instead of optimizeDataLoading since it has issues
      const loadPromises = [];

      // Load users data
      loadPromises.push(this.loadUsersOptimized());

      // Load contact data if requested
      if (includeContact) {
        loadPromises.push(this.loadContactDataOptimized());
      }

      // Load announcements if requested
      if (includeAnnouncements) {
        loadPromises.push(this.loadAnnouncementsOptimized());
      }

      const results = await Promise.allSettled(loadPromises);

      // Extract results safely
      let userData =
        results[0]?.status === "fulfilled" ? results[0].value : null;
      let contactData =
        includeContact && results[1]?.status === "fulfilled"
          ? results[1].value
          : null;
      let announcements =
        includeAnnouncements &&
        results[includeContact ? 2 : 1]?.status === "fulfilled"
          ? results[includeContact ? 2 : 1].value
          : null;

      // Process user data with filters if needed
      let totalUsers = userData?.users?.length || userData?.length || 0;

      if (
        userData &&
        (userFilters.searchTerm ||
          userFilters.filterRole ||
          userFilters.filterStatus)
      ) {
        userData = this.applyUserFilters(userData, userFilters);
        totalUsers = userData?.users?.length || userData?.length || 0;
      }

      // Apply pagination if specified
      if (userData && userFilters.page && userFilters.limit) {
        const users = userData.users || userData;
        if (Array.isArray(users)) {
          const startIndex = (userFilters.page - 1) * userFilters.limit;
          const endIndex = startIndex + userFilters.limit;
          const paginatedUsers = users.slice(startIndex, endIndex);

          if (userData.users) {
            userData = { ...userData, users: paginatedUsers };
          } else {
            userData = paginatedUsers;
          }
        }
      }

      const endTime = Date.now();
      const performance = {
        operationId,
        duration: endTime - startTime,
        cacheHit: !forceRefresh,
        dataTypes,
        optimization: "batch_refresh",
      };

      return {
        success: true,
        data: {
          users: userData?.users || userData,
          userStats: userData?.stats || userData?.userStats,
          totalUsers,
          contactData,
          announcements,
        },
        performance,
      };
    } catch (error) {
      console.error("Batch refresh failed:", error);
      return {
        success: false,
        error: error.message,
        performance: {
          operationId,
          duration: Date.now() - startTime,
          failed: true,
        },
      };
    }
  }

  /**
   * Apply user filters to user data
   */
  static applyUserFilters(userData, filters) {
    // Handle undefined/null userData
    if (!userData) return null;

    const { searchTerm, filterRole, filterStatus, sortBy, sortOrder } = filters;

    let users = userData.users || userData;
    if (!Array.isArray(users)) return userData;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(
        (user) =>
          user.displayName?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.uid?.toLowerCase().includes(term)
      );
    }

    // Apply role filter
    if (filterRole && filterRole !== "all") {
      users = users.filter((user) => user.role === filterRole);
    }

    // Apply status filter
    if (filterStatus && filterStatus !== "all") {
      users = users.filter((user) => user.status === filterStatus);
    }

    // Apply sorting
    if (sortBy) {
      users.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        // Handle special cases
        if (sortBy === "createdAt" || sortBy === "lastLogin") {
          aVal = aVal?.toDate?.() || new Date(aVal) || new Date(0);
          bVal = bVal?.toDate?.() || new Date(bVal) || new Date(0);
        }

        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return {
      users,
      stats: userData.stats,
      userStats: userData.userStats,
    };
  }
}

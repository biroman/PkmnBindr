import { useState, useCallback, useMemo } from "react";
import {
  AdminOptimizedService,
  loadOptimizedDashboardData,
} from "../../services/AdminOptimizedService";

/**
 * Custom hook for managing admin optimization and batch operations
 *
 * This hook handles:
 * - Batch data loading with request deduplication
 * - Request queue management
 * - Performance monitoring
 * - Optimization statistics
 * - Firebase request reduction strategies
 *
 * @returns {Object} Optimization state and operations
 */
export const useAdminOptimization = () => {
  // Optimization state
  const [requestQueue, setRequestQueue] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState({
    totalRequests: 0,
    batchedRequests: 0,
    savedRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    lastOptimization: null,
  });

  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    requestsPerSecond: 0,
    averageBatchSize: 0,
    optimizationRatio: 0,
    lastMeasurement: null,
  });

  /**
   * Create a batched data loader with request deduplication
   */
  const createBatchedLoader = useCallback(() => {
    let requestQueue = [];
    let isProcessing = false;
    let batchTimeout = null;

    const processBatch = async () => {
      if (requestQueue.length === 0 || isProcessing) return;

      setIsProcessingBatch(true);
      isProcessing = true;

      const startTime = Date.now();
      const currentBatch = [...requestQueue];
      requestQueue = [];

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
          userRequests.length > 0
            ? AdminOptimizedService.fetchAllUsersOptimized({
                includeBatchStats: true,
                useAggregation: true,
              })
            : null,
          contactRequests.length > 0
            ? AdminOptimizedService.fetchAllContactDataOptimized()
            : null,
          announcementRequests.length > 0
            ? AdminOptimizedService.fetchAnnouncementsOptimized()
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
              results[resultIndex]?.reason || new Error("Batch request failed")
            );
          }
        });

        // Update optimization stats
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        setOptimizationStats((prev) => ({
          ...prev,
          totalRequests: prev.totalRequests + currentBatch.length,
          batchedRequests: prev.batchedRequests + 1,
          savedRequests:
            prev.savedRequests + Math.max(0, currentBatch.length - 3), // Saved requests by batching
          averageResponseTime:
            (prev.averageResponseTime * prev.batchedRequests + responseTime) /
            (prev.batchedRequests + 1),
          lastOptimization: new Date(),
        }));
      } catch (error) {
        currentBatch.forEach((request) => request.reject(error));
      } finally {
        setIsProcessingBatch(false);
        isProcessing = false;

        // Process any new requests that came in
        if (requestQueue.length > 0) {
          setTimeout(processBatch, 50);
        }
      }
    };

    return {
      queueRequest: (type, forceRefresh = false) => {
        return new Promise((resolve, reject) => {
          requestQueue.push({ type, forceRefresh, resolve, reject });

          // Debounce batch processing
          if (batchTimeout) clearTimeout(batchTimeout);
          batchTimeout = setTimeout(processBatch, 100);
        });
      },
    };
  }, []);

  /**
   * Batch loader singleton
   */
  const batchLoader = useMemo(
    () => createBatchedLoader(),
    [createBatchedLoader]
  );

  /**
   * Load data with change detection and optimization
   * @param {boolean} forceRefresh - Force refresh ignoring cache
   */
  const loadDataWithOptimization = useCallback(
    async (forceRefresh = false) => {
      const startTime = Date.now();

      try {
        // Use the optimized service that handles caching and batching internally
        const result = await loadOptimizedDashboardData(forceRefresh);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Update performance metrics
        setPerformanceMetrics((prev) => {
          const requestCount = prev.requestsPerSecond * 60 + 1; // Approximate requests per minute
          return {
            requestsPerSecond: requestCount / 60,
            averageBatchSize: (prev.averageBatchSize + 1) / 2, // Simple moving average
            optimizationRatio:
              optimizationStats.savedRequests /
              Math.max(1, optimizationStats.totalRequests),
            lastMeasurement: new Date(),
          };
        });

        return result;
      } catch (error) {
        console.error("Error in optimized data loading:", error);
        throw error;
      }
    },
    [optimizationStats]
  );

  /**
   * Queue a request for batch processing
   * @param {string} type - Request type (users, contact, announcements)
   * @param {boolean} forceRefresh - Force refresh
   * @returns {Promise} Promise that resolves with the data
   */
  const queueBatchRequest = useCallback(
    (type, forceRefresh = false) => {
      return batchLoader.queueRequest(type, forceRefresh);
    },
    [batchLoader]
  );

  /**
   * Optimize user data loading with pagination and filtering
   * @param {Object} options - Loading options
   */
  const optimizeUserLoading = useCallback(async (options = {}) => {
    const {
      page = 1,
      limit = 20,
      useAggregation = true,
      includeBatchStats = true,
      filters = {},
    } = options;

    try {
      const result = await AdminOptimizedService.fetchAllUsersOptimized({
        page,
        limit,
        useAggregation,
        includeBatchStats,
        filters,
      });

      // Track cache hits
      if (result.fromCache) {
        setOptimizationStats((prev) => ({
          ...prev,
          cacheHits: prev.cacheHits + 1,
        }));
      }

      return result;
    } catch (error) {
      console.error("Error in optimized user loading:", error);
      throw error;
    }
  }, []);

  /**
   * Deduplicate requests by type and parameters
   * @param {Array} requests - Array of requests to deduplicate
   */
  const deduplicateRequests = useCallback((requests) => {
    const seen = new Map();
    const deduplicated = [];

    requests.forEach((request) => {
      const key = `${request.type}-${JSON.stringify(request.params || {})}`;

      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicated.push(request);
      }
    });

    const savedRequests = requests.length - deduplicated.length;

    if (savedRequests > 0) {
      setOptimizationStats((prev) => ({
        ...prev,
        savedRequests: prev.savedRequests + savedRequests,
      }));
    }

    return deduplicated;
  }, []);

  /**
   * Measure and track performance
   * @param {Function} operation - Operation to measure
   * @param {string} operationName - Name of the operation
   */
  const measurePerformance = useCallback(
    async (operation, operationName = "operation") => {
      const startTime = performance.now();

      try {
        const result = await operation();

        const endTime = performance.now();
        const duration = endTime - startTime;

        console.log(
          `Performance: ${operationName} completed in ${duration.toFixed(2)}ms`
        );

        // Update performance metrics
        setPerformanceMetrics((prev) => ({
          ...prev,
          averageResponseTime: ((prev.averageResponseTime || 0) + duration) / 2,
          lastMeasurement: new Date(),
        }));

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        console.error(
          `Performance: ${operationName} failed after ${duration.toFixed(2)}ms`,
          error
        );
        throw error;
      }
    },
    []
  );

  /**
   * Get optimization recommendations
   */
  const getOptimizationRecommendations = useCallback(() => {
    const recommendations = [];

    // Check cache hit rate
    if (
      optimizationStats.cacheHits /
        Math.max(1, optimizationStats.totalRequests) <
      0.3
    ) {
      recommendations.push({
        type: "cache",
        priority: "high",
        message:
          "Low cache hit rate detected. Consider increasing cache duration or improving cache keys.",
        action: "Review caching strategy",
      });
    }

    // Check batch efficiency
    if (
      optimizationStats.savedRequests /
        Math.max(1, optimizationStats.totalRequests) <
      0.2
    ) {
      recommendations.push({
        type: "batching",
        priority: "medium",
        message: "Low batching efficiency. Consider combining more requests.",
        action: "Implement request batching",
      });
    }

    // Check response time
    if (optimizationStats.averageResponseTime > 2000) {
      recommendations.push({
        type: "performance",
        priority: "high",
        message:
          "High average response time detected. Consider optimizing queries.",
        action: "Optimize database queries",
      });
    }

    return recommendations;
  }, [optimizationStats]);

  /**
   * Reset optimization statistics
   */
  const resetOptimizationStats = useCallback(() => {
    setOptimizationStats({
      totalRequests: 0,
      batchedRequests: 0,
      savedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      lastOptimization: null,
    });

    setPerformanceMetrics({
      requestsPerSecond: 0,
      averageBatchSize: 0,
      optimizationRatio: 0,
      lastMeasurement: null,
    });
  }, []);

  /**
   * Get optimization summary
   */
  const optimizationSummary = useMemo(() => {
    const totalRequests = optimizationStats.totalRequests;
    const savedRequests = optimizationStats.savedRequests;
    const cacheHits = optimizationStats.cacheHits;

    return {
      efficiency: totalRequests > 0 ? (savedRequests / totalRequests) * 100 : 0,
      cacheHitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
      averageResponseTime: optimizationStats.averageResponseTime,
      totalOptimizations: optimizationStats.batchedRequests,
      recommendations: getOptimizationRecommendations(),
    };
  }, [optimizationStats, getOptimizationRecommendations]);

  return {
    // Batch operations
    queueBatchRequest,
    loadDataWithOptimization,
    optimizeUserLoading,
    deduplicateRequests,

    // Performance measurement
    measurePerformance,

    // State
    requestQueue,
    isProcessingBatch,
    optimizationStats,
    performanceMetrics,

    // Analytics
    optimizationSummary,
    getOptimizationRecommendations,

    // Utilities
    resetOptimizationStats,

    // Computed values
    isOptimizationActive: optimizationStats.batchedRequests > 0,
    hasOptimizationData: optimizationStats.totalRequests > 0,
  };
};

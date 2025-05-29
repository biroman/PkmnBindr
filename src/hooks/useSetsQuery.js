import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSets,
  fetchSet,
  queryKeys,
  getCacheConfig,
} from "../services/api";

// ===== SETS QUERIES =====

/**
 * Hook to fetch all Pokemon sets
 * Replaces the manual fetching in SetSelector.jsx
 */
export const useSets = (options = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.sets,
    queryFn: fetchSets,
    enabled,
    ...getCacheConfig("sets"),
    select: (data) => {
      // Sort by release date (newest first) and add any additional processing
      return data.sort(
        (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)
      );
    },
  });
};

/**
 * Hook to fetch a single set by ID
 * Useful for getting detailed set information
 */
export const useSet = (setId, options = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.set(setId),
    queryFn: () => fetchSet(setId),
    enabled: enabled && !!setId,
    ...getCacheConfig("sets"),
  });
};

/**
 * Hook for filtered sets based on search term
 * Filters cached sets data instead of making new API calls
 */
export const useFilteredSets = (searchTerm = "", options = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: [...queryKeys.sets, "filtered", searchTerm],
    queryFn: fetchSets,
    enabled,
    ...getCacheConfig("sets"),
    select: (data) => {
      const sorted = data.sort(
        (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)
      );

      if (!searchTerm.trim()) {
        return sorted;
      }

      const term = searchTerm.toLowerCase();
      return sorted.filter(
        (set) =>
          set.name.toLowerCase().includes(term) ||
          set.series.toLowerCase().includes(term)
      );
    },
  });
};

// ===== UTILITY HOOKS =====

/**
 * Hook to get sets from cache without triggering network requests
 * Useful for quick access to already loaded data
 */
export const useCachedSets = () => {
  const queryClient = useQueryClient();

  return {
    getSets: () => queryClient.getQueryData(queryKeys.sets),
    getSet: (setId) => queryClient.getQueryData(queryKeys.set(setId)),
    findSetByName: (name) => {
      const sets = queryClient.getQueryData(queryKeys.sets);
      return sets?.find((set) => set.name.toLowerCase() === name.toLowerCase());
    },
    findSetById: (id) => {
      const sets = queryClient.getQueryData(queryKeys.sets);
      return sets?.find((set) => set.id === id);
    },
  };
};

/**
 * Hook to prefetch sets for better UX
 * Can be called on app initialization or strategic points
 */
export const usePrefetchSets = () => {
  const queryClient = useQueryClient();

  return {
    prefetchSets: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.sets,
        queryFn: fetchSets,
        ...getCacheConfig("sets"),
      });
    },
    prefetchSet: (setId) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.set(setId),
        queryFn: () => fetchSet(setId),
        ...getCacheConfig("sets"),
      });
    },
  };
};

/**
 * Hook to refresh sets data
 * Useful for manual refresh or after detecting stale data
 */
export const useRefreshSets = () => {
  const queryClient = useQueryClient();

  return {
    refreshSets: () => {
      queryClient.invalidateQueries(queryKeys.sets);
    },
    refreshSet: (setId) => {
      queryClient.invalidateQueries(queryKeys.set(setId));
    },
    refreshAllSets: () => {
      queryClient.invalidateQueries(["sets"]);
    },
  };
};

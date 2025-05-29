import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCards,
  searchCards,
  queryKeys,
  getCacheConfig,
} from "../services/api";
import { processCards as processCardsUtil } from "../utils/processCards";
import {
  addCustomCard,
  removeCustomCard,
  reorderCustomCards,
  getCustomCards,
} from "../utils/storageUtils";
import logger from "../utils/logger";
import { useState, useEffect, useCallback } from "react";
import { parseCardList } from "../utils/parseCardList";
import {
  getSetFromCache,
  saveSetToCache,
  updateHistoryWithFinalState,
  getBinderHistory,
  addHistoryEntry,
  saveBinder,
  getAllBinders,
  throttleApiCall,
  getApiDelay,
  recordApiCall,
} from "../utils/storageUtilsIndexedDB";

// ===== CARDS QUERIES =====

/**
 * Hook to fetch cards for a specific set
 * Replaces the manual fetching in useCards.js
 */
export const useSetCards = (setId, options = {}) => {
  const { enabled = true, processCards = true } = options;
  const shouldEnable = Boolean(enabled && !!setId);

  return useQuery({
    queryKey: queryKeys.cardsBySet(setId),
    queryFn: () => fetchCards(setId),
    enabled: shouldEnable,
    ...getCacheConfig("cards"),
    select: processCards ? (data) => processCardsUtil(data) : undefined,
  });
};

/**
 * Hook for card search functionality
 * Replaces the search logic in CardSearch.jsx
 */
export const useCardSearch = (query, filters = {}, options = {}) => {
  const { enabled = true } = options;
  const hasQuery = !!(query?.trim() || filters.set);
  const shouldEnable = Boolean(enabled && hasQuery);

  return useQuery({
    queryKey: queryKeys.cardSearch(query, filters),
    queryFn: () => searchCards(query, filters),
    enabled: shouldEnable,
    ...getCacheConfig("search"),
  });
};

/**
 * Hook to get custom cards from local storage
 * For custom binders
 */
export const useCustomCards = (binderId, options = {}) => {
  const { enabled = true } = options;
  const shouldEnable = Boolean(enabled && !!binderId);

  return useQuery({
    queryKey: queryKeys.binderCards(binderId),
    queryFn: () => {
      const cards = getCustomCards(binderId);
      return cards || [];
    },
    enabled: shouldEnable,
    staleTime: 0, // Local storage data is always fresh
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};

// ===== CARD MUTATIONS =====

/**
 * Hook for adding cards to custom binders with optimistic updates
 */
export const useAddCardMutation = (binderId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ card, position }) => {
      try {
        const result = await addCustomCard(binderId, card, position);
        if (!result.success) {
          throw new Error(result.error || "Failed to add card");
        }
        return result;
      } catch (err) {
        logger.error("Failed to add card:", err);
        return { success: false, error: err.message };
      }
    },
    onMutate: async ({ card, position }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(queryKeys.binderCards(binderId));

      // Snapshot previous value
      const previousCards = queryClient.getQueryData(
        queryKeys.binderCards(binderId)
      );

      // Optimistically update UI
      queryClient.setQueryData(queryKeys.binderCards(binderId), (old = []) => {
        const newCards = [...old];
        if (position !== null && position >= 0) {
          newCards.splice(position, 0, card);
        } else {
          newCards.push(card);
        }
        return newCards;
      });

      return { previousCards };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCards) {
        queryClient.setQueryData(
          queryKeys.binderCards(binderId),
          context.previousCards
        );
      }
      logger.error("Failed to add card:", err);
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries(queryKeys.binderCards(binderId));
    },
  });
};

/**
 * Hook for removing cards from custom binders with optimistic updates
 */
export const useRemoveCardMutation = (binderId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardIndex) => {
      const result = await removeCustomCard(binderId, cardIndex);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove card");
      }
      return result;
    },
    onMutate: async (cardIndex) => {
      await queryClient.cancelQueries(queryKeys.binderCards(binderId));

      const previousCards = queryClient.getQueryData(
        queryKeys.binderCards(binderId)
      );

      queryClient.setQueryData(queryKeys.binderCards(binderId), (old = []) => {
        return old.filter((_, index) => index !== cardIndex);
      });

      return { previousCards };
    },
    onError: (err, variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(
          queryKeys.binderCards(binderId),
          context.previousCards
        );
      }
      logger.error("Failed to remove card:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries(queryKeys.binderCards(binderId));
    },
  });
};

/**
 * Hook for reordering cards in custom binders with optimistic updates
 */
export const useReorderCardsMutation = (binderId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fromIndex, toIndex, isSwap = false }) => {
      const result = await reorderCustomCards(
        binderId,
        fromIndex,
        toIndex,
        isSwap
      );
      if (!result.success) {
        throw new Error(result.error || "Failed to reorder cards");
      }
      return result;
    },
    onMutate: async ({ fromIndex, toIndex, isSwap }) => {
      await queryClient.cancelQueries(queryKeys.binderCards(binderId));

      const previousCards = queryClient.getQueryData(
        queryKeys.binderCards(binderId)
      );

      queryClient.setQueryData(queryKeys.binderCards(binderId), (old = []) => {
        const newCards = [...old];

        if (isSwap) {
          // Swap two cards
          [newCards[fromIndex], newCards[toIndex]] = [
            newCards[toIndex],
            newCards[fromIndex],
          ];
        } else {
          // Move card from one position to another
          const [movedCard] = newCards.splice(fromIndex, 1);
          newCards.splice(toIndex, 0, movedCard);
        }

        return newCards;
      });

      return { previousCards };
    },
    onError: (err, variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(
          queryKeys.binderCards(binderId),
          context.previousCards
        );
      }
      logger.error("Failed to reorder cards:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries(queryKeys.binderCards(binderId));
    },
  });
};

// ===== UTILITY HOOKS =====

/**
 * Hook to invalidate and refetch card data
 * Useful for manual refresh or after external changes
 */
export const useRefreshCards = () => {
  const queryClient = useQueryClient();

  return {
    refreshSetCards: (setId) => {
      queryClient.invalidateQueries(queryKeys.cardsBySet(setId));
    },
    refreshCustomCards: (binderId) => {
      queryClient.invalidateQueries(queryKeys.binderCards(binderId));
    },
    refreshSearchResults: () => {
      queryClient.invalidateQueries(["cards", "search"]);
    },
    refreshAllCards: () => {
      queryClient.invalidateQueries(queryKeys.cards);
    },
  };
};

/**
 * Hook to prefetch cards for better UX
 * Can be used when hovering over sets or preparing to load data
 */
export const usePrefetchCards = () => {
  const queryClient = useQueryClient();

  return {
    prefetchSetCards: (setId) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.cardsBySet(setId),
        queryFn: () => fetchCards(setId),
        ...getCacheConfig("cards"),
      });
    },
    prefetchCustomCards: (binderId) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.binderCards(binderId),
        queryFn: () => getCustomCards(binderId) || [],
        staleTime: 0,
      });
    },
  };
};

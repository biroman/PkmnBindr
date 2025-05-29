import { useState, useCallback, useMemo } from "react";
import { useSetCards, useCustomCards } from "./useCardsQuery";
import { processCards } from "../utils/processCards";
import {
  getCustomCards,
  addCustomCard,
  removeCustomCard,
  reorderCustomCards,
  updateHistoryWithFinalState,
  getBinderHistory,
  addHistoryEntry,
  saveBinder,
  getAllBinders,
  throttleApiCall,
  getApiDelay,
  recordApiCall,
} from "../utils/storageUtilsIndexedDB";

/**
 * Enhanced useCards hook that integrates React Query for API calls
 * while maintaining backward compatibility with existing functionality
 */
const useCardsWithQuery = () => {
  // Local state for display options and UI state
  const [selectedSet, setSelectedSet] = useState(null);
  const [displayOptions, setDisplayOptions] = useState({
    showReverseHolos: false,
    sortDirection: "asc",
  });
  const [targetCardPosition, setTargetCardPosition] = useState(null);

  // React Query for set cards (when selectedSet is available)
  const {
    data: setCardsData = [],
    isLoading: setCardsLoading,
    error: setCardsError,
    refetch: refetchSetCards,
  } = useSetCards(selectedSet?.id, {
    enabled: !!selectedSet,
    processCards: false, // We'll process manually for consistency
  });

  // Local storage state for custom cards (we'll use React Query for this too eventually)
  const [customCards, setCustomCards] = useState([]);
  const [customBinderId, setCustomBinderId] = useState(null);

  // React Query for custom cards
  const {
    data: customCardsData = [],
    isLoading: customCardsLoading,
    refetch: refetchCustomCards,
  } = useCustomCards(customBinderId, {
    enabled: !!customBinderId,
  });

  // Determine current data source and state
  const isCustomBinder = !!customBinderId;
  const cards = isCustomBinder ? customCardsData : setCardsData;
  const rawCards = isCustomBinder ? [] : setCardsData;
  const loading = isCustomBinder ? customCardsLoading : setCardsLoading;
  const error = isCustomBinder ? "" : setCardsError?.message || "";

  // Process cards with display options
  const processedCards = useMemo(() => {
    if (!cards?.length) return [];

    if (isCustomBinder) {
      return cards; // Custom cards are already processed
    }

    // Process set cards with display options
    const processed = processCards(cards, displayOptions);

    return processed;
  }, [cards, displayOptions, isCustomBinder]);

  // Enhanced handlers with React Query integration
  const handleSearch = useCallback(async () => {
    if (!selectedSet) return { success: false, error: "No set selected" };

    try {
      const result = await refetchSetCards();
      if (result.data) {
        return {
          success: true,
          cardsData: processCards(result.data, displayOptions),
          rawCardsData: result.data,
        };
      }
      return { success: false, error: "No data received" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [selectedSet, refetchSetCards, displayOptions]);

  const handleAddCard = useCallback(
    async (card, position, currentBinder, layout, currentPage) => {
      if (!currentBinder || currentBinder.binderType !== "custom") {
        return {
          success: false,
          error: "Can only add cards to custom binders",
        };
      }

      try {
        // Calculate actual position based on current page and layout
        const actualPosition =
          position !== null ? position : currentPage * layout.cards;

        const result = await addCustomCard(
          currentBinder.id,
          card,
          actualPosition
        );

        if (result.success) {
          // Refetch to get updated data
          await refetchCustomCards();
          return {
            success: true,
            updatedCards: result.updatedCards,
          };
        }

        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    [refetchCustomCards]
  );

  const handleRemoveCard = useCallback(
    async (cardIndex, currentBinder) => {
      if (!currentBinder || currentBinder.binderType !== "custom") {
        return {
          success: false,
          error: "Can only remove cards from custom binders",
        };
      }

      try {
        const result = await removeCustomCard(currentBinder.id, cardIndex);

        if (result.success) {
          await refetchCustomCards();
          return {
            success: true,
            updatedCards: result.updatedCards,
          };
        }

        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    [refetchCustomCards]
  );

  const handleReorderCards = useCallback(
    async (fromIndex, toIndex, isSwap, currentBinder) => {
      if (!currentBinder || currentBinder.binderType !== "custom") {
        return {
          success: false,
          error: "Can only reorder cards in custom binders",
        };
      }

      try {
        const result = await reorderCustomCards(
          currentBinder.id,
          fromIndex,
          toIndex,
          isSwap
        );

        if (result.success) {
          await refetchCustomCards();
          return {
            success: true,
            updatedCards: result.updatedCards,
          };
        }

        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    [refetchCustomCards]
  );

  const handleMoveCards = useCallback(
    async (
      selectedCardData,
      targetPageIndex,
      moveOption,
      currentBinder,
      layout
    ) => {
      // This is a complex operation that might need more specific implementation
      // For now, return the existing functionality
      return {
        success: false,
        error:
          "Move cards functionality needs to be implemented with React Query",
      };
    },
    []
  );

  // Card search modal handlers
  const handleOpenCardSearch = useCallback((position = null) => {
    setTargetCardPosition(position);
  }, []);

  const handleCloseCardSearch = useCallback(() => {
    setTargetCardPosition(null);
  }, []);

  // Utility functions
  const resetCards = useCallback(() => {
    setSelectedSet(null);
    setCustomBinderId(null);
    setCustomCards([]);
    setTargetCardPosition(null);
  }, []);

  const loadCustomCards = useCallback((binderId) => {
    setCustomBinderId(binderId);
    setSelectedSet(null); // Clear any selected set
  }, []);

  const loadSetCards = useCallback(async (setData, processCardsFunc) => {
    setSelectedSet(setData);
    setCustomBinderId(null); // Clear custom binder

    // The React Query will automatically fetch the data
    return { success: true };
  }, []);

  // For backward compatibility with existing code
  const set = selectedSet;
  const setCards = useCallback(
    (newCards) => {
      if (isCustomBinder) {
        setCustomCards(newCards);
      }
      // For set cards, React Query manages the state
    },
    [isCustomBinder]
  );

  return {
    // State
    selectedSet,
    set,
    cards: processedCards,
    rawCards,
    loading,
    error,
    displayOptions,
    targetCardPosition,

    // Data management
    handleSearch,
    handleAddCard,
    handleRemoveCard,
    handleReorderCards,
    handleOpenCardSearch,
    handleCloseCardSearch,
    handleMoveCards,
    resetCards,
    loadCustomCards,
    loadSetCards,
    setSelectedSet,
    setDisplayOptions,
    setCards,
    processCards,

    // React Query specific
    refetchSetCards,
    refetchCustomCards,
    setCardsLoading,
    customCardsLoading,
    setCardsError,
  };
};

export default useCardsWithQuery;

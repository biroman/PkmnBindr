import { useState, useEffect } from "react";
import { parseCardList } from "../utils/parseCardList";
import {
  getSetFromCache,
  saveSetToCache,
  getCustomCards,
  addCustomCard,
  removeCustomCard,
  reorderCustomCards,
  updateHistoryWithFinalState,
  getBinderHistory,
  addHistoryEntry,
  saveBinder,
  getBinders,
  throttleApiCall,
  getApiDelay,
  recordApiCall,
} from "../utils/storageUtils";
import logger from "../utils/logger";

const useCards = () => {
  const [selectedSet, setSelectedSet] = useState(null);
  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [rawCards, setRawCards] = useState([]); // Store the original unprocessed cards
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [displayOptions, setDisplayOptions] = useState({
    showReverseHolos: false,
    sortDirection: "asc",
  });
  const [targetCardPosition, setTargetCardPosition] = useState(null);

  const processCards = (rawCards) => {
    let processedCards = [...rawCards];

    // Add reverse holo versions for common and uncommon cards if enabled
    if (displayOptions.showReverseHolos) {
      const reverseHoloCards = rawCards
        .filter((card) =>
          ["Common", "Uncommon", "Rare", "Rare Holo"].includes(card.rarity)
        )
        .map((card) => ({
          ...card,
          id: `${card.id}_reverse`,
          isReverseHolo: true,
        }));
      processedCards = [...processedCards, ...reverseHoloCards];
    }

    // Sort cards based on number and reverse holo status
    processedCards.sort((a, b) => {
      // Extract base number and any letter suffix
      const [, aBase, aLetter] = a.number.match(/(\d+)([a-zA-Z])?/) || [];
      const [, bBase, bLetter] = b.number.match(/(\d+)([a-zA-Z])?/) || [];

      const aNum = parseInt(aBase);
      const bNum = parseInt(bBase);

      if (aNum === bNum) {
        // First sort by letter suffix (no letter comes before letters)
        if ((!aLetter && bLetter) || (aLetter && !bLetter)) {
          return !aLetter ? -1 : 1;
        }
        if (aLetter !== bLetter) {
          return (aLetter || "").localeCompare(bLetter || "");
        }
        // If numbers and letters are the same, reverse holos come after regular cards
        return (a.isReverseHolo ? 1 : 0) - (b.isReverseHolo ? 1 : 0);
      }

      return displayOptions.sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    });

    return processedCards;
  };

  useEffect(() => {
    if (rawCards.length > 0) {
      const processedCards = processCards(rawCards);
      setCards(processedCards);
    }
  }, [displayOptions]);

  const handleSearch = async () => {
    if (!selectedSet) return;

    setLoading(true);
    setError("");

    try {
      let cardsData = getSetFromCache(selectedSet.id);

      if (!cardsData) {
        const cardsResponse = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=set.id:${selectedSet.id}&orderBy=number`
        );
        const response = await cardsResponse.json();
        cardsData = response.data;
        saveSetToCache(selectedSet.id, cardsData);
      }

      setRawCards(cardsData); // Store the original cards
      const processedCards = processCards(cardsData);
      setCards(processedCards);
      setSet(selectedSet);

      return {
        success: true,
        cardsData: processedCards,
        rawCardsData: cardsData,
      };
    } catch (err) {
      setError(err.message);
      setSet(null);
      setCards([]);
      setRawCards([]);
      return {
        success: false,
        error: err.message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Custom card handlers
  const handleAddCard = (
    card,
    position = null,
    currentBinder,
    layout,
    currentPage
  ) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      // Use targetCardPosition if set (from clicking specific empty slot), otherwise use provided position
      let targetPosition =
        targetCardPosition !== null ? targetCardPosition : position;

      if (targetPosition === null) {
        // Calculate current page range
        const cardsPerPage = layout.cards;
        let startIndex, endIndex;

        if (currentPage === 0) {
          // Right page only (page 0)
          startIndex = 0;
          endIndex = cardsPerPage - 1;
        } else {
          // Calculate for left and right pages
          const leftPhysicalPage = 2 * currentPage - 1;
          const rightPhysicalPage = 2 * currentPage;

          // Start from left page, end at right page
          startIndex = leftPhysicalPage * cardsPerPage;
          endIndex = (rightPhysicalPage + 1) * cardsPerPage - 1;
        }

        // Find first empty spot in current page range
        const currentCards = getCustomCards(currentBinder.id);
        for (let i = startIndex; i <= endIndex; i++) {
          if (!currentCards[i]) {
            targetPosition = i;
            break;
          }
        }

        // If no empty spot on current page, find first empty spot globally
        if (targetPosition === null) {
          const emptyIndex = currentCards.findIndex((card) => card === null);
          if (emptyIndex >= 0) {
            targetPosition = emptyIndex;
          }
        }
      }

      const addedCard = addCustomCard(currentBinder.id, card, targetPosition);
      if (addedCard) {
        // Update history with final state after the action
        updateHistoryWithFinalState(currentBinder.id);

        const updatedCards = getCustomCards(currentBinder.id);
        setCards(updatedCards);

        // Clear the target position after adding the card
        setTargetCardPosition(null);

        return {
          success: true,
          updatedCards,
          updatedHistory: getBinderHistory(currentBinder.id),
        };
      }
      return { success: false };
    }
    return { success: false };
  };

  const handleRemoveCard = (cardIndex, currentBinder) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      const success = removeCustomCard(currentBinder.id, cardIndex);
      if (success) {
        // Update history with final state after the action
        updateHistoryWithFinalState(currentBinder.id);

        const updatedCards = getCustomCards(currentBinder.id);
        setCards(updatedCards);

        return {
          success: true,
          updatedCards,
          updatedHistory: getBinderHistory(currentBinder.id),
        };
      }
    }
    return { success: false };
  };

  const handleReorderCards = (
    fromIndex,
    toIndex,
    isSwap = false,
    currentBinder
  ) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      const success = reorderCustomCards(
        currentBinder.id,
        fromIndex,
        toIndex,
        isSwap
      );
      if (success) {
        // Update history with final state after the action
        updateHistoryWithFinalState(currentBinder.id);

        const updatedCards = getCustomCards(currentBinder.id);
        setCards(updatedCards);

        return {
          success: true,
          updatedCards,
          updatedHistory: getBinderHistory(currentBinder.id),
        };
      }
    }
    return { success: false };
  };

  const handleOpenCardSearch = (position = null) => {
    setTargetCardPosition(position);
    return true;
  };

  const handleCloseCardSearch = () => {
    setTargetCardPosition(null); // Clear target position when closing
    return true;
  };

  const handleMoveCards = async (
    selectedCardData,
    targetPageIndex,
    moveOption,
    currentBinder,
    layout
  ) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      try {
        // Get current cards
        const currentCards = getCustomCards(currentBinder.id);
        const newCards = [...currentCards];

        // Sort selected cards by their current position (descending) to avoid index issues when removing
        const sortedSelectedCards = selectedCardData.sort(
          (a, b) => b.globalIndex - a.globalIndex
        );

        // Calculate target position based on page and move option
        const cardsPerPage = layout.cards;
        let targetPosition;

        if (moveOption === "newPage") {
          // Add to the end of the collection
          targetPosition = newCards.length;
        } else {
          // Calculate position based on target page
          if (targetPageIndex === 0) {
            // Cover page (right side only)
            targetPosition = 0;
          } else {
            // Calculate for left and right pages
            const leftPhysicalPage = 2 * targetPageIndex - 1;
            targetPosition = leftPhysicalPage * cardsPerPage;
          }

          if (moveOption === "fill") {
            // Find first empty slot on target page
            const pageStart = targetPosition;
            const pageEnd =
              targetPosition +
              (targetPageIndex === 0 ? cardsPerPage : cardsPerPage * 2);

            for (let i = pageStart; i < pageEnd && i < newCards.length; i++) {
              if (!newCards[i]) {
                targetPosition = i;
                break;
              }
            }
          }
        }

        // Create a comprehensive history entry for the bulk move operation
        const cardNames = selectedCardData.map(
          (cardData) => cardData.card.name
        );
        const fromPositions = selectedCardData.map(
          (cardData) => cardData.globalIndex
        );

        addHistoryEntry(currentBinder.id, "bulk_move", {
          cardNames: cardNames,
          cardCount: selectedCardData.length,
          fromPositions: fromPositions,
          targetPosition: targetPosition,
          targetPage: targetPageIndex + 1, // Display as 1-indexed
          moveOption: moveOption,
          description: `Moved ${selectedCardData.length} card${
            selectedCardData.length !== 1 ? "s" : ""
          } to page ${targetPageIndex + 1}`,
        });

        // Remove selected cards from their current positions
        const cardsToMove = [];
        sortedSelectedCards.forEach((cardData) => {
          if (newCards[cardData.globalIndex]) {
            cardsToMove.unshift(newCards[cardData.globalIndex]); // Add to beginning to maintain order
            newCards[cardData.globalIndex] = null;
          }
        });

        // Insert cards at target position
        if (moveOption === "insert" || moveOption === "newPage") {
          // Insert and shift existing cards
          cardsToMove.forEach((card, index) => {
            newCards.splice(targetPosition + index, 0, card);
          });
        } else if (moveOption === "fill") {
          // Fill empty slots only
          let currentTargetPos = targetPosition;
          cardsToMove.forEach((card) => {
            // Find next empty slot
            while (
              currentTargetPos < newCards.length &&
              newCards[currentTargetPos]
            ) {
              currentTargetPos++;
            }
            if (currentTargetPos < newCards.length) {
              newCards[currentTargetPos] = card;
            } else {
              newCards.push(card);
            }
            currentTargetPos++;
          });
        }

        // Remove any trailing null values
        while (newCards.length > 0 && newCards[newCards.length - 1] === null) {
          newCards.pop();
        }

        // Update the binder with new card arrangement
        const updatedBinder = {
          ...currentBinder,
          customCards: newCards,
          updatedAt: new Date().toISOString(),
        };

        // Save to storage
        saveBinder(updatedBinder);

        // Update history with final state after the action
        updateHistoryWithFinalState(currentBinder.id);

        // Update state
        setCards(newCards);

        return {
          success: true,
          updatedCards: newCards,
          updatedBinder,
          updatedHistory: getBinderHistory(currentBinder.id),
        };
      } catch (error) {
        logger.error("Error moving cards:", error);
        return { success: false, error };
      }
    }
    return { success: false };
  };

  const resetCards = () => {
    setSelectedSet(null);
    setSet(null);
    setCards([]);
    setRawCards([]);
    setError("");
    setTargetCardPosition(null);
  };

  const loadCustomCards = (binderId) => {
    const savedCustomCards = getCustomCards(binderId);
    setCards(savedCustomCards);
  };

  const loadSetCards = async (setData, processCardsFunc) => {
    setLoading(true);
    setError("");

    // Retry function with exponential backoff
    const fetchWithRetry = async (url, maxRetries = 3) => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(url);

          // Check for rate limit status codes
          if (response.status === 429 || response.status === 503) {
            if (attempt === maxRetries) {
              throw new Error(
                "API quota exceeded. Please wait a moment before trying again."
              );
            }

            // Wait with exponential backoff: 1s, 2s, 4s
            const waitTime = Math.pow(2, attempt) * 1000;
            logger.debug(
              `Rate limited. Retrying in ${waitTime}ms... (attempt ${
                attempt + 1
              }/${maxRetries + 1})`
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          if (attempt === maxRetries) {
            throw error;
          }

          // For network errors, also retry with backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          logger.debug(
            `Network error. Retrying in ${waitTime}ms... (attempt ${
              attempt + 1
            }/${maxRetries + 1})`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    };

    try {
      let cardsData = getSetFromCache(setData.id);

      if (!cardsData) {
        logger.debug(`Fetching cards for set: ${setData.name} (${setData.id})`);

        // Add throttling and smart delays
        await throttleApiCall();
        const additionalDelay = getApiDelay();
        if (additionalDelay > 0) {
          logger.debug(
            `Adding ${additionalDelay}ms delay due to recent API usage...`
          );
          await new Promise((resolve) => setTimeout(resolve, additionalDelay));
        }

        recordApiCall();
        const response = await fetchWithRetry(
          `https://api.pokemontcg.io/v2/cards?q=set.id:${setData.id}&orderBy=number`
        );
        cardsData = response.data;
        saveSetToCache(setData.id, cardsData);
        logger.debug(
          `Successfully cached ${cardsData.length} cards for ${setData.name}`
        );
      } else {
        logger.debug(`Using cached cards for set: ${setData.name}`);
      }

      setRawCards(cardsData); // Store the original cards
      const processedCards = processCardsFunc
        ? processCardsFunc(cardsData)
        : processCards(cardsData);
      setCards(processedCards);
      setSet(setData);

      return {
        success: true,
        cardsData: processedCards,
        rawCardsData: cardsData,
      };
    } catch (err) {
      const errorMessage = err.message;
      setError(errorMessage);
      setSet(null);
      setCards([]);
      setRawCards([]);

      // Log detailed error info
      logger.error(`Failed to load set "${setData.name}":`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    selectedSet,
    set,
    cards,
    rawCards,
    loading,
    error,
    displayOptions,
    targetCardPosition,

    // Actions
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
    processCards,

    // Setters
    setSelectedSet,
    setSet,
    setCards,
    setRawCards,
    setLoading,
    setError,
    setDisplayOptions,
    setTargetCardPosition,
  };
};

export default useCards;

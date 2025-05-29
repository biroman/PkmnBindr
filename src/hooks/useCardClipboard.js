import { useState, useEffect, useCallback } from "react";
import {
  getCardClipboard,
  addToCardClipboard,
  removeFromCardClipboard,
  clearCardClipboard,
  moveCardFromClipboard,
  getCustomCards,
  updateHistoryWithFinalState,
  getBinderHistory,
} from "../utils/storageUtilsIndexedDB";
import logger from "../utils/logger";

const useCardClipboard = () => {
  const [clipboardCards, setClipboardCards] = useState([]);
  const [isClipboardCollapsed, setIsClipboardCollapsed] = useState(true);

  // Initialize clipboard data
  useEffect(() => {
    const loadClipboard = async () => {
      const clipboard = await getCardClipboard();
      setClipboardCards(clipboard);
    };
    loadClipboard();
  }, []);

  const handleAddToClipboard = async (card) => {
    const success = await addToCardClipboard(card);
    if (success) {
      const clipboard = await getCardClipboard();
      setClipboardCards(clipboard);
    }
    return success;
  };

  const handleRemoveFromClipboard = async (index) => {
    const success = await removeFromCardClipboard(index);
    if (success) {
      const clipboard = await getCardClipboard();
      setClipboardCards(clipboard);
    }
    return success;
  };

  const handleClearClipboard = async () => {
    await clearCardClipboard();
    setClipboardCards([]);
  };

  const handleAddToCurrentPage = async (
    card,
    currentBinder,
    layout,
    currentPage
  ) => {
    if (currentBinder) {
      // Find the actual current index of the card in case the clipboard has changed
      const currentClipboard = await getCardClipboard();
      const actualIndex = currentClipboard.findIndex(
        (c) => c.id === card.id && c.isReverseHolo === card.isReverseHolo
      );

      if (actualIndex >= 0) {
        // Calculate first empty spot on current page
        let targetPosition = null;

        if (currentBinder.binderType === "custom") {
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
          const currentCards = await getCustomCards(currentBinder.id);
          for (let i = startIndex; i <= endIndex; i++) {
            if (!currentCards[i]) {
              targetPosition = i;
              break;
            }
          }
        }

        const result = await moveCardFromClipboard(
          actualIndex,
          currentBinder.id,
          targetPosition
        );

        if (result) {
          const clipboard = await getCardClipboard();
          setClipboardCards(clipboard);

          // Refresh custom cards if it's a custom binder
          if (currentBinder.binderType === "custom") {
            // Update history with final state after the action
            await updateHistoryWithFinalState(currentBinder.id);

            return {
              success: true,
              updatedCustomCards: await getCustomCards(currentBinder.id),
              updatedHistory: await getBinderHistory(currentBinder.id),
            };
          }
        }
        return { success: !!result };
      }
    }
    return { success: false };
  };

  const handleMoveFromClipboard = async (
    clipboardIndex,
    binderPosition,
    cardId,
    isReverseHolo,
    currentBinder
  ) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      // Find the actual current index of the card in case the clipboard has changed
      const currentClipboard = await getCardClipboard();
      const actualIndex = currentClipboard.findIndex(
        (c) => c.id === cardId && c.isReverseHolo === isReverseHolo
      );

      if (actualIndex >= 0) {
        const result = await moveCardFromClipboard(
          actualIndex,
          currentBinder.id,
          binderPosition
        );

        if (result) {
          const newClipboard = await getCardClipboard();
          setClipboardCards(newClipboard);

          // Update history with final state after the action
          await updateHistoryWithFinalState(currentBinder.id);

          return {
            success: true,
            updatedCustomCards: await getCustomCards(currentBinder.id),
            updatedHistory: await getBinderHistory(currentBinder.id),
          };
        }
      }
    }
    return { success: false };
  };

  // Synchronous wrapper functions for backward compatibility
  const handleAddToClipboardSync = (card) => {
    // Call the async version in the background
    handleAddToClipboard(card).catch((error) => {
      logger.error("Error adding to clipboard:", error);
    });
    return true; // Return immediately for backward compatibility
  };

  const handleRemoveFromClipboardSync = (index) => {
    // Call the async version in the background
    handleRemoveFromClipboard(index).catch((error) => {
      logger.error("Error removing from clipboard:", error);
    });
    return true; // Return immediately for backward compatibility
  };

  const handleClearClipboardSync = () => {
    // Call the async version in the background
    handleClearClipboard().catch((error) => {
      logger.error("Error clearing clipboard:", error);
    });
    return true; // Return immediately for backward compatibility
  };

  const handleToggleClipboard = () => {
    setIsClipboardCollapsed(!isClipboardCollapsed);
  };

  return {
    // State
    clipboardCards,
    isClipboardCollapsed,

    // Actions (sync wrappers for backward compatibility)
    handleAddToClipboard: handleAddToClipboardSync,
    handleRemoveFromClipboard: handleRemoveFromClipboardSync,
    handleClearClipboard: handleClearClipboardSync,
    handleAddToCurrentPage,
    handleMoveFromClipboard,
    handleToggleClipboard,

    // Async versions (for components that can handle async)
    handleAddToClipboardAsync: handleAddToClipboard,
    handleRemoveFromClipboardAsync: handleRemoveFromClipboard,
    handleClearClipboardAsync: handleClearClipboard,

    // Direct setters
    setClipboardCards,
    setIsClipboardCollapsed,
  };
};

export default useCardClipboard;

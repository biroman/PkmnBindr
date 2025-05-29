import { useState, useEffect } from "react";
import {
  getCardClipboard,
  addToCardClipboard,
  removeFromCardClipboard,
  clearCardClipboard,
  moveCardFromClipboard,
  getCustomCards,
  updateHistoryWithFinalState,
  getBinderHistory,
} from "../utils/storageUtils";

const useCardClipboard = () => {
  const [clipboardCards, setClipboardCards] = useState([]);
  const [isClipboardCollapsed, setIsClipboardCollapsed] = useState(true);

  // Initialize clipboard data
  useEffect(() => {
    setClipboardCards(getCardClipboard());
  }, []);

  const handleAddToClipboard = (card) => {
    const success = addToCardClipboard(card);
    if (success) {
      setClipboardCards(getCardClipboard());
    }
    return success;
  };

  const handleRemoveFromClipboard = (index) => {
    const success = removeFromCardClipboard(index);
    if (success) {
      setClipboardCards(getCardClipboard());
    }
    return success;
  };

  const handleClearClipboard = () => {
    clearCardClipboard();
    setClipboardCards([]);
  };

  const handleAddToCurrentPage = (card, currentBinder, layout, currentPage) => {
    if (currentBinder) {
      // Find the actual current index of the card in case the clipboard has changed
      const currentClipboard = getCardClipboard();
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
          const currentCards = getCustomCards(currentBinder.id);
          for (let i = startIndex; i <= endIndex; i++) {
            if (!currentCards[i]) {
              targetPosition = i;
              break;
            }
          }
        }

        const result = moveCardFromClipboard(
          actualIndex,
          currentBinder.id,
          targetPosition
        );

        if (result) {
          setClipboardCards(getCardClipboard());

          // Refresh custom cards if it's a custom binder
          if (currentBinder.binderType === "custom") {
            // Update history with final state after the action
            updateHistoryWithFinalState(currentBinder.id);

            return {
              success: true,
              updatedCustomCards: getCustomCards(currentBinder.id),
              updatedHistory: getBinderHistory(currentBinder.id),
            };
          }
        }
        return { success: !!result };
      }
    }
    return { success: false };
  };

  const handleMoveFromClipboard = (
    clipboardIndex,
    binderPosition,
    cardId,
    isReverseHolo,
    currentBinder
  ) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      // Find the actual current index of the card in case the clipboard has changed
      const currentClipboard = getCardClipboard();
      const actualIndex = currentClipboard.findIndex(
        (c) => c.id === cardId && c.isReverseHolo === isReverseHolo
      );

      if (actualIndex >= 0) {
        const result = moveCardFromClipboard(
          actualIndex,
          currentBinder.id,
          binderPosition
        );

        if (result) {
          const newClipboard = getCardClipboard();
          setClipboardCards(newClipboard);

          // Update history with final state after the action
          updateHistoryWithFinalState(currentBinder.id);

          return {
            success: true,
            updatedCustomCards: getCustomCards(currentBinder.id),
            updatedHistory: getBinderHistory(currentBinder.id),
          };
        }
      }
    }
    return { success: false };
  };

  const handleToggleClipboard = () => {
    setIsClipboardCollapsed(!isClipboardCollapsed);
  };

  return {
    // State
    clipboardCards,
    isClipboardCollapsed,

    // Actions
    handleAddToClipboard,
    handleRemoveFromClipboard,
    handleClearClipboard,
    handleAddToCurrentPage,
    handleMoveFromClipboard,
    handleToggleClipboard,

    // Direct setters
    setClipboardCards,
    setIsClipboardCollapsed,
  };
};

export default useCardClipboard;

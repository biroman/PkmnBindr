import { useState, useEffect } from "react";
import {
  getBinderHistory,
  revertToHistoryEntry,
  clearBinderHistory,
  navigateHistory,
  canNavigateHistory,
  getHistoryPosition,
  getCustomCards,
} from "../utils/storageUtils";

const useBinderHistory = () => {
  const [historyEntries, setHistoryEntries] = useState([]);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);

  const handleRevertToEntry = (currentBinder, entryId) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      const success = revertToHistoryEntry(currentBinder.id, entryId);
      if (success) {
        // Refresh the binder state
        const updatedCustomCards = getCustomCards(currentBinder.id);
        const updatedHistory = getBinderHistory(currentBinder.id);
        setHistoryEntries(updatedHistory);

        return {
          success: true,
          updatedCustomCards,
          updatedHistory,
        };
      }
    }
    return { success: false };
  };

  const handleClearHistory = (currentBinder) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      clearBinderHistory(currentBinder.id);
      setHistoryEntries([]);
    }
  };

  const handleNavigateHistory = (currentBinder, direction) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      const success = navigateHistory(currentBinder.id, direction);
      if (success) {
        // Refresh the binder state
        const updatedCustomCards = getCustomCards(currentBinder.id);
        const updatedHistory = getBinderHistory(currentBinder.id);
        setHistoryEntries(updatedHistory);

        return {
          success: true,
          updatedCustomCards,
          updatedHistory,
        };
      }
    }
    return { success: false };
  };

  const handleNavigateToPage = (targetPage, setCurrentPage) => {
    setCurrentPage(targetPage);
  };

  // Helper function to calculate which page a position belongs to
  const calculatePageFromPosition = (position, cardsPerPage) => {
    if (position < cardsPerPage) {
      return 0; // Cover page (right side only)
    }

    // For positions beyond the first page, calculate which physical page
    const physicalPage = Math.floor(position / cardsPerPage);

    // Convert physical page to binder page (accounting for left/right layout)
    // Physical pages 0 = binder page 0 (cover)
    // Physical pages 1,2 = binder page 1 (left/right)
    // Physical pages 3,4 = binder page 2 (left/right)
    // etc.
    if (physicalPage === 0) {
      return 0;
    } else {
      return Math.ceil(physicalPage / 2);
    }
  };

  const handleNavigateHistoryWithPageJump = (
    currentBinder,
    direction,
    layout,
    setCurrentPage
  ) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      // Get the entry we're navigating to
      const history = getBinderHistory(currentBinder.id);
      const currentPosition = getHistoryPosition(currentBinder.id);
      let targetEntry = null;

      if (direction === "back") {
        if (currentPosition === -1) {
          targetEntry = history[history.length - 1];
        } else if (currentPosition > 0) {
          targetEntry = history[currentPosition - 1];
        }
      } else if (direction === "forward") {
        if (currentPosition !== -1 && currentPosition < history.length - 1) {
          targetEntry = history[currentPosition + 1];
        }
      }

      // Calculate page and navigate if we have a target entry
      if (targetEntry) {
        let targetPosition = null;

        if (targetEntry.position !== undefined) {
          targetPosition = targetEntry.position;
        } else if (targetEntry.toPosition !== undefined) {
          targetPosition = targetEntry.toPosition;
        } else if (targetEntry.fromPosition !== undefined) {
          targetPosition = targetEntry.fromPosition;
        } else if (
          targetEntry.action === "bulk_move" &&
          targetEntry.targetPosition !== undefined
        ) {
          targetPosition = targetEntry.targetPosition;
        }

        if (targetPosition !== null) {
          const targetPage = calculatePageFromPosition(
            targetPosition,
            layout.cards
          );
          setCurrentPage(targetPage);
        }
      }

      // Perform the actual history navigation
      return handleNavigateHistory(currentBinder, direction);
    }
    return { success: false };
  };

  const handleToggleHistory = () => {
    setIsHistoryCollapsed(!isHistoryCollapsed);
  };

  const loadHistoryForBinder = (binderId) => {
    if (binderId) {
      const savedHistory = getBinderHistory(binderId);
      setHistoryEntries(savedHistory);
    } else {
      setHistoryEntries([]);
    }
  };

  const canNavigateBack = (currentBinder) => {
    return currentBinder ? canNavigateHistory(currentBinder.id, "back") : false;
  };

  const canNavigateForward = (currentBinder) => {
    return currentBinder
      ? canNavigateHistory(currentBinder.id, "forward")
      : false;
  };

  const getCurrentPosition = (currentBinder) => {
    return currentBinder ? getHistoryPosition(currentBinder.id) : -1;
  };

  return {
    // State
    historyEntries,
    isHistoryCollapsed,

    // Actions
    handleRevertToEntry,
    handleClearHistory,
    handleNavigateHistory,
    handleNavigateToPage,
    handleNavigateHistoryWithPageJump,
    handleToggleHistory,
    loadHistoryForBinder,

    // Helpers
    calculatePageFromPosition,
    canNavigateBack,
    canNavigateForward,
    getCurrentPosition,

    // Direct setters
    setHistoryEntries,
    setIsHistoryCollapsed,
  };
};

export default useBinderHistory;

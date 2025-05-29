import { useState, useCallback } from "react";
import {
  getBinderHistory,
  clearBinderHistory,
  undoLastAction,
  redoLastAction,
  getCustomCards,
} from "../utils/storageUtilsIndexedDB";
import logger from "../utils/logger";

const useBinderHistory = () => {
  const [historyEntries, setHistoryEntries] = useState([]);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);

  const handleClearHistory = async (currentBinder) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      try {
        await clearBinderHistory(currentBinder.id);
        setHistoryEntries([]);
      } catch (error) {
        logger.error("Failed to clear history:", error);
      }
    }
  };

  const handleUndoAction = async (currentBinder) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      try {
        const success = await undoLastAction(currentBinder.id);
        if (success) {
          // Refresh the binder state
          const updatedCustomCards = await getCustomCards(currentBinder.id);
          const updatedHistory = await getBinderHistory(currentBinder.id);
          setHistoryEntries(updatedHistory);

          return {
            success: true,
            updatedCustomCards,
            updatedHistory,
          };
        }
      } catch (error) {
        logger.error("Failed to undo action:", error);
      }
    }
    return { success: false };
  };

  const handleRedoAction = async (currentBinder) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      try {
        const success = await redoLastAction(currentBinder.id);
        if (success) {
          // Refresh the binder state
          const updatedCustomCards = await getCustomCards(currentBinder.id);
          const updatedHistory = await getBinderHistory(currentBinder.id);
          setHistoryEntries(updatedHistory);

          return {
            success: true,
            updatedCustomCards,
            updatedHistory,
          };
        }
      } catch (error) {
        logger.error("Failed to redo action:", error);
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

  const handleNavigateHistoryWithPageJump = async (
    currentBinder,
    direction,
    layout,
    setCurrentPage
  ) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      try {
        // Get the entry we're navigating to
        const history = await getBinderHistory(currentBinder.id);

        // For now, just use undo/redo logic
        let result = { success: false };
        if (direction === "back") {
          result = await handleUndoAction(currentBinder);
        } else if (direction === "forward") {
          result = await handleRedoAction(currentBinder);
        }

        // TODO: Add page jumping logic when needed
        return result;
      } catch (error) {
        logger.error("Failed to navigate history with page jump:", error);
      }
    }
    return { success: false };
  };

  const handleToggleHistory = () => {
    setIsHistoryCollapsed(!isHistoryCollapsed);
  };

  const loadHistoryForBinder = async (binderId) => {
    if (binderId) {
      try {
        const savedHistory = await getBinderHistory(binderId);
        setHistoryEntries(savedHistory);
      } catch (error) {
        logger.error("Failed to load history for binder:", error);
        setHistoryEntries([]);
      }
    } else {
      setHistoryEntries([]);
    }
  };

  const canNavigateBack = (currentBinder) => {
    // For now, simplified check - can undo if there are history entries
    return historyEntries.length > 0;
  };

  const canNavigateForward = (currentBinder) => {
    // For now, simplified check - will be enhanced when redo state tracking is added
    return false;
  };

  const getCurrentPosition = (currentBinder) => {
    // Simplified for now
    return historyEntries.length;
  };

  return {
    // State
    historyEntries,
    isHistoryCollapsed,

    // Actions
    handleClearHistory,
    handleUndoAction,
    handleRedoAction,
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

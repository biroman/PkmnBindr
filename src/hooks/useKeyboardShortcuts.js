import { useEffect, useCallback } from "react";

/**
 * Custom hook for keyboard shortcuts
 * Manages history navigation shortcuts (Ctrl+Z, Ctrl+Y)
 */
const useKeyboardShortcuts = ({
  currentBinder,
  canNavigateBack,
  canNavigateForward,
  handleNavigateHistoryWithPageJump,
}) => {
  const handleKeyDown = useCallback(
    (event) => {
      // Only handle shortcuts for custom binders
      if (!currentBinder || currentBinder.binderType !== "custom") {
        return;
      }

      const isCtrlPressed = event.ctrlKey || event.metaKey;

      if (isCtrlPressed) {
        if (event.key === "z" && !event.shiftKey) {
          event.preventDefault();
          if (canNavigateBack) {
            handleNavigateHistoryWithPageJump("back");
          }
        } else if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
          event.preventDefault();
          if (canNavigateForward) {
            handleNavigateHistoryWithPageJump("forward");
          }
        }
      }
    },
    [
      currentBinder,
      canNavigateBack,
      canNavigateForward,
      handleNavigateHistoryWithPageJump,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return null; // This hook doesn't return anything, just sets up event listeners
};

export default useKeyboardShortcuts;

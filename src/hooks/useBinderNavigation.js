import { useCallback, useRef, useEffect } from "react";

const useBinderNavigation = ({
  binder,
  navigation, // from useBinderPages
  activeCard,
  dimensions,
  isModalsOpen = false,
  enableKeyboard = true,
  enableEdgeNavigation = true,
  edgeNavigationState = null, // Passed from useBinderDragDrop
}) => {
  const { canGoNext, canGoPrev, goToNextPage, goToPrevPage, goToPage } =
    navigation;

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (event) => {
      // Only handle arrow keys when no modals are open and we have a current binder
      if (!binder || isModalsOpen) {
        return;
      }

      // Prevent default behavior for arrow keys to avoid page scrolling
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
      }

      switch (event.key) {
        case "ArrowLeft":
          if (canGoPrev) {
            goToPrevPage();
          }
          break;
        case "ArrowRight":
          if (canGoNext) {
            goToNextPage();
          }
          break;
        default:
          break;
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enableKeyboard,
    binder,
    isModalsOpen,
    canGoPrev,
    canGoNext,
    goToPrevPage,
    goToNextPage,
  ]);

  // Calculate navigation positioning
  const getNavigationPositions = useCallback(
    (sidebarWidth = 0) => {
      const navigationAdjustment = sidebarWidth;

      return {
        left: `calc((50% - ${navigationAdjustment / 2}px) - ${
          dimensions.width / 2 + 64
        }px)`,
        right: `calc((50% + ${navigationAdjustment / 2}px) - ${
          dimensions.width / 2 + 64
        }px)`,
      };
    },
    [dimensions.width]
  );

  // Calculate edge zone positions
  const getEdgeZonePositions = useCallback(
    (sidebarWidth = 0) => {
      const navigationAdjustment = sidebarWidth;

      return {
        left: `calc(50% - ${navigationAdjustment / 2}px - ${
          dimensions.width / 2 + 124
        }px)`,
        right: `calc(50% - ${navigationAdjustment / 2}px + ${
          dimensions.width / 2 + 26
        }px)`,
      };
    },
    [dimensions.width]
  );

  return {
    // Edge navigation state (passed through from drag drop hook)
    isInNavigationZone: edgeNavigationState?.currentEdgeZone || null,
    navigationProgress: edgeNavigationState?.navigationProgress || 0,

    // Utilities
    getNavigationPositions,
    getEdgeZonePositions,

    // Navigation actions (pass-through from useBinderPages)
    canGoNext,
    canGoPrev,
    goToNextPage,
    goToPrevPage,
    goToPage,
  };
};

export default useBinderNavigation;

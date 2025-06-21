import { useState, useCallback, useRef, useEffect } from "react";

const useBinderNavigation = ({
  binder,
  navigation, // from useBinderPages
  activeCard,
  dimensions,
  isModalsOpen = false,
  enableKeyboard = true,
  enableEdgeNavigation = true,
}) => {
  // Edge navigation state
  const [edgeNavigationTimer, setEdgeNavigationTimer] = useState(null);
  const [isInNavigationZone, setIsInNavigationZone] = useState(null);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [progressAnimationId, setProgressAnimationId] = useState(null);
  const navigationZoneRef = useRef(null);

  const { canGoNext, canGoPrev, goToNextPage, goToPrevPage, goToPage } =
    navigation;

  // Clear navigation timer helper
  const clearNavigationTimer = useCallback(() => {
    if (edgeNavigationTimer) {
      clearTimeout(edgeNavigationTimer);
      setEdgeNavigationTimer(null);
    }
    if (progressAnimationId) {
      cancelAnimationFrame(progressAnimationId);
      setProgressAnimationId(null);
    }
    setIsInNavigationZone(null);
    navigationZoneRef.current = null;
    setNavigationProgress(0);
  }, [edgeNavigationTimer, progressAnimationId]);

  // Start navigation timer for edge navigation
  const startNavigationTimer = useCallback(
    (direction) => {
      if (!enableEdgeNavigation) return;

      // Clear any existing timer
      clearNavigationTimer();

      setIsInNavigationZone(direction);
      navigationZoneRef.current = direction;

      // Start progress animation
      const startTime = Date.now();
      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / 1000) * 100, 100);
        setNavigationProgress(progress);

        if (progress < 100) {
          const animId = requestAnimationFrame(animateProgress);
          setProgressAnimationId(animId);
        }
      };
      const initialAnimId = requestAnimationFrame(animateProgress);
      setProgressAnimationId(initialAnimId);

      // Start new timer
      const timer = setTimeout(() => {
        const currentZone = navigationZoneRef.current;
        // Only navigate if we're still in the same navigation zone
        if (currentZone === direction) {
          console.log(`Edge navigation triggered: ${direction}`);
          if (direction === "left" && canGoPrev) {
            console.log("Navigating to previous page while dragging");
            goToPrevPage();
          } else if (direction === "right" && canGoNext) {
            console.log("Navigating to next page while dragging");
            goToNextPage();
          }
        }
        clearNavigationTimer();
      }, 1000); // 1 second delay

      setEdgeNavigationTimer(timer);
    },
    [
      enableEdgeNavigation,
      clearNavigationTimer,
      canGoPrev,
      canGoNext,
      goToPrevPage,
      goToNextPage,
    ]
  );

  // Mouse move handler for edge navigation
  const handleMouseMove = useCallback(
    (event) => {
      if (!activeCard || !enableEdgeNavigation) return;

      const mouseX = event.clientX;

      // Get binder container bounds
      const binderContainer = document.querySelector(".binder-container");
      if (!binderContainer) return;

      const rect = binderContainer.getBoundingClientRect();

      // Define edge zones (100px zones immediately adjacent to binder edges)
      const leftZoneStart = rect.left - 100;
      const leftZoneEnd = rect.left;
      const rightZoneStart = rect.right;
      const rightZoneEnd = rect.right + 100;

      // Check if mouse is in navigation zones
      if (mouseX >= leftZoneStart && mouseX <= leftZoneEnd && canGoPrev) {
        if (isInNavigationZone !== "left") {
          console.log("Entering left navigation zone");
          startNavigationTimer("left");
        }
      } else if (
        mouseX >= rightZoneStart &&
        mouseX <= rightZoneEnd &&
        canGoNext
      ) {
        if (isInNavigationZone !== "right") {
          console.log("Entering right navigation zone");
          startNavigationTimer("right");
        }
      } else {
        // Not in any navigation zone
        if (navigationZoneRef.current) {
          console.log("Exiting navigation zone");
          clearNavigationTimer();
        }
      }
    },
    [
      activeCard,
      enableEdgeNavigation,
      canGoPrev,
      canGoNext,
      startNavigationTimer,
      clearNavigationTimer,
      isInNavigationZone,
    ]
  );

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

  // Add/remove mouse move listener when dragging
  useEffect(() => {
    if (activeCard && enableEdgeNavigation) {
      document.addEventListener("mousemove", handleMouseMove);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, [activeCard, enableEdgeNavigation, handleMouseMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearNavigationTimer();
    };
  }, [clearNavigationTimer]);

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
    // State
    isInNavigationZone,
    navigationProgress,

    // Handlers
    clearNavigationTimer,
    startNavigationTimer,
    handleMouseMove,

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

import { useState, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";

/**
 * Custom hook for managing binder drag and drop functionality
 * Handles drag state, edge navigation, and card movement operations
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.binder - Current binder object
 * @param {Function} options.moveCard - Function to move card between positions
 * @param {Object} options.navigation - Navigation object from useBinderNavigation
 * @param {Function} options.onDragStateChange - Callback when drag state changes
 * @param {boolean} options.enableDrag - Whether drag functionality is enabled
 * @returns {Object} Drag and drop handlers and state
 */
export const useBinderDragDrop = ({
  binder,
  moveCard,
  removeCard,
  navigation,
  onDragStateChange,
  enableDrag = true,
}) => {
  // Drag state
  const [activeCard, setActiveCard] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Edge navigation state
  const [currentEdgeZone, setCurrentEdgeZone] = useState(null);
  const [edgeNavigationTimer, setEdgeNavigationTimer] = useState(null);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const progressAnimationIdRef = useRef(null); // Use ref for animation frame

  // Persistent drag data storage to handle React re-renders
  const activeDragDataRef = useRef(null);
  const activeEdgeZoneRef = useRef(null); // Track active zone more reliably

  // Clear navigation timer helper
  const clearNavigationTimer = useCallback(() => {
    if (edgeNavigationTimer) {
      clearTimeout(edgeNavigationTimer);
      setEdgeNavigationTimer(null);
    }
    if (progressAnimationIdRef.current) {
      cancelAnimationFrame(progressAnimationIdRef.current);
      progressAnimationIdRef.current = null;
    }
    setCurrentEdgeZone(null);
    setNavigationProgress(0);
    activeEdgeZoneRef.current = null; // Clear ref as well
  }, [edgeNavigationTimer]);

  // Start navigation timer for edge navigation
  const startNavigationTimer = useCallback(
    (direction, isContinuation = false) => {
      const canNavigate =
        (direction === "left" && navigation.canGoPrev) ||
        (direction === "right" && navigation.canGoNext);

      if (!canNavigate) {
        clearNavigationTimer();
        return;
      }

      // For continuations, we only need to reset the progress animation
      if (isContinuation) {
        setNavigationProgress(0);
        if (progressAnimationIdRef.current) {
          cancelAnimationFrame(progressAnimationIdRef.current);
        }
      } else {
        clearNavigationTimer();
      }

      setCurrentEdgeZone(direction);
      activeEdgeZoneRef.current = direction;

      const delay = isContinuation ? 700 : 1000;
      const startTime = Date.now();

      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / delay) * 100, 100);
        setNavigationProgress(progress);

        if (progress < 100) {
          progressAnimationIdRef.current =
            requestAnimationFrame(animateProgress);
        }
      };
      progressAnimationIdRef.current = requestAnimationFrame(animateProgress);

      const performNavigation = () => {
        const currentDirection = activeEdgeZoneRef.current;
        if (currentDirection !== direction) return;

        // Explicitly set 100% to ensure it completes visually
        cancelAnimationFrame(progressAnimationIdRef.current);
        setNavigationProgress(100);

        // Allow the 100% to render, then navigate and restart
        setTimeout(() => {
          if (activeEdgeZoneRef.current !== currentDirection) return;

          if (currentDirection === "left") {
            navigation.goToPrevPage();
          } else if (currentDirection === "right") {
            navigation.goToNextPage();
          }

          // After navigation, start the next cycle
          setTimeout(() => {
            if (activeEdgeZoneRef.current === currentDirection) {
              startNavigationTimer(currentDirection, true);
            }
          }, 50); // Short delay to allow page state to update
        }, 100); // Short delay to render the 100% state
      };

      const timer = setTimeout(performNavigation, delay);
      setEdgeNavigationTimer(timer);
    },
    [navigation, clearNavigationTimer]
  );

  // Clear drag state utility
  const clearDragState = useCallback(() => {
    setActiveCard(null);
    setIsDragging(false);
    activeDragDataRef.current = null;

    // Clear navigation timer
    clearNavigationTimer();

    // Restore document scrolling
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    document.body.style.userSelect = "";

    // Notify parent of drag state change
    onDragStateChange?.(false);
  }, [clearNavigationTimer, onDragStateChange]);

  // Drag start handler
  const handleDragStart = useCallback(
    (event) => {
      if (!enableDrag) return;

      const { active } = event;
      const cardData = active.data.current;

      if (cardData?.type === "card") {
        setActiveCard(cardData.card);
        setIsDragging(true);
        activeDragDataRef.current = cardData;

        // Prevent document scrolling during drag
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
        document.body.style.userSelect = "none";

        // Notify parent of drag state change
        onDragStateChange?.(true);
      }
    },
    [enableDrag, onDragStateChange]
  );

  // Drag over handler for edge navigation
  const handleDragOver = useCallback(
    (event) => {
      if (!event.over) {
        // Clear edge navigation when not over anything
        if (currentEdgeZone) {
          clearNavigationTimer();
          activeEdgeZoneRef.current = null;
        }
        return;
      }

      const overData = event.over.data.current;

      // Handle edge navigation zones
      if (overData?.type === "edge-navigation") {
        const direction = overData.direction;
        const canNavigate = overData.canNavigate;

        if (canNavigate && activeEdgeZoneRef.current !== direction) {
          startNavigationTimer(direction);
        }
      } else {
        // Clear edge navigation when over other elements
        if (currentEdgeZone) {
          clearNavigationTimer();
          activeEdgeZoneRef.current = null;
        }
      }
    },
    [currentEdgeZone, clearNavigationTimer, startNavigationTimer]
  );

  // Drag end handler
  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;

      // Clear navigation timer first (before any early returns)
      clearNavigationTimer();

      // Restore document scrolling
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.userSelect = "";

      // Clear active card state
      setActiveCard(null);
      setIsDragging(false);

      if (!active || !binder) {
        clearDragState();
        return;
      }

      if (!over) {
        clearDragState();
        return;
      }

      const activeData = active.data.current?.type
        ? active.data.current
        : activeDragDataRef.current; // Use stored data if original is empty or missing type
      const overData = over.data.current;

      // Handle edge navigation drops (no action needed, navigation already handled in timer)
      if (overData?.type === "edge-navigation") {
        clearDragState();
        onDragStateChange?.(false);
        return;
      }

      // Handle card deletion drops
      if (activeData?.type === "card" && overData?.type === "delete-zone") {
        const cardPosition = activeData.position;
        const card = activeData.card;

        try {
          await removeCard(card, cardPosition);
          toast.success(`Deleted ${card.name} from binder`);
        } catch (error) {
          console.error("Failed to delete card:", error);
          toast.error("Failed to delete card");
        }

        clearDragState();
        onDragStateChange?.(false);
        return;
      }

      // Only handle card-to-slot drops
      if (activeData?.type === "card" && overData?.type === "slot") {
        const fromPosition = activeData.position;
        const toPosition = overData.position;

        if (fromPosition !== toPosition) {
          try {
            await moveCard(binder.id, fromPosition, toPosition);
          } catch (error) {
            console.error("Failed to move card:", error);
            toast.error("Failed to move card");
          }
        }
      }

      // Clear stored drag data
      clearDragState();
      onDragStateChange?.(false);
    },
    [
      binder,
      moveCard,
      removeCard,
      clearNavigationTimer,
      clearDragState,
      onDragStateChange,
    ]
  );

  // Drag cancel handler
  const handleDragCancel = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  return {
    // State
    activeCard,
    isDragging,

    // Edge navigation state
    currentEdgeZone,
    navigationProgress,

    // Handlers
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    handleDragOver,

    // Utilities
    clearDragState,
    clearNavigationTimer,

    // Data persistence
    activeDragDataRef,
  };
};

export default useBinderDragDrop;

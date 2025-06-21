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
  const [progressAnimationId, setProgressAnimationId] = useState(null);

  // Persistent drag data storage to handle React re-renders
  const activeDragDataRef = useRef(null);

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
    setCurrentEdgeZone(null);
    setNavigationProgress(0);
  }, [edgeNavigationTimer, progressAnimationId]);

  // Start navigation timer for edge navigation
  const startNavigationTimer = useCallback(
    (direction) => {
      const canNavigate =
        (direction === "left" && navigation.canGoPrev) ||
        (direction === "right" && navigation.canGoNext);

      if (!canNavigate) return;

      // Clear any existing timer
      clearNavigationTimer();

      setCurrentEdgeZone(direction);

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
        if (direction === "left" && navigation.canGoPrev) {
          navigation.goToPrevPage();
        } else if (direction === "right" && navigation.canGoNext) {
          navigation.goToNextPage();
        }
        clearNavigationTimer();
      }, 1000); // 1 second delay

      setEdgeNavigationTimer(timer);
    },
    [clearNavigationTimer, navigation]
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
        }
        return;
      }

      const overData = event.over.data.current;

      // Handle edge navigation zones
      if (overData?.type === "edge-navigation") {
        const direction = overData.direction;
        const canNavigate = overData.canNavigate;

        if (canNavigate && currentEdgeZone !== direction) {
          startNavigationTimer(direction);
        }
      } else {
        // Clear edge navigation when over other elements
        if (currentEdgeZone) {
          clearNavigationTimer();
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
    [binder, moveCard, clearNavigationTimer, clearDragState, onDragStateChange]
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

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
 * @param {boolean} options.selectionMode - Whether multi-card selection mode is active
 * @param {Array} options.selectedPositions - Array of selected card positions
 * @param {Function} options.clearSelection - Function to clear the selection
 * @param {Function} options.setPreviewOffset - Function to set the preview offset
 * @param {Function} options.setIsBulkDragging - Function to set the bulk dragging state
 * @param {boolean} options.enableShiftPreview - Whether shift preview is enabled
 * @returns {Object} Drag and drop handlers and state
 */
export const useBinderDragDrop = ({
  binder,
  moveCard,
  removeCard,
  navigation,
  onDragStateChange,
  enableDrag = true,
  enableShiftPreview = false,
  selectionMode = false,
  selectedPositions = [],
  clearSelection = () => {},
  setPreviewOffset = () => {},
  setIsBulkDragging = () => {},
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

        // If we're in selection mode and the dragged card is part of selection, store whole set
        if (selectionMode && selectedPositions.length > 1) {
          activeDragDataRef.current.multiPositions = selectedPositions;
          setIsBulkDragging(true);
        }

        // Prevent document scrolling during drag
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
        document.body.style.userSelect = "none";

        // Notify parent of drag state change
        onDragStateChange?.(true);
      }
    },
    [
      enableDrag,
      onDragStateChange,
      selectionMode,
      selectedPositions,
      setIsBulkDragging,
    ]
  );

  // Drag over handler for edge navigation and preview offset
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
      } else if (
        selectionMode &&
        activeDragDataRef.current?.multiPositions &&
        overData?.type === "slot"
      ) {
        // Update preview offset for multi-selection
        const activePos = activeDragDataRef.current.position;
        const offset = overData.position - activePos;
        setPreviewOffset(offset);
      } else if (
        enableShiftPreview &&
        !selectionMode &&
        activeDragDataRef.current?.type === "card" &&
        overData?.type === "slot"
      ) {
        // Single-card preview: show shift range
        const activePos = activeDragDataRef.current.position;
        const offset = overData.position - activePos;
        // Only set if actually moving to new position
        if (offset !== 0) {
          setPreviewOffset(offset);
        } else {
          setPreviewOffset(null);
        }
      } else {
        // Clear edge navigation when over other elements
        if (currentEdgeZone) {
          clearNavigationTimer();
          activeEdgeZoneRef.current = null;
        }

        // Clear preview offset when not over slot
        setPreviewOffset(null);
        if (selectionMode) {
          setIsBulkDragging(false);
        }
      }
    },
    [
      currentEdgeZone,
      clearNavigationTimer,
      startNavigationTimer,
      selectionMode,
      setPreviewOffset,
      setIsBulkDragging,
      enableShiftPreview,
    ]
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

      // Multi-card move when selection mode active
      if (
        selectionMode &&
        activeData?.type === "card" &&
        overData?.type === "slot" &&
        selectedPositions.length > 1
      ) {
        const fromPosition = activeData.position;
        const toPosition = overData.position;

        if (fromPosition !== toPosition) {
          const offset = toPosition - fromPosition;

          // Determine iteration order to avoid overwrite conflicts
          const ordered = [...selectedPositions].sort((a, b) =>
            offset > 0 ? b - a : a - b
          );

          try {
            for (const pos of ordered) {
              await moveCard(binder.id, pos, pos + offset, {
                mode: enableShiftPreview ? "shift" : "swap",
              });
            }
          } catch (error) {
            console.error("Failed to move cards:", error);
            toast.error("Failed to move cards");
          }
        }

        // Clear selection after operation
        clearSelection();
      } else if (activeData?.type === "card" && overData?.type === "slot") {
        // Single card scenario
        const fromPosition = activeData.position;
        const toPosition = overData.position;

        if (fromPosition !== toPosition) {
          try {
            await moveCard(binder.id, fromPosition, toPosition, {
              mode: enableShiftPreview ? "shift" : "swap",
            });
          } catch (error) {
            console.error("Failed to move card:", error);
            toast.error("Failed to move card");
          }
        }
      }

      // Clear stored drag data
      clearDragState();
      // Always clear preview offset after drag ends
      setPreviewOffset(null);
      setIsBulkDragging(false);
      onDragStateChange?.(false);
    },
    [
      binder,
      moveCard,
      removeCard,
      clearNavigationTimer,
      clearDragState,
      onDragStateChange,
      selectionMode,
      selectedPositions,
      clearSelection,
      setPreviewOffset,
      setIsBulkDragging,
      enableShiftPreview,
    ]
  );

  // Drag cancel handler
  const handleDragCancel = useCallback(() => {
    clearDragState();
    setPreviewOffset(null);
  }, [clearDragState, setPreviewOffset]);

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

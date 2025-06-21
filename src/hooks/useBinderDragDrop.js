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

  // Persistent drag data storage to handle React re-renders
  const activeDragDataRef = useRef(null);

  // Clear drag state utility
  const clearDragState = useCallback(() => {
    setActiveCard(null);
    setIsDragging(false);
    activeDragDataRef.current = null;

    // Clear navigation timer if available
    navigation?.clearNavigationTimer?.();

    // Restore document scrolling
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    document.body.style.userSelect = "";

    // Notify parent of drag state change
    onDragStateChange?.(false);
  }, [navigation, onDragStateChange]);

  // Drag start handler
  const handleDragStart = useCallback(
    (event) => {
      if (!enableDrag) return;

      const { active } = event;
      const cardData = active.data.current;

      console.log("Drag start:", cardData);

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

  // Drag end handler
  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;

      console.log(
        "handleDragEnd - stored drag data:",
        activeDragDataRef.current
      );
      console.log(
        "handleDragEnd - active.data.current:",
        active?.data?.current
      );

      // Clear navigation timer first (before any early returns)
      navigation?.clearNavigationTimer?.();

      // Restore document scrolling
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.userSelect = "";

      // Clear active card state
      setActiveCard(null);
      setIsDragging(false);

      if (!active || !binder) {
        console.log("Drag ended - no active item or current binder");
        clearDragState();
        return;
      }

      if (!over) {
        console.log("Drag ended - no drop target");
        clearDragState();
        return;
      }

      const activeData = active.data.current?.type
        ? active.data.current
        : activeDragDataRef.current; // Use stored data if original is empty or missing type
      const overData = over.data.current;

      console.log("Drag end data:", {
        activeType: activeData?.type,
        activePosition: activeData?.position,
        overType: overData?.type,
        overPosition: overData?.position,
        usingStoredData:
          !active.data.current?.type && !!activeDragDataRef.current,
        hasActiveDragData: !!activeDragDataRef.current,
        hasActiveDataCurrent: !!active.data.current,
        activeDataCurrentType: active.data.current?.type,
      });

      // Only handle card-to-slot drops
      if (activeData?.type === "card" && overData?.type === "slot") {
        const fromPosition = activeData.position;
        const toPosition = overData.position;

        console.log(
          `Attempting to move card from position ${fromPosition} to ${toPosition}`
        );

        if (fromPosition !== toPosition) {
          try {
            await moveCard(binder.id, fromPosition, toPosition);
            console.log("Card move successful");
          } catch (error) {
            console.error("Failed to move card:", error);
            toast.error("Failed to move card");
          }
        } else {
          console.log("Same position - no move needed");
        }
      } else {
        console.log("Invalid drag/drop combination:", {
          activeType: activeData?.type,
          overType: overData?.type,
        });
      }

      // Clear stored drag data
      clearDragState();
      onDragStateChange?.(false);
    },
    [binder, moveCard, navigation, clearDragState, onDragStateChange]
  );

  // Drag cancel handler
  const handleDragCancel = useCallback(() => {
    console.log("Drag cancelled");
    clearDragState();
  }, [clearDragState]);

  // Drag over handler for debugging and edge navigation
  const handleDragOver = useCallback((event) => {
    // Debug collision detection during drag
    if (event.over) {
      console.log("Drag over:", {
        overId: event.over.id,
        overData: event.over.data.current,
      });
    }
  }, []);

  return {
    // State
    activeCard,
    isDragging,

    // Handlers
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    handleDragOver,

    // Utilities
    clearDragState,

    // Data persistence
    activeDragDataRef,
  };
};

export default useBinderDragDrop;

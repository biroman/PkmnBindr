import { useState, useRef, useCallback } from "react";

/**
 * Custom hook for managing binder modal state and handlers
 * Centralizes all modal logic including state, duplicate prevention, and handlers
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.binder - Current binder object
 * @param {Function} options.onCardAdd - Callback when card is added
 * @param {Function} options.onBinderClear - Callback when binder is cleared
 * @param {Function} options.onPageSelect - Callback when page is selected
 * @param {Function} options.onColorChange - Callback when binder color changes
 * @param {Function} options.onColorPreview - Callback for color preview
 * @param {boolean} options.enableModals - Whether modals are enabled
 * @returns {Object} Modal state, handlers, and utilities
 */
export const useBinderModals = ({
  binder,
  onCardAdd,
  onBinderClear,
  onPageSelect,
  onColorChange,
  onColorPreview,
  enableModals = true,
} = {}) => {
  // Modal state
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isPageOverviewOpen, setIsPageOverviewOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);

  // Modal-specific state
  const [targetPosition, setTargetPosition] = useState(null); // For slot-specific card addition
  const [previewColor, setPreviewColor] = useState(null); // For live color preview

  // Prevent duplicate modal opens
  const modalOpenRef = useRef(false);

  // Check if any modal is open
  const isAnyModalOpen =
    isAddCardModalOpen ||
    isPageOverviewOpen ||
    isClearModalOpen ||
    isColorPickerOpen ||
    isShareLinkModalOpen;

  // Generic modal opener with duplicate prevention
  const openModal = useCallback(
    (modalSetter, additionalActions = () => {}) => {
      if (!enableModals) return;

      // Prevent duplicate modal opens
      if (modalOpenRef.current) {
        return;
      }

      modalOpenRef.current = true;
      modalSetter(true);
      additionalActions();

      // Reset the ref after a short delay
      setTimeout(() => {
        modalOpenRef.current = false;
      }, 300);
    },
    [enableModals]
  );

  // Generic modal closer
  const closeModal = useCallback((modalSetter, resetActions = () => {}) => {
    modalSetter(false);
    resetActions();
    modalOpenRef.current = false;
  }, []);

  // Add Card Modal handlers
  const openAddCardModal = useCallback(
    (position = null) => {
      openModal(setIsAddCardModalOpen, () => {
        setTargetPosition(position);
      });
    },
    [openModal]
  );

  const closeAddCardModal = useCallback(() => {
    closeModal(setIsAddCardModalOpen, () => {
      setTargetPosition(null);
    });
  }, [closeModal]);

  // Page Overview Modal handlers
  const openPageOverview = useCallback(() => {
    openModal(setIsPageOverviewOpen);
  }, [openModal]);

  const closePageOverview = useCallback(() => {
    closeModal(setIsPageOverviewOpen);
  }, [closeModal]);

  // Clear Binder Modal handlers
  const openClearModal = useCallback(() => {
    if (!binder) return;

    const cardCount = Object.keys(binder.cards || {}).length;
    if (cardCount === 0) {
      // Don't open modal if binder is already empty
      return false;
    }

    openModal(setIsClearModalOpen);
    return true;
  }, [binder, openModal]);

  const closeClearModal = useCallback(() => {
    closeModal(setIsClearModalOpen);
  }, [closeModal]);

  const confirmClearBinder = useCallback(async () => {
    if (!binder || !onBinderClear) return;

    try {
      await onBinderClear(binder.id);
      closeClearModal();
    } catch (error) {
      console.error("Failed to clear binder:", error);
      // Don't close modal on error so user can retry
    }
  }, [binder, onBinderClear, closeClearModal]);

  // Color Picker Modal handlers
  const openColorPicker = useCallback(() => {
    openModal(setIsColorPickerOpen, () => {
      setPreviewColor(null); // Reset preview when opening
    });
  }, [openModal]);

  const closeColorPicker = useCallback(() => {
    closeModal(setIsColorPickerOpen, () => {
      setPreviewColor(null); // Clear preview on close
    });
  }, [closeModal]);

  const handleColorPreview = useCallback(
    (color) => {
      setPreviewColor(color);
      onColorPreview?.(color);
    },
    [onColorPreview]
  );

  const handleColorChange = useCallback(
    (color) => {
      if (!binder || !onColorChange) return;

      onColorChange(binder.id, color);
      setPreviewColor(null); // Clear preview after saving
    },
    [binder, onColorChange]
  );

  // Share Link Modal handlers
  const openShareLinkModal = useCallback(() => {
    openModal(setIsShareLinkModalOpen);
  }, [openModal]);

  const closeShareLinkModal = useCallback(() => {
    closeModal(setIsShareLinkModalOpen);
  }, [closeModal]);

  // Page selection handler
  const handlePageSelect = useCallback(
    (pageIndex) => {
      onPageSelect?.(pageIndex);
      closePageOverview();
    },
    [onPageSelect, closePageOverview]
  );

  // Close all modals
  const closeAllModals = useCallback(() => {
    setIsAddCardModalOpen(false);
    setIsPageOverviewOpen(false);
    setIsClearModalOpen(false);
    setIsColorPickerOpen(false);
    setIsShareLinkModalOpen(false);
    setTargetPosition(null);
    setPreviewColor(null);
    modalOpenRef.current = false;
  }, []);

  return {
    // Modal state
    modals: {
      isAddCardModalOpen,
      isPageOverviewOpen,
      isClearModalOpen,
      isColorPickerOpen,
      isShareLinkModalOpen,
      isAnyModalOpen,
    },

    // Modal-specific state
    modalData: {
      targetPosition,
      previewColor,
    },

    // Modal handlers
    handlers: {
      // Add Card Modal
      openAddCardModal,
      closeAddCardModal,

      // Page Overview Modal
      openPageOverview,
      closePageOverview,
      handlePageSelect,

      // Clear Binder Modal
      openClearModal,
      closeClearModal,
      confirmClearBinder,

      // Color Picker Modal
      openColorPicker,
      closeColorPicker,
      handleColorPreview,
      handleColorChange,

      // Share Link Modal
      openShareLinkModal,
      closeShareLinkModal,

      // Utilities
      closeAllModals,
    },

    // Utilities
    isModalOpen: (modalName) => {
      const modalMap = {
        addCard: isAddCardModalOpen,
        pageOverview: isPageOverviewOpen,
        clearBinder: isClearModalOpen,
        colorPicker: isColorPickerOpen,
        shareLink: isShareLinkModalOpen,
      };
      return modalMap[modalName] || false;
    },
  };
};

export default useBinderModals;

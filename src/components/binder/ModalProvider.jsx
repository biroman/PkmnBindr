import React from "react";
import PropTypes from "prop-types";
import AddCardModal from "./AddCardModal";
import BinderPageOverview from "./BinderPageOverview";
import ClearBinderModal from "./ClearBinderModal";
import BinderColorPicker from "./BinderColorPicker";
import ShareLinkModal from "./ShareLinkModal";

/**
 * ModalProvider component that centralizes all binder modal rendering and management
 * Provides a clean interface for managing multiple modals without cluttering the main component
 *
 * @param {Object} props - Component props
 * @param {Object} props.binder - Current binder object
 * @param {Object} props.modals - Modal state object from useBinderModals
 * @param {Object} props.modalData - Modal-specific data (targetPosition, previewColor, etc.)
 * @param {Object} props.handlers - Modal handlers from useBinderModals
 * @param {Object} props.modalProps - Additional props for specific modals
 * @param {boolean} props.disabled - Whether modals are disabled
 * @returns {React.ReactElement} ModalProvider component with all modals
 */
export const ModalProvider = ({
  binder,
  modals = {},
  modalData = {},
  handlers = {},
  modalProps = {},
  disabled = false,
}) => {
  // Don't render modals if disabled or no binder
  if (disabled || !binder) {
    return null;
  }

  const {
    isAddCardModalOpen = false,
    isPageOverviewOpen = false,
    isClearModalOpen = false,
    isColorPickerOpen = false,
    isShareLinkModalOpen = false,
  } = modals;

  const { targetPosition = null, previewColor = null } = modalData;

  const {
    closeAddCardModal = () => {},
    closePageOverview = () => {},
    closeClearModal = () => {},
    confirmClearBinder = () => {},
    closeColorPicker = () => {},
    closeShareLinkModal = () => {},
    handlePageSelect = () => {},
    handleColorChange = () => {},
    handleColorPreview = () => {},
  } = handlers;

  const {
    addCardModal: addCardModalProps = {},
    pageOverview: pageOverviewProps = {},
    clearModal: clearModalProps = {},
    colorPicker: colorPickerProps = {},
    shareModal: shareModalProps = {},
  } = modalProps;

  return (
    <>
      {/* Add Card Modal */}
      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={closeAddCardModal}
        currentBinder={binder}
        targetPosition={targetPosition}
        {...addCardModalProps}
      />

      {/* Page Overview Modal */}
      <BinderPageOverview
        isOpen={isPageOverviewOpen}
        onClose={closePageOverview}
        currentBinder={binder}
        onCardPageSelect={handlePageSelect}
        {...pageOverviewProps}
      />

      {/* Clear Binder Modal */}
      <ClearBinderModal
        isOpen={isClearModalOpen}
        onClose={closeClearModal}
        onConfirm={confirmClearBinder}
        binderName={binder?.metadata?.name || ""}
        cardCount={Object.keys(binder?.cards || {}).length}
        {...clearModalProps}
      />

      {/* Color Picker Modal */}
      <BinderColorPicker
        isOpen={isColorPickerOpen}
        onClose={closeColorPicker}
        currentColor={binder?.settings?.binderColor || "#ffffff"}
        onColorChange={handleColorChange}
        onPreviewChange={handleColorPreview}
        {...colorPickerProps}
      />

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={isShareLinkModalOpen}
        onClose={closeShareLinkModal}
        binder={binder}
        {...shareModalProps}
      />
    </>
  );
};

ModalProvider.propTypes = {
  binder: PropTypes.object,
  modals: PropTypes.shape({
    isAddCardModalOpen: PropTypes.bool,
    isPageOverviewOpen: PropTypes.bool,
    isClearModalOpen: PropTypes.bool,
    isColorPickerOpen: PropTypes.bool,
    isShareLinkModalOpen: PropTypes.bool,
    isAnyModalOpen: PropTypes.bool,
  }),
  modalData: PropTypes.shape({
    targetPosition: PropTypes.number,
    previewColor: PropTypes.string,
  }),
  handlers: PropTypes.shape({
    closeAddCardModal: PropTypes.func,
    closePageOverview: PropTypes.func,
    closeClearModal: PropTypes.func,
    confirmClearBinder: PropTypes.func,
    closeColorPicker: PropTypes.func,
    closeShareLinkModal: PropTypes.func,
    handlePageSelect: PropTypes.func,
    handleColorChange: PropTypes.func,
    handleColorPreview: PropTypes.func,
  }),
  modalProps: PropTypes.shape({
    addCardModal: PropTypes.object,
    pageOverview: PropTypes.object,
    clearModal: PropTypes.object,
    colorPicker: PropTypes.object,
    shareModal: PropTypes.object,
  }),
  disabled: PropTypes.bool,
};

export default ModalProvider;

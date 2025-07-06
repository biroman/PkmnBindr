import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { toast } from "react-hot-toast";
import BinderCore from "./BinderCore";
import BinderToolbar from "./BinderToolbar";
import BinderSidebar from "./BinderSidebar";
import MobileSettingsModal from "./MobileSettingsModal";
import ModalProvider from "./ModalProvider";
import DragProvider from "./DragProvider";
import { BinderNavigation, EdgeNavigation } from "./navigation";
import useBinderPages from "../../hooks/useBinderPages";
import useBinderDimensions from "../../hooks/useBinderDimensions";
import useBinderNavigation from "../../hooks/useBinderNavigation";
import useBinderDragDrop from "../../hooks/useBinderDragDrop";
import useBinderModals from "../../hooks/useBinderModals";
import { useBinderContext } from "../../contexts/BinderContext";
import { useSelection } from "../../contexts/selection";
import { Button } from "../ui/Button";
import { pdfExportService } from "../../services/PdfExportService";
import { Settings } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { getThemeAwareBinderColor } from "../../utils/themeUtils";
import FloatingSyncControls from "./FloatingSyncControls";

/**
 * Default feature configuration for different modes
 */
const DEFAULT_FEATURES = {
  edit: {
    toolbar: true,
    sidebar: true,
    navigation: true,
    dragDrop: true,
    modals: true,
    keyboard: true,
    edgeNavigation: true,
    colorPicker: true,
    export: true,
    addCards: true,
    deleteCards: true,
    clearBinder: true,
    pageManagement: true,
    sorting: true,
    autoSort: true,
  },
  readonly: {
    toolbar: false,
    sidebar: false,
    navigation: true,
    dragDrop: false,
    modals: false,
    keyboard: true,
    edgeNavigation: false,
    colorPicker: false,
    export: false,
    addCards: false,
    deleteCards: false,
    clearBinder: false,
    pageManagement: false,
    sorting: false,
    autoSort: false,
  },
  admin: {
    toolbar: true,
    sidebar: true,
    navigation: true,
    dragDrop: false,
    modals: true,
    keyboard: true,
    edgeNavigation: false,
    colorPicker: false,
    export: true,
    addCards: false,
    deleteCards: false,
    clearBinder: false,
    pageManagement: false,
    sorting: false,
    autoSort: false,
  },
  preview: {
    toolbar: false,
    sidebar: false,
    navigation: false,
    dragDrop: false,
    modals: false,
    keyboard: false,
    edgeNavigation: false,
    colorPicker: false,
    export: false,
    addCards: false,
    deleteCards: false,
    clearBinder: false,
    pageManagement: false,
    sorting: false,
    autoSort: false,
  },
};

/**
 * BinderContainer - Main reusable binder component
 * Unifies all binder functionality into a configurable, mode-aware component
 *
 * @param {Object} props - Component props
 * @param {Object} props.binder - Binder data object
 * @param {string} props.mode - Display mode: 'edit', 'readonly', 'admin', 'preview'
 * @param {Object} props.features - Feature flags to override default mode settings
 * @param {Object} props.binderContext - Optional binder context override
 * @param {number} props.initialPage - Initial page to display
 * @param {Function} props.onBinderChange - Callback when binder data changes
 * @param {Function} props.onCardClick - Callback when card is clicked
 * @param {Function} props.onCardDelete - Callback when card is deleted
 * @param {Function} props.onPageChange - Callback when page changes
 * @param {Function} props.onError - Callback for error handling
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional styles
 * @param {boolean} props.showNoBinderMessage - Whether to show no binder message
 * @returns {React.ReactElement} BinderContainer component
 */
export const BinderContainer = ({
  binder,
  mode = "edit",
  features: featureOverrides = {},
  binderContext,
  initialPage = 0,
  onBinderChange,
  onCardClick,
  onCardDelete,
  onPageChange,
  onError,
  className = "",
  style = {},
  showNoBinderMessage = true,
  // Public view specific props
  isPublicView = false,
  binderOwner = null,
  // Layout props
  hasNavbar = true, // Whether the page has a navbar (affects height calculations)
  // QR code sharing props
  shareUrl = null,
  showQRCode = false,
  onToggleQRCode = null,
}) => {
  // Early return check - must be before any hooks
  if (!binder) {
    if (!showNoBinderMessage) {
      return null;
    }

    return (
      <div className="h-[calc(100vh-65px)] bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black p-4 flex items-center justify-center">
        <div className="text-text-primary text-center">
          <h2 className="text-2xl font-bold mb-4">No Binder Selected</h2>
          <p className="text-text-secondary mb-6">
            Create or select a binder to start organizing your Pokemon cards
          </p>
        </div>
      </div>
    );
  }

  // Merge default features with overrides
  const features = { ...DEFAULT_FEATURES[mode], ...featureOverrides };

  // Local state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    !features.sidebar
  );
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isMobileToolbarOpen, setIsMobileToolbarOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState("swap"); // 'swap' or 'shift'

  // Use external binder context or internal hook
  const contextValue = binderContext || useBinderContext();
  const {
    updateBinderSettings,
    updateBinder,
    updateBinderMetadata,
    exportBinderData,
    moveCard,
    removeCardFromBinder,
    clearBinderCards,
    sortBinder,
    updateAutoSort,
    addPage,
    compactBinderCards,
  } = contextValue;

  const binderDimensions = useBinderDimensions(
    binder?.settings?.gridSize || "3x3"
  );

  // Selection context (multi-card selection)
  const {
    selectionMode,
    selectedPositions,
    toggleSelectionMode,
    clearSelection,
    setPreviewOffset,
    setIsBulkDragging,
  } = useSelection();

  // Core binder hooks
  const {
    getCurrentPageConfig,
    goToNextPage,
    goToPrevPage,
    goToPage,
    canGoNext,
    canGoPrev,
    getCardsForPage,
  } = useBinderPages(binder, binderDimensions.isMobile);

  // Modal management
  const binderModals = useBinderModals({
    binder,
    onBinderClear: features.clearBinder ? clearBinderCards : undefined,
    onPageSelect: (physicalPageIndex) => {
      const pageOrder =
        binder?.settings?.pageOrder ||
        Array.from({ length: binder?.settings?.pageCount || 1 }, (_, i) => i);

      const logicalPageIndex = pageOrder.indexOf(physicalPageIndex);
      if (logicalPageIndex !== -1) {
        goToPage(logicalPageIndex);
        onPageChange?.(logicalPageIndex);
      }
    },
    onColorChange: features.colorPicker
      ? (binderId, color) => {
          updateBinderSettings(binderId, {
            ...binder.settings,
            binderColor: color,
          });
          onBinderChange?.(binder);
        }
      : undefined,
    enableModals: features.modals,
  });

  // Card interaction handlers (must be defined before drag and drop hook)
  const handleCardClick = (card, slotIndex) => {
    onCardClick?.(card, slotIndex);
  };

  const handleCardDelete = async (card, position) => {
    if (!binder || !features.deleteCards) return;

    try {
      await removeCardFromBinder(binder.id, position);
      onBinderChange?.(binder);
    } catch (error) {
      console.error("Failed to delete card:", error);
      onError?.(error);
    }
  };

  const handleSlotClick = (slotIndex) => {
    if (features.addCards) {
      binderModals.handlers.openAddCardModal(slotIndex);
    }
  };

  // Drag and drop management (needs to be first to provide edge navigation state)
  const binderDragDrop = useBinderDragDrop({
    binder,
    moveCard: features.dragDrop ? moveCard : undefined,
    removeCard: features.deleteCards ? handleCardDelete : undefined,
    navigation: {
      canGoNext,
      canGoPrev,
      goToNextPage,
      goToPrevPage,
      goToPage,
    },
    onDragStateChange: (dragActive) => {
      // Some styling update
    },
    enableShiftPreview: reorderMode === "shift",
    enableDrag: features.dragDrop,
    selectionMode,
    selectedPositions: Array.from(selectedPositions),
    clearSelection,
    setPreviewOffset,
    setIsBulkDragging,
  });

  // Navigation management (receives edge navigation state from drag drop)
  const binderNavigation = useBinderNavigation({
    binder,
    navigation: {
      canGoNext,
      canGoPrev,
      goToNextPage,
      goToPrevPage,
      goToPage,
    },
    activeCard: binderDragDrop.activeCard,
    dimensions: binderDimensions,
    isModalsOpen: binderModals.modals.isAnyModalOpen,
    enableKeyboard: features.keyboard,
    enableEdgeNavigation: features.edgeNavigation,
    edgeNavigationState: {
      currentEdgeZone: binderDragDrop.currentEdgeZone,
      navigationProgress: binderDragDrop.navigationProgress,
    },
  });

  // Initialize to specific page
  useEffect(() => {
    if (initialPage && goToPage) {
      goToPage(initialPage);
    }
  }, [initialPage, goToPage]);

  // Toolbar handlers
  const handleAddCard = () => {
    if (features.addCards) {
      binderModals.handlers.openAddCardModal(null);
    }
  };

  const handleSettings = () => {
    console.log("Settings clicked");
    // TODO: Implement settings modal
  };

  const handlePageOverview = () => {
    if (features.navigation) {
      binderModals.handlers.openPageOverview();
    }
  };

  const handleColorPicker = () => {
    if (features.colorPicker) {
      binderModals.handlers.openColorPicker();
    }
  };

  const handleShare = () => {
    binderModals.handlers.openShareLinkModal();
  };

  const handleMobileSettings = () => {
    setIsMobileSettingsOpen(true);
  };

  const handleExport = () => {
    if (features.export && exportBinderData) {
      exportBinderData();
    }
  };

  const handleClearBinder = () => {
    if (!features.clearBinder) return;

    const opened = binderModals.handlers.openClearModal();
    if (!opened) {
      toast("Binder is already empty");
    }
  };

  const handlePdfExport = async () => {
    if (!features.export || !binder || isPdfExporting) return;

    try {
      setIsPdfExporting(true);
      toast.loading("Generating PDF...", { id: "pdf-export" });

      // Generate PDF using the service
      await pdfExportService.generateBinderPdf(binder, {
        quality: 0.95,
        format: "a4",
        includeEmptyPages: false, // Don't include empty pages for cleaner output
        filename: null, // Auto-generate filename
      });

      toast.success("PDF generated successfully!", { id: "pdf-export" });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error(`PDF export failed: ${error.message}`, { id: "pdf-export" });
      onError?.(error);
    } finally {
      setIsPdfExporting(false);
    }
  };

  // Binder property handlers
  const handleGridSizeChange = (newSize) => {
    if (!binder || !features.sorting) return;
    updateBinderSettings(binder.id, { gridSize: newSize });
    onBinderChange?.(binder);
  };

  const handleNameChange = (newName) => {
    if (!binder) return;
    updateBinderMetadata(binder.id, { name: newName });
    onBinderChange?.(binder);
  };

  const handleSortChange = async (sortBy) => {
    if (!binder || !features.sorting) return;
    // Always sort ascending when the type changes
    const sortDirection = "asc";
    try {
      await updateBinderSettings(binder.id, { sortBy, sortDirection });
      sortBinder(binder.id, sortBy, sortDirection);
      onBinderChange?.(binder);
    } catch (error) {
      onError?.(error);
    }
  };

  const handleSortDirectionChange = async (sortDirection) => {
    if (!binder || !features.sorting) return;
    try {
      const sortBy = binder.settings?.sortBy || "custom";
      await updateBinderSettings(binder.id, { sortDirection });
      sortBinder(binder.id, sortBy, sortDirection);
      onBinderChange?.(binder);
    } catch (error) {
      onError?.(error);
    }
  };

  const handleAutoSortChange = (autoSort) => {
    if (!binder || !features.autoSort) return;

    try {
      updateAutoSort(binder.id, autoSort);
      onBinderChange?.(binder);
    } catch (error) {
      console.error("Failed to update auto-sort:", error);
      onError?.(error);
    }
  };

  const handleAddPage = async () => {
    if (!binder || !features.pageManagement) return;

    try {
      await addPage(binder.id);
      onBinderChange?.(binder);
    } catch (error) {
      console.error("Failed to add page:", error);
      onError?.(error);
    }
  };

  const handleToggleMissing = async (instanceId, isMissing) => {
    if (!binder) return;

    const currentMissingCards = binder.metadata?.missingInstances || [];
    let updatedMissingCards;

    if (isMissing) {
      updatedMissingCards = [...currentMissingCards, instanceId];
    } else {
      updatedMissingCards = currentMissingCards.filter(
        (id) => id !== instanceId
      );
    }

    try {
      await updateBinderMetadata(binder.id, {
        missingInstances: updatedMissingCards,
      });

      toast.success(
        isMissing ? "Card marked as missing" : "Card marked as collected"
      );
      onBinderChange?.(binder);
    } catch (error) {
      console.error("Failed to update missing status:", error);
      onError?.(error);
    }
  };

  const handleBulkToggleMissing = async (markAsMissing) => {
    if (!binder?.cards) return;

    // Get all current card instanceIds
    const allCardInstanceIds = Object.values(binder.cards)
      .map((cardEntry) => cardEntry?.instanceId)
      .filter(Boolean);

    if (allCardInstanceIds.length === 0) {
      toast.error("No cards found in binder");
      return;
    }

    const currentMissingCards = binder.metadata?.missingInstances || [];
    let updatedMissingCards;

    if (markAsMissing) {
      // Add all card instanceIds to missing list (avoid duplicates)
      updatedMissingCards = [
        ...new Set([...currentMissingCards, ...allCardInstanceIds]),
      ];
    } else {
      // Remove all card instanceIds from missing list
      updatedMissingCards = currentMissingCards.filter(
        (instanceId) => !allCardInstanceIds.includes(instanceId)
      );
    }

    try {
      await updateBinderMetadata(binder.id, {
        missingInstances: updatedMissingCards,
      });

      const cardCount = allCardInstanceIds.length;
      toast.success(
        markAsMissing
          ? `Marked ${cardCount} cards as missing`
          : `Marked ${cardCount} cards as collected`
      );
      onBinderChange?.(binder);
    } catch (error) {
      console.error("Failed to update bulk missing status:", error);
      onError?.(error);
    }
  };

  // Compaction Handlers
  const handleCompactEntireBinder = () => {
    if (!binder) return;
    compactBinderCards(binder.id, { scope: "binder" });
  };

  const handleCompactCurrentPage = () => {
    if (!binder) return;

    const cfg = getCurrentPageConfig;
    const pageIndices = [];

    if (binderDimensions.isMobile) {
      // Mobile has single page view
      if (cfg.type === "cards-single") {
        pageIndices.push(cfg.leftPage.cardPageIndex);
      }
    } else {
      if (cfg.type === "cover-and-first") {
        pageIndices.push(cfg.rightPage.cardPageIndex);
      } else if (cfg.type === "cards-pair") {
        pageIndices.push(cfg.leftPage.cardPageIndex);
        pageIndices.push(cfg.rightPage.cardPageIndex);
      }
    }

    if (pageIndices.length > 0) {
      compactBinderCards(binder.id, { scope: "page", pageIndices });
    }
  };

  const pageConfig = getCurrentPageConfig;
  const isMobile = binderDimensions.isMobile;
  const sidebarWidth =
    features.sidebar && !isSidebarCollapsed && !isMobile ? 320 : 0;

  // Get the current theme
  const { theme } = useTheme();

  // Get the current binder color (preview or saved) with theme awareness
  const currentDisplayColor = (() => {
    // If there's a preview color (from color picker), use it
    if (binderModals.modalData.previewColor) {
      return binderModals.modalData.previewColor;
    }

    // Otherwise, get theme-aware color
    return getThemeAwareBinderColor(binder?.settings?.binderColor, theme);
  })();

  const handleToggleSelectionMode = () => {
    toggleSelectionMode();
  };

  const handleToggleReorderMode = () => {
    setReorderMode((prev) => (prev === "swap" ? "shift" : "swap"));
  };

  return (
    <div
      className={`${
        isMobile
          ? hasNavbar
            ? "fixed top-16 bottom-0 left-0 right-0 overflow-auto"
            : "fixed inset-0 overflow-auto"
          : hasNavbar
          ? "h-[calc(100vh-64px)] overflow-hidden"
          : "h-screen overflow-hidden"
      } bg-gradient-to-br from-slate-800 to-slate-900 ${className}`}
      style={{
        paddingRight: `${sidebarWidth}px`,
        // On mobile, use flexbox to center the content, no padding needed here
        paddingBottom: isMobile ? "80px" : "0", // Add bottom padding for mobile navigation
        ...style,
      }}
    >
      {/* Desktop Toolbar - only show on desktop */}
      {features.toolbar && !isMobile && (
        <div className="absolute top-0 left-0 right-0 z-20 p-2">
          <BinderToolbar
            onAddCard={handleAddCard}
            onSettings={handleSettings}
            onExport={handleExport}
            onClearBinder={handleClearBinder}
            onPageOverview={handlePageOverview}
            onPdfExport={handlePdfExport}
            onColorPicker={handleColorPicker}
            onShare={handleShare}
            onMobileSettings={handleMobileSettings}
            onToggleSelectionMode={handleToggleSelectionMode}
            reorderMode={reorderMode}
            onToggleReorderMode={handleToggleReorderMode}
            selectionMode={selectionMode}
            currentBinder={binder}
            isPdfExporting={isPdfExporting}
            isMobile={false}
            onCompactPage={handleCompactCurrentPage}
            onCompactBinder={handleCompactEntireBinder}
            disabled={
              !features.addCards && !features.export && !features.clearBinder
            }
          />
        </div>
      )}

      {/* Main Binder Display - Full height with proper centering */}
      <DragProvider
        dragHandlers={
          features.dragDrop
            ? {
                onDragStart: binderDragDrop.handleDragStart,
                onDragEnd: binderDragDrop.handleDragEnd,
                onDragCancel: binderDragDrop.handleDragCancel,
                onDragOver: binderDragDrop.handleDragOver,
              }
            : {}
        }
        activeCard={binderDragDrop.activeCard}
        disabled={!features.dragDrop}
        className={`h-full w-full flex ${
          isMobile ? "items-center" : "items-center" // Center vertically on mobile too
        } justify-center`}
        style={{
          paddingTop: features.toolbar && !isMobile ? "70px" : "0", // Account for toolbar height on desktop only
          padding: isMobile ? "16px 0" : "0", // Add some vertical padding on mobile
        }}
      >
        <BinderCore
          binder={binder}
          currentPageConfig={pageConfig}
          dimensions={binderDimensions}
          mode={mode}
          backgroundColor={currentDisplayColor}
          reorderMode={reorderMode}
          getCardsForPage={getCardsForPage}
          onCardInteraction={{
            onCardClick: handleCardClick,
            onCardDelete: features.deleteCards ? handleCardDelete : undefined,
            onSlotClick: features.addCards ? handleSlotClick : undefined,
            onToggleMissing: handleToggleMissing,
          }}
          dragHandlers={
            features.dragDrop
              ? {
                  onDragStart: binderDragDrop.handleDragStart,
                  onDragEnd: binderDragDrop.handleDragEnd,
                  onDragCancel: binderDragDrop.handleDragCancel,
                  onDragOver: binderDragDrop.handleDragOver,
                }
              : {}
          }
          activeCard={binderDragDrop.activeCard}
          className={`drag-container ${
            binderDragDrop.activeCard ? "dragging-active" : ""
          }`}
          // Public view specific props
          isPublicView={isPublicView}
          binderOwner={binderOwner}
          // QR code sharing props
          shareUrl={shareUrl}
          showQRCode={showQRCode}
          onToggleQRCode={onToggleQRCode}
        />

        {/* Edge Navigation - positioned relative to full viewport, inside DndContext */}
        {features.edgeNavigation && (
          <EdgeNavigation
            isActive={!!binderDragDrop.activeCard}
            navigation={binderNavigation}
            positions={binderNavigation.getEdgeZonePositions(sidebarWidth)}
            dragState={{
              isInNavigationZone: binderNavigation.isInNavigationZone,
              navigationProgress: binderNavigation.navigationProgress,
            }}
          />
        )}

        {/* Page Navigation - positioned relative to full viewport, inside DndContext */}
        {features.navigation && (
          <BinderNavigation
            navigation={binderNavigation}
            positions={binderNavigation.getNavigationPositions(sidebarWidth)}
            onAddPage={features.pageManagement ? handleAddPage : undefined}
            isReadOnly={mode === "readonly" || mode === "preview"}
            mode={mode}
            activeCard={binderDragDrop.activeCard}
            currentPageConfig={pageConfig}
            isMobile={isMobile}
            // Pass down drag state for progress indicator
            navigationProgress={binderDragDrop.navigationProgress}
            currentEdgeZone={binderDragDrop.currentEdgeZone}
            // Public view props
            isPublicView={isPublicView}
            // Mobile toolbar integration
            toolbarActions={
              isMobile && features.toolbar
                ? {
                    onAddCard: features.addCards ? handleAddCard : undefined,
                    onPageOverview: features.navigation
                      ? handlePageOverview
                      : undefined,
                    onColorPicker: features.colorPicker
                      ? handleColorPicker
                      : undefined,
                    onShare: features.export ? handleShare : undefined,
                    onMobileSettings: handleMobileSettings,
                    onPdfExport: features.export ? handlePdfExport : undefined,
                    onClearBinder: features.clearBinder
                      ? handleClearBinder
                      : undefined,
                    onToggleSelectionMode: handleToggleSelectionMode,
                    selectionMode,
                    reorderMode,
                    onToggleReorderMode: handleToggleReorderMode,
                    onCompactPage: handleCompactCurrentPage,
                    onCompactBinder: handleCompactEntireBinder,
                  }
                : {}
            }
            isToolbarOpen={isMobileToolbarOpen}
            onToggleToolbar={() => setIsMobileToolbarOpen(!isMobileToolbarOpen)}
            onCardDelete={features.deleteCards ? handleCardDelete : undefined}
          />
        )}
      </DragProvider>

      {/* Sidebar Toggle Button - only show on desktop */}
      {features.sidebar && !isMobile && (
        <div
          className="absolute top-4 right-4"
          style={{
            top: features.toolbar ? "78px" : "16px", // Account for toolbar height
          }}
        >
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-3 bg-card-background/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-card-background hover:shadow-xl transition-all duration-200 flex items-center gap-2 border border-border"
            title={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            <Settings className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium text-primary">
              {isSidebarCollapsed ? "Settings" : "Hide"}
            </span>
          </button>
        </div>
      )}

      {/* Floating Save / Revert Controls */}
      {features.sidebar && !isMobile && isSidebarCollapsed && (
        <FloatingSyncControls binder={binder} />
      )}

      {/* Sidebar - only show on desktop */}
      {features.sidebar && !isMobile && (
        <BinderSidebar
          isMobile={binderDimensions.isMobile}
          isCollapsed={isSidebarCollapsed}
          binder={binder}
          onCollapseChange={setIsSidebarCollapsed}
          onGridSizeChange={handleGridSizeChange}
          onNameChange={handleNameChange}
          onSortChange={handleSortChange}
          onSortDirectionChange={handleSortDirectionChange}
          onAutoSortChange={handleAutoSortChange}
          onBulkToggleMissing={handleBulkToggleMissing}
          isReadOnly={mode !== "edit"}
        />
      )}

      {/* Modals */}
      {features.modals && (
        <ModalProvider
          binder={binder}
          modals={binderModals.modals}
          modalData={binderModals.modalData}
          handlers={binderModals.handlers}
        />
      )}

      {/* Mobile Settings Modal */}
      {isMobile && features.sidebar && (
        <MobileSettingsModal
          isOpen={isMobileSettingsOpen}
          onClose={() => setIsMobileSettingsOpen(false)}
          binder={binder}
          onGridSizeChange={handleGridSizeChange}
          onNameChange={handleNameChange}
          onSortChange={handleSortChange}
          onSortDirectionChange={handleSortDirectionChange}
          onAutoSortChange={handleAutoSortChange}
          onBulkToggleMissing={handleBulkToggleMissing}
          onAddPage={handleAddPage}
          onClearBinder={handleClearBinder}
        />
      )}
    </div>
  );
};

BinderContainer.propTypes = {
  binder: PropTypes.object,
  mode: PropTypes.oneOf(["edit", "readonly", "admin", "preview"]),
  features: PropTypes.object,
  binderContext: PropTypes.object,
  initialPage: PropTypes.number,
  onBinderChange: PropTypes.func,
  onCardClick: PropTypes.func,
  onCardDelete: PropTypes.func,
  onPageChange: PropTypes.func,
  onError: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  showNoBinderMessage: PropTypes.bool,
  // Public view specific props
  isPublicView: PropTypes.bool,
  binderOwner: PropTypes.object,
  // QR code sharing props
  shareUrl: PropTypes.string,
  showQRCode: PropTypes.bool,
  onToggleQRCode: PropTypes.func,
};

export default BinderContainer;

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { toast } from "react-hot-toast";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useBinderContext } from "../contexts/BinderContext";
import { Button } from "../components/ui/Button";
import CoverPage from "../components/binder/CoverPage";
import CardPage from "../components/binder/CardPage";
import GridSizeSelector from "../components/binder/GridSizeSelector";
import BinderToolbar from "../components/binder/BinderToolbar";
import DraggableCard from "../components/binder/DraggableCard";
import BinderSidebar from "../components/binder/BinderSidebar";
import BinderCore from "../components/binder/BinderCore";
import {
  BinderNavigation,
  EdgeNavigation,
} from "../components/binder/navigation";
import useBinderPages from "../hooks/useBinderPages";
import useBinderDimensions from "../hooks/useBinderDimensions";
import useBinderNavigation from "../hooks/useBinderNavigation";
import useBinderDragDrop from "../hooks/useBinderDragDrop";
import useBinderModals from "../hooks/useBinderModals";
import ModalProvider from "../components/binder/ModalProvider";
import pdfExportService from "../services/PdfExportService";
import { useRules } from "../contexts/RulesContext";
import useExportTracking from "../hooks/useExportTracking";

const BinderPage = () => {
  const navigate = useNavigate();
  const { id: binderId } = useParams();
  const { checkFeatureLimitReached, canPerformAction } = useRules();
  const { trackExport } = useExportTracking();
  const {
    currentBinder,
    binders,
    selectBinder,
    updateBinderSettings,
    updateBinder,
    updateBinderMetadata,
    exportBinderData,
    clearAllData,
    moveCard,
    moveCardOptimistic,
    removeCardFromBinder,
    clearBinderCards,
    batchAddCards,
    canAccessBinder,
    sortBinder,
    updateAutoSort,
    addPage,
  } = useBinderContext();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  // Auto-select binder based on URL parameter with security check
  useEffect(() => {
    if (binderId && binders.length > 0) {
      const targetBinder = binders.find((binder) => binder.id === binderId);
      if (targetBinder) {
        // Security check: Verify user can access this binder
        if (!canAccessBinder(binderId)) {
          console.warn(`Access denied: User cannot access binder ${binderId}`);
          toast.error("Access denied: This binder belongs to another user");
          navigate("/binders", { replace: true });
          return;
        }

        // Only select if it's not already the current binder
        if (!currentBinder || currentBinder.id !== binderId) {
          selectBinder(targetBinder);
        }
      } else {
        // Binder not found, redirect to binders page
        navigate("/binders", { replace: true });
      }
    }
  }, [
    binderId,
    binders,
    currentBinder,
    selectBinder,
    navigate,
    canAccessBinder,
  ]);

  // Use the binder pages hook
  const {
    getCurrentPageConfig,
    goToNextPage,
    goToPrevPage,
    goToPage,
    canGoNext,
    canGoPrev,
    getCardsForPage,
    getPageDisplayText,
  } = useBinderPages(currentBinder);

  // Use the robust binder dimensions hook (call before any conditional returns)
  const binderDimensions = useBinderDimensions(
    currentBinder?.settings?.gridSize || "3x3"
  );

  // Modal management functionality (must come before navigation hook)
  const binderModals = useBinderModals({
    binder: currentBinder,
    onCardAdd: (binder, position) => {
      // Card addition is handled by AddCardModal itself
      console.log("Card add request:", binder, position);
    },
    onBinderClear: clearBinderCards,
    onPageSelect: (physicalPageIndex) => {
      // Navigate to the selected page
      // We need to find the logical page index that corresponds to this physical page
      const pageOrder =
        currentBinder?.settings?.pageOrder ||
        Array.from(
          { length: currentBinder?.settings?.pageCount || 1 },
          (_, i) => i
        );

      const logicalPageIndex = pageOrder.indexOf(physicalPageIndex);

      if (logicalPageIndex !== -1) {
        // Navigate to the logical page index
        goToPage(logicalPageIndex);
        console.log(
          "Navigated to logical page:",
          logicalPageIndex,
          "showing physical page:",
          physicalPageIndex
        );
      } else {
        console.warn(
          "Could not find logical page index for physical page:",
          physicalPageIndex
        );
      }
    },
    onColorChange: (binderId, color) => {
      updateBinderSettings(binderId, {
        ...currentBinder.settings,
        binderColor: color,
      });
    },
    onColorPreview: (color) => {
      // Color preview handled by modalData
    },
    enableModals: true,
  });

  // Navigation state managed by hook (must come after useBinderPages and useBinderDimensions)
  const binderNavigation = useBinderNavigation({
    binder: currentBinder,
    navigation: {
      canGoNext,
      canGoPrev,
      goToNextPage,
      goToPrevPage,
      goToPage,
    },
    activeCard: null, // Will be updated after drag hook is initialized
    dimensions: binderDimensions,
    isModalsOpen: binderModals.modals.isAnyModalOpen,
    enableKeyboard: true,
    enableEdgeNavigation: true,
  });

  // Drag and drop functionality (must come after navigation hook)
  const binderDragDrop = useBinderDragDrop({
    binder: currentBinder,
    moveCard,
    navigation: binderNavigation,
    onDragStateChange: (isDragging) => {
      // Optional: Add any side effects when drag state changes
      console.log("Drag state changed:", isDragging);
    },
    enableDrag: true,
  });

  // No need for local state management - handled by context

  // Card interaction handlers
  const handleCardClick = (card, slotIndex) => {
    console.log("Card clicked:", card, "at slot:", slotIndex);
    // TODO: Open card details modal or edit card
  };

  const handleCardDelete = async (card, position) => {
    if (!currentBinder) return;

    try {
      await removeCardFromBinder(currentBinder.id, position);
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  };

  const handleSlotClick = (slotIndex) => {
    binderModals.handlers.openAddCardModal(slotIndex);
  };

  // Grid size change handler
  const handleGridSizeChange = (newSize) => {
    if (!currentBinder) return;
    updateBinderSettings(currentBinder.id, { gridSize: newSize });
  };

  // Binder name change handler
  const handleNameChange = (newName) => {
    if (!currentBinder) return;
    updateBinder(currentBinder.id, {
      metadata: {
        ...currentBinder.metadata,
        name: newName,
      },
    });
  };

  // Toolbar handlers
  const handleAddCard = () => {
    binderModals.handlers.openAddCardModal(null); // No specific target, add to next available slot
  };

  const handleSettings = () => {
    // TODO: Open settings modal
    console.log("Settings clicked");
  };

  const handlePageOverview = () => {
    binderModals.handlers.openPageOverview();
  };

  const handleColorPicker = () => {
    binderModals.handlers.openColorPicker();
  };

  // Page selection is handled by the modal hook

  const handleExport = () => {
    exportBinderData();
  };

  const handleClearBinder = () => {
    if (!currentBinder) return;

    const opened = binderModals.handlers.openClearModal();
    if (!opened) {
      toast("Binder is already empty");
    }
  };

  const handlePdfExport = async () => {
    if (!currentBinder || isPdfExporting) return;

    try {
      // Check if user can perform PDF exports
      const pdfExportCheck = await canPerformAction("pdf_export");
      if (!pdfExportCheck.allowed) {
        toast.error(
          pdfExportCheck.reason ||
            "PDF export is not available for your subscription tier"
        );
        return;
      }

      setIsPdfExporting(true);

      // Generate PDF
      await pdfExportService.generateBinderPdf(currentBinder, {
        quality: 0.95,
        format: "a4",
        includeEmptyPages: false, // Don't include completely empty pages by default
      });

      // Track the export usage
      await trackExport("pdf");

      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    } finally {
      setIsPdfExporting(false);
    }
  };

  // Clear binder confirmation is handled by the modal hook

  const handleToggleMissing = async (instanceId, isMissing) => {
    if (!currentBinder) return;

    const currentMissingCards = currentBinder.metadata?.missingInstances || [];
    let updatedMissingCards;

    if (isMissing) {
      // Add to missing cards
      updatedMissingCards = [...currentMissingCards, instanceId];
    } else {
      // Remove from missing cards
      updatedMissingCards = currentMissingCards.filter(
        (id) => id !== instanceId
      );
    }

    // Update binder metadata (use instance-based tracking)
    await updateBinderMetadata(currentBinder.id, {
      missingInstances: updatedMissingCards,
    });

    // Show toast notification
    if (isMissing) {
      toast.success(`Card marked as missing`);
    } else {
      toast.success(`Card marked as collected`);
    }
  };

  // Sorting handlers
  const handleSortChange = async (sortBy) => {
    if (!currentBinder) return;

    try {
      await sortBinder(currentBinder.id, sortBy);
    } catch (error) {
      console.error("Failed to sort binder:", error);
    }
  };

  const handleAutoSortChange = (autoSort) => {
    if (!currentBinder) return;

    try {
      updateAutoSort(currentBinder.id, autoSort);
    } catch (error) {
      console.error("Failed to update auto-sort:", error);
    }
  };

  const handleAddPage = async () => {
    if (!currentBinder) return;

    try {
      await addPage(currentBinder.id);
      // Navigate to the new page after adding it
      setTimeout(() => {
        goToPage(totalPages); // totalPages will be updated after addPage
      }, 100);
    } catch (error) {
      console.error("Failed to add page:", error);
      // Error is already handled by the addPage function with toast
    }
  };

  // Don't render if no binder selected
  if (!currentBinder) {
    return (
      <div className="h-[calc(100vh-65px)] bg-gradient-to-br from-slate-800 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No Binder Selected</h2>
          <p className="text-slate-300 mb-6">
            Create or select a binder to start organizing your Pokemon cards
          </p>
          <div className="space-x-4">
            <Button
              onClick={() => navigate("/binders")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Manage Binders
            </Button>
            <Button
              onClick={() => navigate("/browse")}
              className="bg-green-600 hover:bg-green-700"
            >
              Browse Cards
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pageConfig = getCurrentPageConfig;

  // Calculate sidebar width for navigation button positioning
  const sidebarWidth = isSidebarCollapsed ? 0 : 320; // 0px when hidden, 320px when visible
  // Buttons should shift left by the full sidebar width to stick with the binder
  const navigationAdjustment = sidebarWidth;

  // Get the current binder color (preview or saved)
  const currentDisplayColor =
    binderModals.modalData.previewColor ||
    currentBinder?.settings?.binderColor ||
    "#ffffff";

  return (
    <div
      className="h-[calc(100vh-65px)] bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden"
      style={{ paddingRight: `${sidebarWidth}px` }}
    >
      {/* Main Binder Area */}
      <div className="flex flex-col p-2 h-full">
        {/* Binder Toolbar */}
        <BinderToolbar
          onAddCard={handleAddCard}
          onSettings={handleSettings}
          onExport={handleExport}
          onClearBinder={handleClearBinder}
          onPageOverview={handlePageOverview}
          onPdfExport={handlePdfExport}
          onColorPicker={handleColorPicker}
          currentBinder={currentBinder}
          isPdfExporting={isPdfExporting}
        />

        <BinderCore
          binder={currentBinder}
          currentPageConfig={pageConfig}
          dimensions={binderDimensions}
          mode="edit"
          backgroundColor={currentDisplayColor}
          getCardsForPage={getCardsForPage}
          onCardInteraction={{
            onCardClick: handleCardClick,
            onCardDelete: handleCardDelete,
            onSlotClick: handleSlotClick,
            onToggleMissing: handleToggleMissing,
          }}
          dragHandlers={{
            onDragStart: binderDragDrop.handleDragStart,
            onDragEnd: binderDragDrop.handleDragEnd,
            onDragCancel: binderDragDrop.handleDragCancel,
            onDragOver: binderDragDrop.handleDragOver,
          }}
          activeCard={binderDragDrop.activeCard}
          className={`drag-container ${
            binderDragDrop.activeCard ? "dragging-active" : ""
          }`}
        >
          {/* Edge Navigation Zones */}
          <EdgeNavigation
            isActive={!!binderDragDrop.activeCard}
            navigation={binderNavigation}
            positions={binderNavigation.getEdgeZonePositions(sidebarWidth)}
            dragState={{
              isInNavigationZone: binderNavigation.isInNavigationZone,
              navigationProgress: binderNavigation.navigationProgress,
            }}
          />

          {/* Page Navigation Controls */}
          <BinderNavigation
            navigation={binderNavigation}
            positions={binderNavigation.getNavigationPositions(sidebarWidth)}
            onAddPage={handleAddPage}
            isReadOnly={false}
            mode="edit"
            activeCard={binderDragDrop.activeCard}
          />

          {/* Sidebar Toggle Button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              title={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                {isSidebarCollapsed ? "Settings" : "Hide"}
              </span>
            </button>
          </div>
        </BinderCore>
      </div>

      {/* Sidebar */}
      <BinderSidebar
        binder={currentBinder}
        onGridSizeChange={handleGridSizeChange}
        onNameChange={handleNameChange}
        onCollapseChange={setIsSidebarCollapsed}
        onSortChange={handleSortChange}
        onAutoSortChange={handleAutoSortChange}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Modals */}
      <ModalProvider
        binder={currentBinder}
        modals={binderModals.modals}
        modalData={binderModals.modalData}
        handlers={binderModals.handlers}
      />
    </div>
  );
};

export default BinderPage;

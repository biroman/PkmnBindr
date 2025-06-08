import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { useBinderContext } from "../contexts/BinderContext";
import { Button } from "../components/ui/Button";
import CoverPage from "../components/binder/CoverPage";
import CardPage from "../components/binder/CardPage";
import GridSizeSelector from "../components/binder/GridSizeSelector";
import BinderToolbar from "../components/binder/BinderToolbar";
import AddCardModal from "../components/binder/AddCardModal";
import PageManager from "../components/binder/PageManager";
import DraggableCard from "../components/binder/DraggableCard";
import useBinderPages from "../hooks/useBinderPages";
import useBinderDimensions from "../hooks/useBinderDimensions";

const BinderPage = () => {
  const navigate = useNavigate();
  const { id: binderId } = useParams();
  const {
    currentBinder,
    binders,
    selectBinder,
    updateBinderSettings,
    exportBinderData,
    clearAllData,
    moveCard,
    moveCardOptimistic,
    removeCardFromBinder,
  } = useBinderContext();
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null); // For drag overlay

  // Auto-select binder based on URL parameter
  useEffect(() => {
    if (binderId && binders.length > 0) {
      const targetBinder = binders.find((binder) => binder.id === binderId);
      if (targetBinder) {
        // Only select if it's not already the current binder
        if (!currentBinder || currentBinder.id !== binderId) {
          selectBinder(targetBinder);
        }
      } else {
        // Binder not found, redirect to binders page
        navigate("/binders", { replace: true });
      }
    }
  }, [binderId, binders, currentBinder, selectBinder, navigate]);

  // Use the binder pages hook
  const {
    getCurrentPageConfig,
    goToNextPage,
    goToPrevPage,
    canGoNext,
    canGoPrev,
    getCardsForPage,
    getPageDisplayText,
  } = useBinderPages(currentBinder);

  // Use the robust binder dimensions hook (call before any conditional returns)
  const binderDimensions = useBinderDimensions(
    currentBinder?.settings?.gridSize || "3x3"
  );

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
    console.log("Empty slot clicked:", slotIndex);
    // TODO: Open card search/add modal
  };

  // Grid size change handler
  const handleGridSizeChange = (newSize) => {
    if (!currentBinder) return;
    updateBinderSettings(currentBinder.id, { gridSize: newSize });
  };

  // Toolbar handlers
  const handleAddCard = () => {
    setIsAddCardModalOpen(true);
  };

  const handleSettings = () => {
    // TODO: Open settings modal
    console.log("Settings clicked");
  };

  const handleExport = () => {
    exportBinderData();
  };

  const handleClearBinder = () => {
    if (
      window.confirm(
        `Are you sure you want to clear all cards from "${currentBinder.metadata.name}"? This action cannot be undone.`
      )
    ) {
      // TODO: Implement clear binder functionality
      console.log("Clear binder");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event) => {
    const { active } = event;
    const cardData = active.data.current;

    if (cardData?.type === "card") {
      setActiveCard(cardData.card);
      // Prevent document scrolling during drag
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.userSelect = "none";
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCard(null);

    // Restore document scrolling
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    document.body.style.userSelect = "";

    if (!active || !over || !currentBinder) {
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    // Only handle card-to-slot drops
    if (activeData?.type === "card" && overData?.type === "slot") {
      const fromPosition = activeData.position;
      const toPosition = overData.position;

      if (fromPosition !== toPosition) {
        try {
          await moveCard(currentBinder.id, fromPosition, toPosition);
        } catch (error) {
          console.error("Failed to move card:", error);
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveCard(null);

    // Restore document scrolling on cancel
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    document.body.style.userSelect = "";
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

  return (
    <div className="h-[calc(100vh-65px)] bg-gradient-to-br from-slate-800 to-slate-900 p-2 overflow-hidden">
      {/* Binder Toolbar */}
      <BinderToolbar
        onAddCard={handleAddCard}
        onSettings={handleSettings}
        onExport={handleExport}
        onClearBinder={handleClearBinder}
        currentBinder={currentBinder}
      />

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        currentBinder={currentBinder}
      />

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          className={`flex items-center justify-center h-full drag-container ${
            activeCard ? "dragging-active" : ""
          }`}
        >
          {/* Binder Container - Dynamic sizing based on grid */}
          <div
            className="relative flex gap-4"
            style={{
              width: `${binderDimensions.width}px`,
              height: `${binderDimensions.height}px`,
            }}
          >
            {/* Left Page */}
            {pageConfig.leftPage.type === "cover" ? (
              <CoverPage binder={currentBinder} />
            ) : (
              <CardPage
                pageNumber={pageConfig.leftPage.pageNumber}
                cards={getCardsForPage(pageConfig.leftPage.cardPageIndex)}
                gridSize={currentBinder.settings.gridSize}
                onCardClick={handleCardClick}
                onCardDelete={handleCardDelete}
                onSlotClick={handleSlotClick}
                cardPageIndex={pageConfig.leftPage.cardPageIndex}
              />
            )}

            {/* Center Spine */}
            <div className="w-2 bg-gray-400 rounded-full shadow-lg"></div>

            {/* Right Page */}
            <CardPage
              pageNumber={pageConfig.rightPage.pageNumber}
              cards={getCardsForPage(pageConfig.rightPage.cardPageIndex)}
              gridSize={currentBinder.settings.gridSize}
              onCardClick={handleCardClick}
              onCardDelete={handleCardDelete}
              onSlotClick={handleSlotClick}
              cardPageIndex={pageConfig.rightPage.cardPageIndex}
            />
          </div>

          {/* Left Navigation - positioned next to binder */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2"
            style={{ left: binderDimensions.navigationPositions.left }}
          >
            <button
              onClick={goToPrevPage}
              disabled={!canGoPrev}
              className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Previous Page"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>

          {/* Right Navigation - positioned next to binder */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2"
            style={{ right: binderDimensions.navigationPositions.right }}
          >
            <button
              onClick={goToNextPage}
              disabled={!canGoNext}
              className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Next Page"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Binder Info Overlay */}
          <div className="absolute top-4 left-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium shadow-lg">
              📚 {currentBinder.metadata.name}
            </div>
          </div>

          {/* Grid Size Selector */}
          <div className="absolute top-4 right-20">
            <GridSizeSelector
              currentSize={currentBinder.settings.gridSize}
              onSizeChange={handleGridSizeChange}
            />
          </div>

          {/* Page Manager */}
          <div className="absolute top-4 right-4 w-80">
            <PageManager binder={currentBinder} />
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeCard ? (
              <DraggableCard
                card={activeCard}
                position={-1} // Special position for overlay
                gridSize={currentBinder.settings.gridSize}
                isDragging={true}
              />
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>
    </div>
  );
};

export default BinderPage;

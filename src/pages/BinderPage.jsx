import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { toast } from "react-hot-toast";
import { useBinderContext } from "../contexts/BinderContext";
import { Button } from "../components/ui/Button";
import CoverPage from "../components/binder/CoverPage";
import CardPage from "../components/binder/CardPage";
import GridSizeSelector from "../components/binder/GridSizeSelector";
import BinderToolbar from "../components/binder/BinderToolbar";
import AddCardModal from "../components/binder/AddCardModal";
import PageManager from "../components/binder/PageManager";
import DraggableCard from "../components/binder/DraggableCard";
import BinderSidebar from "../components/binder/BinderSidebar";
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
    updateBinder,
    updateBinderMetadata,
    exportBinderData,
    clearAllData,
    moveCard,
    moveCardOptimistic,
    removeCardFromBinder,
  } = useBinderContext();
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null); // For drag overlay
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Edge navigation state
  const [edgeNavigationTimer, setEdgeNavigationTimer] = useState(null);
  const [isInNavigationZone, setIsInNavigationZone] = useState(null);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [progressAnimationId, setProgressAnimationId] = useState(null); // 'left' | 'right' | null
  const navigationZoneRef = useRef(null); // Ref to track current navigation zone without closure issues

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

  const handleToggleMissing = async (missingCardId, isMissing) => {
    if (!currentBinder) return;

    const currentMissingCards = currentBinder.metadata?.missingCards || [];
    let updatedMissingCards;

    if (isMissing) {
      // Add to missing cards
      updatedMissingCards = [...currentMissingCards, missingCardId].sort(
        (a, b) => {
          // Extract base number and reverse holo flag for sorting
          const parseCard = (card) => {
            const isRH = card.endsWith("rh");
            const baseNum = isRH ? card.slice(0, -2) : card;
            const num = parseInt(baseNum);
            return {
              baseNum: isNaN(num) ? baseNum : num,
              isRH,
              isNumeric: !isNaN(num),
            };
          };

          const aCard = parseCard(a);
          const bCard = parseCard(b);

          // First sort by base number
          if (aCard.isNumeric && bCard.isNumeric) {
            if (aCard.baseNum !== bCard.baseNum) {
              return aCard.baseNum - bCard.baseNum;
            }
            // Same base number: regular before reverse holo
            return aCard.isRH - bCard.isRH;
          } else {
            // Alphabetical for non-numeric
            const comparison = String(aCard.baseNum).localeCompare(
              String(bCard.baseNum)
            );
            if (comparison !== 0) return comparison;
            return aCard.isRH - bCard.isRH;
          }
        }
      );
    } else {
      // Remove from missing cards
      updatedMissingCards = currentMissingCards.filter(
        (num) => num !== missingCardId
      );
    }

    // Update binder metadata
    await updateBinderMetadata(currentBinder.id, {
      missingCards: updatedMissingCards,
    });

    // Show toast notification
    const isReverseHolo = missingCardId.endsWith("rh");
    const displayNumber = isReverseHolo
      ? missingCardId.slice(0, -2)
      : missingCardId;
    const cardType = isReverseHolo ? "reverse holo" : "regular";

    if (isMissing) {
      toast.success(`Card #${displayNumber} (${cardType}) marked as missing`);
    } else {
      toast.success(`Card #${displayNumber} (${cardType}) marked as collected`);
    }
  };

  // Edge navigation helper functions
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

  const startNavigationTimer = useCallback(
    (direction) => {
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
          if (direction === "left" && canGoPrev) {
            goToPrevPage();
          } else if (direction === "right" && canGoNext) {
            goToNextPage();
          }
        }
        clearNavigationTimer();
      }, 1000); // 1 second delay

      setEdgeNavigationTimer(timer);
    },
    [
      clearNavigationTimer,
      isInNavigationZone,
      canGoPrev,
      canGoNext,
      goToPrevPage,
      goToNextPage,
    ]
  );

  // Mouse move handler for edge navigation
  const handleMouseMove = useCallback(
    (event) => {
      if (!activeCard) return;

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
          startNavigationTimer("left");
        }
      } else if (
        mouseX >= rightZoneStart &&
        mouseX <= rightZoneEnd &&
        canGoNext
      ) {
        if (isInNavigationZone !== "right") {
          startNavigationTimer("right");
        }
      } else {
        // Not in any navigation zone
        if (navigationZoneRef.current) {
          clearNavigationTimer();
        }
      }
    },
    [
      activeCard,
      canGoPrev,
      canGoNext,
      startNavigationTimer,
      clearNavigationTimer,
    ]
  );

  // Add/remove mouse move listener when dragging
  useEffect(() => {
    if (activeCard) {
      document.addEventListener("mousemove", handleMouseMove);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, [activeCard, isInNavigationZone, canGoPrev, canGoNext]);

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

    // Clear navigation timer
    clearNavigationTimer();

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

    // Clear navigation timer
    clearNavigationTimer();

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

  // Calculate sidebar width for navigation button positioning
  const sidebarWidth = isSidebarCollapsed ? 0 : 320; // 0px when hidden, 320px when visible
  // Buttons should shift left by the full sidebar width to stick with the binder
  const navigationAdjustment = sidebarWidth;

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
            className={`flex items-center justify-center flex-1 drag-container ${
              activeCard ? "dragging-active" : ""
            }`}
          >
            {/* Edge Navigation Zones - positioned relative to binder container */}
            {activeCard && (
              <>
                {/* Left Edge Zone */}
                <div
                  className={`fixed top-16 bottom-0 w-24 transition-all duration-200 z-20 ${
                    isInNavigationZone === "left"
                      ? "bg-blue-500/30 border-r-4 border-blue-500"
                      : "bg-blue-500/10 border-r-2 border-blue-300"
                  } ${canGoPrev ? "opacity-100" : "opacity-50"}`}
                  style={{
                    left: `calc(50% - ${navigationAdjustment / 2}px - ${
                      binderDimensions.width / 2 + 124
                    }px)`,
                  }}
                >
                  <div className="flex items-center justify-center h-full">
                    <div className="text-white text-center">
                      <div className="relative inline-block">
                        <svg
                          className="w-8 h-8 mx-auto mb-2"
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
                        {isInNavigationZone === "left" && (
                          <svg
                            className="absolute inset-0 w-8 h-8 -rotate-90"
                            viewBox="0 0 32 32"
                          >
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth="2"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeDasharray="87.96"
                              strokeDashoffset={
                                87.96 - (87.96 * navigationProgress) / 100
                              }
                              className="transition-all duration-75 ease-linear"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="text-xs font-medium">
                        {isInNavigationZone === "left"
                          ? "Switching..."
                          : "Hold to go back"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Edge Zone */}
                <div
                  className={`fixed top-16 bottom-0 w-24 transition-all duration-200 z-20 ${
                    isInNavigationZone === "right"
                      ? "bg-blue-500/30 border-l-4 border-blue-500"
                      : "bg-blue-500/10 border-l-2 border-blue-300"
                  } ${canGoNext ? "opacity-100" : "opacity-50"}`}
                  style={{
                    left: `calc(50% - ${navigationAdjustment / 2}px + ${
                      binderDimensions.width / 2 + 26
                    }px)`,
                  }}
                >
                  <div className="flex items-center justify-center h-full">
                    <div className="text-white text-center">
                      <div className="relative inline-block">
                        <svg
                          className="w-8 h-8 mx-auto mb-2"
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
                        {isInNavigationZone === "right" && (
                          <svg
                            className="absolute inset-0 w-8 h-8 -rotate-90"
                            viewBox="0 0 32 32"
                          >
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth="2"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeDasharray="87.96"
                              strokeDashoffset={
                                87.96 - (87.96 * navigationProgress) / 100
                              }
                              className="transition-all duration-75 ease-linear"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="text-xs font-medium">
                        {isInNavigationZone === "right"
                          ? "Switching..."
                          : "Hold to go forward"}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Binder Container - Dynamic sizing based on grid */}
            <div
              className="relative flex gap-4 binder-container"
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
                  onToggleMissing={handleToggleMissing}
                  cardPageIndex={pageConfig.leftPage.cardPageIndex}
                  missingCards={currentBinder.metadata?.missingCards || []}
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
                onToggleMissing={handleToggleMissing}
                cardPageIndex={pageConfig.rightPage.cardPageIndex}
                missingCards={currentBinder.metadata?.missingCards || []}
              />
            </div>

            {/* Left Navigation - positioned next to binder */}
            {!activeCard && (
              <div
                className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300"
                style={{
                  left: `calc((50% - ${navigationAdjustment / 2}px) - ${
                    binderDimensions.width / 2 + 64
                  }px)`,
                }}
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
            )}

            {/* Right Navigation - positioned next to binder */}
            {!activeCard && (
              <div
                className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300"
                style={{
                  right: `calc((50% + ${navigationAdjustment / 2}px) - ${
                    binderDimensions.width / 2 + 64
                  }px)`,
                }}
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
            )}

            {/* Page Manager - moved to top left */}
            <div className="absolute top-4 left-4 w-80">
              <PageManager binder={currentBinder} />
            </div>

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

      {/* Sidebar */}
      <BinderSidebar
        binder={currentBinder}
        onGridSizeChange={handleGridSizeChange}
        onNameChange={handleNameChange}
        onCollapseChange={setIsSidebarCollapsed}
        isCollapsed={isSidebarCollapsed}
      />
    </div>
  );
};

export default BinderPage;

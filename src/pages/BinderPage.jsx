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

import DraggableCard from "../components/binder/DraggableCard";
import BinderSidebar from "../components/binder/BinderSidebar";
import BinderPageOverview from "../components/binder/BinderPageOverview";
import ClearBinderModal from "../components/binder/ClearBinderModal";
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
    batchAddCards,
    canAccessBinder,
  } = useBinderContext();
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [targetPosition, setTargetPosition] = useState(null); // For slot-specific card addition
  const [activeCard, setActiveCard] = useState(null); // For drag overlay
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPageOverviewOpen, setIsPageOverviewOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Edge navigation state
  const [edgeNavigationTimer, setEdgeNavigationTimer] = useState(null);
  const [isInNavigationZone, setIsInNavigationZone] = useState(null);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [progressAnimationId, setProgressAnimationId] = useState(null); // 'left' | 'right' | null
  const navigationZoneRef = useRef(null); // Ref to track current navigation zone without closure issues

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
    setTargetPosition(slotIndex);
    setIsAddCardModalOpen(true);
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
    setTargetPosition(null); // No specific target, add to next available slot
    setIsAddCardModalOpen(true);
  };

  const handleSettings = () => {
    // TODO: Open settings modal
    console.log("Settings clicked");
  };

  const handlePageOverview = () => {
    setIsPageOverviewOpen(true);
  };

  const handlePageSelect = (physicalPageIndex) => {
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
  };

  const handleExport = () => {
    exportBinderData();
  };

  const handleClearBinder = () => {
    if (!currentBinder) return;

    const cardCount = Object.keys(currentBinder.cards || {}).length;
    if (cardCount === 0) {
      toast.info("Binder is already empty");
      return;
    }

    setIsClearModalOpen(true);
  };

  const confirmClearBinder = async () => {
    if (!currentBinder) return;

    try {
      // Get all card positions in the binder
      const cardPositions = Object.keys(currentBinder.cards || {}).map((pos) =>
        parseInt(pos)
      );

      // Remove all cards one by one
      for (const position of cardPositions) {
        await removeCardFromBinder(currentBinder.id, position);
        // Small delay to prevent overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      // Also clear any missing instances since all cards are gone
      await updateBinderMetadata(currentBinder.id, {
        missingInstances: [],
      });

      toast.success(
        `Cleared all ${cardPositions.length} cards from "${currentBinder.metadata.name}"`
      );

      setIsClearModalOpen(false);
    } catch (error) {
      console.error("Failed to clear binder:", error);
      toast.error("Failed to clear binder");
    }
  };

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
          onPageOverview={handlePageOverview}
          currentBinder={currentBinder}
        />

        {/* Add Card Modal */}
        <AddCardModal
          isOpen={isAddCardModalOpen}
          onClose={() => {
            setIsAddCardModalOpen(false);
            setTargetPosition(null);
          }}
          currentBinder={currentBinder}
          targetPosition={targetPosition}
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
                  missingPositions={
                    currentBinder.metadata?.missingInstances || []
                  }
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
                missingPositions={
                  currentBinder.metadata?.missingInstances || []
                }
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

      {/* Modals */}
      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        currentBinder={currentBinder}
        targetPosition={targetPosition}
      />

      <BinderPageOverview
        isOpen={isPageOverviewOpen}
        onClose={() => setIsPageOverviewOpen(false)}
        currentBinder={currentBinder}
        onCardPageSelect={handlePageSelect}
      />

      <ClearBinderModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={confirmClearBinder}
        binderName={currentBinder?.metadata?.name || ""}
        cardCount={Object.keys(currentBinder?.cards || {}).length}
      />
    </div>
  );
};

export default BinderPage;

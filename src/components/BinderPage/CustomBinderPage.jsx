import {
  Star,
  Plus,
  Trash2,
  Search,
  Lightbulb,
  CheckSquare,
  Square,
  Move,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Clipboard,
} from "lucide-react";
import PropTypes from "prop-types";
import { useTheme } from "../../theme/ThemeContent";
import { useContextMenu } from "../../hooks";
import ContextMenu from "../ContextMenu/ContextMenu";
import MoveCardsModal from "./MoveCardsModal";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  getCustomCards,
  addCustomCard,
  removeCustomCard,
  reorderCustomCards,
  updateHistoryWithFinalState,
  getBinderHistory,
  addHistoryEntry,
  saveBinder,
  getAllBinders,
  getMissingCards,
  saveToClipboard,
  getCardClipboard,
  updateCardClipboard,
  parseMissingCards,
  addToMissingCards,
  updateMissingCards,
} from "../../utils/storageUtilsIndexedDB";

const CustomBinderPage = ({
  cards = [],
  currentPage,
  layout,
  onReorderCards,
  onRemoveCard,
  onOpenCardSearch,
  onMoveFromClipboard,
  parsedMissingCards = new Set(),
  onToggleCardStatus,
  onMoveCards,
  onPageChange,
  currentBinder,
  onCardsUpdate,
}) => {
  const { theme } = useTheme();
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [navigationTimer, setNavigationTimer] = useState(null);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  const cardsPerPage = layout.cards;
  const totalPhysicalPages = Math.ceil(cards.length / cardsPerPage);
  const maxPage = Math.ceil((totalPhysicalPages + 1) / 2) - 1;

  // Handle window resize for responsive binder sizing
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cleanup navigation timer on unmount
  useEffect(() => {
    return () => {
      if (navigationTimer) {
        clearTimeout(navigationTimer.timeout);
        clearInterval(navigationTimer.progressInterval);
      }
    };
  }, [navigationTimer]);

  let leftPhysicalPage, rightPhysicalPage;

  if (currentPage === 0) {
    leftPhysicalPage = null;
    rightPhysicalPage = 0;
  } else {
    leftPhysicalPage = 2 * currentPage - 1;
    rightPhysicalPage = 2 * currentPage;
  }

  const leftPageCards =
    leftPhysicalPage !== null && leftPhysicalPage < totalPhysicalPages
      ? cards.slice(
          leftPhysicalPage * cardsPerPage,
          (leftPhysicalPage + 1) * cardsPerPage
        )
      : [];
  const rightPageCards =
    rightPhysicalPage < totalPhysicalPages
      ? cards.slice(
          rightPhysicalPage * cardsPerPage,
          (rightPhysicalPage + 1) * cardsPerPage
        )
      : [];

  // Responsive binder sizing (same as original BinderPage)
  const binderDimensions = useMemo(() => {
    const getGridDimensions = (layoutId) => {
      const gridMap = {
        "2x2": { cols: 2, rows: 2 },
        "3x3": { cols: 3, rows: 3 },
        "4x3": { cols: 4, rows: 3 },
        "4x4": { cols: 4, rows: 4 },
      };
      return gridMap[layoutId] || { cols: 3, rows: 3 };
    };

    const { cols, rows } = getGridDimensions(layout.id);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      "2xl": 1536,
    };

    const sidebarWidth = viewportWidth >= breakpoints.lg ? 384 : 320;
    const headerHeight = 80;
    const footerHeight = 60;
    const padding = viewportWidth >= breakpoints.md ? 32 : 16;

    const effectiveSidebarWidth =
      viewportWidth >= breakpoints.lg ? sidebarWidth : 0;
    const availableWidth = viewportWidth - effectiveSidebarWidth - padding;
    const availableHeight =
      viewportHeight - headerHeight - footerHeight - padding;

    const calculateResponsiveDimensions = () => {
      const cardAspectRatio = 2.5 / 3.5;
      const maxCardWidth = (availableWidth * 0.45) / cols;
      const maxCardHeight = (availableHeight * 0.85) / rows;

      const cardWidthFromHeight = maxCardHeight * cardAspectRatio;
      const cardHeightFromWidth = maxCardWidth / cardAspectRatio;

      const finalCardWidth = Math.min(maxCardWidth, cardWidthFromHeight);
      const finalCardHeight = Math.min(maxCardHeight, cardHeightFromWidth);

      const pageWidth = finalCardWidth * cols;
      const pageHeight = finalCardHeight * rows;

      const gap = Math.max(8, Math.min(16, finalCardWidth * 0.05));
      const padding = Math.max(16, Math.min(32, finalCardWidth * 0.1));

      const totalPageWidth = pageWidth + gap * (cols - 1) + padding * 2;
      const totalPageHeight = pageHeight + gap * (rows - 1) + padding * 2;

      const binderWidth = totalPageWidth * 2 + 16;
      const binderHeight = totalPageHeight;

      const maxBinderWidth = availableWidth * 0.95;
      const maxBinderHeight = availableHeight * 0.9;

      let finalBinderWidth = Math.min(binderWidth, maxBinderWidth);
      let finalBinderHeight = Math.min(binderHeight, maxBinderHeight);

      if (binderWidth > maxBinderWidth || binderHeight > maxBinderHeight) {
        const scaleX = maxBinderWidth / binderWidth;
        const scaleY = maxBinderHeight / binderHeight;
        const scale = Math.min(scaleX, scaleY);

        finalBinderWidth = binderWidth * scale;
        finalBinderHeight = binderHeight * scale;
      }

      let responsiveScale = 1;
      if (viewportWidth <= breakpoints.md) {
        responsiveScale = 0.8;
      } else if (viewportWidth <= breakpoints.lg) {
        responsiveScale = 0.9;
      } else if (viewportWidth >= breakpoints["2xl"]) {
        responsiveScale = 1.1;
      }

      finalBinderWidth *= responsiveScale;
      finalBinderHeight *= responsiveScale;

      return {
        width: `${Math.round(finalBinderWidth)}px`,
        height: `${Math.round(finalBinderHeight)}px`,
        padding: `${Math.round(padding * responsiveScale)}px`,
        gap: `${Math.round(gap * responsiveScale)}px`,
        gridCols: cols,
        gridRows: rows,
      };
    };

    return calculateResponsiveDimensions();
  }, [layout.id, layout.cards, windowSize]);

  const getGridClasses = () => {
    return `grid-cols-${binderDimensions.gridCols} grid-rows-${binderDimensions.gridRows}`;
  };

  const getContainerStyles = () => ({
    width: binderDimensions.width,
    height: binderDimensions.height,
    maxWidth: "95vw",
    maxHeight: "85vh",
  });

  const getGridStyles = () => ({
    padding: binderDimensions.padding,
    gap: binderDimensions.gap,
  });

  // Drag and drop handlers
  const handleDragStart = (e, card, globalIndex) => {
    setDraggedCard({ card, globalIndex });
    e.dataTransfer.effectAllowed = "move";

    // Create enhanced drag image (same style as clipboard)
    const dragImage = document.createElement("div");
    dragImage.style.width = "80px";
    dragImage.style.height = "112px";
    dragImage.style.background = `url(${card.images.small}) center/cover`;
    dragImage.style.borderRadius = "8px";
    dragImage.style.border = "2px solid #3b82f6";
    dragImage.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)";
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    dragImage.style.transform = "rotate(-5deg) scale(1.1)";
    dragImage.style.pointerEvents = "none";
    dragImage.style.zIndex = "9999";

    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 40, 56);

    // Clean up after drag starts
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 1);

    // Set drag data for clipboard to read
    const dragData = {
      card,
      globalIndex,
      source: "binder",
    };
    e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  };

  const handleDragOver = (e, targetIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(targetIndex);
    setDragOverZone(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    setDragOverZone(null);

    // Check if this is a clipboard card
    try {
      const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (dragData.source === "clipboard") {
        // Handle clipboard card drop
        const targetCard = cards[targetIndex];
        if (!targetCard) {
          // Only allow dropping on empty slots from clipboard
          // Call the parent to handle moving card from clipboard to binder
          if (onMoveFromClipboard) {
            // Call async function and handle the result
            onMoveFromClipboard(
              dragData.clipboardIndex,
              targetIndex,
              dragData.cardId,
              dragData.isReverseHolo
            );
          }
        }
        setDraggedCard(null);
        return;
      }
    } catch {
      // Not clipboard data, continue with normal handling
    }

    if (draggedCard && draggedCard.globalIndex !== targetIndex) {
      // Check if target position has a card (swap) or is empty (move)
      const targetCard = cards[targetIndex];

      if (targetCard) {
        // Swap the two cards
        onReorderCards(draggedCard.globalIndex, targetIndex, true); // true indicates swap
      } else {
        // Move to empty position
        onReorderCards(draggedCard.globalIndex, targetIndex, false); // false indicates move
      }
    }
    setDraggedCard(null);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverIndex(null);
    setDragOverZone(null);
  };

  const handleRemoveCard = (e, card, globalIndex) => {
    e.stopPropagation();
    onRemoveCard(globalIndex);
  };

  const handleToggleCardStatus = (e, card) => {
    e.stopPropagation();
    if (onToggleCardStatus) {
      onToggleCardStatus(e, card);
    }
  };

  // Selection handlers
  const handleCardClick = (e, card, globalIndex) => {
    if (isSelectionMode) {
      e.stopPropagation();
      handleCardSelection(card, globalIndex);
    }
  };

  const handleCardSelection = (card, globalIndex) => {
    // Use a more reliable card identifier
    const cardKey = `${globalIndex}`;
    const newSelectedCards = new Set(selectedCards);

    if (newSelectedCards.has(cardKey)) {
      newSelectedCards.delete(cardKey);
    } else {
      newSelectedCards.add(cardKey);
    }

    setSelectedCards(newSelectedCards);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedCards(new Set());
    }
  };

  const handleMoveSelectedCards = () => {
    if (selectedCards.size === 0) return;
    setShowMoveModal(true);
  };

  const handleMoveCards = async (
    selectedCardData,
    targetPageIndex,
    moveOption
  ) => {
    const success = await onMoveCards(
      selectedCardData,
      targetPageIndex,
      moveOption
    );
    if (success) {
      setSelectedCards(new Set());
      setIsSelectionMode(false);
      setShowMoveModal(false);
    }
  };

  // Handle adding a new page to the binder
  const handleAddPage = () => {
    if (!currentBinder || currentBinder.binderType !== "custom") {
      return;
    }

    const result = addPageToBinder(currentBinder.id, layout.cards);
    if (result && result.success && onCardsUpdate) {
      // Notify parent component that cards have been updated
      onCardsUpdate();

      // Navigate to the new page if user wants
      const newPageCount = Math.ceil(result.newLength / layout.cards);
      const maxPage = Math.ceil((newPageCount + 1) / 2) - 1;

      // Optionally navigate to the last page to show the new empty slots
      if (currentPage < maxPage) {
        onPageChange(maxPage);
      }
    }
  };

  // Handle removing the current page from the binder
  const handleRemovePage = () => {
    if (!currentBinder || currentBinder.binderType !== "custom") {
      return;
    }

    // Don't allow removing the cover page (page 0)
    if (currentPage <= 0) {
      return;
    }

    const result = removePageFromBinder(
      currentBinder.id,
      currentPage,
      layout.cards
    );

    if (result && result.success) {
      // Notify parent component that cards have been updated
      if (onCardsUpdate) {
        onCardsUpdate();
      }

      // Navigate back if we're now beyond the last page
      if (result.shouldNavigateBack && onPageChange) {
        onPageChange(Math.max(0, result.newMaxPage));
      }
    } else if (result && result.hasCards) {
      // Show an alert or notification that the page contains cards
      alert(
        `Cannot remove page: it contains ${result.cardCount} card${
          result.cardCount !== 1 ? "s" : ""
        }. Remove the cards first.`
      );
    }
  };

  const selectAllOnPage = () => {
    const newSelectedCards = new Set(selectedCards);

    // Get cards on current page
    const leftPageStart =
      leftPhysicalPage !== null ? leftPhysicalPage * cardsPerPage : -1;
    const leftPageEnd =
      leftPhysicalPage !== null ? (leftPhysicalPage + 1) * cardsPerPage : -1;
    const rightPageStart = rightPhysicalPage * cardsPerPage;
    const rightPageEnd = (rightPhysicalPage + 1) * cardsPerPage;

    // Add left page cards
    if (leftPhysicalPage !== null) {
      for (let i = leftPageStart; i < leftPageEnd && i < cards.length; i++) {
        if (cards[i]) {
          newSelectedCards.add(`${i}`);
        }
      }
    }

    // Add right page cards
    for (let i = rightPageStart; i < rightPageEnd && i < cards.length; i++) {
      if (cards[i]) {
        newSelectedCards.add(`${i}`);
      }
    }

    setSelectedCards(newSelectedCards);
  };

  const deselectAll = () => {
    setSelectedCards(new Set());
  };

  const renderPage = (pageCards, pageOffset = 0) => {
    return (
      <div
        className={`relative ${theme.colors.background.sidebar} w-full h-full rounded-3xl shadow-2xl border ${theme.colors.border.light}`}
      >
        <div
          className={`grid ${getGridClasses()} h-full w-full`}
          style={getGridStyles()}
        >
          {Array.from({ length: layout.cards }).map((_, idx) => {
            const card = pageCards[idx];
            const globalIndex = pageOffset + idx;
            const isDragOver = dragOverIndex === globalIndex;
            const isDragging = draggedCard?.globalIndex === globalIndex;
            const isSelected = card && selectedCards.has(`${globalIndex}`);

            return (
              <div
                key={`slot-${globalIndex}`}
                className={`relative w-full ${
                  isDragOver
                    ? card
                      ? "ring-2 ring-orange-500 ring-opacity-50" // Orange for swap
                      : "ring-2 ring-blue-500 ring-opacity-50" // Blue for move
                    : ""
                }`}
                onDragOver={(e) => handleDragOver(e, globalIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, globalIndex)}
              >
                <div className="aspect-[2.5/3.5] w-full">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {card ? (
                      <div
                        className={`relative w-full h-full group transition-all duration-200 ${
                          isDragging
                            ? "opacity-30 scale-95 rotate-2"
                            : isDragOver
                            ? "scale-105 rotate-1 ring-2 ring-orange-400"
                            : isSelected
                            ? "ring-2 ring-blue-500 scale-[1.02]"
                            : "hover:scale-[1.02] hover:-rotate-1"
                        }`}
                        draggable={!isSelectionMode}
                        onDragStart={(e) =>
                          !isSelectionMode &&
                          handleDragStart(e, card, globalIndex)
                        }
                        onDragEnd={handleDragEnd}
                      >
                        {/* Card container */}
                        <div
                          className={`relative w-full h-full ${
                            isSelectionMode ? "cursor-pointer" : "cursor-move"
                          }`}
                        >
                          <div
                            className="relative w-full h-full cursor-pointer"
                            onClick={(e) =>
                              handleCardClick(e, card, globalIndex)
                            }
                          >
                            <img
                              src={card.images.small}
                              alt={card.name}
                              className={`
                                w-full h-full object-contain rounded-lg shadow-lg
                                transition-all duration-300 ease-out
                                ${
                                  isDragging
                                    ? "shadow-2xl"
                                    : "group-hover:shadow-xl group-hover:shadow-blue-500/20"
                                }
                                ${
                                  parsedMissingCards.has(
                                    card.isReverseHolo
                                      ? `${card.positionId || card.id}_reverse`
                                      : card.positionId || card.id
                                  )
                                    ? "opacity-50 grayscale"
                                    : ""
                                }
                              `}
                            />

                            {/* Missing card overlay */}
                            {parsedMissingCards.has(
                              card.isReverseHolo
                                ? `${card.positionId || card.id}_reverse`
                                : card.positionId || card.id
                            ) && (
                              <div className="absolute inset-0 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                <div className="bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                                  MISSING
                                </div>
                              </div>
                            )}

                            {/* Selection indicator */}
                            {isSelectionMode && (
                              <div className="absolute top-2 left-2 z-10">
                                <div
                                  className={`w-6 h-6 rounded-md flex items-center justify-center shadow-lg transition-all duration-200 ${
                                    isSelected
                                      ? "bg-blue-500 text-white"
                                      : `${theme.colors.background.card} ${theme.colors.text.secondary} hover:${theme.colors.background.sidebar}`
                                  }`}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Top overlay - Reverse holo indicator */}
                            {card.isReverseHolo && (
                              <div
                                className={`absolute top-2 ${
                                  isSelectionMode ? "right-2" : "right-2"
                                } opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                              >
                                <div
                                  className={`w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 backdrop-blur-sm bg-opacity-90 flex items-center justify-center shadow-lg`}
                                >
                                  <Star className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}

                            {/* Bottom overlay - Card info and actions */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                              {/* Action buttons */}
                              <div className="flex gap-6 mx-4 my-4 justify-center pointer-events-auto">
                                <button
                                  onClick={(e) =>
                                    handleToggleCardStatus(e, card)
                                  }
                                  className={`
                                    flex-1 px-2 py-2 rounded-lg backdrop-blur-sm bg-opacity-90
                                    flex items-center justify-center gap-1 shadow-lg
                                    hover:scale-105 transition-all duration-200
                                    text-xs font-medium
                                    ${
                                      parsedMissingCards.has(
                                        card.isReverseHolo
                                          ? `${
                                              card.positionId || card.id
                                            }_reverse`
                                          : card.positionId || card.id
                                      )
                                        ? `${theme.colors.button.success}`
                                        : "bg-orange-500 hover:bg-orange-600 text-white"
                                    }
                                  `}
                                  title={
                                    parsedMissingCards.has(
                                      card.isReverseHolo
                                        ? `${
                                            card.positionId || card.id
                                          }_reverse`
                                        : card.positionId || card.id
                                    )
                                      ? "Mark as collected"
                                      : "Mark as missing"
                                  }
                                >
                                  {parsedMissingCards.has(
                                    card.isReverseHolo
                                      ? `${card.positionId || card.id}_reverse`
                                      : card.positionId || card.id
                                  ) ? (
                                    <Plus className="w-3 h-3" />
                                  ) : (
                                    <CircleHelp className="w-3 h-3" />
                                  )}
                                  {parsedMissingCards.has(
                                    card.isReverseHolo
                                      ? `${card.positionId || card.id}_reverse`
                                      : card.positionId || card.id
                                  )
                                    ? "Collected"
                                    : "Missing"}
                                </button>

                                <button
                                  onClick={(e) =>
                                    handleRemoveCard(e, card, globalIndex)
                                  }
                                  className={`
                                    flex-1 px-2 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white backdrop-blur-sm bg-opacity-90
                                    flex items-center justify-center gap-1 shadow-lg
                                    hover:scale-105 transition-all duration-200
                                    text-xs font-medium
                                  `}
                                  title="Remove from binder"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Empty slot */
                      <div
                        className={`
                          w-full h-full rounded-lg border-2 border-dashed 
                          ${theme.colors.border.accent} ${
                          theme.colors.background.card
                        }
                          flex items-center justify-center cursor-pointer
                          hover:border-solid transition-all duration-200
                          group-hover:shadow-lg
                          ${
                            isDragOver
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105 shadow-lg ring-2 ring-blue-500/30"
                              : "hover:border-blue-400/50 hover:bg-blue-50/10"
                          }
                        `}
                        onClick={() => onOpenCardSearch(globalIndex)}
                        onDragOver={(e) => handleDragOver(e, globalIndex)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, globalIndex)}
                      >
                        <div className="text-center space-y-2">
                          <div
                            className={`w-12 h-12 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center`}
                          >
                            <Plus
                              className={`w-6 h-6 ${theme.colors.text.accent}`}
                            />
                          </div>
                          <div
                            className={`text-xs ${theme.colors.text.secondary} font-medium`}
                          >
                            Add Card
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Navigation zone handlers
  const handleNavigationZoneDragOver = (e, zone) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Only start timer if we're not already in this zone
    if (dragOverZone !== zone) {
      setDragOverZone(zone);
      setNavigationProgress(0);

      // Clear any existing timer
      if (navigationTimer) {
        clearTimeout(navigationTimer.timeout);
        clearInterval(navigationTimer.progressInterval);
      }

      // Start progress animation
      const progressInterval = setInterval(() => {
        setNavigationProgress((prev) => {
          const newProgress = prev + 100 / 10; // 10 updates over 1 second
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 100);

      // Set navigation timer
      const timeout = setTimeout(() => {
        if (!draggedCard || !onPageChange) return;

        // Navigate to the appropriate page
        if (zone === "left" && currentPage > 0) {
          onPageChange(currentPage - 1);
        } else if (zone === "right" && currentPage < maxPage) {
          onPageChange(currentPage + 1);
        }

        // Reset states but keep the card dragged
        setDragOverZone(null);
        setNavigationProgress(0);
        clearInterval(progressInterval);
      }, 1000);

      setNavigationTimer({ timeout, progressInterval });
    }
  };

  const handleNavigationZoneDragLeave = () => {
    // Clear timer and reset states
    if (navigationTimer) {
      clearTimeout(navigationTimer.timeout);
      clearInterval(navigationTimer.progressInterval);
      setNavigationTimer(null);
    }
    setDragOverZone(null);
    setNavigationProgress(0);
  };

  const handleNavigationZoneDrop = (e) => {
    e.preventDefault();

    // Clear timer
    if (navigationTimer) {
      clearTimeout(navigationTimer.timeout);
      clearInterval(navigationTimer.progressInterval);
      setNavigationTimer(null);
    }

    setDragOverZone(null);
    setNavigationProgress(0);

    // Don't navigate on drop - only on timer
  };

  return (
    <div
      className="h-full flex items-center justify-center p-4"
      data-custom-context-menu
      onContextMenu={handleContextMenu}
    >
      <div className="flex flex-col items-center space-y-6">
        {/* Binder Container with Navigation Zones */}
        <div
          className="relative flex items-center"
          onWheel={(e) => {
            e.preventDefault();

            // Only navigate if we have cards and onPageChange function
            if (cards.length === 0 || !onPageChange) return;

            const totalPhysicalPages = Math.ceil(cards.length / cardsPerPage);
            const adjustedTotalPages = Math.ceil((totalPhysicalPages + 1) / 2);

            if (e.deltaY > 0) {
              // Scroll down - previous page
              if (currentPage > 0) {
                onPageChange(currentPage - 1);
              }
            } else {
              // Scroll up - next page
              if (currentPage < adjustedTotalPages - 1) {
                onPageChange(currentPage + 1);
              }
            }
          }}
        >
          {/* Left Navigation Zone */}
          {currentPage > 0 && draggedCard && (
            <div
              className={`absolute left-0 top-0 bottom-0 w-16 z-50 flex items-center justify-center transition-all duration-200 ${
                dragOverZone === "left"
                  ? "bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-l-lg"
                  : "bg-transparent"
              }`}
              style={{ transform: "translateX(-100%)" }}
              onDragOver={(e) => handleNavigationZoneDragOver(e, "left")}
              onDragLeave={handleNavigationZoneDragLeave}
              onDrop={handleNavigationZoneDrop}
            >
              {dragOverZone === "left" && (
                <div className="flex flex-col items-center text-blue-500">
                  <ChevronLeft className="w-8 h-8" />
                  <span className="text-xs font-medium">Previous</span>
                  {/* Progress indicator */}
                  <div className="w-12 h-1 bg-blue-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                      style={{ width: `${navigationProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Binder Pages */}
          <div className="flex gap-4 relative" style={getContainerStyles()}>
            {/* Left Page */}
            <div className="flex-1 min-w-0">
              {currentPage === 0 ? (
                <div
                  className={`relative ${theme.colors.background.sidebar} w-full h-full rounded-3xl shadow-2xl border ${theme.colors.border.light} flex items-center justify-center`}
                >
                  <div className="text-center space-y-4">
                    <div
                      className={`w-16 h-16 mx-auto rounded-full ${theme.colors.background.card} flex items-center justify-center`}
                    >
                      {cards.filter((card) => card !== null).length === 0 ? (
                        <Search
                          className={`w-8 h-8 ${theme.colors.text.accent}`}
                        />
                      ) : (
                        <Lightbulb
                          className={`w-8 h-8 ${theme.colors.text.accent}`}
                        />
                      )}
                    </div>
                    <div>
                      <h3
                        className={`text-lg font-bold ${theme.colors.text.primary} mb-2`}
                      >
                        {cards.filter((card) => card !== null).length === 0
                          ? "Custom Collection"
                          : "Tips & Tricks"}
                      </h3>
                      {cards.filter((card) => card !== null).length === 0 ? (
                        <p
                          className={`${theme.colors.text.secondary} text-sm max-w-80`}
                        >
                          Add individual cards from any set to create your
                          personalized collection
                        </p>
                      ) : (
                        <div
                          className={`${theme.colors.text.secondary} text-sm max-w-80 mx-auto space-y-3 text-left`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-blue-400 font-bold text-base leading-none mt-0.5 flex-shrink-0">
                              •
                            </span>
                            <span className="leading-relaxed">
                              Click and drag cards to rearrange their position
                            </span>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-green-400 font-bold text-base leading-none mt-0.5 flex-shrink-0">
                              •
                            </span>
                            <span className="leading-relaxed">
                              Mark cards as &ldquo;Missing&rdquo; to track what
                              you need
                            </span>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-purple-400 font-bold text-base leading-none mt-0.5 flex-shrink-0">
                              •
                            </span>
                            <div className="leading-relaxed">
                              Drag cards to the clipboard on the right
                              <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded ml-1 ${theme.colors.background.card} border ${theme.colors.border.light}`}
                              >
                                <Clipboard className="w-2.5 h-2.5 text-blue-500" />
                              </span>{" "}
                              to store them between pages
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-orange-400 font-bold text-base leading-none mt-0.5 flex-shrink-0">
                              •
                            </span>
                            <span className="leading-relaxed">
                              Drag cards from clipboard to specific positions
                            </span>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-red-400 font-bold text-base leading-none mt-0.5 flex-shrink-0">
                              •
                            </span>
                            <span className="leading-relaxed">
                              Drag cards to the left or right edges to navigate
                              between pages
                            </span>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-yellow-400 font-bold text-base leading-none mt-0.5 flex-shrink-0">
                              •
                            </span>
                            <div className="leading-relaxed">
                              If you regret an action, you can undo it with the
                              undo button
                              <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded ml-1 ${theme.colors.background.card} border ${theme.colors.border.light}`}
                              >
                                <Undo2 className="w-2.5 h-2.5 text-blue-500" />
                              </span>{" "}
                              in the bottom right corner
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-cyan-400 font-bold text-base leading-none mt-0.5 flex-shrink-0">
                              •
                            </span>
                            <span className="leading-relaxed">
                              Right-click anywhere to access quick actions like
                              adding new pages
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {cards.filter((card) => card !== null).length === 0 && (
                      <button
                        onClick={() => onOpenCardSearch()}
                        className={`px-4 py-2 rounded-lg ${theme.colors.button.primary} font-medium`}
                      >
                        Add Cards
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                renderPage(leftPageCards, leftPhysicalPage * cardsPerPage)
              )}
            </div>

            {/* Right Page */}
            <div className="flex-1 min-w-0">
              {renderPage(rightPageCards, rightPhysicalPage * cardsPerPage)}
            </div>
          </div>

          {/* Right Navigation Zone */}
          {currentPage < maxPage && draggedCard && (
            <div
              className={`absolute right-0 top-0 bottom-0 w-16 z-50 flex items-center justify-center transition-all duration-200 ${
                dragOverZone === "right"
                  ? "bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-r-lg"
                  : "bg-transparent"
              }`}
              style={{ transform: "translateX(100%)" }}
              onDragOver={(e) => handleNavigationZoneDragOver(e, "right")}
              onDragLeave={handleNavigationZoneDragLeave}
              onDrop={handleNavigationZoneDrop}
            >
              {dragOverZone === "right" && (
                <div className="flex flex-col items-center text-blue-500">
                  <ChevronRight className="w-8 h-8" />
                  <span className="text-xs font-medium">Next</span>
                  {/* Progress indicator */}
                  <div className="w-12 h-1 bg-blue-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                      style={{ width: `${navigationProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selection Mode Toggle - Floating Button */}
      {cards.filter((card) => card !== null).length > 0 && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
          <div className="flex flex-col gap-3">
            {/* Selection Mode Toggle Button */}
            <button
              onClick={toggleSelectionMode}
              className={`
                w-38 h-12 rounded-xl shadow-lg border transition-all duration-200 
                flex items-center justify-center group hover:scale-105
                ${
                  isSelectionMode
                    ? `bg-blue-500 border-blue-400 text-white hover:bg-blue-600`
                    : `${theme.colors.background.card} ${theme.colors.border.light} ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`
                }
              `}
              title={
                isSelectionMode ? "Exit selection mode" : "Select cards to move"
              }
            >
              <Move className="w-5 h-5 mr-4" />
              <p className="text-xs">Card Selector</p>
            </button>

            {/* Selection Controls - Show when in selection mode */}
            {isSelectionMode && (
              <div
                className={`${theme.colors.background.card} border ${theme.colors.border.light} rounded-xl shadow-lg p-3 min-w-56`}
              >
                <div className="space-y-3">
                  {/* Selected count */}
                  <div className="text-center">
                    <span
                      className={`text-sm font-medium ${theme.colors.text.primary}`}
                    >
                      {selectedCards.size} selected
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    {selectedCards.size > 0 && (
                      <button
                        onClick={handleMoveSelectedCards}
                        className={`w-full px-3 py-2 rounded-lg ${theme.colors.button.primary} font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm`}
                      >
                        <Move className="w-4 h-4" />
                        Move Cards
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={selectAllOnPage}
                        className={`flex-1 px-3 py-2 rounded-lg ${theme.colors.button.secondary} font-medium transition-all duration-200 text-xs`}
                      >
                        Select Page
                      </button>

                      <button
                        onClick={deselectAll}
                        className={`flex-1 px-3 py-2 rounded-lg ${theme.colors.button.secondary} font-medium transition-all duration-200 text-xs`}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Move Cards Modal */}
      {showMoveModal && (
        <MoveCardsModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          selectedCards={Array.from(selectedCards)
            .map((cardKey) => {
              const globalIndex = parseInt(cardKey);
              const card = cards[globalIndex];
              return {
                card,
                globalIndex,
                cardKey,
              };
            })
            .filter((item) => item.card !== null && item.card !== undefined)}
          currentPage={currentPage}
          totalPages={Math.ceil((totalPhysicalPages + 1) / 2)}
          onMoveCards={handleMoveCards}
        />
      )}

      {/* Context Menu */}
      <ContextMenu
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onAddPage={handleAddPage}
        onRemovePage={handleRemovePage}
        currentBinder={currentBinder}
        currentPage={currentPage}
      />
    </div>
  );
};

CustomBinderPage.propTypes = {
  cards: PropTypes.array,
  currentPage: PropTypes.number.isRequired,
  layout: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    cards: PropTypes.number.isRequired,
  }).isRequired,
  onReorderCards: PropTypes.func.isRequired,
  onRemoveCard: PropTypes.func.isRequired,
  onOpenCardSearch: PropTypes.func.isRequired,
  onMoveFromClipboard: PropTypes.func,
  parsedMissingCards: PropTypes.instanceOf(Set),
  onToggleCardStatus: PropTypes.func,
  onMoveCards: PropTypes.func,
  onPageChange: PropTypes.func,
  currentBinder: PropTypes.object,
  onCardsUpdate: PropTypes.func,
};

export default CustomBinderPage;

import {
  Star,
  Plus,
  Trash2,
  Search,
  Lightbulb,
  CheckSquare,
  Square,
  Move,
} from "lucide-react";
import PropTypes from "prop-types";
import { useTheme } from "../../theme/ThemeContent";
import MoveCardsModal from "./MoveCardsModal";
import { useState, useMemo, useEffect } from "react";

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
}) => {
  const { theme } = useTheme();
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
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

    // Set drag data for clipboard to read
    const dragData = {
      card,
      globalIndex,
      source: "binder",
    };
    e.dataTransfer.setData("text/plain", JSON.stringify(dragData));

    // Find the actual card image element
    const cardImg = e.currentTarget.querySelector("img");
    if (cardImg) {
      // Create a smaller drag image
      const dragImage = document.createElement("img");
      dragImage.src = cardImg.src;
      dragImage.style.width = "120px";
      dragImage.style.height = "auto";
      dragImage.style.transform = "rotate(-5deg) scale(1.05)";
      dragImage.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
      dragImage.style.borderRadius = "8px";
      dragImage.style.position = "absolute";
      dragImage.style.top = "-1000px";
      dragImage.style.left = "-1000px";
      dragImage.style.zIndex = "9999";
      dragImage.style.pointerEvents = "none";

      document.body.appendChild(dragImage);

      // Set the drag image
      e.dataTransfer.setDragImage(dragImage, 60, 84); // Center of 120px wide card

      // Clean up after drag starts
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 1);
    }
  };

  const handleDragOver = (e, targetIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(targetIndex);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);

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
    console.log("Selected cards:", Array.from(newSelectedCards)); // Debug log
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
    if (onMoveCards) {
      await onMoveCards(selectedCardData, targetPageIndex, moveOption);
      setSelectedCards(new Set());
      setIsSelectionMode(false);
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
                              <div className="flex gap-1 justify-center pointer-events-auto">
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
                                    <Star className="w-3 h-3" />
                                  )}
                                  {parsedMissingCards.has(
                                    card.isReverseHolo
                                      ? `${card.positionId || card.id}_reverse`
                                      : card.positionId || card.id
                                  )
                                    ? "Need"
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

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-6">
        {/* Selection Controls */}
        {cards.filter((card) => card !== null).length > 0 && (
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-lg ${theme.colors.background.card} border ${theme.colors.border.accent}`}
          >
            <button
              onClick={toggleSelectionMode}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                isSelectionMode
                  ? `${theme.colors.button.primary}`
                  : `${theme.colors.button.secondary}`
              }`}
            >
              {isSelectionMode ? (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Exit Selection
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  Select Cards
                </>
              )}
            </button>

            {isSelectionMode && (
              <>
                <div className={`h-4 w-px ${theme.colors.border.accent}`} />
                <span className={`text-sm ${theme.colors.text.secondary}`}>
                  {selectedCards.size} selected
                </span>

                {selectedCards.size > 0 && (
                  <>
                    <button
                      onClick={handleMoveSelectedCards}
                      className={`px-3 py-2 rounded-lg ${theme.colors.button.primary} font-medium transition-all duration-200 flex items-center gap-2`}
                    >
                      <Move className="w-4 h-4" />
                      Move Cards
                    </button>
                  </>
                )}

                <button
                  onClick={selectAllOnPage}
                  className={`px-3 py-2 rounded-lg ${theme.colors.button.secondary} font-medium transition-all duration-200`}
                >
                  Select Page
                </button>

                <button
                  onClick={deselectAll}
                  className={`px-3 py-2 rounded-lg ${theme.colors.button.secondary} font-medium transition-all duration-200`}
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}

        {/* Binder Container */}
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
                          <span className="leading-relaxed">
                            Drag cards to the clipboard on the right to store
                            them between pages
                          </span>
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
                          <span className="text-yellow-400 font-bold text-base leading-none mt-0.5 flex-shrink-0">
                            •
                          </span>
                          <span className="leading-relaxed">
                            If you regret an action, you can undo it with the
                            undo button in the bottom right corner
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
      </div>

      {/* Move Cards Modal */}
      {showMoveModal && (
        <MoveCardsModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          selectedCards={Array.from(selectedCards)
            .map((cardKey) => {
              const globalIndex = parseInt(cardKey);
              const card = cards[globalIndex];
              console.log("Processing card:", globalIndex, card); // Debug log
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
};

export default CustomBinderPage;

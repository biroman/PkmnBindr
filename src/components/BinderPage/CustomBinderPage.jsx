import { Star, Eye, Plus, Trash2, GripVertical, Search } from "lucide-react";
import PropTypes from "prop-types";
import { useTheme } from "../../theme/ThemeContent";
import CardModal from "./CardModal";
import { useState, useMemo, useEffect } from "react";

const CustomBinderPage = ({
  cards = [],
  currentPage,
  layout,
  onReorderCards,
  onRemoveCard,
  onOpenCardSearch,
  onMoveFromClipboard,
}) => {
  const { theme } = useTheme();
  const [selectedCard, setSelectedCard] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

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

  const handleInspectCard = (e, card) => {
    e.stopPropagation();
    setSelectedCard(card);
  };

  const handleRemoveCard = (e, card, globalIndex) => {
    e.stopPropagation();
    onRemoveCard(globalIndex);
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
                            : "hover:scale-[1.02] hover:-rotate-1"
                        }`}
                        draggable
                        onDragStart={(e) =>
                          handleDragStart(e, card, globalIndex)
                        }
                        onDragEnd={handleDragEnd}
                      >
                        {/* Card container */}
                        <div className="relative w-full h-full cursor-move">
                          <div
                            className="relative w-full h-full cursor-pointer"
                            onClick={() => setSelectedCard(card)}
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
                              `}
                            />

                            {/* Top overlay - Drag handle and reverse holo */}
                            <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {/* Drag handle */}
                              <div
                                className={`w-7 h-7 rounded-lg ${theme.colors.button.secondary} backdrop-blur-sm bg-opacity-90 flex items-center justify-center shadow-lg cursor-move`}
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              {/* Reverse holo indicator */}
                              {card.isReverseHolo && (
                                <div
                                  className={`w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 backdrop-blur-sm bg-opacity-90 flex items-center justify-center shadow-lg`}
                                >
                                  <Star className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Bottom overlay - Card info and actions */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {/* Card info bar */}
                              <div
                                className={`${theme.colors.background.main} backdrop-blur-sm bg-opacity-95 rounded-lg p-2 mb-2 shadow-lg border ${theme.colors.border.light}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={`text-xs font-semibold ${theme.colors.text.primary} truncate`}
                                    >
                                      {card.name}
                                    </div>
                                    <div
                                      className={`text-xs ${theme.colors.text.secondary} flex items-center gap-1`}
                                    >
                                      <span>#{card.number}</span>
                                      <span>•</span>
                                      <span className="truncate">
                                        {card.set.name}
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    className={`px-2 py-1 text-xs font-medium rounded ${theme.colors.button.accent} ml-2`}
                                  >
                                    {card.rarity}
                                  </div>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={(e) => handleInspectCard(e, card)}
                                  className={`
                                    flex-1 px-3 py-2 rounded-lg ${theme.colors.button.secondary} backdrop-blur-sm bg-opacity-90
                                    flex items-center justify-center gap-2 shadow-lg
                                    hover:scale-105 transition-all duration-200
                                    text-xs font-medium
                                  `}
                                  title="View details"
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </button>

                                <button
                                  onClick={(e) =>
                                    handleRemoveCard(e, card, globalIndex)
                                  }
                                  className={`
                                    flex-1 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white backdrop-blur-sm bg-opacity-90
                                    flex items-center justify-center gap-2 shadow-lg
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
                        onClick={onOpenCardSearch}
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
                    <Search className={`w-8 h-8 ${theme.colors.text.accent}`} />
                  </div>
                  <div>
                    <h3
                      className={`text-lg font-bold ${theme.colors.text.primary} mb-2`}
                    >
                      Custom Collection
                    </h3>
                    <p
                      className={`${theme.colors.text.secondary} text-sm max-w-48`}
                    >
                      Add individual cards from any set to create your
                      personalized collection
                    </p>
                  </div>
                  <button
                    onClick={onOpenCardSearch}
                    className={`px-4 py-2 rounded-lg ${theme.colors.button.primary} font-medium`}
                  >
                    Add Cards
                  </button>
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

      {/* Card Modal */}
      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
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
};

export default CustomBinderPage;

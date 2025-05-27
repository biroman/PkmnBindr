import { Star, Plus, Trash2 } from "lucide-react";
import PropTypes from "prop-types";
import { useTheme } from "../../theme/ThemeContent";
import { useState, useMemo, useEffect } from "react";

const BinderPage = ({
  cards = [],
  currentPage,
  parsedMissingCards,
  layout,
  onToggleCardStatus,
}) => {
  const { theme } = useTheme();
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

  // Progress calculation removed - now handled in App.jsx header

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

  /**
   * Responsive Binder Sizing Algorithm
   *
   * This algorithm calculates optimal binder dimensions based on:
   * - Viewport dimensions (responsive design)
   * - Layout density (cards per page)
   * - Card aspect ratio (2.5:3.5 for Pokemon cards)
   * - Screen size breakpoints
   * - Optimal card visibility and usability
   */
  const binderDimensions = useMemo(() => {
    // Extract grid dimensions from layout
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

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Define responsive breakpoints
    const breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      "2xl": 1536,
    };

    // Calculate available space (accounting for sidebar, header, padding)
    const sidebarWidth = viewportWidth >= breakpoints.lg ? 384 : 320; // w-96 on lg+, w-80 on smaller
    const headerHeight = 80; // Approximate header height
    const footerHeight = 60; // Approximate footer height
    const padding = viewportWidth >= breakpoints.md ? 32 : 16; // Less padding on mobile

    // On mobile/tablet, sidebar is overlay so use full width
    const effectiveSidebarWidth =
      viewportWidth >= breakpoints.lg ? sidebarWidth : 0;
    const availableWidth = viewportWidth - effectiveSidebarWidth - padding;
    const availableHeight =
      viewportHeight - headerHeight - footerHeight - padding;

    // Calculate optimal binder dimensions
    const calculateResponsiveDimensions = () => {
      // Card aspect ratio: 2.5:3.5 (width:height)
      const cardAspectRatio = 2.5 / 3.5;

      // Calculate ideal card size based on available space
      const maxCardWidth = (availableWidth * 0.45) / cols; // 45% width per page, divided by columns
      const maxCardHeight = (availableHeight * 0.85) / rows; // 85% height, divided by rows

      // Respect card aspect ratio
      const cardWidthFromHeight = maxCardHeight * cardAspectRatio;
      const cardHeightFromWidth = maxCardWidth / cardAspectRatio;

      // Use the smaller dimension to ensure cards fit
      const finalCardWidth = Math.min(maxCardWidth, cardWidthFromHeight);
      const finalCardHeight = Math.min(maxCardHeight, cardHeightFromWidth);

      // Calculate binder dimensions based on final card size
      const pageWidth = finalCardWidth * cols;
      const pageHeight = finalCardHeight * rows;

      // Add padding and gaps
      const gap = Math.max(8, Math.min(16, finalCardWidth * 0.05)); // 5% of card width, min 8px, max 16px
      const padding = Math.max(16, Math.min(32, finalCardWidth * 0.1)); // 10% of card width, min 16px, max 32px

      const totalPageWidth = pageWidth + gap * (cols - 1) + padding * 2;
      const totalPageHeight = pageHeight + gap * (rows - 1) + padding * 2;

      // Calculate binder container size (two pages side by side)
      const binderWidth = totalPageWidth * 2 + 16; // 16px gap between pages
      const binderHeight = totalPageHeight;

      // Ensure binder fits in available space
      const maxBinderWidth = availableWidth * 0.95;
      const maxBinderHeight = availableHeight * 0.9;

      let finalBinderWidth = Math.min(binderWidth, maxBinderWidth);
      let finalBinderHeight = Math.min(binderHeight, maxBinderHeight);

      // If we had to scale down, maintain aspect ratio
      if (binderWidth > maxBinderWidth || binderHeight > maxBinderHeight) {
        const scaleX = maxBinderWidth / binderWidth;
        const scaleY = maxBinderHeight / binderHeight;
        const scale = Math.min(scaleX, scaleY);

        finalBinderWidth = binderWidth * scale;
        finalBinderHeight = binderHeight * scale;
      }

      // Responsive adjustments for different screen sizes
      let responsiveScale = 1;
      if (viewportWidth <= breakpoints.md) {
        // Mobile/tablet: smaller binder
        responsiveScale = 0.8;
      } else if (viewportWidth <= breakpoints.lg) {
        // Small desktop: slightly smaller
        responsiveScale = 0.9;
      } else if (viewportWidth >= breakpoints["2xl"]) {
        // Large desktop: can be bigger
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

  // Generate dynamic CSS classes based on calculated dimensions
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

  const handleToggleCardStatus = (e, card) => {
    e.stopPropagation();
    if (onToggleCardStatus) {
      onToggleCardStatus(e, card);
    }
  };

  const renderPage = (pageCards) => {
    return (
      <div
        className={`relative ${theme.colors.background.sidebar} w-full h-full rounded-3xl shadow-2xl border ${theme.colors.border.light} overflow-hidden`}
      >
        <div
          className={`grid ${getGridClasses()} w-full h-full`}
          style={getGridStyles()}
        >
          {Array.from({ length: layout.cards }, (_, index) => {
            const card = pageCards[index];
            return (
              <div key={index} className="relative">
                <div className="w-full h-full">
                  <div className="relative w-full h-full group">
                    {card ? (
                      <div className="relative w-full h-full">
                        {parsedMissingCards.has(
                          card.isReverseHolo
                            ? `${card.number}_reverse`
                            : card.number
                        ) ? (
                          /* Missing card placeholder */
                          <div className="relative w-full h-full">
                            <div className="relative w-full h-full group">
                              <div
                                className={`
                                  w-full h-full rounded-lg border-2 border-dashed 
                                  ${theme.colors.border.accent} ${theme.colors.background.card}
                                  flex items-center justify-center cursor-pointer
                                  hover:border-solid transition-all duration-200
                                  group-hover:shadow-lg
                                `}
                              >
                                <div className="text-center space-y-2">
                                  <div
                                    className={`w-12 h-12 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center`}
                                  >
                                    <span
                                      className={`text-lg font-bold ${theme.colors.text.accent}`}
                                    >
                                      {card.number}
                                    </span>
                                  </div>
                                  <div
                                    className={`text-xs ${theme.colors.text.secondary} font-medium text-center`}
                                  >
                                    {card.name}
                                  </div>
                                  {card.isReverseHolo && (
                                    <div className="flex items-center justify-center gap-1">
                                      <Star
                                        className={`w-3 h-3 ${theme.colors.text.accent}`}
                                      />
                                      <span
                                        className={`text-xs ${theme.colors.text.accent}`}
                                      >
                                        RH
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Hover preview */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <img
                                  src={card.images.small}
                                  alt={card.name}
                                  className="w-full h-full object-contain rounded-lg shadow-xl"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Collected card */
                          <div className="relative w-full h-full cursor-pointer">
                            <img
                              src={card.images.small}
                              alt={card.name}
                              className={`
                                w-full h-full object-contain rounded-lg shadow-lg
                                transition-all duration-200 
                                group-hover:shadow-xl group-hover:scale-[1.02]
                              `}
                            />

                            {/* Collected indicator */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div
                                className={`w-6 h-6 rounded-full ${theme.colors.button.success} flex items-center justify-center shadow-lg`}
                              >
                                <span className="text-xs font-bold text-white">
                                  ✓
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action buttons overlay */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-auto">
                            {/* Toggle collection status button */}
                            <button
                              onClick={(e) => handleToggleCardStatus(e, card)}
                              className={`
                                w-8 h-8 rounded-full flex items-center justify-center shadow-lg
                                hover:scale-110 transition-transform duration-200
                                ${
                                  parsedMissingCards.has(
                                    card.isReverseHolo
                                      ? `${card.number}_reverse`
                                      : card.number
                                  )
                                    ? `${theme.colors.button.success}`
                                    : "bg-red-500 hover:bg-red-600 text-white"
                                }
                              `}
                              title={
                                parsedMissingCards.has(
                                  card.isReverseHolo
                                    ? `${card.number}_reverse`
                                    : card.number
                                )
                                  ? "Mark as collected"
                                  : "Mark as missing"
                              }
                            >
                              {parsedMissingCards.has(
                                card.isReverseHolo
                                  ? `${card.number}_reverse`
                                  : card.number
                              ) ? (
                                <Plus className="w-4 h-4" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Card info badge */}
                          <div className="absolute bottom-3 right-3 flex flex-col gap-1 items-end pointer-events-auto">
                            <span
                              className={`px-2 py-1 text-xs font-bold rounded-md ${theme.colors.button.primary} shadow-lg`}
                            >
                              #{card.number}
                            </span>
                            {card.isReverseHolo && (
                              <span
                                className={`px-2 py-1 text-xs font-bold rounded-md ${theme.colors.button.secondary} shadow-lg flex items-center gap-1`}
                              >
                                <Star className="w-3 h-3" />
                                RH
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Empty slot */
                      <div
                        className={`w-full h-full rounded-lg border-2 border-dashed ${theme.colors.border.accent} ${theme.colors.background.card} opacity-30`}
                      />
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
    <div className="h-full flex flex-col">
      {/* Main Binder View - Responsive layout */}
      <div
        className={`flex-1 relative overflow-auto ${theme.colors.background.main} p-2 md:p-4`}
      >
        <div className="min-h-full flex items-center justify-center">
          {/* Binder Pages Container - Responsive centered layout */}
          <div className="relative" style={getContainerStyles()}>
            <div className="flex gap-2 md:gap-4 h-full">
              {/* Left Page */}
              <div className="flex-1 min-w-0">
                {currentPage === 0 ? (
                  /* Cover Page */
                  <div
                    className={`h-full w-full ${theme.colors.background.sidebar} rounded-3xl shadow-2xl border ${theme.colors.border.light} flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden`}
                  >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-current via-transparent to-current" />
                    </div>

                    <div className="relative z-10 text-center space-y-3 md:space-y-6">
                      <div
                        className={`text-3xl md:text-6xl font-bold ${theme.colors.text.accent} mb-2 md:mb-4`}
                      >
                        PkmnBindr
                      </div>
                      <div
                        className={`text-sm md:text-xl ${theme.colors.text.secondary}`}
                      >
                        Collection Manager
                      </div>
                      <div
                        className={`text-xs md:text-sm ${theme.colors.text.secondary} opacity-60`}
                      >
                        Organize • Track • Collect
                      </div>
                    </div>
                  </div>
                ) : (
                  renderPage(leftPageCards)
                )}
              </div>

              {/* Right Page */}
              <div className="flex-1 min-w-0">{renderPage(rightPageCards)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

BinderPage.propTypes = {
  cards: PropTypes.array,
  currentPage: PropTypes.number.isRequired,
  parsedMissingCards: PropTypes.instanceOf(Set).isRequired,
  layout: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    cards: PropTypes.number.isRequired,
  }).isRequired,
  onToggleCardStatus: PropTypes.func,
};

export default BinderPage;

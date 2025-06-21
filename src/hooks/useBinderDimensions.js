import { useState, useEffect, useMemo, useCallback } from "react";

// Configuration constants - centralized and easily maintainable
const BINDER_CONFIG = {
  CARD_ASPECT_RATIO: 5 / 7,
  NAVBAR_HEIGHT: 65,
  VERTICAL_PADDING: 80, // 40px top + 40px bottom
  NAVIGATION_SPACE: 160, // Space for left/right nav buttons
  PAGE_PADDING: 32,
  CARD_GAP: 8,
  HEADER_SPACE: 32,
  SPINE_WIDTH: 16,
  GRID_CONFIGS: {
    "1x1": { cols: 1, rows: 1, total: 1 },
    "2x2": { cols: 2, rows: 2, total: 4 },
    "3x3": { cols: 3, rows: 3, total: 9 },
    "4x3": { cols: 4, rows: 3, total: 12 },
    "4x4": { cols: 4, rows: 4, total: 16 },
  },
  DEFAULT_GRID: "3x3",
};

// Helper to get grid configuration safely
export const getGridConfig = (size) => {
  return (
    BINDER_CONFIG.GRID_CONFIGS[size] ||
    BINDER_CONFIG.GRID_CONFIGS[BINDER_CONFIG.DEFAULT_GRID]
  );
};

// Custom hook for window dimensions with debouncing
const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height: typeof window !== "undefined" ? window.innerHeight : 1080,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100); // Debounce resize events
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return windowDimensions;
};

// Main hook for calculating binder dimensions
const useBinderDimensions = (gridSize) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const dimensions = useMemo(() => {
    const grid = getGridConfig(gridSize);

    // Calculate available space
    const availableHeight =
      windowHeight -
      BINDER_CONFIG.NAVBAR_HEIGHT -
      BINDER_CONFIG.VERTICAL_PADDING;
    const availableWidth = windowWidth - BINDER_CONFIG.NAVIGATION_SPACE;

    // Validate minimum dimensions
    if (availableHeight < 200 || availableWidth < 300) {
      return {
        width: Math.max(300, availableWidth),
        height: Math.max(200, availableHeight),
        cardWidth: 50,
        cardHeight: 70,
        isMinimal: true,
      };
    }

    // Calculate optimal card size based on constraints
    const heightConstrainedCardHeight =
      (availableHeight -
        BINDER_CONFIG.PAGE_PADDING -
        BINDER_CONFIG.HEADER_SPACE -
        BINDER_CONFIG.CARD_GAP * (grid.rows - 1)) /
      grid.rows;

    const heightConstrainedCardWidth =
      heightConstrainedCardHeight * BINDER_CONFIG.CARD_ASPECT_RATIO;

    const maxPageWidth = (availableWidth - BINDER_CONFIG.SPINE_WIDTH) / 2;
    const widthConstrainedCardWidth =
      (maxPageWidth -
        BINDER_CONFIG.PAGE_PADDING -
        BINDER_CONFIG.CARD_GAP * (grid.cols - 1)) /
      grid.cols;

    // Use the smaller constraint to ensure everything fits
    let cardWidth = Math.min(
      heightConstrainedCardWidth,
      widthConstrainedCardWidth
    );

    // Scale down 4x3 layout to make it more compact
    if (gridSize === "4x3") {
      cardWidth = cardWidth * 0.85; // Scale down by 15%
    }

    const cardHeight = cardWidth / BINDER_CONFIG.CARD_ASPECT_RATIO;

    // Calculate final binder dimensions
    const pageWidth =
      cardWidth * grid.cols +
      BINDER_CONFIG.PAGE_PADDING +
      BINDER_CONFIG.CARD_GAP * (grid.cols - 1);

    const pageHeight =
      cardHeight * grid.rows +
      BINDER_CONFIG.PAGE_PADDING +
      BINDER_CONFIG.HEADER_SPACE +
      BINDER_CONFIG.CARD_GAP * (grid.rows - 1);

    const binderWidth = pageWidth * 2 + BINDER_CONFIG.SPINE_WIDTH;
    const binderHeight = pageHeight;

    return {
      width: Math.min(binderWidth, availableWidth),
      height: Math.min(binderHeight, availableHeight),
      cardWidth: Math.max(cardWidth, 40), // Minimum card size
      cardHeight: Math.max(cardHeight, 56), // Minimum card size (40 * 7/5)
      pageWidth,
      pageHeight,
      grid,
      isMinimal: false,
    };
  }, [gridSize, windowWidth, windowHeight]);

  // Navigation button positioning
  const navigationPositions = useMemo(
    () => ({
      left: `calc(50% - ${dimensions.width / 2 + 64}px)`,
      right: `calc(50% - ${dimensions.width / 2 + 64}px)`,
    }),
    [dimensions.width]
  );

  return {
    ...dimensions,
    navigationPositions,
    config: BINDER_CONFIG,
  };
};

export default useBinderDimensions;

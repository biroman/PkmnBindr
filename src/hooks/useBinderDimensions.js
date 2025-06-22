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
  // Mobile specific constants
  MOBILE_BREAKPOINT: 768, // px
  MOBILE_TOOLBAR_HEIGHT: 60,
  MOBILE_NAVIGATION_HEIGHT: 80,
  MOBILE_VERTICAL_PADDING: 120, // Space for mobile toolbar + navigation
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
    const isMobile = windowWidth < BINDER_CONFIG.MOBILE_BREAKPOINT;

    // Calculate available space - different for mobile vs desktop
    const availableHeight = isMobile
      ? windowHeight -
        BINDER_CONFIG.NAVBAR_HEIGHT -
        BINDER_CONFIG.MOBILE_VERTICAL_PADDING
      : windowHeight -
        BINDER_CONFIG.NAVBAR_HEIGHT -
        BINDER_CONFIG.VERTICAL_PADDING;

    const availableWidth = isMobile
      ? windowWidth - 40 // Just some padding on mobile
      : windowWidth - BINDER_CONFIG.NAVIGATION_SPACE;

    // Validate minimum dimensions - more lenient for mobile
    const minHeight = isMobile ? 300 : 200;
    const minWidth = isMobile ? 250 : 300;

    if (availableHeight < minHeight || availableWidth < minWidth) {
      return {
        width: Math.max(minWidth, availableWidth),
        height: Math.max(minHeight, availableHeight),
        cardWidth: isMobile ? 60 : 50,
        cardHeight: isMobile ? 84 : 70,
        isMobile,
        isMinimal: true,
        pageWidth: Math.max(minWidth, availableWidth),
        pageHeight: Math.max(minHeight, availableHeight),
        grid,
      };
    }

    // For mobile, calculate single page dimensions
    if (isMobile) {
      const singlePageWidth = availableWidth;
      const widthConstrainedCardWidth =
        (singlePageWidth -
          BINDER_CONFIG.PAGE_PADDING -
          BINDER_CONFIG.CARD_GAP * (grid.cols - 1)) /
        grid.cols;

      const heightConstrainedCardHeight =
        (availableHeight -
          BINDER_CONFIG.PAGE_PADDING -
          BINDER_CONFIG.HEADER_SPACE -
          BINDER_CONFIG.CARD_GAP * (grid.rows - 1)) /
        grid.rows;

      const heightConstrainedCardWidth =
        heightConstrainedCardHeight * BINDER_CONFIG.CARD_ASPECT_RATIO;

      // Use the smaller constraint to ensure everything fits
      let cardWidth = Math.min(
        heightConstrainedCardWidth,
        widthConstrainedCardWidth
      );

      // Scale down 4x3 layout to make it more compact on mobile
      if (gridSize === "4x3") {
        cardWidth = cardWidth * 0.8; // Scale down by 20% on mobile
      }

      const cardHeight = cardWidth / BINDER_CONFIG.CARD_ASPECT_RATIO;

      // Calculate final single page dimensions for mobile
      const pageWidth =
        cardWidth * grid.cols +
        BINDER_CONFIG.PAGE_PADDING +
        BINDER_CONFIG.CARD_GAP * (grid.cols - 1);

      const pageHeight =
        cardHeight * grid.rows +
        BINDER_CONFIG.PAGE_PADDING +
        BINDER_CONFIG.HEADER_SPACE +
        BINDER_CONFIG.CARD_GAP * (grid.rows - 1);

      return {
        width: Math.min(pageWidth, availableWidth),
        height: Math.min(pageHeight, availableHeight),
        cardWidth: Math.max(cardWidth, 40), // Minimum card size
        cardHeight: Math.max(cardHeight, 56), // Minimum card size (40 * 7/5)
        pageWidth,
        pageHeight,
        grid,
        isMobile: true,
        isMinimal: false,
      };
    }

    // Desktop calculations (existing logic)
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
      isMobile: false,
      isMinimal: false,
    };
  }, [gridSize, windowWidth, windowHeight]);

  // Navigation button positioning - different for mobile vs desktop
  const navigationPositions = useMemo(() => {
    if (dimensions.isMobile) {
      // Mobile: navigation will be at bottom, return mobile-specific positions
      return {
        left: "20px",
        right: "20px",
        isMobile: true,
      };
    }

    // Desktop: existing logic
    return {
      left: `calc(50% - ${dimensions.width / 2 + 64}px)`,
      right: `calc(50% - ${dimensions.width / 2 + 64}px)`,
      isMobile: false,
    };
  }, [dimensions.width, dimensions.isMobile]);

  return {
    ...dimensions,
    navigationPositions,
    config: BINDER_CONFIG,
  };
};

export default useBinderDimensions;

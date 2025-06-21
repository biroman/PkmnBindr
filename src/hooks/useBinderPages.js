import { useState, useMemo, useEffect } from "react";
import { getGridConfig } from "./useBinderDimensions";
import { useCardCache } from "../contexts/CardCacheContext";

const useBinderPages = (binder, isMobile = false) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0); // 0-based index
  const [currentMobilePageIndex, setCurrentMobilePageIndex] = useState(0); // For mobile single-page navigation
  const { getCardFromCache } = useCardCache();

  // Calculate total pages needed
  const totalPages = useMemo(() => {
    if (!binder?.cards || typeof binder.cards !== "object") {
      // Return minimum pages from settings or default to 1
      return Math.max(
        binder?.settings?.minPages || 1,
        binder?.settings?.pageCount || 1
      );
    }

    // Get the stored page count from settings (includes manually added pages)
    const storedPageCount = binder?.settings?.pageCount || 1;

    // Get the highest position number to determine how many pages we need for cards
    const positions = Object.keys(binder.cards).map((pos) => parseInt(pos));

    // Calculate how many cards per page based on grid size
    const gridConfig = getGridConfig(binder.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;

    if (positions.length === 0) {
      // No cards, return stored page count (respecting minimum)
      return Math.max(binder?.settings?.minPages || 1, storedPageCount);
    }

    const maxPosition = Math.max(...positions);

    // Calculate how many card pages we need based on highest position
    const requiredCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);

    // Convert card pages to actual binder pages
    // Page 1 is special (cover + 1 card page)
    // All other pages are pairs of card pages
    let requiredBinderPages;
    if (requiredCardPages <= 1) {
      requiredBinderPages = 1; // Just the cover page with first card page
    } else {
      const pairsNeeded = Math.ceil((requiredCardPages - 1) / 2);
      requiredBinderPages = 1 + pairsNeeded; // Cover page + pairs
    }

    // Return the higher of stored pages or required pages for cards
    const finalPageCount = Math.max(
      storedPageCount,
      requiredBinderPages,
      binder?.settings?.minPages || 1
    );

    // Respect max pages setting
    const maxPages = binder?.settings?.maxPages || 100;
    return Math.min(finalPageCount, maxPages);
  }, [
    binder?.cards,
    binder?.settings?.gridSize,
    binder?.settings?.minPages,
    binder?.settings?.maxPages,
    binder?.settings?.pageCount,
    binder?.settings?.pageOrder,
    binder?.settings?.autoExpand,
  ]);

  // Calculate total individual pages for mobile (cover + all card pages)
  const totalMobilePages = useMemo(() => {
    if (!binder?.cards || typeof binder.cards !== "object") {
      return 1; // Just cover page
    }

    const positions = Object.keys(binder.cards).map((pos) => parseInt(pos));
    if (positions.length === 0) {
      return 1; // Just cover page
    }

    const gridConfig = getGridConfig(binder.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;
    const maxPosition = Math.max(...positions);
    const requiredCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);

    // Total individual pages = cover + card pages
    return 1 + requiredCardPages;
  }, [binder?.cards, binder?.settings?.gridSize]);

  // Auto-adjust current page when total pages changes
  useEffect(() => {
    if (isMobile) {
      if (currentMobilePageIndex >= totalMobilePages) {
        const newPageIndex = Math.max(0, totalMobilePages - 1);
        setTimeout(() => {
          setCurrentMobilePageIndex(newPageIndex);
        }, 0);
      }
    } else {
      if (currentPageIndex >= totalPages) {
        const newPageIndex = Math.max(0, totalPages - 1);
        setTimeout(() => {
          setCurrentPageIndex(newPageIndex);
        }, 0);
      }
    }
  }, [
    totalPages,
    totalMobilePages,
    currentPageIndex,
    currentMobilePageIndex,
    isMobile,
  ]);

  // Helper function to get physical page index from logical page index
  const getPhysicalPageIndex = useMemo(() => {
    const pageOrder = binder?.settings?.pageOrder;
    if (!pageOrder || !Array.isArray(pageOrder)) {
      // No custom page order, use sequential
      return (logicalIndex) => logicalIndex;
    }
    return (logicalIndex) => pageOrder[logicalIndex] || logicalIndex;
  }, [binder?.settings?.pageOrder]);

  // Get page configuration for current view
  const getCurrentPageConfig = useMemo(() => {
    if (isMobile) {
      // Mobile single-page logic
      if (currentMobilePageIndex === 0) {
        // Cover page
        return {
          type: "cover-single",
          leftPage: { type: "cover", pageNumber: null },
          rightPage: null, // Not used in mobile
        };
      } else {
        // Card pages (index 1 = card page 0, index 2 = card page 1, etc.)
        const cardPageIndex = currentMobilePageIndex - 1;
        return {
          type: "cards-single",
          leftPage: {
            type: "cards",
            pageNumber: currentMobilePageIndex,
            cardPageIndex: cardPageIndex,
          },
          rightPage: null, // Not used in mobile
        };
      }
    }

    // Desktop two-page logic (existing)
    const physicalPageIndex = getPhysicalPageIndex(currentPageIndex);

    if (physicalPageIndex === 0) {
      // First page: Cover + Card Page 1
      return {
        type: "cover-and-first",
        leftPage: { type: "cover", pageNumber: null },
        rightPage: {
          type: "cards",
          pageNumber: 1,
          cardPageIndex: 0, // Index in the cards array
        },
      };
    } else {
      // Subsequent pages: Card Page X + Card Page Y
      const leftCardPageIndex = (physicalPageIndex - 1) * 2 + 1; // -1 for cover page offset
      const rightCardPageIndex = leftCardPageIndex + 1;

      return {
        type: "cards-pair",
        leftPage: {
          type: "cards",
          pageNumber: leftCardPageIndex + 1,
          cardPageIndex: leftCardPageIndex,
        },
        rightPage: {
          type: "cards",
          pageNumber: rightCardPageIndex + 1,
          cardPageIndex: rightCardPageIndex,
        },
      };
    }
  }, [
    currentPageIndex,
    currentMobilePageIndex,
    getPhysicalPageIndex,
    isMobile,
  ]);

  // Navigation functions
  const goToNextPage = () => {
    if (isMobile) {
      if (currentMobilePageIndex < totalMobilePages - 1) {
        setCurrentMobilePageIndex((prev) => prev + 1);
      }
    } else {
      if (currentPageIndex < totalPages - 1) {
        setCurrentPageIndex((prev) => prev + 1);
      }
    }
  };

  const goToPrevPage = () => {
    if (isMobile) {
      if (currentMobilePageIndex > 0) {
        setCurrentMobilePageIndex((prev) => prev - 1);
      }
    } else {
      if (currentPageIndex > 0) {
        setCurrentPageIndex((prev) => prev - 1);
      }
    }
  };

  const goToPage = (pageIndex) => {
    if (isMobile) {
      if (pageIndex >= 0 && pageIndex < totalMobilePages) {
        setCurrentMobilePageIndex(pageIndex);
      }
    } else {
      if (pageIndex >= 0 && pageIndex < totalPages) {
        setCurrentPageIndex(pageIndex);
      }
    }
  };

  // Get cards for a specific card page
  const getCardsForPage = (cardPageIndex) => {
    if (!binder?.cards || typeof binder.cards !== "object") return [];

    // Calculate how many cards per page based on grid size
    const gridConfig = getGridConfig(binder.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;

    // Calculate the starting position for this page
    const startPosition = cardPageIndex * cardsPerPage;

    // Create array with nulls for empty slots and card data for occupied slots
    const pageCards = [];
    for (let i = 0; i < cardsPerPage; i++) {
      const globalPosition = startPosition + i;
      const cardEntry = binder.cards[globalPosition.toString()];

      if (cardEntry) {
        // Try to get full card data from cache first
        let fullCard = getCardFromCache(cardEntry.cardId);

        if (fullCard) {
          pageCards[i] = {
            ...fullCard,
            binderMetadata: cardEntry,
          };
        } else if (cardEntry.cardData) {
          // Use stored card data from binder (for cloud-synced cards)
          pageCards[i] = {
            ...cardEntry.cardData,
            binderMetadata: cardEntry,
          };
        } else if (cardEntry.name && cardEntry.image) {
          // Direct card data (admin normalized format)
          pageCards[i] = cardEntry;
        } else {
          // Fallback for old binder format - create minimal card object
          pageCards[i] = {
            id: cardEntry.cardId,
            name: "Unknown Card",
            image: "",
            binderMetadata: cardEntry,
          };
        }
      } else {
        pageCards[i] = null; // Empty slot
      }
    }

    return pageCards;
  };

  // Navigation state
  const canGoNext = isMobile
    ? currentMobilePageIndex < totalMobilePages - 1
    : currentPageIndex < totalPages - 1;

  const canGoPrev = isMobile
    ? currentMobilePageIndex > 0
    : currentPageIndex > 0;

  // Display text for current page
  const getPageDisplayText = () => {
    if (isMobile) {
      if (currentMobilePageIndex === 0) {
        return "Cover";
      } else {
        return `Page ${currentMobilePageIndex}`;
      }
    }

    const physicalPageIndex = getPhysicalPageIndex(currentPageIndex);

    if (physicalPageIndex === 0) {
      return "Cover - Page 1";
    } else {
      const config = getCurrentPageConfig;
      return `Pages ${config.leftPage.pageNumber}-${config.rightPage.pageNumber}`;
    }
  };

  return {
    // State
    currentPageIndex: isMobile ? currentMobilePageIndex : currentPageIndex,
    totalPages: isMobile ? totalMobilePages : totalPages,
    getCurrentPageConfig,

    // Navigation
    goToNextPage,
    goToPrevPage,
    goToPage,
    canGoNext,
    canGoPrev,

    // Data helpers
    getCardsForPage,
    getPageDisplayText,
  };
};

export default useBinderPages;

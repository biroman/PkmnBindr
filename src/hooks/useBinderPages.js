import { useState, useMemo, useEffect } from "react";
import { getGridConfig } from "./useBinderDimensions";
import { useCardCache } from "../contexts/CardCacheContext";

const useBinderPages = (binder) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0); // 0-based index
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

  // Auto-adjust current page when total pages changes
  useEffect(() => {
    if (currentPageIndex >= totalPages) {
      // Current page is beyond the new total, move to the last available page
      const newPageIndex = Math.max(0, totalPages - 1);

      // Use setTimeout to defer the state update until after the current render cycle
      // This prevents the "Cannot update a component while rendering a different component" error
      setTimeout(() => {
        setCurrentPageIndex(newPageIndex);
      }, 0);
    }
  }, [totalPages, currentPageIndex]);

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
    // Get the physical page index for the current logical page
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
  }, [currentPageIndex, getPhysicalPageIndex]);

  // Navigation functions
  const goToNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  const goToPage = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < totalPages) {
      setCurrentPageIndex(pageIndex);
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
        // Get full card data from cache
        const fullCard = getCardFromCache(cardEntry.cardId);

        if (fullCard) {
          pageCards[i] = {
            ...fullCard,
            binderMetadata: cardEntry,
          };
        } else {
          // Card not in cache - create minimal card object
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
  const canGoNext = currentPageIndex < totalPages - 1;
  const canGoPrev = currentPageIndex > 0;

  // Display text for current page
  const getPageDisplayText = () => {
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
    currentPageIndex,
    totalPages,
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

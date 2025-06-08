import { useState, useMemo } from "react";
import { getGridConfig } from "./useBinderDimensions";
import { useCardCache } from "../contexts/CardCacheContext";

const useBinderPages = (binder) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0); // 0-based index
  const { getCardFromCache } = useCardCache();

  // Calculate total pages needed
  const totalPages = useMemo(() => {
    if (!binder?.cards || typeof binder.cards !== "object") {
      // Return minimum pages from settings or default to 1
      return Math.max(binder?.settings?.minPages || 1, 1);
    }

    // Get the highest position number to determine how many pages we need
    const positions = Object.keys(binder.cards).map((pos) => parseInt(pos));

    // Calculate how many cards per page based on grid size
    const gridConfig = getGridConfig(binder.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;

    if (positions.length === 0) {
      // No cards, return minimum pages from settings
      return Math.max(binder?.settings?.minPages || 1, 1);
    }

    const maxPosition = Math.max(...positions);

    // Calculate how many card pages we need based on highest position
    const cardPages = Math.ceil((maxPosition + 1) / cardsPerPage);

    // Respect minimum pages setting
    const minCardPages = Math.max(binder?.settings?.minPages || 1, 1);
    const actualCardPages = Math.max(cardPages, minCardPages);

    // Check if auto-expand is enabled and respect max pages
    if (binder?.settings?.autoExpand && cardPages > actualCardPages) {
      const maxPages = binder?.settings?.maxPages || 100;
      return Math.min(cardPages, maxPages);
    }

    // Page 1 is special (cover + 1 card page)
    // All other pages are pairs of card pages
    const pairsNeeded = Math.ceil((actualCardPages - 1) / 2);
    return 1 + pairsNeeded; // Cover page + pairs
  }, [
    binder?.cards,
    binder?.settings?.gridSize,
    binder?.settings?.minPages,
    binder?.settings?.maxPages,
    binder?.settings?.autoExpand,
  ]);

  // Get page configuration for current view
  const getCurrentPageConfig = useMemo(() => {
    if (currentPageIndex === 0) {
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
      const leftCardPageIndex = (currentPageIndex - 1) * 2 + 1; // -1 for cover page offset
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
  }, [currentPageIndex]);

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
    if (currentPageIndex === 0) {
      return "Cover - Page 1";
    } else {
      return `Pages ${getCurrentPageConfig.leftPage.pageNumber}-${getCurrentPageConfig.rightPage.pageNumber}`;
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

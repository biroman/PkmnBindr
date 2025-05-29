import { useState, useCallback } from "react";

/**
 * Custom hook to manage modal states
 * Centralizes modal state management and provides clean interface
 */
const useModalManager = () => {
  const [showDeckList, setShowDeckList] = useState(false);
  const [showCardSearch, setShowCardSearch] = useState(false);
  const [cardListToShow, setCardListToShow] = useState([]);

  // Modal handlers
  const handleOpenDeckList = useCallback((cardList = []) => {
    setCardListToShow(cardList);
    setShowDeckList(true);
  }, []);

  const handleCloseDeckList = useCallback(() => {
    setShowDeckList(false);
    setCardListToShow([]);
  }, []);

  const handleOpenCardSearch = useCallback(() => {
    setShowCardSearch(true);
  }, []);

  const handleCloseCardSearch = useCallback(() => {
    setShowCardSearch(false);
  }, []);

  return {
    // State
    modals: {
      showDeckList,
      showCardSearch,
      cardListToShow,
    },

    // Actions
    handleOpenDeckList,
    handleCloseDeckList,
    handleOpenCardSearch,
    handleCloseCardSearch,
  };
};

export default useModalManager;

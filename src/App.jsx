import { useState, useEffect } from "react";
import {
  Loader2,
  FileText,
  ListX,
  Grid3X3,
  FolderOpen,
  Menu,
  X,
  ArrowLeft,
  ArrowRight,
  Plus,
} from "lucide-react";
import SetSelector from "./components/SetSelector/SetSelector";
import BinderLayoutSelector from "./components/BinderPage/BinderLayoutSelector";
import BinderPage from "./components/BinderPage/BinderPage";
import CustomBinderPage from "./components/BinderPage/CustomBinderPage";
import CardSearch from "./components/CardSearch/CardSearch";
import CardClipboard from "./components/CardClipboard/CardClipboard";
import BinderHistory from "./components/BinderHistory/BinderHistory";
import DeckListModal from "./components/DeckListModal/DeckListModal";
import StorageControls from "./components/StorageControls/StorageControls";

import EnhancedBinderSelector from "./components/BinderSelector/EnhancedBinderSelector";
import { parseCardList } from "./utils/parseCardList";
import {
  initializeStorage,
  getCurrentBinder,
  getBinders,
  saveBinder,
  getMissingCards,
  saveMissingCards,
  getLayoutPrefs,
  saveLayoutPrefs,
  createBinder,
  deleteBinder,
  renameBinder,
  setCurrentBinder as setCurrentBinderInStorage,
  getSetFromCache,
  saveSetToCache,
  addCustomCard,
  removeCustomCard,
  reorderCustomCards,
  getCustomCards,
  setBinderType,
  getCardClipboard,
  addToCardClipboard,
  removeFromCardClipboard,
  clearCardClipboard,
  moveCardFromClipboard,
  getBinderHistory,
  revertToHistoryEntry,
  clearBinderHistory,
  navigateHistory,
  canNavigateHistory,
  getHistoryPosition,
  updateHistoryWithFinalState,
  addHistoryEntry,
} from "./utils/storageUtils";
import { useTheme } from "./theme/ThemeContent";
import ThemeSelector from "./components/ThemeSelector";
import DarkModeToggle from "./components/DarkModeToggle";

const App = () => {
  const { theme } = useTheme();
  const [selectedSet, setSelectedSet] = useState(null);
  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [missingCards, setMissingCards] = useState("");
  const [parsedMissingCards, setParsedMissingCards] = useState(new Set());
  const [showDeckList, setShowDeckList] = useState(false);
  const [cardListToShow, setCardListToShow] = useState([]);
  const [binders, setBinders] = useState([]);
  const [currentBinder, setCurrentBinder] = useState(null);
  const [layout, setLayout] = useState({
    id: "3x3",
    label: "3×3",
    cards: 9,
  });
  const [rawCards, setRawCards] = useState([]); // Store the original unprocessed cards
  const [displayOptions, setDisplayOptions] = useState({
    showReverseHolos: false,
    sortDirection: "asc",
  });
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCardSearch, setShowCardSearch] = useState(false);
  const [targetCardPosition, setTargetCardPosition] = useState(null); // For tracking specific position when adding cards
  const [customCards, setCustomCards] = useState([]);
  const [clipboardCards, setClipboardCards] = useState([]);
  const [isClipboardCollapsed, setIsClipboardCollapsed] = useState(true);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);

  const processCards = (rawCards) => {
    let processedCards = [...rawCards];

    // Add reverse holo versions for common and uncommon cards if enabled
    if (displayOptions.showReverseHolos) {
      const reverseHoloCards = rawCards
        .filter((card) =>
          ["Common", "Uncommon", "Rare", "Rare Holo"].includes(card.rarity)
        )
        .map((card) => ({
          ...card,
          id: `${card.id}_reverse`,
          isReverseHolo: true,
        }));
      processedCards = [...processedCards, ...reverseHoloCards];
    }

    // Sort cards based on number and reverse holo status
    processedCards.sort((a, b) => {
      // Extract base number and any letter suffix
      const [, aBase, aLetter] = a.number.match(/(\d+)([a-zA-Z])?/) || [];
      const [, bBase, bLetter] = b.number.match(/(\d+)([a-zA-Z])?/) || [];

      const aNum = parseInt(aBase);
      const bNum = parseInt(bBase);

      if (aNum === bNum) {
        // First sort by letter suffix (no letter comes before letters)
        if ((!aLetter && bLetter) || (aLetter && !bLetter)) {
          return !aLetter ? -1 : 1;
        }
        if (aLetter !== bLetter) {
          return (aLetter || "").localeCompare(bLetter || "");
        }
        // If numbers and letters are the same, reverse holos come after regular cards
        return (a.isReverseHolo ? 1 : 0) - (b.isReverseHolo ? 1 : 0);
      }

      return displayOptions.sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    });

    return processedCards;
  };

  useEffect(() => {
    if (rawCards.length > 0) {
      const processedCards = processCards(rawCards);
      setCards(processedCards);
      setCurrentPage(0); // Reset to first page when display changes
    }
  }, [displayOptions]);

  // Initialize storage and load saved data
  useEffect(() => {
    initializeStorage();
    const savedLayout = getLayoutPrefs();
    if (savedLayout) {
      setLayout(savedLayout);
    }
    setBinders(getBinders());
    setClipboardCards(getCardClipboard());
  }, []);

  // Load missing cards when set changes
  useEffect(() => {
    if (set) {
      const savedMissingCards = getMissingCards(set.id);
      setParsedMissingCards(savedMissingCards);
      const missingCardsText = Array.from(savedMissingCards)
        .map((number) => `#${number}`)
        .join("\n");
      setMissingCards(missingCardsText);
    }
  }, [set]);

  // Save layout preferences when changed
  useEffect(() => {
    saveLayoutPrefs(layout);
  }, [layout]);

  const handleBinderSelect = async (binder) => {
    setCurrentBinder(binder);
    setCurrentBinderInStorage(binder.id);

    // Reset current view
    setSelectedSet(null);
    setSet(null);
    setCards([]);
    setRawCards([]); // Reset raw cards
    setMissingCards("");
    setParsedMissingCards(new Set());
    setCurrentPage(0);

    // Load custom cards if it's a custom binder
    if (binder.binderType === "custom") {
      const savedCustomCards = getCustomCards(binder.id);
      setCustomCards(savedCustomCards);
      setCards(savedCustomCards);

      // Load history for custom binder
      const savedHistory = getBinderHistory(binder.id);
      setHistoryEntries(savedHistory);

      // Load missing cards for custom binder
      const savedMissingCards = new Set(binder.missingCards || []);
      setParsedMissingCards(savedMissingCards);
    } else {
      setCustomCards([]);

      // If binder has a set, load it automatically
      if (binder.sets && binder.sets.length > 0) {
        const currentSet = binder.sets[0];
        setSelectedSet(currentSet);

        setLoading(true);
        try {
          let cardsData = getSetFromCache(currentSet.id);

          if (!cardsData) {
            const cardsResponse = await fetch(
              `https://api.pokemontcg.io/v2/cards?q=set.id:${currentSet.id}&orderBy=number`
            );
            const response = await cardsResponse.json();
            cardsData = response.data;
            saveSetToCache(currentSet.id, cardsData);
          }

          setRawCards(cardsData); // Store the original cards
          const processedCards = processCards(cardsData);
          setCards(processedCards);
          setSet(currentSet);

          // Load missing cards from the binder's data directly
          const savedMissingCards = new Set(
            binder.missingCards?.[currentSet.id] || []
          );
          setParsedMissingCards(savedMissingCards);
          const missingCardsText = Array.from(savedMissingCards)
            .map((number) => `#${number}`)
            .join("\n");
          setMissingCards(missingCardsText);
        } catch (err) {
          setError(err.message);
          setSet(null);
          setCards([]);
          setRawCards([]);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleToggleCardStatus = (e, card) => {
    e.stopPropagation(); // Prevent opening the card modal

    // Generate the appropriate card ID based on binder type and whether it's a reverse holo
    const cardId =
      currentBinder?.binderType === "custom"
        ? card.isReverseHolo
          ? `${card.positionId || card.id}_reverse`
          : card.positionId || card.id
        : card.isReverseHolo
        ? `${card.number}_reverse`
        : card.number;

    const newMissingCards = new Set(parsedMissingCards);

    if (newMissingCards.has(cardId)) {
      // Remove card from missing cards (mark as collected)
      newMissingCards.delete(cardId);
    } else {
      // Add card to missing cards (mark as missing)
      newMissingCards.add(cardId);
    }

    setParsedMissingCards(newMissingCards);

    // Update the text representation for set-based binders
    if (currentBinder?.binderType !== "custom") {
      const missingCardsText = Array.from(newMissingCards)
        .map((number) => `#${number}`)
        .join("\n");
      setMissingCards(missingCardsText);
    }

    // Save to storage
    if (currentBinder?.binderType === "custom") {
      // For custom binders, save missing cards to the binder data
      const updatedBinder = {
        ...currentBinder,
        missingCards: Array.from(newMissingCards),
        updatedAt: new Date().toISOString(),
      };

      saveBinder(updatedBinder);
      setCurrentBinder(updatedBinder);
      setBinders((prev) =>
        prev.map((b) => (b.id === updatedBinder.id ? updatedBinder : b))
      );
    } else if (set) {
      // For set-based binders, save to set-specific storage
      saveMissingCards(set.id, newMissingCards);

      // Update the current binder's missing cards data
      if (currentBinder) {
        const updatedBinder = {
          ...currentBinder,
          missingCards: {
            ...currentBinder.missingCards,
            [set.id]: Array.from(newMissingCards),
          },
          updatedAt: new Date().toISOString(),
        };

        saveBinder(updatedBinder);
        setCurrentBinder(updatedBinder);
        setBinders((prev) =>
          prev.map((b) => (b.id === updatedBinder.id ? updatedBinder : b))
        );
      }
    }
  };

  const handleSearch = async () => {
    if (!selectedSet) return;

    setLoading(true);
    setError("");

    try {
      let cardsData = getSetFromCache(selectedSet.id);

      if (!cardsData) {
        const cardsResponse = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=set.id:${selectedSet.id}&orderBy=number`
        );
        const response = await cardsResponse.json();
        cardsData = response.data;
        saveSetToCache(selectedSet.id, cardsData);
      }

      setRawCards(cardsData); // Store the original cards
      const processedCards = processCards(cardsData);
      setCards(processedCards);
      setSet(selectedSet);
      setCurrentPage(0);
    } catch (err) {
      setError(err.message);
      setSet(null);
      setCards([]);
      setRawCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    setCurrentPage(0);
  };

  const handleMissingCardsChange = (e) => {
    const text = e.target.value;
    setMissingCards(text);

    // Only parse if we have a set loaded
    if (set && rawCards.length > 0) {
      const parsed = parseCardList(text, rawCards);
      setParsedMissingCards(parsed);

      // Automatically save missing cards to storage
      saveMissingCards(set.id, parsed);

      // Update the current binder's missing cards data
      if (currentBinder) {
        const updatedBinder = {
          ...currentBinder,
          missingCards: {
            ...currentBinder.missingCards,
            [set.id]: Array.from(parsed),
          },
          updatedAt: new Date().toISOString(),
        };

        // Save the updated binder
        saveBinder(updatedBinder);
        setCurrentBinder(updatedBinder);
        setBinders((prev) =>
          prev.map((b) => (b.id === updatedBinder.id ? updatedBinder : b))
        );
      }
    } else {
      // If no set is loaded, just parse without card reference
      const parsed = parseCardList(text, []);
      setParsedMissingCards(parsed);
    }
  };

  const handleDataImported = () => {
    setBinders(getBinders());
    const current = getCurrentBinder();
    if (current) {
      setCurrentBinder(current);
    }
  };

  // Custom card handlers
  const handleAddCard = (card, position = null) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      // Use targetCardPosition if set (from clicking specific empty slot), otherwise use provided position
      let targetPosition =
        targetCardPosition !== null ? targetCardPosition : position;

      if (targetPosition === null) {
        // Calculate current page range
        const cardsPerPage = layout.cards;
        let startIndex, endIndex;

        if (currentPage === 0) {
          // Right page only (page 0)
          startIndex = 0;
          endIndex = cardsPerPage - 1;
        } else {
          // Calculate for left and right pages
          const leftPhysicalPage = 2 * currentPage - 1;
          const rightPhysicalPage = 2 * currentPage;

          // Start from left page, end at right page
          startIndex = leftPhysicalPage * cardsPerPage;
          endIndex = (rightPhysicalPage + 1) * cardsPerPage - 1;
        }

        // Find first empty spot in current page range
        const currentCards = getCustomCards(currentBinder.id);
        for (let i = startIndex; i <= endIndex; i++) {
          if (!currentCards[i]) {
            targetPosition = i;
            break;
          }
        }

        // If no empty spot on current page, find first empty spot globally
        if (targetPosition === null) {
          const emptyIndex = currentCards.findIndex((card) => card === null);
          if (emptyIndex >= 0) {
            targetPosition = emptyIndex;
          }
        }
      }

      const addedCard = addCustomCard(currentBinder.id, card, targetPosition);
      if (addedCard) {
        // Update history with final state after the action
        updateHistoryWithFinalState(currentBinder.id);

        const updatedCards = getCustomCards(currentBinder.id);
        setCustomCards(updatedCards);
        setCards(updatedCards);

        // Update history state
        const updatedHistory = getBinderHistory(currentBinder.id);
        setHistoryEntries(updatedHistory);

        // Update current binder state
        const updatedBinder = { ...currentBinder, customCards: updatedCards };
        setCurrentBinder(updatedBinder);
        setBinders(getBinders());

        // Clear the target position after adding the card
        setTargetCardPosition(null);
        return true;
      }
      return false;
    }
    return false;
  };

  const handleRemoveCard = (cardIndex) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      const success = removeCustomCard(currentBinder.id, cardIndex);
      if (success) {
        // Update history with final state after the action
        updateHistoryWithFinalState(currentBinder.id);

        const updatedCards = getCustomCards(currentBinder.id);
        setCustomCards(updatedCards);
        setCards(updatedCards);

        // Update history state
        const updatedHistory = getBinderHistory(currentBinder.id);
        setHistoryEntries(updatedHistory);

        // Update current binder state
        const updatedBinder = { ...currentBinder, customCards: updatedCards };
        setCurrentBinder(updatedBinder);
        setBinders(getBinders());
      }
    }
  };

  const handleReorderCards = (fromIndex, toIndex, isSwap = false) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      const success = reorderCustomCards(
        currentBinder.id,
        fromIndex,
        toIndex,
        isSwap
      );
      if (success) {
        // Update history with final state after the action
        updateHistoryWithFinalState(currentBinder.id);

        const updatedCards = getCustomCards(currentBinder.id);
        setCustomCards(updatedCards);
        setCards(updatedCards);

        // Update history state
        const updatedHistory = getBinderHistory(currentBinder.id);
        setHistoryEntries(updatedHistory);

        // Update current binder state
        const updatedBinder = { ...currentBinder, customCards: updatedCards };
        setCurrentBinder(updatedBinder);
        setBinders(getBinders());
      }
    }
  };

  const handleOpenCardSearch = (position = null) => {
    setTargetCardPosition(position);
    setShowCardSearch(true);
  };

  const handleCloseCardSearch = () => {
    setShowCardSearch(false);
    setTargetCardPosition(null); // Clear target position when closing
  };

  // Clipboard handlers
  const handleAddToClipboard = (card) => {
    const success = addToCardClipboard(card);
    if (success) {
      setClipboardCards(getCardClipboard());
    }
    return success;
  };

  const handleRemoveFromClipboard = (index) => {
    const success = removeFromCardClipboard(index);
    if (success) {
      setClipboardCards(getCardClipboard());
    }
    return success;
  };

  const handleClearClipboard = () => {
    clearCardClipboard();
    setClipboardCards([]);
  };

  const handleAddToCurrentPage = (card) => {
    if (currentBinder) {
      // Find the actual current index of the card in case the clipboard has changed
      const currentClipboard = getCardClipboard();
      const actualIndex = currentClipboard.findIndex(
        (c) => c.id === card.id && c.isReverseHolo === card.isReverseHolo
      );

      if (actualIndex >= 0) {
        // Calculate first empty spot on current page
        let targetPosition = null;

        if (currentBinder.binderType === "custom") {
          // Calculate current page range
          const cardsPerPage = layout.cards;
          let startIndex, endIndex;

          if (currentPage === 0) {
            // Right page only (page 0)
            startIndex = 0;
            endIndex = cardsPerPage - 1;
          } else {
            // Calculate for left and right pages
            const leftPhysicalPage = 2 * currentPage - 1;
            const rightPhysicalPage = 2 * currentPage;

            // Start from left page, end at right page
            startIndex = leftPhysicalPage * cardsPerPage;
            endIndex = (rightPhysicalPage + 1) * cardsPerPage - 1;
          }

          // Find first empty spot in current page range
          const currentCards = getCustomCards(currentBinder.id);
          for (let i = startIndex; i <= endIndex; i++) {
            if (!currentCards[i]) {
              targetPosition = i;
              break;
            }
          }
        }

        const result = moveCardFromClipboard(
          actualIndex,
          currentBinder.id,
          targetPosition
        );
        if (result) {
          setClipboardCards(getCardClipboard());
          // Refresh custom cards if it's a custom binder
          if (currentBinder.binderType === "custom") {
            // Update history with final state after the action
            updateHistoryWithFinalState(currentBinder.id);

            const updatedCustomCards = getCustomCards(currentBinder.id);
            setCustomCards(updatedCustomCards);
            setCards(updatedCustomCards);

            // Update history state
            const updatedHistory = getBinderHistory(currentBinder.id);
            setHistoryEntries(updatedHistory);
          }
        }
        return result;
      }
    }
    return null;
  };

  const handleToggleClipboard = () => {
    setIsClipboardCollapsed(!isClipboardCollapsed);
  };

  const handleToggleHistory = () => {
    setIsHistoryCollapsed(!isHistoryCollapsed);
  };

  const handleRevertToEntry = (entryId) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      const success = revertToHistoryEntry(currentBinder.id, entryId);
      if (success) {
        // Refresh the binder state
        const updatedCustomCards = getCustomCards(currentBinder.id);
        setCustomCards(updatedCustomCards);
        setCards(updatedCustomCards);

        // Refresh history
        const updatedHistory = getBinderHistory(currentBinder.id);
        setHistoryEntries(updatedHistory);

        // Update current binder state
        const updatedBinder = {
          ...currentBinder,
          customCards: updatedCustomCards,
        };
        setCurrentBinder(updatedBinder);
        setBinders(getBinders());
      }
    }
  };

  const handleClearHistory = () => {
    if (currentBinder && currentBinder.binderType === "custom") {
      clearBinderHistory(currentBinder.id);
      setHistoryEntries([]);
    }
  };

  const handleNavigateHistory = (direction) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      const success = navigateHistory(currentBinder.id, direction);
      if (success) {
        // Refresh the binder state
        const updatedCustomCards = getCustomCards(currentBinder.id);
        setCustomCards(updatedCustomCards);
        setCards(updatedCustomCards);

        // Refresh history
        const updatedHistory = getBinderHistory(currentBinder.id);
        setHistoryEntries(updatedHistory);

        // Update current binder state
        const updatedBinder = {
          ...currentBinder,
          customCards: updatedCustomCards,
        };
        setCurrentBinder(updatedBinder);
        setBinders(getBinders());
      }
    }
  };

  const handleNavigateToPage = (targetPage) => {
    setCurrentPage(targetPage);
  };

  // Helper function to calculate which page a position belongs to
  const calculatePageFromPosition = (position, cardsPerPage) => {
    if (position < cardsPerPage) {
      return 0; // Cover page (right side only)
    }

    // For positions beyond the first page, calculate which physical page
    const physicalPage = Math.floor(position / cardsPerPage);

    // Convert physical page to binder page (accounting for left/right layout)
    // Physical pages 0 = binder page 0 (cover)
    // Physical pages 1,2 = binder page 1 (left/right)
    // Physical pages 3,4 = binder page 2 (left/right)
    // etc.
    if (physicalPage === 0) {
      return 0;
    } else {
      return Math.ceil(physicalPage / 2);
    }
  };

  const handleNavigateHistoryWithPageJump = (direction) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      // Get the entry we're navigating to
      const history = getBinderHistory(currentBinder.id);
      const currentPosition = getHistoryPosition(currentBinder.id);
      let targetEntry = null;

      if (direction === "back") {
        if (currentPosition === -1) {
          targetEntry = history[history.length - 1];
        } else if (currentPosition > 0) {
          targetEntry = history[currentPosition - 1];
        }
      } else if (direction === "forward") {
        if (currentPosition !== -1 && currentPosition < history.length - 1) {
          targetEntry = history[currentPosition + 1];
        }
      }

      // Calculate page and navigate if we have a target entry
      if (targetEntry) {
        let targetPosition = null;

        if (targetEntry.position !== undefined) {
          targetPosition = targetEntry.position;
        } else if (targetEntry.toPosition !== undefined) {
          targetPosition = targetEntry.toPosition;
        } else if (targetEntry.fromPosition !== undefined) {
          targetPosition = targetEntry.fromPosition;
        } else if (
          targetEntry.action === "bulk_move" &&
          targetEntry.targetPosition !== undefined
        ) {
          targetPosition = targetEntry.targetPosition;
        }

        if (targetPosition !== null) {
          const targetPage = calculatePageFromPosition(
            targetPosition,
            layout.cards
          );
          setCurrentPage(targetPage);
        }
      }

      // Perform the actual history navigation
      handleNavigateHistory(direction);
    }
  };

  // Keyboard shortcuts for history navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts for custom binders
      if (!currentBinder || currentBinder.binderType !== "custom") {
        return;
      }

      // Check if Ctrl (or Cmd on Mac) is pressed
      const isCtrlPressed = event.ctrlKey || event.metaKey;

      if (isCtrlPressed) {
        if (event.key === "z" && !event.shiftKey) {
          // Ctrl+Z for undo
          event.preventDefault();
          if (canNavigateHistory(currentBinder.id, "back")) {
            handleNavigateHistoryWithPageJump("back");
          }
        } else if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
          // Ctrl+Y or Ctrl+Shift+Z for redo
          event.preventDefault();
          if (canNavigateHistory(currentBinder.id, "forward")) {
            handleNavigateHistoryWithPageJump("forward");
          }
        }
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentBinder, handleNavigateHistory, layout.cards]);

  const handleMoveFromClipboard = (
    clipboardIndex,
    binderPosition,
    cardId,
    isReverseHolo
  ) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      // Find the actual current index of the card in case the clipboard has changed
      const currentClipboard = getCardClipboard();
      const actualIndex = currentClipboard.findIndex(
        (c) => c.id === cardId && c.isReverseHolo === isReverseHolo
      );

      if (actualIndex >= 0) {
        const result = moveCardFromClipboard(
          actualIndex,
          currentBinder.id,
          binderPosition
        );

        if (result) {
          const newClipboard = getCardClipboard();
          setClipboardCards(newClipboard);

          // Update history with final state after the action
          updateHistoryWithFinalState(currentBinder.id);

          // Refresh custom cards
          const updatedCustomCards = getCustomCards(currentBinder.id);
          setCustomCards(updatedCustomCards);
          setCards(updatedCustomCards);

          // Update history state
          const updatedHistory = getBinderHistory(currentBinder.id);
          setHistoryEntries(updatedHistory);
        }
        return result;
      }
    }
    return null;
  };

  const handleMoveCards = async (
    selectedCardData,
    targetPageIndex,
    moveOption
  ) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      try {
        // Get current cards
        const currentCards = getCustomCards(currentBinder.id);
        const newCards = [...currentCards];

        // Sort selected cards by their current position (descending) to avoid index issues when removing
        const sortedSelectedCards = selectedCardData.sort(
          (a, b) => b.globalIndex - a.globalIndex
        );

        // Calculate target position based on page and move option
        const cardsPerPage = layout.cards;
        let targetPosition;

        if (moveOption === "newPage") {
          // Add to the end of the collection
          targetPosition = newCards.length;
        } else {
          // Calculate position based on target page
          if (targetPageIndex === 0) {
            // Cover page (right side only)
            targetPosition = 0;
          } else {
            // Calculate for left and right pages
            const leftPhysicalPage = 2 * targetPageIndex - 1;
            targetPosition = leftPhysicalPage * cardsPerPage;
          }

          if (moveOption === "fill") {
            // Find first empty slot on target page
            const pageStart = targetPosition;
            const pageEnd =
              targetPosition +
              (targetPageIndex === 0 ? cardsPerPage : cardsPerPage * 2);

            for (let i = pageStart; i < pageEnd && i < newCards.length; i++) {
              if (!newCards[i]) {
                targetPosition = i;
                break;
              }
            }
          }
        }

        // Create a comprehensive history entry for the bulk move operation
        const cardNames = selectedCardData.map(
          (cardData) => cardData.card.name
        );
        const fromPositions = selectedCardData.map(
          (cardData) => cardData.globalIndex
        );

        addHistoryEntry(currentBinder.id, "bulk_move", {
          cardNames: cardNames,
          cardCount: selectedCardData.length,
          fromPositions: fromPositions,
          targetPosition: targetPosition,
          targetPage: targetPageIndex + 1, // Display as 1-indexed
          moveOption: moveOption,
          description: `Moved ${selectedCardData.length} card${
            selectedCardData.length !== 1 ? "s" : ""
          } to page ${targetPageIndex + 1}`,
        });

        // Remove selected cards from their current positions
        const cardsToMove = [];
        sortedSelectedCards.forEach((cardData) => {
          if (newCards[cardData.globalIndex]) {
            cardsToMove.unshift(newCards[cardData.globalIndex]); // Add to beginning to maintain order
            newCards[cardData.globalIndex] = null;
          }
        });

        // Insert cards at target position
        if (moveOption === "insert" || moveOption === "newPage") {
          // Insert and shift existing cards
          cardsToMove.forEach((card, index) => {
            newCards.splice(targetPosition + index, 0, card);
          });
        } else if (moveOption === "fill") {
          // Fill empty slots only
          let currentTargetPos = targetPosition;
          cardsToMove.forEach((card) => {
            // Find next empty slot
            while (
              currentTargetPos < newCards.length &&
              newCards[currentTargetPos]
            ) {
              currentTargetPos++;
            }
            if (currentTargetPos < newCards.length) {
              newCards[currentTargetPos] = card;
            } else {
              newCards.push(card);
            }
            currentTargetPos++;
          });
        }

        // Remove any trailing null values
        while (newCards.length > 0 && newCards[newCards.length - 1] === null) {
          newCards.pop();
        }

        // Update the binder with new card arrangement
        const updatedBinder = {
          ...currentBinder,
          customCards: newCards,
          updatedAt: new Date().toISOString(),
        };

        // Save to storage
        saveBinder(updatedBinder);

        // Update history with final state after the action
        updateHistoryWithFinalState(currentBinder.id);

        // Update state
        setCustomCards(newCards);
        setCards(newCards);
        setCurrentBinder(updatedBinder);
        setBinders(getBinders());

        // Update history state
        const updatedHistory = getBinderHistory(currentBinder.id);
        setHistoryEntries(updatedHistory);

        return true;
      } catch (error) {
        console.error("Error moving cards:", error);
        return false;
      }
    }
    return false;
  };

  // Calculate progress stats
  const totalCards = cards.length;
  const missingCount = parsedMissingCards.size;

  // For custom binders, show actual card count and missing cards
  const isCustomBinder = currentBinder?.binderType === "custom";
  const actualCardsInBinder = isCustomBinder
    ? cards.filter((card) => card !== null).length
    : totalCards;

  const collectedCount = isCustomBinder
    ? actualCardsInBinder - missingCount // Subtract missing cards from actual cards
    : totalCards - missingCount; // Traditional missing cards calculation for sets

  const progressPercentage = isCustomBinder
    ? actualCardsInBinder > 0
      ? (collectedCount / actualCardsInBinder) * 100
      : 100 // Show 100% if no cards added yet
    : totalCards > 0
    ? (collectedCount / totalCards) * 100
    : 0;

  const handleBinderCreate = (name, binderType = "set") => {
    const newBinder = createBinder(name);
    setBinderType(newBinder.id, binderType);

    // Get the updated binder with the correct type
    const updatedBinders = getBinders();
    const binderWithType = updatedBinders.find((b) => b.id === newBinder.id);

    setBinders(updatedBinders);
    handleBinderSelect(binderWithType);
  };

  const handleBinderDelete = (binderId) => {
    deleteBinder(binderId);
    setBinders(getBinders());
    if (currentBinder?.id === binderId) {
      setCurrentBinder(null);
    }
  };

  const handleBinderRename = (binderId, newName) => {
    const binder = binders.find((b) => b.id === binderId);
    if (binder) {
      const renamedBinder = renameBinder(binderId, newName);
      setBinders(getBinders());
      if (currentBinder?.id === binderId) {
        setCurrentBinder(renamedBinder);
      }
    }
  };

  return (
    <div
      className={`min-h-screen ${theme.colors.background.main} flex flex-col`}
    >
      {/* Modern Header */}
      <header
        className={`${theme.colors.background.sidebar} border-b ${theme.colors.border.accent} px-6 py-4`}
      >
        <div className="grid grid-cols-3 items-center">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Sidebar Toggle Button - Now visible on all screen sizes */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-2 rounded-lg ${theme.colors.button.secondary} transition-all duration-200 hover:scale-105`}
                title={showSidebar ? "Hide sidebar" : "Show sidebar"}
              >
                {showSidebar ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </button>

              <div>
                <h1
                  className={`text-xl font-bold ${theme.colors.text.primary}`}
                >
                  PkmnBindr
                </h1>
                <p className={`text-sm ${theme.colors.text.secondary}`}>
                  Pokemon Collection Manager
                </p>
              </div>
            </div>

            {currentBinder && set && (
              <div className="hidden xl:flex items-center gap-4">
                <div className={`h-6 w-px ${theme.colors.border.accent}`} />
                <div className="flex items-center gap-2">
                  <FolderOpen
                    className={`w-4 h-4 ${theme.colors.text.accent}`}
                  />
                  <span
                    className={`text-sm font-medium ${theme.colors.text.primary}`}
                  >
                    {currentBinder.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${theme.colors.text.secondary}`}>
                    •
                  </span>
                  <span className={`text-sm ${theme.colors.text.secondary}`}>
                    {set.name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Center Section - Navigation */}
          <div className="flex justify-center">
            {cards.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.max(p - 1, 0));
                  }}
                  disabled={currentPage === 0}
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${theme.colors.button.secondary}
                    enabled:hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-200
                  `}
                  title="Previous page"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div
                  className={`
                    px-3 py-1.5 ${theme.colors.background.card} rounded-lg
                    border ${theme.colors.border.accent}
                    text-sm font-medium ${theme.colors.text.primary}
                    min-w-[120px] text-center cursor-pointer
                    hover:shadow-lg transition-all duration-200
                  `}
                  title="Hover and scroll to navigate pages quickly"
                  onWheel={(e) => {
                    e.preventDefault();
                    const totalPhysicalPages = Math.ceil(
                      cards.length / layout.cards
                    );
                    const adjustedTotalPages = Math.ceil(
                      (totalPhysicalPages + 1) / 2
                    );

                    if (e.deltaY > 0) {
                      // Scroll up - previous page
                      setCurrentPage((p) => Math.max(p - 1, 0));
                    } else {
                      // Scroll down - next page
                      setCurrentPage((p) =>
                        Math.min(p + 1, adjustedTotalPages - 1)
                      );
                    }
                  }}
                >
                  {(() => {
                    const totalPhysicalPages = Math.ceil(
                      cards.length / layout.cards
                    );
                    let leftPhysicalPage, rightPhysicalPage;

                    if (currentPage === 0) {
                      return "Cover Page";
                    } else {
                      leftPhysicalPage = 2 * currentPage - 1;
                      rightPhysicalPage = 2 * currentPage;
                      return `Pages ${leftPhysicalPage + 1}-${
                        rightPhysicalPage + 1
                      } of ${totalPhysicalPages}`;
                    }
                  })()}
                </div>

                <button
                  onClick={() => {
                    const totalPhysicalPages = Math.ceil(
                      cards.length / layout.cards
                    );
                    const adjustedTotalPages = Math.ceil(
                      (totalPhysicalPages + 1) / 2
                    );
                    setCurrentPage((p) =>
                      Math.min(p + 1, adjustedTotalPages - 1)
                    );
                  }}
                  disabled={(() => {
                    const totalPhysicalPages = Math.ceil(
                      cards.length / layout.cards
                    );
                    const adjustedTotalPages = Math.ceil(
                      (totalPhysicalPages + 1) / 2
                    );
                    return currentPage >= adjustedTotalPages - 1;
                  })()}
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${theme.colors.button.secondary}
                    enabled:hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-200
                  `}
                  title="Next page"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 justify-end">
            {/* Collection Progress - Responsive version */}
            {(totalCards > 0 ||
              (isCustomBinder && actualCardsInBinder > 0)) && (
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="flex items-center gap-2 lg:gap-3">
                  <span
                    className={`text-xs lg:text-sm font-medium ${theme.colors.text.accent} hidden sm:inline`}
                  >
                    {isCustomBinder ? "Collection:" : "Collection:"}
                  </span>
                  <span
                    className={`text-sm lg:text-base font-bold ${theme.colors.text.primary} min-w-[80px] text-right`}
                  >
                    {isCustomBinder
                      ? `${collectedCount} / ${actualCardsInBinder}`
                      : `${collectedCount} / ${totalCards}`}
                  </span>
                  <span
                    className={`text-xs lg:text-sm ${theme.colors.text.secondary} hidden md:inline font-medium`}
                  >
                    ({progressPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-24 lg:w-32 h-2.5 bg-gray-700 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full bg-gradient-to-r ${theme.colors.progress.from} ${theme.colors.progress.to} transition-all duration-500 ease-out`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
          ${showSidebar ? "translate-x-0" : "-translate-x-full"}
          fixed lg:relative
          z-30 lg:z-0
          w-86 lg:w-106 h-full
          ${theme.colors.background.sidebar}
          border-r ${theme.colors.border.accent}
          transition-transform duration-300 ease-in-out
          flex flex-col
        `}
        >
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2
                  className={`text-lg font-semibold ${theme.colors.text.primary}`}
                >
                  Collection Manager
                </h2>
                <div className="flex items-center gap-3">
                  <DarkModeToggle />
                  <div
                    className={`w-px h-6 ${theme.colors.border.light}`}
                  ></div>
                  <ThemeSelector />
                </div>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className={`p-2 rounded-lg ${theme.colors.button.secondary} lg:hidden transition-all duration-200 hover:scale-105`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Binder Management */}
            <section>
              <h3
                className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
              >
                Binder Management
              </h3>
              <EnhancedBinderSelector
                binders={binders}
                currentBinder={currentBinder}
                onBinderSelect={handleBinderSelect}
                onBinderCreate={handleBinderCreate}
                onBinderDelete={handleBinderDelete}
                onBinderRename={handleBinderRename}
              />
            </section>

            {currentBinder && (
              <>
                {/* Custom Binder Actions */}
                {currentBinder.binderType === "custom" && (
                  <section>
                    <h3
                      className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
                    >
                      Custom Collection
                    </h3>
                    <div className="space-y-4">
                      <button
                        onClick={handleOpenCardSearch}
                        className={`w-full px-4 py-3 text-sm rounded-xl 
                          focus:outline-none focus:ring-2 focus:ring-offset-2 
                          flex items-center justify-center gap-2 
                          font-medium
                          transition-all duration-200
                          ${theme.colors.button.primary}`}
                      >
                        <Plus className="w-4 h-4" />
                        Add Cards
                      </button>

                      {customCards.length > 0 && (
                        <div
                          className={`${theme.colors.background.card} rounded-xl p-4`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`text-sm font-medium ${theme.colors.text.primary}`}
                            >
                              Collection Stats
                            </span>
                          </div>
                          <div
                            className={`text-xs ${theme.colors.text.secondary}`}
                          >
                            {customCards.length} card
                            {customCards.length !== 1 ? "s" : ""} in collection
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Set Selection */}
                {currentBinder.binderType !== "custom" && (
                  <section>
                    <h3
                      className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
                    >
                      Set Selection
                    </h3>
                    <div className="space-y-4">
                      <SetSelector
                        onSetSelect={setSelectedSet}
                        selectedSet={selectedSet}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={loading || !selectedSet}
                        className={`w-full px-4 py-3 text-sm rounded-xl 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2 
                        font-medium
                        transition-all duration-200
                        ${theme.colors.button.primary}`}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading Set...
                          </>
                        ) : (
                          "Load Set"
                        )}
                      </button>
                    </div>
                  </section>
                )}

                {/* Layout Options */}
                {(set || currentBinder.binderType === "custom") && (
                  <section>
                    <h3
                      className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
                    >
                      View Options
                    </h3>
                    <BinderLayoutSelector
                      currentLayout={layout}
                      onLayoutChange={handleLayoutChange}
                      displayOptions={displayOptions}
                      onDisplayOptionsChange={setDisplayOptions}
                      isCustomBinder={currentBinder?.binderType === "custom"}
                    />
                  </section>
                )}

                {/* Missing Cards */}
                {selectedSet && (
                  <section>
                    <h3
                      className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
                    >
                      Missing Cards
                    </h3>
                    <div
                      className={`${theme.colors.background.card} rounded-xl p-4 space-y-4`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium ${theme.colors.text.primary}`}
                        >
                          Track Missing Cards
                        </span>
                        {parsedMissingCards.size > 0 && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-md ${theme.colors.button.primary}`}
                          >
                            {parsedMissingCards.size} hidden
                          </span>
                        )}
                      </div>

                      {parsedMissingCards.size > 0 && (
                        <div
                          className={`text-xs ${theme.colors.text.secondary} bg-blue-500/10 p-2 rounded-lg`}
                        >
                          💡 Cards listed below are automatically hidden from
                          the binder view
                        </div>
                      )}

                      <textarea
                        value={missingCards}
                        onChange={handleMissingCardsChange}
                        disabled={!currentBinder || !set}
                        placeholder={`Enter missing cards (one per line):
5, 13, 58
[1], [25], [150]  
001/178, 025/178
5rh, 13rh`}
                        className={`w-full h-32 px-3 py-2 rounded-lg text-sm
                          resize-none
                          transition-all duration-200
                          ${theme.colors.background.sidebar}
                          border ${theme.colors.border.accent}
                          ${theme.colors.text.primary}
                          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500/50
                          disabled:opacity-50 disabled:cursor-not-allowed
                          placeholder:${theme.colors.text.secondary}`}
                      />

                      {/* Auto-save indicator */}
                      {set && currentBinder && (
                        <div
                          className={`text-xs ${theme.colors.text.secondary} text-center`}
                        >
                          ✓ Changes are automatically saved
                        </div>
                      )}
                    </div>

                    {/* Format Guide */}
                    <div
                      className={`mt-4 p-4 rounded-lg ${theme.colors.background.sidebar}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <FileText
                          className={`w-4 h-4 ${theme.colors.text.accent}`}
                        />
                        <span
                          className={`text-xs font-medium ${theme.colors.text.accent}`}
                        >
                          Supported Formats
                        </span>
                      </div>
                      <div
                        className={`grid grid-cols-1 gap-3 text-xs ${theme.colors.text.secondary}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                          >
                            #1
                          </span>
                          <span>Number with hash</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                          >
                            [1]
                          </span>
                          <span>Bracketed number</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                          >
                            001/178
                          </span>
                          <span>Set fraction</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                          >
                            25
                          </span>
                          <span>Just the number</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                          >
                            Pikachu
                          </span>
                          <span>Card name</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded-md ${theme.colors.background.card} font-mono`}
                          >
                            25rh
                          </span>
                          <span>Reverse holo cards</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Actions */}
                {set && cards.length > 0 && (
                  <section>
                    <h3
                      className={`text-sm font-medium ${theme.colors.text.accent} mb-4 uppercase tracking-wide`}
                    >
                      Export & Lists
                    </h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setCardListToShow([]);
                          setShowDeckList(true);
                        }}
                        className={`w-full px-4 py-3 text-sm font-medium rounded-xl
                          transition-all duration-200
                          hover:${theme.colors.background.sidebar}
                          focus:outline-none focus:ring-2 focus:ring-offset-2
                          flex items-center justify-center gap-2
                          ${theme.colors.button.secondary} border ${theme.colors.border.accent}`}
                      >
                        <FileText className="w-4 h-4" />
                        Full Set List
                      </button>

                      <button
                        onClick={() => {
                          const missingCardsList = cards.filter((card) =>
                            parsedMissingCards.has(card.number)
                          );
                          setCardListToShow(missingCardsList);
                          setShowDeckList(true);
                        }}
                        disabled={parsedMissingCards.size === 0}
                        className={`w-full px-4 py-3 text-sm font-medium rounded-xl
                          transition-all duration-200
                          hover:${theme.colors.background.sidebar}
                          focus:outline-none focus:ring-2 focus:ring-offset-2
                          flex items-center justify-center gap-2
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${theme.colors.button.secondary} border ${theme.colors.border.accent}`}
                      >
                        <ListX className="w-4 h-4" />
                        Missing Cards List
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className={`p-6 border-t ${theme.colors.border.accent}`}>
            <StorageControls onDataImported={handleDataImported} />
          </div>
        </aside>

        {/* Sidebar Overlay */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:bg-transparent"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 min-w-0 relative ${showSidebar ? "md:ml-0" : ""}`}
        >
          {cards.length > 0 ? (
            currentBinder?.binderType === "custom" ? (
              <CustomBinderPage
                cards={cards}
                currentPage={currentPage}
                layout={layout}
                onReorderCards={handleReorderCards}
                onRemoveCard={handleRemoveCard}
                onOpenCardSearch={handleOpenCardSearch}
                onMoveFromClipboard={handleMoveFromClipboard}
                parsedMissingCards={parsedMissingCards}
                onToggleCardStatus={handleToggleCardStatus}
                onMoveCards={handleMoveCards}
              />
            ) : (
              <BinderPage
                cards={cards}
                currentPage={currentPage}
                parsedMissingCards={parsedMissingCards}
                layout={layout}
                onToggleCardStatus={handleToggleCardStatus}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center space-y-6 max-w-md">
                <div
                  className={`w-16 h-16 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center`}
                >
                  {currentBinder ? (
                    <Grid3X3
                      className={`w-8 h-8 ${theme.colors.text.accent}`}
                    />
                  ) : (
                    <FolderOpen
                      className={`w-8 h-8 ${theme.colors.text.accent}`}
                    />
                  )}
                </div>
                <div>
                  <h2
                    className={`text-2xl font-bold ${theme.colors.text.primary} mb-2`}
                  >
                    {currentBinder ? "Select a Set" : "Get Started"}
                  </h2>
                  <p
                    className={`${theme.colors.text.secondary} leading-relaxed`}
                  >
                    {currentBinder
                      ? "Choose a Pokemon set from the sidebar to start tracking your collection"
                      : "Create a new binder or select an existing one to begin organizing your Pokemon card collection"}
                  </p>
                </div>
                {!currentBinder && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className={`px-6 py-3 rounded-xl ${theme.colors.button.primary} font-medium`}
                  >
                    Catch &apos;em all!
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showDeckList && (
        <DeckListModal
          cards={cardListToShow.length > 0 ? cardListToShow : cards}
          onClose={() => {
            setShowDeckList(false);
            setCardListToShow([]);
          }}
        />
      )}

      {showCardSearch && (
        <CardSearch
          isOpen={showCardSearch}
          onClose={handleCloseCardSearch}
          onAddCard={handleAddCard}
          onAddToClipboard={handleAddToClipboard}
        />
      )}

      {/* Card Clipboard - Only show for custom binders */}
      {currentBinder?.binderType === "custom" && (
        <CardClipboard
          clipboardCards={clipboardCards}
          onAddToClipboard={handleAddToClipboard}
          onRemoveFromClipboard={handleRemoveFromClipboard}
          onAddToCurrentPage={handleAddToCurrentPage}
          onClearClipboard={handleClearClipboard}
          currentPage={currentPage + 1}
          isCollapsed={isClipboardCollapsed}
          onToggleCollapse={handleToggleClipboard}
        />
      )}

      {/* Binder History - Only show for custom binders */}
      {currentBinder?.binderType === "custom" && (
        <BinderHistory
          historyEntries={historyEntries}
          onRevertToEntry={handleRevertToEntry}
          onClearHistory={handleClearHistory}
          onNavigateHistory={handleNavigateHistory}
          canNavigateBack={canNavigateHistory(currentBinder.id, "back")}
          canNavigateForward={canNavigateHistory(currentBinder.id, "forward")}
          currentPosition={getHistoryPosition(currentBinder.id)}
          isCollapsed={isHistoryCollapsed}
          onToggleCollapse={handleToggleHistory}
          onNavigateToPage={handleNavigateToPage}
          cardsPerPage={layout.cards}
        />
      )}

      {/* Footer */}
      <footer
        className={`${theme.colors.background.sidebar} border-t ${theme.colors.border.accent} px-6 py-4`}
      >
        <p className={`text-center ${theme.colors.text.secondary} text-xs`}>
          PkmnBindr is not affiliated with, sponsored or endorsed by Pokemon or
          The Pokemon Company International Inc.
        </p>
      </footer>
    </div>
  );
};

export default App;

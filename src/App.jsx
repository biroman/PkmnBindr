import { useState, useEffect } from "react";
import {
  Loader2,
  Save,
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
} from "./utils/storageUtils";
import { useTheme } from "./theme/ThemeContent";
import ThemeSelector from "./components/ThemeSelector";

const App = () => {
  const { theme } = useTheme();
  const [selectedSet, setSelectedSet] = useState(null);
  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCardSearch, setShowCardSearch] = useState(false);
  const [customCards, setCustomCards] = useState([]);
  const [clipboardCards, setClipboardCards] = useState([]);
  const [isClipboardCollapsed, setIsClipboardCollapsed] = useState(false);

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
    setSaveStatus(null);

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

    // Generate the appropriate card ID based on whether it's a reverse holo
    const cardId = card.isReverseHolo ? `${card.number}_reverse` : card.number;
    const newMissingCards = new Set(parsedMissingCards);

    if (newMissingCards.has(cardId)) {
      // Remove card from missing cards (mark as collected)
      newMissingCards.delete(cardId);
    } else {
      // Add card to missing cards (mark as missing)
      newMissingCards.add(cardId);
    }

    setParsedMissingCards(newMissingCards);

    // Update the text representation
    const missingCardsText = Array.from(newMissingCards)
      .map((number) => `#${number}`)
      .join("\n");
    setMissingCards(missingCardsText);

    // Save to storage if we have a set
    if (set) {
      saveMissingCards(set.id, newMissingCards);
    }
  };

  const handleSaveBinder = async () => {
    if (!currentBinder || !set) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      // Create the updated binder data
      const updatedBinder = {
        ...currentBinder,
        sets: [set],
        missingCards: {
          ...currentBinder.missingCards,
          [set.id]: Array.from(parsedMissingCards),
        },
        updatedAt: new Date().toISOString(),
      };

      // Save the binder
      saveBinder(updatedBinder.id, updatedBinder);

      // Update local state
      setCurrentBinder(updatedBinder);
      setBinders((prev) =>
        prev.map((b) => (b.id === updatedBinder.id ? updatedBinder : b))
      );

      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error("Failed to save binder:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setSaving(false);
    }
  };

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
    const parsed = parseCardList(text);
    setParsedMissingCards(parsed);
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
      const addedCard = addCustomCard(currentBinder.id, card, position);
      if (addedCard) {
        const updatedCards = getCustomCards(currentBinder.id);
        setCustomCards(updatedCards);
        setCards(updatedCards);

        // Update current binder state
        const updatedBinder = { ...currentBinder, customCards: updatedCards };
        setCurrentBinder(updatedBinder);
        setBinders(getBinders());
      }
    }
  };

  const handleRemoveCard = (cardIndex) => {
    if (currentBinder && currentBinder.binderType === "custom") {
      const success = removeCustomCard(currentBinder.id, cardIndex);
      if (success) {
        const updatedCards = getCustomCards(currentBinder.id);
        setCustomCards(updatedCards);
        setCards(updatedCards);

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
        const updatedCards = getCustomCards(currentBinder.id);
        setCustomCards(updatedCards);
        setCards(updatedCards);

        // Update current binder state
        const updatedBinder = { ...currentBinder, customCards: updatedCards };
        setCurrentBinder(updatedBinder);
        setBinders(getBinders());
      }
    }
  };

  const handleOpenCardSearch = () => {
    setShowCardSearch(true);
  };

  const handleCloseCardSearch = () => {
    setShowCardSearch(false);
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
        const result = moveCardFromClipboard(actualIndex, currentBinder.id);
        if (result) {
          setClipboardCards(getCardClipboard());
          // Refresh custom cards if it's a custom binder
          if (currentBinder.binderType === "custom") {
            const updatedCustomCards = getCustomCards(currentBinder.id);
            setCustomCards(updatedCustomCards);
            setCards(updatedCustomCards);
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

          // Refresh custom cards
          const updatedCustomCards = getCustomCards(currentBinder.id);
          setCustomCards(updatedCustomCards);
          setCards(updatedCustomCards);
        }
        return result;
      }
    }
    return null;
  };

  // Calculate progress stats
  const totalCards = cards.length;
  const missingCount = parsedMissingCards.size;

  // For custom binders, show actual card count instead of collection progress
  const isCustomBinder = currentBinder?.binderType === "custom";
  const collectedCount = isCustomBinder
    ? cards.filter((card) => card !== null).length // Count non-null cards in custom binder
    : totalCards - missingCount; // Traditional missing cards calculation for sets

  const progressPercentage = isCustomBinder
    ? 100 // Custom binders are always "complete" since users add what they want
    : totalCards > 0
    ? (collectedCount / totalCards) * 100
    : 0;

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
                    min-w-[120px] text-center
                  `}
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
            {totalCards > 0 && (
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="flex items-center gap-1 lg:gap-2">
                  <span
                    className={`text-xs lg:text-sm font-medium ${theme.colors.text.accent} hidden sm:inline`}
                  >
                    {isCustomBinder ? "Cards:" : "Collection:"}
                  </span>
                  <span
                    className={`text-xs lg:text-sm font-bold ${theme.colors.text.primary}`}
                  >
                    {isCustomBinder
                      ? collectedCount
                      : `${collectedCount} / ${totalCards}`}
                  </span>
                  <span
                    className={`text-xs ${theme.colors.text.secondary} hidden md:inline`}
                  >
                    ({progressPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-16 lg:w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${theme.colors.progress.from} ${theme.colors.progress.to} transition-all duration-500`}
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
                <ThemeSelector />
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
                        {missingCards && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-md ${theme.colors.button.primary}`}
                          >
                            {parsedMissingCards.size} missing
                          </span>
                        )}
                      </div>

                      <textarea
                        value={missingCards}
                        onChange={handleMissingCardsChange}
                        disabled={!currentBinder}
                        placeholder="One card per line..."
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

                      {/* Save Button */}
                      <button
                        onClick={handleSaveBinder}
                        disabled={saving || !selectedSet || !set}
                        className={`w-full px-4 py-3 text-sm rounded-xl
                          transition-all duration-200
                          font-medium
                          focus:outline-none focus:ring-2 focus:ring-offset-2
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${theme.colors.button.success}
                          flex items-center justify-center gap-2`}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Progress</span>
                          </>
                        )}
                      </button>

                      {/* Status Messages */}
                      {saveStatus === "success" && (
                        <div
                          className={`${theme.colors.button.success} bg-opacity-10 text-sm text-center py-2 px-4 rounded-lg`}
                        >
                          Progress saved successfully!
                        </div>
                      )}
                      {saveStatus === "error" && (
                        <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 px-4 rounded-lg">
                          Failed to save. Please try again.
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
                            Pikachu
                          </span>
                          <span>Card name</span>
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

        {/* Sidebar Overlay for Mobile */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
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
                    Open Collection Manager
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

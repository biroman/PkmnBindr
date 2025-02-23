import { useState, useEffect } from "react";
import { Loader2, Save, FileText, ListX } from "lucide-react";
import SetSelector from "./components/SetSelector/SetSelector";
import BinderLayoutSelector from "./components/BinderPage/BinderLayoutSelector";
import BinderPage from "./components/BinderPage/BinderPage";
import DeckListModal from "./components/DeckListModal/DeckListModal";
import StorageControls from "./components/StorageControls/StorageControls";
import BinderSelector from "./components/BinderSelector/BinderSelector";
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
      const aNum = parseInt(a.number);
      const bNum = parseInt(b.number);

      if (aNum === bNum) {
        // If numbers are the same, reverse holos come after regular cards
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
  };

  const handleSaveBinder = async () => {
    if (!currentBinder || !selectedSet) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      // Save missing cards when the user explicitly clicks save
      if (selectedSet) {
        saveMissingCards(selectedSet.id, parsedMissingCards);
      }

      // Then update the binder with the latest missing cards
      const updatedBinder = {
        ...currentBinder,
        sets: [selectedSet],
        missingCards: {
          ...currentBinder.missingCards,
          [selectedSet.id]: Array.from(parsedMissingCards),
        },
      };

      await saveBinder(updatedBinder);
      setCurrentBinder(updatedBinder);
      setBinders(getBinders());
      setSaveStatus("success");

      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (err) {
      setSaveStatus("error");
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBinderCreate = (name) => {
    const newBinder = createBinder(name);
    setBinders(getBinders());
    handleBinderSelect(newBinder);
  };

  const handleBinderDelete = (binderId) => {
    if (deleteBinder(binderId)) {
      setBinders(getBinders());
      setCurrentBinder(getCurrentBinder());
    }
  };

  const handleBinderRename = (binderId, newName) => {
    if (renameBinder(binderId, newName)) {
      setBinders(getBinders());
      if (currentBinder?.id === binderId) {
        setCurrentBinder({ ...currentBinder, name: newName });
      }
    }
  };

  const handleSearch = async () => {
    if (!selectedSet || !currentBinder) return;
    setLoading(true);
    setError("");
    setSaveStatus(null);

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
    const newText = e.target.value;
    setMissingCards(newText);
    const newParsedCards = parseCardList(newText, cards);
    setParsedMissingCards(newParsedCards);
  };

  const handleDataImported = () => {
    // Reload all data from storage
    const savedLayout = getLayoutPrefs();
    if (savedLayout) {
      setLayout(savedLayout);
    }
    setBinders(getBinders());
    setCurrentBinder(getCurrentBinder());
    if (set) {
      const savedMissingCards = getMissingCards(set.id);
      setParsedMissingCards(savedMissingCards);
      const missingCardsText = Array.from(savedMissingCards)
        .map((number) => `#${number}`)
        .join("\n");
      setMissingCards(missingCardsText);
    }
  };

  return (
    <div
      className={`h-screen bg-gradient-to-br ${theme.colors.background.main} flex`}
    >
      <div
        className={`w-100 ${theme.colors.background.sidebar} backdrop-blur-sm p-4 flex flex-col border-r ${theme.colors.border.accent}`}
      >
        {/* Header */}
        <div className={theme.colors.text.primary}>
          <h1 className={`text-2xl ${theme.colors.text.accent} font-bold mb-1`}>
            PkmnBindr
          </h1>
          <p className={`${theme.colors.text.secondary} text-sm`}>
            Generate Master Set Binder
          </p>
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 my-4">
          <BinderSelector
            binders={binders}
            currentBinder={currentBinder}
            onBinderSelect={handleBinderSelect}
            onBinderCreate={handleBinderCreate}
            onBinderDelete={handleBinderDelete}
            onBinderRename={handleBinderRename}
          />

          {currentBinder && (
            <>
              <SetSelector
                onSetSelect={setSelectedSet}
                selectedSet={selectedSet}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSearch}
                  disabled={loading || !selectedSet}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2 
                    shadow-lg
                    font-semibold
                    transition-all duration-200
                    ${theme.colors.button.primary}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
              <BinderLayoutSelector
                currentLayout={layout}
                onLayoutChange={handleLayoutChange}
                displayOptions={displayOptions}
                onDisplayOptionsChange={setDisplayOptions}
              />

              {saveStatus === "success" && (
                <div
                  className={`${theme.colors.button.success} bg-opacity-10 text-sm text-center py-2 px-4 rounded-lg`}
                >
                  Binder saved successfully!
                </div>
              )}
              {saveStatus === "error" && (
                <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 px-4 rounded-lg">
                  Failed to save binder. Please try again.
                </div>
              )}
            </>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div
            className={`${theme.colors.background.card} rounded-xl border ${theme.colors.border.accent} p-4 space-y-4`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  className={`text-sm font-medium ${theme.colors.text.accent}`}
                >
                  Missing Cards
                </label>
                {missingCards && (
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-lg
              ${theme.colors.button.primary}`}
                  >
                    {parsedMissingCards.size} cards missing
                  </span>
                )}
              </div>

              <textarea
                value={missingCards}
                onChange={handleMissingCardsChange}
                disabled={!currentBinder}
                placeholder={
                  currentBinder
                    ? "One card per line..."
                    : "Select a binder first"
                }
                className={`w-full h-24 px-3 py-2 rounded-lg text-sm
            transition-all duration-200
            ${theme.colors.background.sidebar} backdrop-blur-sm
            border ${theme.colors.border.accent}
            ${theme.colors.text.primary}
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:${theme.colors.text.secondary}`}
              />
            </div>
            {/* Format Guide */}
            <div
              className={`p-3 rounded-lg ${theme.colors.background.sidebar} backdrop-blur-sm`}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className={`w-4 h-4 ${theme.colors.text.accent}`} />
                <span
                  className={`text-xs font-medium ${theme.colors.text.accent}`}
                >
                  Supported Formats
                </span>
              </div>
              <div
                className={`grid grid-cols-2 gap-2 text-xs ${theme.colors.text.secondary}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-md ${theme.colors.background.card}`}
                  >
                    #1
                  </span>
                  <span>Number with hash</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-md ${theme.colors.background.card}`}
                  >
                    [1]
                  </span>
                  <span>Bracketed number</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-md ${theme.colors.background.card}`}
                  >
                    001/178
                  </span>
                  <span>Set fraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-md ${theme.colors.background.card}`}
                  >
                    Pikachu
                  </span>
                  <span>Card name</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Save Button */}
              <button
                onClick={handleSaveBinder}
                disabled={saving || !selectedSet || !set}
                className={`w-full px-4 py-2.5 text-sm rounded-lg
            transition-all duration-200
            font-medium
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg
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
                    <span>Save Binder</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Deck List Buttons */}
          {set && cards.length > 0 && (
            <div
              className={`${theme.colors.background.card} rounded-xl border ${theme.colors.border.accent} p-4 space-y-3`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className={`w-4 h-4 ${theme.colors.text.accent}`} />
                <span
                  className={`text-sm font-medium ${theme.colors.text.accent}`}
                >
                  Deck Lists
                </span>
              </div>

              <button
                onClick={() => {
                  setCardListToShow([]);
                  setShowDeckList(true);
                }}
                className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg
            transition-all duration-200
            hover:${theme.colors.background.sidebar}
            focus:outline-none focus:ring-2 focus:ring-offset-2
            flex items-center justify-center gap-2
            ${theme.colors.button.secondary} border ${theme.colors.border.accent}`}
              >
                <FileText className="w-4 h-4" />
                Full Set Deck List
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
                className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg
            transition-all duration-200
            hover:${theme.colors.background.sidebar}
            focus:outline-none focus:ring-2 focus:ring-offset-2
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${theme.colors.button.secondary} border ${theme.colors.border.accent}`}
              >
                <ListX className="w-4 h-4" />
                Missing Cards Deck List
              </button>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className={`pt-4 border-t ${theme.colors.border.accent}`}>
          <div className="flex items-center justify-between">
            <StorageControls onDataImported={handleDataImported} />
            <ThemeSelector />
          </div>
        </div>
      </div>

      <div className={`flex-1 min-w-0 ${theme.colors.background.main}`}>
        {cards.length > 0 ? (
          <BinderPage
            cards={cards}
            currentPage={currentPage}
            onNextPage={() => {
              const totalPhysicalPages = Math.ceil(cards.length / layout.cards);
              const adjustedTotalPages = Math.ceil(
                (totalPhysicalPages + 1) / 2
              );
              setCurrentPage((p) => Math.min(p + 1, adjustedTotalPages - 1));
            }}
            onPrevPage={() => setCurrentPage((p) => Math.max(p - 1, 0))}
            parsedMissingCards={parsedMissingCards}
            layout={layout}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className={`text-4xl font-bold ${theme.colors.text.accent}`}>
                {currentBinder ? "Select a Set" : "Select a Binder"}
              </div>
              <p className={theme.colors.text.secondary}>
                {currentBinder
                  ? "Choose a set to start building your collection"
                  : "Create or select a binder to get started"}
              </p>
            </div>
          </div>
        )}
      </div>

      {showDeckList && (
        <DeckListModal
          cards={cardListToShow.length > 0 ? cardListToShow : cards}
          onClose={() => {
            setShowDeckList(false);
            setCardListToShow([]);
          }}
        />
      )}

      <footer
        className={`absolute bottom-0 left-100 right-0 text-center p-4 ${theme.colors.text.secondary} text-opacity-50 text-xs`}
      >
        <p>
          The PkmnBindr Website are not affiliated with, sponsored or endorsed
          by, or in any way associated with Pokemon or The Pokemon Company
          International Inc
        </p>
      </footer>
    </div>
  );
};

export default App;

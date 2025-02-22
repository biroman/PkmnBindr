import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
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

        setCards(cardsData);
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
      // First save missing cards to ensure they're stored
      if (selectedSet) {
        saveMissingCards(selectedSet.id, parsedMissingCards);
      }

      // Then update the binder with the latest missing cards
      const updatedBinder = {
        ...currentBinder,
        sets: [selectedSet], // Only allow one set
        missingCards: {
          ...currentBinder.missingCards,
          [selectedSet.id]: Array.from(parsedMissingCards),
        },
      };

      await saveBinder(updatedBinder);
      setCurrentBinder(updatedBinder);
      setBinders(getBinders());
      setSaveStatus("success");

      // Reset save status after 3 seconds
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

      setCards(cardsData);
      setSet(selectedSet);
      setCurrentPage(0);
    } catch (err) {
      setError(err.message);
      setSet(null);
      setCards([]);
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

    // Save to storage
    if (set) {
      saveMissingCards(set.id, newParsedCards);
    }
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
        className={`w-100 ${theme.colors.background.sidebar} backdrop-blur-sm p-4 flex flex-col gap-4 overflow-y-auto border-r ${theme.colors.border.accent}`}
      >
        <div className="flex items-center justify-between">
          <div className={theme.colors.text.primary}>
            <h1
              className={`text-2xl ${theme.colors.text.accent} font-bold mb-1`}
            >
              PkmnBindr
            </h1>
            <p className={`${theme.colors.text.secondary} text-sm`}>
              Generate Master Set Binder
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StorageControls onDataImported={handleDataImported} />
            <ThemeSelector />
          </div>
        </div>

        <div className="space-y-4">
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
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div
          className={`space-y-2 ${theme.colors.background.card} p-4 rounded-xl border ${theme.colors.border.accent}`}
        >
          <div className="flex items-center justify-between mb-2">
            <label
              className={`text-sm font-medium ${theme.colors.text.accent}`}
            >
              Hide Missing Cards
            </label>
            {missingCards && (
              <span
                className={`text-xs ${theme.colors.background.card} px-3 py-1 rounded-full ${theme.colors.text.accent} font-medium border ${theme.colors.border.accent}`}
              >
                {parsedMissingCards.size} cards
              </span>
            )}
          </div>

          <textarea
            value={missingCards}
            onChange={handleMissingCardsChange}
            disabled={!currentBinder}
            placeholder={
              currentBinder ? "One card per line..." : "Select a binder first"
            }
            className={`w-full h-24 px-3 py-2 ${theme.colors.background.card} border ${theme.colors.border.accent} rounded-lg 
              ${theme.colors.text.primary} text-sm
              focus:outline-none focus:ring-2 focus:ring-offset-2 
              disabled:opacity-50 disabled:cursor-not-allowed`}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSaveBinder}
              disabled={saving || !selectedSet || !set}
              className={`px-3 py-2 w-full text-sm rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-offset-2 
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 
                shadow-lg
                font-semibold
                transition-all duration-200
                ${theme.colors.button.success}`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Binder
                </>
              )}
            </button>
          </div>
        </div>

        {set && cards.length > 0 && (
          <div className="space-y-2 mt-4">
            <button
              onClick={() => {
                setCardListToShow([]);
                setShowDeckList(true);
              }}
              className={`w-full px-4 py-3 text-sm font-semibold 
                rounded-lg
                transition-all duration-200 ease-in-out
                shadow-lg
                focus:outline-none focus:ring-2 focus:ring-offset-2
                flex items-center justify-center gap-3
                ${theme.colors.button.primary}`}
            >
              Create Full Set Deck List
            </button>

            <button
              onClick={() => {
                const missingCardsList = cards.filter((card) =>
                  parsedMissingCards.has(card.number)
                );
                setCardListToShow(missingCardsList);
                setShowDeckList(true);
              }}
              className={`w-full px-4 py-3 text-sm font-semibold 
                rounded-lg
                transition-all duration-200 ease-in-out
                border ${theme.colors.border.light}
                focus:outline-none focus:ring-2 focus:ring-offset-2
                flex items-center justify-center gap-3
                disabled:opacity-50 disabled:cursor-not-allowed
                ${theme.colors.button.secondary}`}
              disabled={parsedMissingCards.size === 0}
            >
              Create Missing Cards Deck List
            </button>
          </div>
        )}
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

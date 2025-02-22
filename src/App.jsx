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

const App = () => {
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
    <div className="h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex">
      <div className="w-100 bg-gray-900/80 backdrop-blur-sm p-4 flex flex-col gap-4 overflow-y-auto border-r border-yellow-500/20">
        <div className="flex items-center justify-between">
          <div className="text-yellow-500">
            <h1 className="text-2xl text-[#d62e36] font-bold mb-1">
              PkmnBindr
            </h1>
            <p className="text-yellow-500/60 text-sm">
              Generate Master Set Binder
            </p>
          </div>
          <StorageControls onDataImported={handleDataImported} />
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
                  className="flex-1 px-3 py-2 bg-yellow-500 text-gray-900 text-sm rounded-lg 
                    hover:bg-yellow-400 
                    focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2 
                    shadow-lg shadow-yellow-500/20
                    font-semibold
                    transition-all duration-200"
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
                <div className="text-green-500 text-sm text-center bg-green-500/10 py-2 px-4 rounded-lg">
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

        <div className="space-y-2 bg-gray-800/50 p-4 rounded-xl border border-yellow-500/20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-yellow-500">
              Hide Missing Cards
            </label>
            {missingCards && (
              <span className="text-xs bg-yellow-500/10 px-3 py-1 rounded-full text-yellow-500 font-medium border border-yellow-500/20">
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
            className="w-full h-24 px-3 py-2 bg-gray-800/50 border border-yellow-500/20 rounded-lg 
  text-yellow-100 text-sm placeholder-yellow-500/30
  focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent
  disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="mt-2 space-y-2 text-xs text-yellow-500/60">
            <p>Format examples: #1, [2], 003/189, Caterpie (id best)</p>

            <div className="mt-4 p-3 bg-gray-800/30 rounded-lg space-y-3">
              <p className="text-yellow-500 font-medium">
                Quick steps to import from pkmn.gg:
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to pkmn.gg and select your set</li>
                <li className="flex items-start gap-3">
                  Find this button in the top right corner:
                </li>
                <img
                  src="/pkmngg.png"
                  alt="pkmn.gg missing cards button"
                  className="h-8 rounded border border-yellow-500/20"
                />
                <li>Click it to see your missing cards list</li>
                <li>Copy the entire list and paste it here</li>
              </ol>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveBinder}
              disabled={saving || !selectedSet || !set}
              className="px-3 py-2 bg-green-600 w-full text-white text-sm rounded-lg 
                    hover:bg-green-500 
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2 
                    shadow-lg shadow-green-500/20
                    font-semibold
                    transition-all duration-200"
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

        {/* <div className="flex flex-col items-center justify-end mt-auto space-y-4">
          <a
            href="https://www.buymeacoffee.com/biroman"
            target="_blank"
            rel="noopener noreferrer"
            className="relative w-full flex justify-center group"
          >
            <div className="bg-fuchsia-400 text-white font-bold px-4 py-2 rounded-lg hover:bg-fuchsia-300 transition-colors ">
              Buy me a coffee? ☕
            </div>
          </a>
        </div> */}
        {set && cards.length > 0 && (
          <div className=" space-y-2 mt-4">
            <button
              onClick={() => {
                setCardListToShow([]);
                setShowDeckList(true);
              }}
              className="w-full px-4 py-3 bg-yellow-500 text-gray-900 text-sm font-semibold 
                rounded-lg hover:bg-yellow-400
                transition-all duration-200 ease-in-out
                shadow-lg shadow-yellow-500/20
                focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900
                flex items-center justify-center gap-3"
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
              className="w-full px-4 py-3 bg-gray-800 text-yellow-500 text-sm font-semibold 
                rounded-lg hover:bg-gray-700
                transition-all duration-200 ease-in-out
                border border-yellow-500/20
                focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900
                flex items-center justify-center gap-3
                disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={parsedMissingCards.size === 0}
            >
              Create Missing Cards Deck List
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 bg-gray-950">
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
              <div className="text-4xl font-bold text-yellow-500">
                {currentBinder ? "Select a Set" : "Select a Binder"}
              </div>
              <p className="text-yellow-500/60">
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
      <footer className="absolute bottom-0 left-100 right-0 text-center p-4 text-gray-500/50 text-xs">
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

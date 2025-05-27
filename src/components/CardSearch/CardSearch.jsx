import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  Search,
  Plus,
  Filter,
  X,
  Star,
  Loader2,
  Clipboard,
  Check,
} from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";

// Storage key for persisting search state
const SEARCH_STATE_KEY = "pkmnbinder_card_search_state";

const CardSearch = ({ onAddCard, onAddToClipboard, isOpen, onClose }) => {
  const { theme } = useTheme();

  // Load initial state from localStorage
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(SEARCH_STATE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load search state:", error);
    }
    return {
      searchQuery: "",
      searchResults: [],
      selectedFilters: { rarity: "", type: "", set: "" },
      scrollPosition: 0,
    };
  };

  const savedState = loadSavedState();

  const [searchQuery, setSearchQuery] = useState(savedState.searchQuery);
  const [searchResults, setSearchResults] = useState(savedState.searchResults);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(
    savedState.selectedFilters
  );
  const [availableSets, setAvailableSets] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(
    savedState.scrollPosition
  );
  const [recentlyAdded, setRecentlyAdded] = useState(new Set());
  const [pulsing, setPulsing] = useState(new Set()); // For pulse effect on already-added buttons
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Save current state to localStorage
  const saveState = () => {
    try {
      const stateToSave = {
        searchQuery,
        searchResults,
        selectedFilters,
        scrollPosition,
      };
      localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Failed to save search state:", error);
    }
  };

  // Save state whenever relevant data changes
  useEffect(() => {
    saveState();
  }, [searchQuery, searchResults, selectedFilters, scrollPosition]);

  // Focus search input when modal opens and restore scroll position (only once)
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      // Restore scroll position after a short delay to ensure content is rendered
      setTimeout(() => {
        if (resultsRef.current && scrollPosition > 0) {
          resultsRef.current.scrollTop = scrollPosition;
        }
      }, 100);
    }
  }, [isOpen]); // Remove scrollPosition dependency to prevent feedback loop

  // Save scroll position when modal closes
  useEffect(() => {
    if (!isOpen && resultsRef.current) {
      setScrollPosition(resultsRef.current.scrollTop);
    }
  }, [isOpen]);

  // Add debounced scroll listener to save position while scrolling
  useEffect(() => {
    let scrollTimeout;

    const handleScroll = () => {
      // Clear previous timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Set new timeout to save scroll position after user stops scrolling
      scrollTimeout = setTimeout(() => {
        if (resultsRef.current) {
          setScrollPosition(resultsRef.current.scrollTop);
        }
      }, 150); // Debounce for 150ms
    };

    const resultsElement = resultsRef.current;
    if (resultsElement && isOpen) {
      resultsElement.addEventListener("scroll", handleScroll);
      return () => {
        resultsElement.removeEventListener("scroll", handleScroll);
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
      };
    }
  }, [isOpen]);

  // Load available sets for filtering
  useEffect(() => {
    const loadSets = async () => {
      try {
        const response = await fetch("https://api.pokemontcg.io/v2/sets");
        const data = await response.json();
        setAvailableSets(data.data);
      } catch (error) {
        console.error("Failed to load sets:", error);
      }
    };
    loadSets();
  }, []);

  const searchCards = async (query, filters = {}) => {
    if (!query.trim() && !filters.set) return;

    setLoading(true);
    try {
      // Build search query
      let searchParams = [];

      if (query.trim()) {
        searchParams.push(`name:"${query.trim()}*"`);
      }

      if (filters.rarity) {
        searchParams.push(`rarity:"${filters.rarity}"`);
      }

      if (filters.type) {
        searchParams.push(`types:"${filters.type}"`);
      }

      if (filters.set) {
        searchParams.push(`set.id:"${filters.set}"`);
      }

      const queryString = searchParams.join(" ");
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(
          queryString
        )}&pageSize=500&orderBy=name`
      );

      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchCards(searchQuery, selectedFilters);
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...selectedFilters, [filterType]: value };
    setSelectedFilters(newFilters);

    // Auto-search when filters change
    if (searchQuery.trim() || newFilters.set) {
      searchCards(searchQuery, newFilters);
    }
  };

  const clearFilters = () => {
    setSelectedFilters({ rarity: "", type: "", set: "" });
    setScrollPosition(0); // Reset scroll position when clearing filters
    if (searchQuery.trim()) {
      searchCards(searchQuery, {});
    } else {
      setSearchResults([]);
    }
  };

  const clearAll = () => {
    setSearchQuery("");
    setSelectedFilters({ rarity: "", type: "", set: "" });
    setSearchResults([]);
    setScrollPosition(0);
    // Also clear from localStorage
    localStorage.removeItem(SEARCH_STATE_KEY);
  };

  const handleAddCard = (card, isReverseHolo = false) => {
    const cardToAdd = {
      ...card,
      isReverseHolo,
      id: isReverseHolo ? `${card.id}_reverse` : card.id,
    };

    const cardKey = `${card.id}_${isReverseHolo ? "rh" : "normal"}`;

    // If button is already in "Added!" state, show pulse effect
    if (recentlyAdded.has(cardKey)) {
      setPulsing((prev) => new Set([...prev, cardKey]));

      // Remove pulse effect after 300ms
      setTimeout(() => {
        setPulsing((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cardKey);
          return newSet;
        });
      }, 200);
    }

    const success = onAddCard(cardToAdd);
    if (success !== false) {
      // Add visual feedback
      setRecentlyAdded((prev) => new Set([...prev, cardKey]));

      // Remove feedback after 2 seconds
      setTimeout(() => {
        setRecentlyAdded((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cardKey);
          return newSet;
        });
      }, 2000);
    }
  };

  const handleAddToClipboard = (card, isReverseHolo = false) => {
    const cardToAdd = {
      ...card,
      isReverseHolo,
      id: isReverseHolo ? `${card.id}_reverse` : card.id,
    };

    const cardKey = `${card.id}_${isReverseHolo ? "rh" : "normal"}_clipboard`;

    // If button is already in "Added!" state, show pulse effect
    if (recentlyAdded.has(cardKey)) {
      setPulsing((prev) => new Set([...prev, cardKey]));

      // Remove pulse effect after 300ms
      setTimeout(() => {
        setPulsing((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cardKey);
          return newSet;
        });
      }, 200);
    }

    const success = onAddToClipboard(cardToAdd);
    if (success !== false) {
      // Add visual feedback for clipboard
      setRecentlyAdded((prev) => new Set([...prev, cardKey]));

      // Remove feedback after 2 seconds
      setTimeout(() => {
        setRecentlyAdded((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cardKey);
          return newSet;
        });
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`${theme.colors.background.main} rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex border ${theme.colors.border.light}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className={`p-6 border-b ${theme.colors.border.light}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-bold ${theme.colors.text.primary}`}>
                Add Cards to Binder
              </h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10 ${theme.colors.text.secondary}`}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for cards by name..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl ${theme.colors.background.card} border ${theme.colors.border.accent} ${theme.colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 rounded-xl ${theme.colors.button.primary} font-medium flex items-center gap-2 disabled:opacity-50`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2
                    className={`w-8 h-8 animate-spin mx-auto mb-4 ${theme.colors.text.accent}`}
                  />
                  <p className={theme.colors.text.secondary}>
                    Searching for cards...
                  </p>
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {searchResults
                  .sort((a, b) => a.number - b.number)
                  .map((card) => (
                    <div
                      key={card.id}
                      className={`${theme.colors.background.card} rounded-lg p-3 border ${theme.colors.border.light} hover:shadow-lg transition-all duration-200 group`}
                    >
                      <div className="aspect-[2.5/3.5] mb-2 relative">
                        <img
                          src={card.images.small}
                          alt={card.name}
                          className="w-full h-full object-contain rounded-md"
                        />
                      </div>

                      <div className="space-y-1">
                        <h3
                          className={`font-medium ${theme.colors.text.primary} text-xs truncate`}
                        >
                          {card.name}
                        </h3>
                        <p
                          className={`text-xs ${theme.colors.text.secondary} truncate`}
                        >
                          {card.set.name} #{card.number}
                        </p>
                        <p className={`text-xs ${theme.colors.text.accent}`}>
                          {card.rarity}
                        </p>
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAddCard(card, false)}
                            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all duration-200 ${
                              recentlyAdded.has(`${card.id}_normal`)
                                ? `bg-green-500 text-white ${
                                    pulsing.has(`${card.id}_normal`)
                                      ? "bg-green-300 shadow-md"
                                      : ""
                                  }`
                                : `${theme.colors.button.primary} hover:scale-105`
                            }`}
                          >
                            {recentlyAdded.has(`${card.id}_normal`) ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            {recentlyAdded.has(`${card.id}_normal`)
                              ? "Added!"
                              : "Add"}
                          </button>
                          <button
                            onClick={() => handleAddToClipboard(card, false)}
                            className={`px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center transition-all duration-200 ${
                              recentlyAdded.has(`${card.id}_normal_clipboard`)
                                ? `bg-green-500 text-white ${
                                    pulsing.has(`${card.id}_normal_clipboard`)
                                      ? "bg-green-300 shadow-md"
                                      : ""
                                  }`
                                : `${theme.colors.button.secondary} hover:scale-105`
                            }`}
                            title="Add to clipboard"
                          >
                            <Clipboard className="w-3 h-3" />
                          </button>
                        </div>

                        {["Common", "Uncommon", "Rare", "Rare Holo"].includes(
                          card.rarity
                        ) && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAddCard(card, true)}
                              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all duration-200 ${
                                recentlyAdded.has(`${card.id}_rh`)
                                  ? `bg-green-500 text-white ${
                                      pulsing.has(`${card.id}_rh`)
                                        ? "bg-green-300 shadow-md"
                                        : ""
                                    }`
                                  : `${theme.colors.button.secondary} hover:scale-105`
                              }`}
                            >
                              {recentlyAdded.has(`${card.id}_rh`) ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Star className="w-3 h-3" />
                              )}
                              {recentlyAdded.has(`${card.id}_rh`)
                                ? "Added!"
                                : "Add RH"}
                            </button>
                            <button
                              onClick={() => handleAddToClipboard(card, true)}
                              className={`px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center transition-all duration-200 ${
                                recentlyAdded.has(`${card.id}_rh_clipboard`)
                                  ? `bg-green-500 text-white ${
                                      pulsing.has(`${card.id}_rh_clipboard`)
                                        ? "bg-green-300 shadow-md"
                                        : ""
                                    }`
                                  : `${theme.colors.button.secondary} hover:scale-105`
                              }`}
                              title="Add reverse holo to clipboard"
                            >
                              <Clipboard className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : searchQuery.trim() || selectedFilters.set ? (
              <div className="text-center py-12">
                <div
                  className={`w-16 h-16 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center mb-4`}
                >
                  <Search className={`w-8 h-8 ${theme.colors.text.accent}`} />
                </div>
                <h3
                  className={`text-lg font-medium ${theme.colors.text.primary} mb-2`}
                >
                  No cards found
                </h3>
                <p className={theme.colors.text.secondary}>
                  Try adjusting your search terms or filters
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div
                  className={`w-16 h-16 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center mb-4`}
                >
                  <Search className={`w-8 h-8 ${theme.colors.text.accent}`} />
                </div>
                <h3
                  className={`text-lg font-medium ${theme.colors.text.primary} mb-2`}
                >
                  Search for Pokemon Cards
                </h3>
                <p className={theme.colors.text.secondary}>
                  Enter a card name or use filters to find cards to add to your
                  binder
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Filters Sidebar */}
        <div
          className={`w-80 ${theme.colors.background.sidebar} border-l ${theme.colors.border.light} p-6 overflow-y-auto`}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className={`w-5 h-5 ${theme.colors.text.accent}`} />
              <h3
                className={`text-lg font-semibold ${theme.colors.text.primary}`}
              >
                Filters
              </h3>
            </div>

            {/* Rarity Filter */}
            <div>
              <label
                className={`block text-sm font-medium ${theme.colors.text.secondary} mb-2`}
              >
                Rarity
              </label>
              <select
                value={selectedFilters.rarity}
                onChange={(e) => handleFilterChange("rarity", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${theme.colors.background.main} border ${theme.colors.border.accent} ${theme.colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              >
                <option value="">All Rarities</option>
                <option value="Common">Common</option>
                <option value="Uncommon">Uncommon</option>
                <option value="Rare">Rare</option>
                <option value="Rare Holo">Rare Holo</option>
                <option value="Rare Holo EX">Rare Holo EX</option>
                <option value="Rare Holo GX">Rare Holo GX</option>
                <option value="Rare Holo V">Rare Holo V</option>
                <option value="Rare Holo VMAX">Rare Holo VMAX</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label
                className={`block text-sm font-medium ${theme.colors.text.secondary} mb-2`}
              >
                Type
              </label>
              <select
                value={selectedFilters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${theme.colors.background.main} border ${theme.colors.border.accent} ${theme.colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              >
                <option value="">All Types</option>
                <option value="Grass">Grass</option>
                <option value="Fire">Fire</option>
                <option value="Water">Water</option>
                <option value="Lightning">Lightning</option>
                <option value="Psychic">Psychic</option>
                <option value="Fighting">Fighting</option>
                <option value="Darkness">Darkness</option>
                <option value="Metal">Metal</option>
                <option value="Fairy">Fairy</option>
                <option value="Dragon">Dragon</option>
                <option value="Colorless">Colorless</option>
              </select>
            </div>

            {/* Set Filter */}
            <div>
              <label
                className={`block text-sm font-medium ${theme.colors.text.secondary} mb-2`}
              >
                Set
              </label>
              <select
                value={selectedFilters.set}
                onChange={(e) => handleFilterChange("set", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${theme.colors.background.main} border ${theme.colors.border.accent} ${theme.colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              >
                <option value="">All Sets</option>
                {availableSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={clearFilters}
                className={`w-full px-4 py-2 rounded-lg ${theme.colors.button.secondary} text-sm font-medium`}
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={clearAll}
                className={`w-full px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium`}
              >
                Clear All & Reset
              </button>
            </div>

            {/* Active Filters Summary */}
            {(selectedFilters.rarity ||
              selectedFilters.type ||
              selectedFilters.set) && (
              <div
                className={`p-3 rounded-lg ${theme.colors.background.card} border ${theme.colors.border.accent}`}
              >
                <h4
                  className={`text-sm font-medium ${theme.colors.text.primary} mb-2`}
                >
                  Active Filters:
                </h4>
                <div className="space-y-1 text-xs">
                  {selectedFilters.rarity && (
                    <div className={theme.colors.text.secondary}>
                      Rarity: {selectedFilters.rarity}
                    </div>
                  )}
                  {selectedFilters.type && (
                    <div className={theme.colors.text.secondary}>
                      Type: {selectedFilters.type}
                    </div>
                  )}
                  {selectedFilters.set && (
                    <div className={theme.colors.text.secondary}>
                      Set:{" "}
                      {availableSets.find((s) => s.id === selectedFilters.set)
                        ?.name || selectedFilters.set}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

CardSearch.propTypes = {
  onAddCard: PropTypes.func.isRequired,
  onAddToClipboard: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CardSearch;

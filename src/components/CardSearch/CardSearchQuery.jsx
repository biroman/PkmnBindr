import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useTheme } from "../../theme/ThemeContent";
import { useCardSearch, useSets } from "../../hooks";
import logger from "../../utils/logger";

// Sub-components
import SearchHeader from "./SearchHeader";
import SearchResults from "./SearchResults";
import SearchFilters from "./SearchFilters";

// Storage key for persisting search state
const SEARCH_STATE_KEY = "pkmnbinder_card_search_state";

const CardSearchQuery = ({ onAddCard, onAddToClipboard, isOpen, onClose }) => {
  const { theme } = useTheme();

  // Load initial state from localStorage
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(SEARCH_STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        return {
          searchQuery: state.searchQuery || "",
          selectedFilters: state.selectedFilters || {
            rarity: "",
            type: "",
            set: "",
          },
          scrollPosition: state.scrollPosition || 0,
        };
      }
    } catch (error) {
      logger.error("Failed to load search state:", error);
    }
    return {
      searchQuery: "",
      selectedFilters: { rarity: "", type: "", set: "" },
      scrollPosition: 0,
    };
  };

  const savedState = loadSavedState();

  // Component state
  const [searchQuery, setSearchQuery] = useState(savedState.searchQuery);
  const [selectedFilters, setSelectedFilters] = useState(
    savedState.selectedFilters
  );
  const [scrollPosition, setScrollPosition] = useState(
    savedState.scrollPosition
  );
  const [recentlyAdded, setRecentlyAdded] = useState(new Set());
  const [pulsing, setPulsing] = useState(new Set());
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [debouncedFilters, setDebouncedFilters] = useState(selectedFilters);
  const [hasSearched, setHasSearched] = useState(false);

  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Debounce search query and filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (hasSearched || searchQuery.trim()) {
        setHasSearched(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, hasSearched]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(selectedFilters);
      if (hasSearched || selectedFilters.set) {
        setHasSearched(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedFilters, hasSearched]);

  // React Query hooks
  const {
    data: searchResults = [],
    isLoading,
    error,
    isFetching,
  } = useCardSearch(debouncedQuery, debouncedFilters, {
    enabled:
      isOpen && hasSearched && (debouncedQuery.trim() || debouncedFilters.set),
  });

  const { data: availableSets = [], isLoading: setsLoading } = useSets({
    enabled: isOpen,
  });

  // Memoized sorted results
  const sortedResults = useMemo(() => {
    return [...searchResults].sort((a, b) => a.number - b.number);
  }, [searchResults]);

  // State persistence
  const saveState = useCallback(() => {
    try {
      const stateToSave = {
        searchQuery,
        selectedFilters,
        scrollPosition,
      };
      localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      logger.error("Failed to save search state:", error);
    }
  }, [searchQuery, selectedFilters, scrollPosition]);

  useEffect(() => {
    saveState();
  }, [searchQuery, selectedFilters, scrollPosition]);

  // Modal lifecycle effects
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setTimeout(() => {
        if (resultsRef.current && scrollPosition > 0) {
          resultsRef.current.scrollTop = scrollPosition;
        }
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setHasSearched(false);
      if (resultsRef.current) {
        setScrollPosition(resultsRef.current.scrollTop);
      }
    }
  }, [isOpen]);

  // Scroll position tracking
  useEffect(() => {
    let scrollTimeout;
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (resultsRef.current) {
          setScrollPosition(resultsRef.current.scrollTop);
        }
      }, 150);
    };

    const resultsElement = resultsRef.current;
    if (resultsElement && isOpen) {
      resultsElement.addEventListener("scroll", handleScroll);
      return () => {
        resultsElement.removeEventListener("scroll", handleScroll);
        if (scrollTimeout) clearTimeout(scrollTimeout);
      };
    }
  }, [isOpen]);

  // Event handlers
  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...selectedFilters, [filterType]: value };
    setSelectedFilters(newFilters);
    if (value) {
      setHasSearched(true);
    }
  };

  const handleClearFilters = () => {
    setSelectedFilters({ rarity: "", type: "", set: "" });
    setScrollPosition(0);
  };

  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedFilters({ rarity: "", type: "", set: "" });
    setScrollPosition(0);
    setHasSearched(false);
    localStorage.removeItem(SEARCH_STATE_KEY);
  };

  const handleAddCard = (card, isReverseHolo = false) => {
    const cardToAdd = {
      ...card,
      isReverseHolo,
      id: isReverseHolo ? `${card.id}_reverse` : card.id,
    };

    const cardKey = `${card.id}_${isReverseHolo ? "rh" : "normal"}`;

    // Visual feedback
    setPulsing((prev) => new Set([...prev, cardKey]));
    setTimeout(() => {
      setPulsing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
    }, 200);

    const success = onAddCard(cardToAdd);
    if (success !== false) {
      setRecentlyAdded((prev) => new Set([...prev, cardKey]));
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

    setPulsing((prev) => new Set([...prev, cardKey]));
    setTimeout(() => {
      setPulsing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
    }, 200);

    const success = onAddToClipboard(cardToAdd);
    if (success !== false) {
      setRecentlyAdded((prev) => new Set([...prev, cardKey]));
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
          <SearchHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearch}
            onClose={onClose}
            isLoading={isLoading}
            isFetching={isFetching}
            searchInputRef={searchInputRef}
          />

          {/* Results Area */}
          <div ref={resultsRef} className="flex-1 overflow-y-auto p-6">
            <SearchResults
              isLoading={isLoading}
              error={error}
              searchResults={sortedResults}
              searchQuery={searchQuery}
              selectedFilters={selectedFilters}
              onAddCard={handleAddCard}
              onAddToClipboard={handleAddToClipboard}
              recentlyAdded={recentlyAdded}
              pulsing={pulsing}
              resultsRef={resultsRef}
            />
          </div>
        </div>

        {/* Filters Sidebar */}
        <SearchFilters
          selectedFilters={selectedFilters}
          onFilterChange={handleFilterChange}
          availableSets={availableSets}
          setsLoading={setsLoading}
          onClearFilters={handleClearFilters}
          onClearAll={handleClearAll}
        />
      </div>
    </div>
  );
};

CardSearchQuery.propTypes = {
  onAddCard: PropTypes.func.isRequired,
  onAddToClipboard: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CardSearchQuery;

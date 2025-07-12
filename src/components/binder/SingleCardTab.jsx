import { useState, useRef, useEffect, Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { ChevronRight } from "lucide-react";
import useCardSearch from "../../hooks/useCardSearch";
import PokemonCard from "../PokemonCard";
import DraggableSearchCard from "./DraggableSearchCard";
import SortDropdown from "../ui/SortDropdown";

const SearchFilters = ({
  filters,
  availableTypes,
  availableSets,
  availableRarities,
  onFilterChange,
  isMobile,
  hasActiveFilters,
  onVisibilityChange = () => {},
}) => {
  // State for mobile modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for temporary filter selections
  const [tempFilters, setTempFilters] = useState(filters);

  // Keep temp filters in sync with external changes
  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  const handleTempFilterChange = (key, value) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = (close) => {
    Object.keys(tempFilters).forEach((key) => {
      onFilterChange(key, tempFilters[key]);
    });
    if (close) close();
  };

  const handleClearAndApplyFilters = (close) => {
    const cleared = { name: "", set: "", rarity: "", types: [] };
    setTempFilters(cleared);
    Object.keys(cleared).forEach((key) => {
      onFilterChange(key, cleared[key]);
    });
    if (close) close();
  };

  const renderFilterControls = (isPopover = false) => (
    <div
      className={`space-y-4 ${
        isPopover ? "p-4" : "flex-1 overflow-y-auto p-4"
      }`}
    >
      {/* Types */}
      <div>
        <label className="block text-sm font-medium text-primary mb-2">
          Type
        </label>
        <select
          value={tempFilters.types?.[0] || ""}
          onChange={(e) =>
            handleTempFilterChange(
              "types",
              e.target.value ? [e.target.value] : []
            )
          }
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card-background text-primary"
        >
          <option value="">All Types</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Set */}
      <div>
        <label className="block text-sm font-medium text-primary mb-2">
          Set
        </label>
        <select
          value={tempFilters.set}
          onChange={(e) => handleTempFilterChange("set", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card-background text-primary"
        >
          <option value="">All Sets</option>
          {availableSets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </select>
      </div>

      {/* Rarity */}
      <div>
        <label className="block text-sm font-medium text-primary mb-2">
          Rarity
        </label>
        <select
          value={tempFilters.rarity}
          onChange={(e) => handleTempFilterChange("rarity", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card-background text-primary"
        >
          <option value="">All Rarities</option>
          {availableRarities.map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderFilterButton = (onClick) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
        hasActiveFilters ? "text-blue-600 dark:text-blue-400" : "text-primary"
      }`}
    >
      <FunnelIcon className="w-4 h-4" />
      <span>Filters</span>
      {hasActiveFilters && (
        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <>
        {renderFilterButton(() => {
          setIsModalOpen(true);
          onVisibilityChange(true);
        })}
        {isModalOpen && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
              onClick={() => {
                setIsModalOpen(false);
                onVisibilityChange(false);
              }}
            />
            <div className="fixed inset-x-4 bottom-0 top-20 bg-card-background rounded-t-2xl shadow-2xl z-[60] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-primary">Filters</h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    onVisibilityChange(false);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
              {renderFilterControls()}
              <div className="flex items-center gap-3 p-4 border-t border-border">
                <button
                  onClick={() => {
                    handleClearAndApplyFilters(() => setIsModalOpen(false));
                    onVisibilityChange(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    handleApplyFilters(() => setIsModalOpen(false));
                    onVisibilityChange(false);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Desktop Popover implementation
  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button as={Fragment}>{renderFilterButton()}</Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-30 mt-3 w-80 max-w-sm transform -translate-x-1/2 left-1/2 sm:px-0">
              <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black ring-opacity-5 bg-card-background">
                <div className="p-4 border-b border-border">
                  <h3 className="text-base font-semibold text-primary">
                    Filters
                  </h3>
                </div>
                {renderFilterControls(true)}
                <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-border">
                  <button
                    onClick={() => handleClearAndApplyFilters(close)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => handleApplyFilters(close)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

const SingleCardTab = ({
  selectedMap = {},
  onCardSelect,
  isCardSelected,
  onIncrease,
  onDecrease,
  compact = false,
  onSearchFocusChange = () => {},
  onFiltersVisibilityChange = () => {},
}) => {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const searchInputRef = useRef(null);
  // Detect mobile screen (matches Tailwind sm breakpoint)
  const isMobileScreen = window.matchMedia("(max-width: 639px)").matches;
  const debounceRef = useRef(null);

  const {
    searchQuery,
    filters,
    orderBy,
    cards,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    featuredCards,
    featuredLoading,
    availableTypes,
    availableSets,
    availableRarities,
    loadMoreCards,
    updateFilter,
    updateSearchQuery,
    setOrderBy,
    hasActiveFilters,
    isEmpty,
    showFeatured,
    performSearch,
  } = useCardSearch();

  // Infinite scroll setup
  const sentinelRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    // Only observe when we can load more and we're not showing featured
    if (!hasMore || showFeatured) return;

    const observerOptions = {
      root: resultsRef.current,
      rootMargin: "300px", // start loading a bit before bottom
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && !isLoadingMore && !isLoading) {
        loadMoreCards();
      }
    }, observerOptions);

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) observer.observe(currentSentinel);

    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, isLoading, loadMoreCards, showFeatured]);

  // Focus search input when tab becomes active
  useEffect(() => {
    // Auto-focus only on larger screens to avoid hiding action buttons on mobile
    if (!isMobileScreen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isMobileScreen]);

  // Trigger search when sorting changes (if there are existing results or active filters)
  useEffect(() => {
    if (orderBy && (cards.length > 0 || hasActiveFilters)) {
      performSearch();
    }
  }, [orderBy]);

  // Debounced search on mobile when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Avoid triggering empty searches without filters
    if (!searchQuery && !hasActiveFilters) return;

    debounceRef.current = setTimeout(() => {
      performSearch();
    }, 500); // 500ms debounce delay

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, isMobileScreen]);

  // Handle Enter key press in search input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  };

  const displayCards = showFeatured ? featuredCards : cards;
  const displayLoading = showFeatured ? featuredLoading : isLoading;

  return (
    <div className={`flex flex-col h-full`}>
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Search Bar */}
        <div
          className={`${
            compact ? "p-2" : "p-3 sm:p-6"
          } border-b border-border sticky top-0 bg-card-background z-20`}
        >
          <div className="flex gap-2 mb-2 sm:mb-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon
                className={`${
                  compact ? "w-4 h-4 left-2 top-2.5" : "w-5 h-5 left-3 top-3"
                } absolute text-slate-400 dark:text-slate-500`}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => updateSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => onSearchFocusChange(true)}
                onBlur={() => onSearchFocusChange(false)}
                placeholder="Search Pokemon cards"
                className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card-background text-primary ${
                  compact
                    ? "pl-8 pr-3 py-1.5 text-xs"
                    : "pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base"
                }`}
              />
            </div>
            {/* Large search button hidden on mobile */}
            {!compact && (
              <button
                onClick={performSearch}
                disabled={!searchQuery && !hasActiveFilters}
                className="hidden sm:flex px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors items-center gap-2 font-medium"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
                Search
              </button>
            )}
          </div>

          {/* Sort and Results Info Bar */}
          <div
            className={`flex gap-2 text-xs ${
              compact
                ? "flex-row items-center justify-between"
                : "flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3 text-sm"
            }`}
          >
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-primary whitespace-nowrap">
                Sort by:
              </label>
              <SortDropdown value={orderBy} onChange={setOrderBy} />

              <SearchFilters
                filters={filters}
                availableTypes={availableTypes}
                availableSets={availableSets}
                availableRarities={availableRarities}
                onFilterChange={updateFilter}
                isMobile={isMobileScreen}
                hasActiveFilters={hasActiveFilters}
                onVisibilityChange={onFiltersVisibilityChange}
              />
            </div>

            {/* Results Count */}
            {(totalCount > 0 || cards.length > 0) && (
              <div className="text-sm text-secondary whitespace-nowrap">
                {showFeatured ? (
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    Featured Cards
                  </span>
                ) : (
                  <span>
                    {isLoading ? (
                      "Searching..."
                    ) : (
                      <>
                        <span className="font-medium">
                          {totalCount.toLocaleString()}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {" "}
                          cards found
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters are now always in a modal */}
        {/* Results */}
        <div
          ref={resultsRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
        >
          <div className="p-4 sm:p-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="text-red-800 dark:text-red-200 font-medium">
                  Search Error
                </div>
                <div className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              </div>
            )}

            {displayLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-secondary">Searching for cards...</div>
              </div>
            )}

            {isEmpty && (
              <div className="text-center py-8">
                <div className="text-slate-400 dark:text-slate-500 text-lg mb-2">
                  No cards found
                </div>
                <div className="text-secondary text-sm">
                  Try adjusting your search terms or filters
                </div>
              </div>
            )}

            {displayCards.length > 0 && (
              <div>
                <div
                  className={`grid gap-2 ${
                    compact
                      ? "grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 sm:gap-3"
                  }`}
                >
                  {displayCards.map((card) => (
                    <div key={card.id} className="relative">
                      {compact ? (
                        <DraggableSearchCard card={card} />
                      ) : (
                        <PokemonCard
                          card={card}
                          onClick={() => onCardSelect(card)}
                          className={`cursor-pointer transition-all ${
                            isCardSelected(card.id)
                              ? "ring-2 ring-blue-500 scale-105"
                              : "hover:scale-105"
                          }`}
                        />
                      )}
                      {isCardSelected(card.id) && (
                        <>
                          <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg pointer-events-none" />
                          {/* Quantity badge */}
                          <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded shadow">
                            {selectedMap[card.id]?.count || 1}
                          </div>
                          {/* Plus / Minus - Mobile optimized */}
                          <div className="absolute bottom-1 right-1 flex flex-col gap-1 z-20 sm:gap-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onIncrease(card);
                              }}
                              className="w-8 h-8 sm:w-6 sm:h-6 bg-white/95 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-100 dark:hover:bg-slate-600 hover:scale-110 active:scale-95 transition-all duration-150 border border-white/20"
                              aria-label="Increase quantity"
                            >
                              <PlusIcon className="w-5 h-5 sm:w-4 sm:h-4 stroke-2" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDecrease(card);
                              }}
                              className="w-8 h-8 sm:w-6 sm:h-6 bg-white/95 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full flex items-center justify-center shadow-lg hover:bg-red-100 dark:hover:bg-slate-600 hover:scale-110 active:scale-95 transition-all duration-150 border border-white/20"
                              aria-label="Decrease quantity"
                            >
                              <MinusIcon className="w-5 h-5 sm:w-4 sm:h-4 stroke-2" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {hasMore && !showFeatured && (
                  <div
                    ref={sentinelRef}
                    className="w-full flex items-center justify-center py-6"
                  >
                    {isLoadingMore && (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleCardTab;

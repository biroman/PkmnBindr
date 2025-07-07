import { useState, useRef, useEffect } from "react";
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
  isExpanded,
  onToggle,
  isSidebarMode = false,
  showToggleButton = true,
}) => {
  // State for mobile modal filters (temporary until saved)
  const [tempFilters, setTempFilters] = useState(filters);

  // Update temp filters when actual filters change (from external updates)
  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  // Handle temp filter changes in modal
  const handleTempFilterChange = (key, value) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save filters and close modal
  const handleSaveFilters = () => {
    Object.keys(tempFilters).forEach((key) => {
      onFilterChange(key, tempFilters[key]);
    });
    onToggle(); // Close modal
  };

  // Cancel and revert to original filters
  const handleCancelFilters = () => {
    setTempFilters(filters); // Revert to original
    onToggle(); // Close modal
  };

  // Clear all temp filters
  const handleClearTempFilters = () => {
    setTempFilters({
      name: "",
      types: [],
      set: "",
      rarity: "",
    });
  };

  if (isSidebarMode) {
    // Desktop sidebar layout - always expanded
    return (
      <div className="bg-secondary border-l border-border p-4 w-80 flex-shrink-0">
        <div className="mb-4">
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <FunnelIcon className="w-5 h-5" />
            Filters
            {Object.values(filters).some(
              (f) => f && (Array.isArray(f) ? f.length > 0 : true)
            ) && (
              <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Types */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Type
            </label>
            <select
              value={filters.types[0] || ""}
              onChange={(e) =>
                onFilterChange("types", e.target.value ? [e.target.value] : [])
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
              value={filters.set}
              onChange={(e) => onFilterChange("set", e.target.value)}
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
              value={filters.rarity}
              onChange={(e) => onFilterChange("rarity", e.target.value)}
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

          {/* Clear Filters Button */}
          {Object.values(filters).some(
            (f) => f && (Array.isArray(f) ? f.length > 0 : true)
          ) && (
            <button
              onClick={() => {
                onFilterChange("name", "");
                onFilterChange("types", []);
                onFilterChange("set", "");
                onFilterChange("rarity", "");
              }}
              className="w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mobile layout - popup modal
  return (
    <>
      {/* Filter toggle button */}
      {showToggleButton && (
        <div className="border-b border-border">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="font-medium text-primary">Filters</span>
              {Object.values(filters).some(
                (f) => f && (Array.isArray(f) ? f.length > 0 : true)
              ) && (
                <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center text-slate-400 dark:text-slate-500">
              <span className="text-sm mr-2">Tap to filter</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}

      {/* Modal Popup */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleCancelFilters}
          />

          {/* Modal Content */}
          <div className="fixed inset-x-4 bottom-4 top-20 bg-card-background rounded-xl shadow-2xl z-50 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-primary">Filters</h3>
              <button
                onClick={handleCancelFilters}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Types */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Type
                </label>
                <select
                  value={tempFilters.types[0] || ""}
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
                  onChange={(e) =>
                    handleTempFilterChange("set", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleTempFilterChange("rarity", e.target.value)
                  }
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

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t border-border">
              <button
                onClick={handleClearTempFilters}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleCancelFilters}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-border rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilters}
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
};

const SingleCardTab = ({
  selectedMap = {},
  onCardSelect,
  isCardSelected,
  onIncrease,
  onDecrease,
  compact = false,
}) => {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const searchInputRef = useRef(null);

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

  // Focus search input when tab becomes active
  useEffect(() => {
    if (searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, []);

  // Trigger search when sorting changes (if there are existing results or active filters)
  useEffect(() => {
    if (orderBy && (cards.length > 0 || hasActiveFilters)) {
      performSearch();
    }
  }, [orderBy]);

  // Handle Enter key press in search input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  };

  const displayCards = showFeatured ? featuredCards : cards;
  const displayLoading = showFeatured ? featuredLoading : isLoading;

  return (
    <div className={`flex flex-col h-full ${compact ? "" : "lg:flex-row"}`}>
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

              {compact && (
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className="flex items-center gap-1 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <FunnelIcon className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && <span className="text-blue-600">•</span>}
                </button>
              )}
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

        {/* Mobile/Tablet Filters (show on lg screens and below) */}
        <div className={`${compact ? "" : "lg:hidden"}`}>
          <SearchFilters
            filters={filters}
            availableTypes={availableTypes}
            availableSets={availableSets}
            availableRarities={availableRarities}
            onFilterChange={updateFilter}
            isExpanded={filtersExpanded}
            onToggle={() => setFiltersExpanded(!filtersExpanded)}
            showToggleButton={!compact}
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
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
                      : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 sm:gap-3"
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
                          {/* Plus / Minus */}
                          <div className="absolute bottom-1 right-1 flex flex-col gap-0.5 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onIncrease(card);
                              }}
                              className="w-6 h-6 bg-white/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full flex items-center justify-center shadow hover:bg-blue-100 dark:hover:bg-slate-600"
                              aria-label="Increase quantity"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDecrease(card);
                              }}
                              className="w-6 h-6 bg-white/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full flex items-center justify-center shadow hover:bg-blue-100 dark:hover:bg-slate-600"
                              aria-label="Decrease quantity"
                            >
                              <MinusIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {hasMore && !showFeatured && (
                  <div className="text-center pt-6">
                    <button
                      onClick={loadMoreCards}
                      disabled={isLoadingMore}
                      className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoadingMore ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar Filters hidden when compact */}
      {!compact && (
        <div className="hidden lg:block">
          <SearchFilters
            filters={filters}
            availableTypes={availableTypes}
            availableSets={availableSets}
            availableRarities={availableRarities}
            onFilterChange={updateFilter}
            isSidebarMode={true}
          />
        </div>
      )}
    </div>
  );
};

export default SingleCardTab;

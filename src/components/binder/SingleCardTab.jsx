import { useState, useRef, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import useCardSearch from "../../hooks/useCardSearch";
import PokemonCard from "../PokemonCard";

const SearchFilters = ({
  filters,
  availableTypes,
  availableSets,
  availableRarities,
  onFilterChange,
  isExpanded,
  onToggle,
}) => {
  return (
    <div className="border-b border-slate-200">
      {/* Filter toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <FunnelIcon className="w-5 h-5 text-slate-600" />
          <span className="font-medium text-slate-800">Filters</span>
          {Object.values(filters).some(
            (f) => f && (Array.isArray(f) ? f.length > 0 : true)
          ) && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
        <div
          className={`transform transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Filter options */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pokemon Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pokemon Name
              </label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => onFilterChange("name", e.target.value)}
                placeholder="e.g., Charizard"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Types */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type
              </label>
              <select
                value={filters.types[0] || ""}
                onChange={(e) =>
                  onFilterChange(
                    "types",
                    e.target.value ? [e.target.value] : []
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Set
              </label>
              <select
                value={filters.set}
                onChange={(e) => onFilterChange("set", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Sets</option>
                {availableSets.slice(0, 20).map((set) => (
                  <option key={set.id} value={set.name}>
                    {set.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rarity */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rarity
              </label>
              <select
                value={filters.rarity}
                onChange={(e) => onFilterChange("rarity", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Rarities</option>
                {availableRarities.slice(0, 10).map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SingleCardTab = ({ selectedCards, onCardSelect, isCardSelected }) => {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const searchInputRef = useRef(null);

  const {
    searchQuery,
    filters,
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
    hasActiveFilters,
    isEmpty,
    showFeatured,
  } = useCardSearch();

  // Focus search input when tab becomes active
  useEffect(() => {
    if (searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, []);

  const displayCards = showFeatured ? featuredCards : cards;
  const displayLoading = showFeatured ? featuredLoading : isLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-6 border-b border-slate-200">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            placeholder="Search for Pokemon cards..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Quick searches */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-sm text-slate-600 mr-2">Quick search:</span>
          {["Charizard", "Pikachu", "Mewtwo", "Lucario"].map((pokemon) => (
            <button
              key={pokemon}
              onClick={() => updateSearchQuery(pokemon)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm transition-colors"
            >
              {pokemon}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <SearchFilters
        filters={filters}
        availableTypes={availableTypes}
        availableSets={availableSets}
        availableRarities={availableRarities}
        onFilterChange={updateFilter}
        isExpanded={filtersExpanded}
        onToggle={() => setFiltersExpanded(!filtersExpanded)}
      />

      {/* Results */}
      <div className="flex-1 p-6 overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-red-800 font-medium">Search Error</div>
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}

        {displayLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-slate-600">Searching for cards...</div>
          </div>
        )}

        {isEmpty && (
          <div className="text-center py-8">
            <div className="text-slate-400 text-lg mb-2">No cards found</div>
            <div className="text-slate-500 text-sm">
              Try adjusting your search terms or filters
            </div>
          </div>
        )}

        {displayCards.length > 0 && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {displayCards.map((card) => (
                <div key={card.id} className="relative">
                  <PokemonCard
                    card={card}
                    onClick={() => onCardSelect(card)}
                    className={`cursor-pointer transition-all ${
                      isCardSelected(card.id)
                        ? "ring-2 ring-blue-500 scale-105"
                        : "hover:scale-105"
                    }`}
                  />
                  {isCardSelected(card.id) && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasMore && !showFeatured && (
              <div className="text-center pt-6">
                <button
                  onClick={loadMoreCards}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SingleCardTab;

import { useState, useRef, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import useCardSearch from "../hooks/useCardSearch";
import PokemonCard from "./PokemonCard";

// Search filters component
const SearchFilters = ({
  filters,
  availableTypes,
  availableSets,
  availableRarities,
  onFilterChange,
  onReset,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      {/* Filter toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
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
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Types */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Types
              </label>
              <select
                multiple
                value={filters.types}
                onChange={(e) =>
                  onFilterChange(
                    "types",
                    Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    )
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                size="3"
              >
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Supertype */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Supertype
              </label>
              <select
                value={filters.supertype}
                onChange={(e) => onFilterChange("supertype", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="Pokémon">Pokémon</option>
                <option value="Trainer">Trainer</option>
                <option value="Energy">Energy</option>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Sets</option>
                {availableSets.map((set) => (
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
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Rarities</option>
                {availableRarities.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity}
                  </option>
                ))}
              </select>
            </div>

            {/* Artist */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Artist
              </label>
              <input
                type="text"
                value={filters.artist}
                onChange={(e) => onFilterChange("artist", e.target.value)}
                placeholder="e.g., Ken Sugimori"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter actions */}
          <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={onReset}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main card search component
const CardSearch = ({ onCardSelect, selectedCards = [], className = "" }) => {
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
    searchCards,
    loadMoreCards,
    resetSearch,
    searchByPokemon,
    updateFilter,
    updateSearchQuery,
    setOrderBy,
    hasActiveFilters,
    isEmpty,
    showFeatured,
  } = useCardSearch();

  const [quickSearches] = useState([
    "Charizard",
    "Pikachu",
    "Mewtwo",
    "Lucario",
    "Gardevoir",
    "Rayquaza",
  ]);

  const searchInputRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCards();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreCards]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchCards({ resetResults: true });
  };

  const handleQuickSearch = (pokemonName) => {
    updateSearchQuery(pokemonName);
    searchByPokemon(pokemonName);
  };

  const handleFilterChange = (filterName, value) => {
    updateFilter(filterName, value);
  };

  const handleResetFilters = () => {
    resetSearch();
  };

  const handleCardClick = (card) => {
    onCardSelect?.(card);
  };

  const isCardSelected = (cardId) => {
    return selectedCards.some((card) => card.id === cardId);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Pokemon Card Search
        </h2>

        {/* Main search bar */}
        <form onSubmit={handleSearchSubmit} className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => updateSearchQuery(e.target.value)}
              placeholder="Search for Pokemon cards..."
              className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => updateSearchQuery("")}
                className="absolute right-3 top-3 p-1 hover:bg-slate-100 rounded"
              >
                <XMarkIcon className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </form>

        {/* Quick searches */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-slate-600 mr-2">Quick search:</span>
          {quickSearches.map((pokemon) => (
            <button
              key={pokemon}
              onClick={() => handleQuickSearch(pokemon)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm transition-colors"
            >
              {pokemon}
            </button>
          ))}
        </div>

        {/* Sort and results info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-600">Sort by:</label>
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="-set.releaseDate">Newest First</option>
                <option value="set.releaseDate">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="-name">Name Z-A</option>
                <option value="-hp">HP High-Low</option>
                <option value="hp">HP Low-High</option>
              </select>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="text-sm text-slate-600">
              Found {totalCount.toLocaleString()} cards
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <SearchFilters
        filters={filters}
        availableTypes={availableTypes}
        availableSets={availableSets}
        availableRarities={availableRarities}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Results */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="text-red-800 font-medium">Search Error</div>
              <button
                onClick={() => searchCards({ resetResults: true })}
                className="text-red-600 hover:text-red-800"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-slate-600">Searching for cards...</div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-12">
            <div className="text-slate-400 text-lg mb-2">No cards found</div>
            <div className="text-slate-500 text-sm mb-4">
              Try adjusting your search terms or filters
            </div>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Featured cards */}
        {showFeatured && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Featured Cards
            </h3>
            {featuredLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[5/7] bg-slate-200 animate-pulse rounded-lg"
                  ></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {featuredCards.map((card) => (
                  <PokemonCard
                    key={card.id}
                    card={card}
                    onClick={handleCardClick}
                    showAddButton={true}
                    className={
                      isCardSelected(card.id) ? "ring-2 ring-blue-500" : ""
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search results */}
        {cards.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Search Results{" "}
              {totalCount > 0 && `(${totalCount.toLocaleString()})`}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {cards.map((card) => (
                <PokemonCard
                  key={card.id}
                  card={card}
                  onClick={handleCardClick}
                  showAddButton={true}
                  className={
                    isCardSelected(card.id) ? "ring-2 ring-blue-500" : ""
                  }
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div ref={loadMoreRef} className="text-center pt-8">
                {isLoadingMore ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                ) : (
                  <button
                    onClick={loadMoreCards}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Load More Cards
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardSearch;

import { useState, useEffect, useCallback, useMemo } from "react";
import { pokemonTcgApi, normalizeCardData } from "../services/pokemonTcgApi";
import { useCardCache } from "../contexts/CardCacheContext";

// Custom hook for Pokemon card search functionality
const useCardSearch = () => {
  // Card cache
  const { addCardsToCache } = useCardCache();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    name: "",
    types: [],
    supertype: "",
    subtypes: [],
    set: "",
    rarity: "",
    artist: "",
  });
  const [orderBy, setOrderBy] = useState("");

  // Results state
  const [cards, setCards] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Featured/initial cards
  const [featuredCards, setFeaturedCards] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  // Available filter options
  const [availableTypes, setAvailableTypes] = useState([]);
  const [availableSets, setAvailableSets] = useState([]);
  const [availableRarities, setAvailableRarities] = useState([]);
  const [availableSubtypes, setAvailableSubtypes] = useState([]);
  const [availableSupertypes, setAvailableSupertypes] = useState([]);

  // Load filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [types, sets, rarities, subtypes, supertypes] = await Promise.all(
          [
            pokemonTcgApi.getTypes(),
            pokemonTcgApi.getSets(),
            pokemonTcgApi.getRarities(),
            pokemonTcgApi.getSubtypes(),
            pokemonTcgApi.getSupertypes(),
          ]
        );

        setAvailableTypes(types);
        setAvailableSets(sets); // Show all available sets
        setAvailableRarities(rarities);
        setAvailableSubtypes(subtypes);
        setAvailableSupertypes(supertypes);
      } catch (error) {
        console.error("Failed to load filter options:", error);
      }
    };

    loadFilterOptions();
  }, []);

  // Load featured cards on mount
  useEffect(() => {
    const loadFeaturedCards = async () => {
      try {
        setFeaturedLoading(true);
        const featured = await pokemonTcgApi.getFeaturedCards(12);
        const normalizedFeatured = featured.map(normalizeCardData);

        // Add featured cards to cache
        addCardsToCache(normalizedFeatured);

        setFeaturedCards(normalizedFeatured);
      } catch (error) {
        console.error("Failed to load featured cards:", error);
      } finally {
        setFeaturedLoading(false);
      }
    };

    loadFeaturedCards();
  }, []);

  // Search function
  const searchCards = useCallback(
    async (options = {}) => {
      const { resetResults = true, page = 1, loadMore = false } = options;

      try {
        if (loadMore) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setError(null);
        }

        const searchParams = {
          query: searchQuery,
          page,
          pageSize,
          orderBy,
          filters: {
            ...filters,
            // Clean empty filters
            ...Object.fromEntries(
              Object.entries(filters).filter(
                ([_, value]) =>
                  value && (Array.isArray(value) ? value.length > 0 : true)
              )
            ),
          },
        };

        const response = await pokemonTcgApi.searchCards(searchParams);
        const normalizedCards = response.cards.map(normalizeCardData);

        // Add cards to cache
        addCardsToCache(normalizedCards);

        if (resetResults || page === 1) {
          setCards(normalizedCards);
          setCurrentPage(1);
        } else {
          // Merge and deduplicate by card.id to avoid duplicate React keys
          setCards((prev) => {
            const map = new Map();
            // Preserve existing order for previously loaded cards
            prev.forEach((card) => map.set(card.id, card));
            // Append new cards (later pages) while preventing duplicates
            normalizedCards.forEach((card) => map.set(card.id, card));
            return Array.from(map.values());
          });
          setCurrentPage(page);
        }

        setTotalCount(response.totalCount);
        setHasMore(response.hasMore);
      } catch (error) {
        console.error("Search failed:", error);
        setError(error.message);

        if (resetResults) {
          setCards([]);
          setTotalCount(0);
          setHasMore(false);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [searchQuery, filters, orderBy, pageSize]
  );

  // Fetch all cards for a query up to a limit
  const fetchAllCards = useCallback(
    async (limit) => {
      const searchParams = {
        query: searchQuery,
        page: 1,
        pageSize: limit,
        orderBy,
        filters: {
          ...filters,
          ...Object.fromEntries(
            Object.entries(filters).filter(
              ([_, value]) =>
                value && (Array.isArray(value) ? value.length > 0 : true)
            )
          ),
        },
      };

      try {
        const response = await pokemonTcgApi.searchCards(searchParams);
        const normalizedCards = response.cards.map(normalizeCardData);
        addCardsToCache(normalizedCards);
        return normalizedCards;
      } catch (error) {
        console.error("Fetch all cards failed:", error);
        setError(error.message);
        return [];
      }
    },
    [searchQuery, filters, orderBy, addCardsToCache]
  );

  // Load more results
  const loadMoreCards = useCallback(() => {
    if (!hasMore || isLoadingMore) return;

    searchCards({
      resetResults: false,
      page: currentPage + 1,
      loadMore: true,
    });
  }, [searchCards, hasMore, isLoadingMore, currentPage]);

  // Reset search
  const resetSearch = useCallback(() => {
    setSearchQuery("");
    setFilters({
      name: "",
      types: [],
      supertype: "",
      subtypes: [],
      set: "",
      rarity: "",
      artist: "",
    });
    setCards([]);
    setTotalCount(0);
    setCurrentPage(1);
    setHasMore(false);
    setError(null);
  }, []);

  // Quick search by Pokemon name
  const searchByPokemon = useCallback(
    async (pokemonName) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await pokemonTcgApi.searchByPokemon(
          pokemonName,
          pageSize
        );
        const normalizedCards = response.cards.map(normalizeCardData);

        // Add cards to cache
        addCardsToCache(normalizedCards);

        setCards(normalizedCards);
        setTotalCount(response.totalCount);
        setCurrentPage(1);
        setHasMore(response.hasMore);
        setSearchQuery(pokemonName);
        setFilters((prev) => ({ ...prev, name: pokemonName }));
      } catch (error) {
        console.error("Pokemon search failed:", error);
        setError(error.message);
        setCards([]);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize]
  );

  // Get individual card details
  const getCardDetails = useCallback(
    async (cardId) => {
      try {
        const card = await pokemonTcgApi.getCard(cardId);
        const normalizedCard = normalizeCardData(card);

        // Add card to cache
        addCardsToCache([normalizedCard]);

        return normalizedCard;
      } catch (error) {
        console.error("Failed to get card details:", error);
        throw error;
      }
    },
    [addCardsToCache]
  );

  // Update filters
  const updateFilter = useCallback((filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  }, []);

  // Update search query
  const updateSearchQuery = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Manual search function
  const performSearch = useCallback(() => {
    if (
      searchQuery ||
      Object.values(filters).some(
        (value) => value && (Array.isArray(value) ? value.length > 0 : true)
      )
    ) {
      searchCards({ resetResults: true });
    }
  }, [searchCards, searchQuery, filters]);

  // Auto-search only for filters changes, not searchQuery
  useEffect(() => {
    // Run immediately (no debounce) when filters change.
    if (
      Object.values(filters).some(
        (value) => value && (Array.isArray(value) ? value.length > 0 : true)
      )
    ) {
      searchCards({ resetResults: true });
    }
  }, [searchCards, filters]); // Removed searchQuery from dependencies

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return (
      Object.values(filters).some(
        (value) => value && (Array.isArray(value) ? value.length > 0 : true)
      ) || searchQuery
    );
  }, [filters, searchQuery]);

  const isEmpty = useMemo(() => {
    return !isLoading && cards.length === 0 && hasActiveFilters;
  }, [isLoading, cards.length, hasActiveFilters]);

  const showFeatured = useMemo(() => {
    return !hasActiveFilters && !isLoading && cards.length === 0;
  }, [hasActiveFilters, isLoading, cards.length]);

  return {
    // Search state
    searchQuery,
    filters,
    orderBy,

    // Results
    cards,
    totalCount,
    currentPage,
    pageSize,
    hasMore,

    // Loading and error
    isLoading,
    isLoadingMore,
    error,

    // Featured cards
    featuredCards,
    featuredLoading,

    // Filter options
    availableTypes,
    availableSets,
    availableRarities,
    availableSubtypes,
    availableSupertypes,

    // Actions
    searchCards,
    loadMoreCards,
    resetSearch,
    searchByPokemon,
    getCardDetails,
    updateFilter,
    updateSearchQuery,
    setOrderBy,
    setPageSize,

    // Computed
    hasActiveFilters,
    isEmpty,
    showFeatured,

    // Manual search
    performSearch,
    fetchAllCards,
  };
};

export default useCardSearch;

import { useState, useEffect, useCallback, useMemo } from "react";
import { pokemonTcgApi, normalizeCardData } from "../services/pokemonTcgApi";
import { useCardCache } from "../contexts/CardCacheContext";

// In-memory cache for locally fetched set card files to avoid duplicate network hits across components
const localSetCache = new Map();

const useSetSearch = () => {
  const { addCardsToCache } = useCardCache();
  const [sets, setSets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSets, setFilteredSets] = useState([]);

  // Grouped sets for accordion view
  const groupedSets = useMemo(() => {
    if (!filteredSets) return {};

    // First, group by series
    const bySeries = filteredSets.reduce((acc, set) => {
      const seriesName = set.series || "Other"; // Fallback for sets with no series
      if (!acc[seriesName]) {
        acc[seriesName] = [];
      }
      acc[seriesName].push(set);
      return acc;
    }, {});

    // Sort the sets inside each series by releaseDate (latest first)
    Object.keys(bySeries).forEach((series) => {
      bySeries[series].sort(
        (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)
      );
    });

    // Then, sort series by the latest release date within each series
    const sortedSeriesNames = Object.keys(bySeries).sort((a, b) => {
      const latestA = new Date(bySeries[a][0].releaseDate).getTime();
      const latestB = new Date(bySeries[b][0].releaseDate).getTime();
      return latestB - latestA; // Descending order
    });

    // Reconstruct the object with sorted keys
    const sortedGroupedSets = {};
    for (const seriesName of sortedSeriesNames) {
      sortedGroupedSets[seriesName] = bySeries[seriesName];
    }

    return sortedGroupedSets;
  }, [filteredSets]);

  // Load all sets on mount
  useEffect(() => {
    const loadSets = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const setsData = await pokemonTcgApi.getSets();

        console.log("First set example:", setsData[0]);

        // Add total cards count to each set if available
        const setsWithDetails = setsData.map((set) => ({
          ...set,
          cardCount: set.total || set.totalCount || set.printedTotal || 0,
          symbol: set.images?.symbol || "",
          logo: set.images?.logo || "",
        }));

        // Sort by releaseDate (latest first)
        const sortedByDate = [...setsWithDetails].sort(
          (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)
        );

        setSets(sortedByDate);
        setFilteredSets(sortedByDate);
      } catch (err) {
        console.error("Failed to load sets:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSets();
  }, []);

  // Filter sets based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSets(sets);
    } else {
      const filtered = sets.filter(
        (set) =>
          set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          set.series.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSets(filtered);
    }
  }, [searchQuery, sets]);

  // Fetch every card in a set (API is limited to 250 cards per request)
  const getSetCards = useCallback(
    async (setId) => {
      const PAGE_SIZE = 250; // API hard-cap defined in pokemonTcgApi

      // Helper: paginate through the API until all cards are received
      const fetchAllCards = async (query) => {
        let page = 1;
        let hasMore = true;
        const collected = [];

        while (hasMore) {
          const resp = await pokemonTcgApi.searchCards({
            query,
            page,
            pageSize: PAGE_SIZE,
            orderBy: "number",
          });

          if (Array.isArray(resp.cards)) {
            collected.push(...resp.cards);
          }

          hasMore = resp.hasMore;
          page += 1;

          // Safety stop to prevent infinite loops in unlikely API failure cases
          if (page > 100) {
            console.warn(
              "Pagination aborted after 100 pages for query:",
              query
            );
            break;
          }
        }

        return collected;
      };

      try {
        console.log("Fetching cards for set ID:", setId);

        if (localSetCache.has(setId)) {
          const cached = localSetCache.get(setId);
          addCardsToCache(cached);
          return cached;
        }

        try {
          const localUrl = `${
            import.meta.env.BASE_URL || "/"
          }data/en/cards/${setId}.json`;
          const localResp = await fetch(localUrl);
          if (localResp.ok) {
            const localData = await localResp.json();
            const normalizedLocal = localData.map(normalizeCardData);
            // Cache and return
            localSetCache.set(setId, normalizedLocal);
            addCardsToCache(normalizedLocal);
            return normalizedLocal;
          }
        } catch (localErr) {
          // Just warn; we'll fall back to API
          console.warn(
            `Local JSON for set ${setId} not found or invalid`,
            localErr
          );
        }

        // Primary attempt: search by set.id
        let cards = await fetchAllCards(`set.id:"${setId}"`);

        // Fallback: search by set.name if nothing returned
        if (cards.length === 0) {
          const setName = sets.find((s) => s.id === setId)?.name;
          if (setName) {
            console.log("Fallback to set.name search:", setName);
            cards = await fetchAllCards(`set.name:"${setName}"`);
          }
        }

        const normalizedCards = cards.map(normalizeCardData);

        // Cache the full set before returning
        addCardsToCache(normalizedCards);

        return normalizedCards;
      } catch (err) {
        console.error("Failed to load set cards:", err);
        throw new Error(`Failed to load cards from set: ${err.message}`);
      }
    },
    [addCardsToCache, sets]
  );

  const updateSearchQuery = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const resetSearch = useCallback(() => {
    setSearchQuery("");
    setFilteredSets(sets);
  }, [sets]);

  return {
    sets: filteredSets,
    isLoading,
    error,
    searchQuery,
    getSetCards,
    updateSearchQuery,
    resetSearch,
    totalSets: sets.length,
    filteredCount: filteredSets.length,
    groupedSets,
  };
};

export default useSetSearch;

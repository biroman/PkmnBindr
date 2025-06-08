import { useState, useEffect, useCallback } from "react";
import { pokemonTcgApi, normalizeCardData } from "../services/pokemonTcgApi";
import { useCardCache } from "../contexts/CardCacheContext";

const useSetSearch = () => {
  const { addCardsToCache } = useCardCache();
  const [sets, setSets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSets, setFilteredSets] = useState([]);

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
          cardCount: set.total || set.totalCount || 0,
          symbol: set.images?.symbol || "",
          logo: set.images?.logo || "",
        }));

        setSets(setsWithDetails);
        setFilteredSets(setsWithDetails);
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

  // Get all cards from a specific set
  const getSetCards = useCallback(
    async (setId) => {
      try {
        console.log("Fetching cards for set ID:", setId);

        // First try with set.id
        let response = await pokemonTcgApi.searchCards({
          query: `set.id:"${setId}"`,
          pageSize: 250, // Get all cards from the set
          orderBy: "number",
        });

        console.log("API response for set.id query:", response);
        console.log("Cards found with set.id:", response.cards?.length || 0);

        // If no cards found with set.id, try with set.name
        if (!response.cards || response.cards.length === 0) {
          console.log("No cards found with set.id, trying set.name...");

          // Find the set name from our sets data
          const setName = sets.find((s) => s.id === setId)?.name;
          if (setName) {
            response = await pokemonTcgApi.searchCards({
              query: `set.name:"${setName}"`,
              pageSize: 250,
              orderBy: "number",
            });
            console.log("API response for set.name query:", response);
            console.log(
              "Cards found with set.name:",
              response.cards?.length || 0
            );
          }
        }

        const normalizedCards = (response.cards || []).map(normalizeCardData);

        // Add cards to cache
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
  };
};

export default useSetSearch;

import { createContext, useContext, useState, useEffect } from "react";

// Storage key for card cache
const CARD_CACHE_KEY = "pokemon_card_cache";

// Create context
const CardCacheContext = createContext();

// Local storage utilities for card cache
const cardCacheStorage = {
  get: () => {
    try {
      const item = localStorage.getItem(CARD_CACHE_KEY);
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error("Error reading card cache from localStorage:", error);
      return {};
    }
  },

  set: (cache) => {
    try {
      localStorage.setItem(CARD_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error("Error writing card cache to localStorage:", error);
    }
  },
};

// Card Cache Provider
export const CardCacheProvider = ({ children }) => {
  const [cardCache, setCardCache] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load cache from localStorage on mount
  useEffect(() => {
    const loadCache = () => {
      try {
        const savedCache = cardCacheStorage.get();
        setCardCache(savedCache);
      } catch (error) {
        console.error("Failed to load card cache:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCache();
  }, []);

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      cardCacheStorage.set(cardCache);
    }
  }, [cardCache, isLoading]);

  // Add card to cache
  const addCardToCache = (card) => {
    if (!card || !card.id) return;

    const cacheEntry = {
      ...card,
      cachedAt: new Date().toISOString(),
      version: 1,
    };

    setCardCache((prev) => ({
      ...prev,
      [card.id]: cacheEntry,
    }));
  };

  // Add multiple cards to cache
  const addCardsToCache = (cards) => {
    if (!Array.isArray(cards)) return;

    const newCacheEntries = {};
    cards.forEach((card) => {
      if (card && card.id) {
        newCacheEntries[card.id] = {
          ...card,
          cachedAt: new Date().toISOString(),
          version: 1,
        };
      }
    });

    setCardCache((prev) => ({
      ...prev,
      ...newCacheEntries,
    }));
  };

  // Get card from cache
  const getCardFromCache = (cardId) => {
    return cardCache[cardId] || null;
  };

  // Get multiple cards from cache
  const getCardsFromCache = (cardIds) => {
    return cardIds.map((cardId) => cardCache[cardId] || null);
  };

  // Check if card exists in cache
  const isCardCached = (cardId) => {
    return !!cardCache[cardId];
  };

  // Clear entire cache
  const clearCache = () => {
    setCardCache({});
  };

  // Get cache stats
  const getCacheStats = () => {
    return {
      totalCards: Object.keys(cardCache).length,
      cacheSize: JSON.stringify(cardCache).length,
    };
  };

  const value = {
    // State
    cardCache,
    isLoading,

    // Actions
    addCardToCache,
    addCardsToCache,
    getCardFromCache,
    getCardsFromCache,
    isCardCached,
    clearCache,

    // Utilities
    getCacheStats,
  };

  return (
    <CardCacheContext.Provider value={value}>
      {children}
    </CardCacheContext.Provider>
  );
};

// Hook to use the context
export const useCardCache = () => {
  const context = useContext(CardCacheContext);
  if (!context) {
    throw new Error("useCardCache must be used within a CardCacheProvider");
  }
  return context;
};

export default CardCacheContext;

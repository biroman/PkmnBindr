// Pokemon TCG API Service
// Handles all interactions with the Pokemon TCG API (pokemontcg.io)

const BASE_URL = "https://api.pokemontcg.io/v2";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 250;

// API configuration
const API_CONFIG = {
  baseURL: BASE_URL,
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
};

// Simple cache implementation
class ApiCache {
  constructor(ttl = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

// Create cache instances
const searchCache = new ApiCache(5 * 60 * 1000); // 5 minutes for search results
const cardCache = new ApiCache(30 * 60 * 1000); // 30 minutes for individual cards
const setCache = new ApiCache(60 * 60 * 1000); // 1 hour for sets

// Rate limiting
class RateLimit {
  constructor(maxRequests = 100, windowMs = 60 * 1000) {
    // 100 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest() {
    this.requests.push(Date.now());
  }

  getTimeUntilReset() {
    if (this.requests.length === 0) return 0;
    const oldest = Math.min(...this.requests);
    return this.windowMs - (Date.now() - oldest);
  }
}

const rateLimiter = new RateLimit();

// HTTP client with error handling and retries
async function apiRequest(endpoint, options = {}) {
  const {
    params = {},
    retries = API_CONFIG.retries,
    retryDelay = API_CONFIG.retryDelay,
  } = options;

  // Check rate limit
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getTimeUntilReset();
    throw new Error(
      `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`
    );
  }

  // Build URL with query parameters
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const cacheKey = url.toString();

  // Check cache first
  let cache;
  if (endpoint.includes("/cards/") && !endpoint.includes("/cards?")) {
    cache = cardCache;
  } else if (endpoint.includes("/cards")) {
    cache = searchCache;
  } else if (endpoint.includes("/sets")) {
    cache = setCache;
  }

  if (cache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Make request with retries
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      rateLimiter.recordRequest();

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        API_CONFIG.timeout
      );

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the response
      if (cache) {
        cache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        // Wait before retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `API request failed after ${retries + 1} attempts: ${lastError.message}`
  );
}

// Card search functions
export const pokemonTcgApi = {
  // Search for cards with advanced filtering
  async searchCards({
    query = "",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    orderBy = "",
    filters = {},
  } = {}) {
    try {
      // Build search query
      let q = query;

      // Add filters to query
      if (filters.name) {
        q += (q ? " " : "") + `name:${filters.name}*`;
      }
      if (filters.types && filters.types.length > 0) {
        q += (q ? " " : "") + `types:${filters.types.join(",")}`;
      }
      if (filters.supertype) {
        q += (q ? " " : "") + `supertype:${filters.supertype}`;
      }
      if (filters.subtypes && filters.subtypes.length > 0) {
        q += (q ? " " : "") + `subtypes:${filters.subtypes.join(",")}`;
      }
      if (filters.set) {
        // Always treat as set ID first, fallback to set name
        q += (q ? " " : "") + `set.id:"${filters.set}"`;
      }
      if (filters.rarity) {
        q += (q ? " " : "") + `rarity:"${filters.rarity}"`;
      }
      if (filters.artist) {
        q += (q ? " " : "") + `artist:"${filters.artist}"`;
      }

      const params = {
        ...(q && { q }),
        page,
        pageSize: Math.min(pageSize, MAX_PAGE_SIZE),
        ...(orderBy && { orderBy }),
      };

      // console.log("Search params:", params);
      // console.log("Built query:", q);

      const response = await apiRequest("/cards", { params });

      return {
        cards: response.data || [],
        totalCount: response.totalCount || 0,
        page: response.page || 1,
        pageSize: response.pageSize || DEFAULT_PAGE_SIZE,
        hasMore: response.page * response.pageSize < response.totalCount,
      };
    } catch (error) {
      console.error("Card search failed:", error);
      throw new Error(`Failed to search cards: ${error.message}`);
    }
  },

  // Get a specific card by ID
  async getCard(cardId) {
    try {
      if (!cardId) {
        throw new Error("Card ID is required");
      }

      const response = await apiRequest(`/cards/${cardId}`);
      return response.data;
    } catch (error) {
      console.error("Get card failed:", error);
      throw new Error(`Failed to get card: ${error.message}`);
    }
  },

  // Get popular/featured cards
  async getFeaturedCards(limit = 12) {
    try {
      const response = await apiRequest("/cards", {
        params: {
          q: 'supertype:Pokémon rarity:"Rare Holo"',
          pageSize: limit,
          orderBy: "-set.releaseDate",
        },
      });

      return response.data || [];
    } catch (error) {
      console.error("Get featured cards failed:", error);
      throw new Error(`Failed to get featured cards: ${error.message}`);
    }
  },

  // Search by Pokemon name (simplified)
  async searchByPokemon(pokemonName, limit = 20) {
    try {
      return await this.searchCards({
        filters: { name: pokemonName },
        pageSize: limit,
        orderBy: "-set.releaseDate",
      });
    } catch (error) {
      console.error("Search by Pokemon failed:", error);
      throw new Error(`Failed to search by Pokemon: ${error.message}`);
    }
  },

  // Get all available sets
  async getSets() {
    try {
      const response = await apiRequest("/sets", {
        params: {
          orderBy: "-releaseDate",
          pageSize: MAX_PAGE_SIZE,
        },
      });

      return response.data || [];
    } catch (error) {
      console.error("Get sets failed:", error);
      throw new Error(`Failed to get sets: ${error.message}`);
    }
  },

  // Get all available types
  async getTypes() {
    try {
      // Fallback to hardcoded types since the API endpoint seems unreliable
      const pokemonTypes = [
        "Colorless",
        "Darkness",
        "Dragon",
        "Fairy",
        "Fighting",
        "Fire",
        "Grass",
        "Lightning",
        "Metal",
        "Psychic",
        "Water",
      ];
      return pokemonTypes;
    } catch (error) {
      console.error("Get types failed:", error);
      throw new Error(`Failed to get types: ${error.message}`);
    }
  },

  // Get all available rarities
  async getRarities() {
    try {
      const response = await apiRequest("/rarities");
      return response.data || [];
    } catch (error) {
      console.error("Get rarities failed:", error);
      throw new Error(`Failed to get rarities: ${error.message}`);
    }
  },

  // Utility functions
  utils: {
    // Clear all caches
    clearCache() {
      searchCache.clear();
      cardCache.clear();
      setCache.clear();
    },

    // Get cache stats
    getCacheStats() {
      return {
        searchCache: searchCache.cache.size,
        cardCache: cardCache.cache.size,
        setCache: setCache.cache.size,
      };
    },

    // Get rate limit info
    getRateLimitInfo() {
      return {
        canMakeRequest: rateLimiter.canMakeRequest(),
        timeUntilReset: rateLimiter.getTimeUntilReset(),
        requestCount: rateLimiter.requests.length,
        maxRequests: rateLimiter.maxRequests,
      };
    },
  },
};

// Helper function to normalize card data for our application
// Only keeps essential data to reduce storage size
export function normalizeCardData(card) {
  if (!card) return null;

  return {
    // Essential identification
    id: card.id,
    name: card.name,

    // Images (essential for display)
    image: card.images?.large || card.images?.small || "",

    // Card classification
    supertype: card.supertype,
    subtypes: card.subtypes || [],
    types: card.types || [],
    rarity: card.rarity,

    // Set information (minimal)
    set: {
      id: card.set?.id || "",
      name: card.set?.name || "",
      series: card.set?.series || "",
      symbol: card.set?.images?.symbol || "",
    },

    // Card number for identification
    number: card.number,

    // Artist credit
    artist: card.artist,

    // App metadata
    addedAt: new Date().toISOString(),
    source: "pokemon-tcg-api",
  };
}

export default pokemonTcgApi;

// Pokemon TCG API Service
// Handles all interactions with the Pokemon TCG API (pokemontcg.io)

// Direct API access - Pokemon TCG API supports CORS
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

// Helper function to build fuzzy name queries
function buildFuzzyNameQuery(searchTerm) {
  if (!searchTerm || typeof searchTerm !== "string") {
    return "";
  }

  const trimmed = searchTerm.trim();

  // If the search term contains spaces, we need to handle it differently
  if (trimmed.includes(" ")) {
    // For multi-word searches like "Sandy Shocks" or "Sandy sho"
    const words = trimmed.split(/\s+/).filter((word) => word.length > 0);

    if (words.length === 1) {
      // Single word after splitting (shouldn't happen, but safe fallback)
      return `name:*${words[0]}*`;
    } else if (words.length === 2) {
      const [word1, word2] = words;

      // Check if second word looks like a partial search (less than 4 chars)
      if (word2.length < 4) {
        // Partial second word: "Sandy sho" -> search just the first word with wildcard
        // This is more reliable than complex queries
        return `name:*${word1}*`;
      } else {
        // Both words seem complete: "Sandy Shocks" -> use exact match with quotes
        // This works best for complete names with spaces
        return `name:"${trimmed}"`;
      }
    } else {
      // More than 2 words - use exact match for precision
      return `name:"${trimmed}"`;
    }
  } else {
    // Single word - use wildcards for partial matching
    return `name:*${trimmed}*`;
  }
}

// Card search functions
export const pokemonTcgApi = {
  // Add helper method to the API object
  buildFuzzyNameQuery,

  // Build fallback query for failed searches
  buildFallbackQuery(originalQuery) {
    if (!originalQuery || typeof originalQuery !== "string") {
      return "";
    }

    const trimmed = originalQuery.trim();

    // If it contains spaces, try just the first word
    if (trimmed.includes(" ")) {
      const firstWord = trimmed.split(" ")[0];
      if (firstWord.length >= 3) {
        return firstWord; // This will become name:*firstWord*
      }
    }

    // If it's already a single word, try without wildcards (exact match)
    if (!trimmed.includes(" ") && trimmed.length >= 3) {
      return `"${trimmed}"`; // Force exact match
    }

    return null; // No fallback available
  },
  // Search for cards with advanced filtering and fallback strategies
  async searchCards({
    query = "",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    orderBy = "",
    filters = {},
    _isRetry = false,
  } = {}) {
    try {
      // Build search query
      let q = "";

      // Parse and handle different query types
      if (query) {
        const trimmedQuery = query.trim();

        // Check if the query is already a formatted API query (contains colon and quotes)
        if (trimmedQuery.match(/^\w+(\.\w+)?:".*"$/)) {
          // Already formatted query like set.id:"sv7" or name:"Pikachu"
          q += trimmedQuery;
        } else if (trimmedQuery.includes("#")) {
          // Pattern: "Pikachu #3" or "#3" - search by card number
          const parts = trimmedQuery.split("#");
          if (parts.length === 2) {
            const pokemonName = parts[0].trim();
            const cardNumber = parts[1].trim();

            if (pokemonName) {
              // Both name and number: "Pikachu #3"
              q += `name:"${pokemonName}" number:${cardNumber}`;
            } else {
              // Just number: "#3"
              q += `number:${cardNumber}`;
            }
          } else {
            // Fallback to name search if # parsing fails
            q += `name:"${trimmedQuery}"`;
          }
        } else if (trimmedQuery.toLowerCase().startsWith("artist:")) {
          // Pattern: "artist:Ken Sugimori"
          const artistName = trimmedQuery.substring(7).trim(); // Remove "artist:"
          q += `artist:"${artistName}"`;
        } else if (trimmedQuery.toLowerCase().startsWith("set:")) {
          // Pattern: "set:Base Set"
          const setName = trimmedQuery.substring(4).trim(); // Remove "set:"
          q += `set.name:"${setName}"`;
        } else if (trimmedQuery.toLowerCase().startsWith("type:")) {
          // Pattern: "type:Fire"
          const typeName = trimmedQuery.substring(5).trim(); // Remove "type:"
          q += `types:"${typeName}"`;
        } else if (trimmedQuery.toLowerCase().startsWith("rarity:")) {
          // Pattern: "rarity:Rare Holo"
          const rarityName = trimmedQuery.substring(7).trim(); // Remove "rarity:"
          q += `rarity:"${rarityName}"`;
        } else {
          // Default: treat as pokemon name search with smart fuzzy matching
          q += this.buildFuzzyNameQuery(trimmedQuery);
        }
      }

      // Add filters to query (these will be combined with the parsed query above)
      if (filters.name) {
        // Use smart fuzzy matching for name filter as well
        q += (q ? " " : "") + this.buildFuzzyNameQuery(filters.name);
      }
      if (filters.types && filters.types.length > 0) {
        q += (q ? " " : "") + `types:"${filters.types.join('","')}"`;
      }
      if (filters.supertype) {
        q += (q ? " " : "") + `supertype:"${filters.supertype}"`;
      }
      if (filters.subtypes && filters.subtypes.length > 0) {
        q += (q ? " " : "") + `subtypes:"${filters.subtypes.join('","')}"`;
      }
      if (filters.set) {
        // Check if it looks like a set ID (contains letters and numbers) or set name
        // Set IDs typically look like "sv7", "ex1", "base1", etc.
        // Set names are longer like "Scarlet & Violet", "Base Set", etc.
        if (filters.set.match(/^[a-z0-9-]+$/i) && filters.set.length <= 10) {
          // Looks like a set ID
          q += (q ? " " : "") + `set.id:"${filters.set}"`;
        } else {
          // Looks like a set name
          q += (q ? " " : "") + `set.name:"${filters.set}"`;
        }
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

      console.log("Search params:", params);
      console.log("Built query:", q);
      console.log("Original query input:", query);

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

      // If this is a 400 error and we haven't tried a fallback yet, try a simpler search
      if (error.message.includes("400") && !_isRetry && query.trim()) {
        console.log("Attempting fallback search with simpler query...");

        try {
          // Try fallback strategy: search just the first word for multi-word queries
          const fallbackQuery = this.buildFallbackQuery(query.trim());
          if (fallbackQuery && fallbackQuery !== query) {
            return await this.searchCards({
              query: fallbackQuery,
              page,
              pageSize,
              orderBy,
              filters,
              _isRetry: true,
            });
          }
        } catch (fallbackError) {
          console.error("Fallback search also failed:", fallbackError);
        }
      }

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
      });
    } catch (error) {
      console.error("Search by Pokemon failed:", error);
      throw new Error(`Failed to search by Pokemon: ${error.message}`);
    }
  },

  // Get all available sets
  async getSets() {
    try {
      const allSets = [];
      let page = 1;
      let hasMore = true;

      // Fetch all pages of sets
      while (hasMore) {
        const response = await apiRequest("/sets", {
          params: {
            orderBy: "-releaseDate",
            pageSize: MAX_PAGE_SIZE,
            page: page,
          },
        });

        if (response.data && response.data.length > 0) {
          allSets.push(...response.data);

          // Check if there are more pages
          hasMore = response.data.length === MAX_PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allSets;
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
      // Use comprehensive list ordered by rarity level (most common to least common)
      const pokemonRarities = [
        // Standard rarities (most common)
        "Common",
        "Uncommon",
        "Rare",

        // Holofoil rarities (more rare)
        "Rare Holo",
        "Rare Holo EX",
        "Rare Holo GX",
        "Rare Holo V",
        "Rare Holo VMAX",
        "Rare Holo VSTAR",
        "Rare Holo LV.X",
        "Rare Holo Star",

        // Special rarities (very rare)
        "Double Rare",
        "Illustration Rare",
        "Special Illustration Rare",
        "Ultra Rare",
        "Rare Ultra",
        "Hyper Rare",

        // Secret/Rainbow rarities (extremely rare)
        "Secret Rare",
        "Rare Secret",
        "Rare Rainbow",

        // Older special rarities
        "Amazing Rare",
        "Rare ACE",
        "Rare BREAK",
        "Rare Prime",
        "Rare Prism Star",
        "Rare Shining",
        "Rare Shiny",
        "Rare Shiny GX",
        "Shiny Rare",

        // Promotional/Special (varies)
        "Promo",
        "LEGEND",
      ];

      return pokemonRarities;
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

// Cards that should use normal size images instead of _hires (they don't have hires versions)
const CARDS_WITH_NO_HIRES = [
  "sv8-196", // Larvesta
  "xyp-XY39", // Kingdra
  "xyp-XY46", // Altaria
  "xyp-XY68", // Chesnaught
];

// Helper function to normalize card data for our application
// Only keeps essential data to reduce storage size
export function normalizeCardData(card) {
  if (!card) return null;

  // Determine which image to use for small and large
  let imageSmallUrl = card.images?.small || "";
  let imageLargeUrl = card.images?.large || "";

  // Use _hires version by default, unless the card is in the exception list
  if (imageSmallUrl && !CARDS_WITH_NO_HIRES.includes(card.id)) {
    // Convert normal image URL to _hires version
    // e.g., "10.png" becomes "10_hires.png"
    imageSmallUrl = imageSmallUrl.replace(/(\d+)\.png$/, "$1_hires.png");
  }

  if (imageLargeUrl && !CARDS_WITH_NO_HIRES.includes(card.id)) {
    // Convert normal image URL to _hires version
    // e.g., "10.png" becomes "10_hires.png"
    imageLargeUrl = imageLargeUrl.replace(/(\d+)\.png$/, "$1_hires.png");
  }

  return {
    // Essential identification
    id: card.id,
    name: card.name,

    // Images (essential for display) - now using _hires by default with exceptions
    // Maintain both imageSmall and image for compatibility
    imageSmall: imageSmallUrl,
    image: imageLargeUrl || imageSmallUrl, // Fallback to small if large not available

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

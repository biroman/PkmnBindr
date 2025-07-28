// Supabase API Service
// Handles all interactions with the Supabase Pokemon TCG database as a fallback

const SUPABASE_URL = "https://mmhwipzmntviqsmydlpb.supabase.co";
const SUPABASE_API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1taHdpcHptbnR2aXFzbXlkbHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjA1NjIsImV4cCI6MjA2ODA5NjU2Mn0.H2hKTI4I3ZAJJ4hjMLa2YJ6_c5Ax8cxKI1L9dPG93YQ";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 250;

// API configuration
const API_CONFIG = {
  baseURL: SUPABASE_URL,
  timeout: 10000, // 10 seconds
  retries: 2,
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
// Cache for rarely changing metadata endpoints (types, rarities, etc.)
const metaCache = new ApiCache(2 * 60 * 60 * 1000); // 2 hours

// HTTP client with error handling and retries
async function apiRequest(endpoint, options = {}) {
  const {
    params = {},
    retries = API_CONFIG.retries,
    retryDelay = API_CONFIG.retryDelay,
  } = options;

  // Build URL with query parameters
  const url = new URL(`${SUPABASE_URL}/rest/v1${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const cacheKey = url.toString();

  // Determine which cache to use
  let cache;
  if (endpoint.includes("/cards") && !endpoint.includes("?")) {
    cache = cardCache;
  } else if (endpoint.includes("/cards")) {
    cache = searchCache;
  } else if (endpoint.includes("/sets")) {
    cache = setCache;
  } else if (
    endpoint === "/types" ||
    endpoint === "/subtypes" ||
    endpoint === "/rarities" ||
    endpoint === "/supertypes"
  ) {
    cache = metaCache;
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
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        API_CONFIG.timeout
      );

      const response = await fetch(url, {
        method: "GET",
        headers: {
          apikey: SUPABASE_API_KEY,
          Authorization: `Bearer ${SUPABASE_API_KEY}`,
          "Content-Type": "application/json",
          Prefer: "count=exact",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Get total count from headers
      const contentRange = response.headers.get("content-range");
      const totalCount = contentRange ? contentRange.split("/")[1] : null;

      const result = {
        data: data,
        totalCount: totalCount ? parseInt(totalCount, 10) : data.length,
        page: 1, // This will be adjusted by the caller based on input params
        pageSize: data.length,
        hasMore: false, // This will also be adjusted by the caller
      };

      // Cache the response
      if (cache) {
        cache.set(cacheKey, result);
      }

      return result;
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
    `Supabase API request failed after ${retries + 1} attempts: ${
      lastError.message
    }`
  );
}

// Supabase API service
export const supabaseApi = {
  // Search for cards
  async searchCards({
    query = "",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    orderBy = "",
    filters = {},
  } = {}) {
    try {
      // --- START OF FIX ---
      // Build parameters object directly instead of using a combined string.
      // Each filter becomes a separate query parameter, resulting in an AND search.
      const params = {
        select: "*",
      };

      // Handle the main text query (which we treat as a name search)
      if (query.trim()) {
        params.name = `${query.trim()}`;
      }

      // Handle advanced filters
      if (filters.name) {
        params.name = `ilike.%${filters.name}%`;
      }
      if (filters.types && filters.types.length > 0) {
        // `cs` means "contains", for JSONB arrays
        params.types = `cs.{${filters.types.join(",")}}`;
      }
      if (filters.supertype) {
        params.supertype = `eq.${filters.supertype}`;
      }
      if (filters.subtypes && filters.subtypes.length > 0) {
        params.subtypes = `cs.{${filters.subtypes.join(",")}}`;
      }
      if (filters.set) {
        // In Supabase, the set is referenced by its ID in the cards table
        params.set_id = `eq.${filters.set}`;
      }
      if (filters.rarity) {
        params.rarity = `eq.${filters.rarity}`;
      }
      if (filters.artist) {
        params.artist = `ilike.%${filters.artist}%`;
      }

      // Add ordering and pagination
      if (orderBy) {
        params.order = orderBy;
      }
      params.limit = Math.min(pageSize, MAX_PAGE_SIZE);
      params.offset = (page - 1) * Math.min(pageSize, MAX_PAGE_SIZE);
      // --- END OF FIX ---

      console.log("Supabase search params:", params);

      const response = await apiRequest("/cards", { params });

      const totalCount = response.totalCount || 0;
      const currentPageSize = response.data?.length || 0;

      return {
        cards: response.data || [],
        totalCount: totalCount,
        page: page,
        pageSize: currentPageSize,
        hasMore: page * pageSize < totalCount,
      };
    } catch (error) {
      console.error("Supabase card search failed:", error);
      throw new Error(`Failed to search cards: ${error.message}`);
    }
  },

  // Get a specific card by ID
  async getCard(cardId) {
    try {
      if (!cardId) {
        throw new Error("Card ID is required");
      }

      const response = await apiRequest(`/cards`, {
        params: {
          select: "*",
          id: `eq.${cardId}`,
          limit: 1,
        },
      });

      const card = response.data?.[0] || null;

      // If we have a card with set_id, try to get the set information
      if (card && card.set_id) {
        try {
          const setResponse = await apiRequest(`/sets`, {
            params: {
              select: "*",
              id: `eq.${card.set_id}`,
              limit: 1,
            },
          });

          const set = setResponse.data?.[0] || null;
          if (set) {
            // Add set information to the card
            card.set_name = set.name;
            card.set_series = set.series;
            card.set_symbol = set.images?.symbol || "";
          }
        } catch (setError) {
          console.warn("Failed to fetch set information for card:", setError);
          // Continue without set information
        }
      }

      return card;
    } catch (error) {
      console.error("Supabase get card failed:", error);
      throw new Error(`Failed to get card: ${error.message}`);
    }
  },

  // Get featured cards
  async getFeaturedCards(limit = 12) {
    try {
      const response = await apiRequest("/cards", {
        params: {
          select: "*",
          supertype: "eq.Pokémon",
          rarity: "eq.Rare Holo",
          limit: limit,
        },
      });

      return response.data || [];
    } catch (error) {
      console.error("Supabase get featured cards failed:", error);
      throw new Error(`Failed to get featured cards: ${error.message}`);
    }
  },

  // Search by Pokemon name
  async searchByPokemon(pokemonName, limit = 20) {
    try {
      return await this.searchCards({
        query: pokemonName, // Use the main query field
        pageSize: limit,
      });
    } catch (error) {
      console.error("Supabase search by Pokemon failed:", error);
      throw new Error(`Failed to search by Pokemon: ${error.message}`);
    }
  },

  // Get all cards for a specific set
  async getSetCards(setId, pageSize = 500) {
    try {
      const response = await apiRequest("/cards", {
        params: {
          select: "*",
          set_id: `eq.${setId}`,
          order: "number.asc",
          limit: pageSize,
        },
      });

      // If the database sorting doesn't work correctly (e.g., string sorting),
      // we'll also sort on the frontend as a fallback
      const cards = response.data || [];

      // Sort by card number numerically
      const sortedCards = cards.sort((a, b) => {
        const numA = parseInt(a.number, 10) || 0;
        const numB = parseInt(b.number, 10) || 0;
        return numA - numB;
      });

      // Add set information to all cards
      try {
        const setResponse = await apiRequest(`/sets`, {
          params: {
            select: "*",
            id: `eq.${setId}`,
            limit: 1,
          },
        });

        const set = setResponse.data?.[0] || null;
        if (set) {
          // Add set information to all cards
          sortedCards.forEach((card) => {
            card.set_name = set.name;
            card.set_series = set.series;
            card.set_symbol = set.images?.symbol || "";
          });
        }
      } catch (setError) {
        console.warn("Failed to fetch set information for cards:", setError);
        // Continue without set information
      }

      return sortedCards;
    } catch (error) {
      console.error("Supabase get set cards failed:", error);
      throw new Error(`Failed to get set cards: ${error.message}`);
    }
  },

  // Get card count for a specific set
  async getSetCardCount(setId) {
    try {
      const response = await apiRequest("/cards", {
        params: {
          select: "id",
          set_id: `eq.${setId}`,
          limit: 1,
        },
      });

      return response.totalCount || 0;
    } catch (error) {
      console.error("Supabase get set card count failed:", error);
      return 0;
    }
  },

  // Get all available sets with card counts
  async getSets() {
    try {
      // Fetch from the SQL view that already contains the aggregate card counts.
      // The view must be created in Supabase as `public.sets_with_counts` (see docs).
      const response = await apiRequest("/sets_with_counts", {
        params: {
          select: "*",
          order: "release_date.desc",
        },
      });

      const setsWithCounts = (response.data || []).map((set) => {
        const total =
          set.total_count /* from view */ ??
          set.totalCount /* fallback for older data */ ??
          0;
        return {
          ...set,
          total,
          totalCount: total,
          printedTotal: total, // Maintain compatibility with the previous shape
        };
      });

      return setsWithCounts;
    } catch (error) {
      console.error("Supabase get sets failed:", error);
      throw new Error(`Failed to get sets: ${error.message}`);
    }
  },

  // Get all available types
  async getTypes() {
    try {
      const response = await apiRequest("/types", {
        params: {
          select: "name", // Only select the name column
        },
      });

      return response.data?.map((type) => type.name) || [];
    } catch (error) {
      console.error("Supabase get types failed:", error);
      // Fallback to hardcoded types
      return [
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
    }
  },

  // Get all available subtypes
  async getSubtypes() {
    try {
      const response = await apiRequest("/subtypes", {
        params: {
          select: "name",
        },
      });

      return response.data?.map((subtype) => subtype.name) || [];
    } catch (error) {
      console.error("Supabase get subtypes failed:", error);
      // Fallback to hardcoded subtypes
      return [
        "BREAK",
        "Baby",
        "Basic",
        "EX",
        "GX",
        "Goldenrod Game Corner",
        "Item",
        "LEGEND",
        "Level-Up",
        "MEGA",
        "Pokémon Tool",
        "Pokémon Tool F",
        "Rapid Strike",
        "Restored",
        "Rocket's Secret Machine",
        "Single Strike",
        "Special",
        "Stadium",
        "Stage 1",
        "Stage 2",
        "Supporter",
        "TAG TEAM",
        "Technical Machine",
        "V",
        "VMAX",
      ];
    }
  },

  // Get all available rarities
  async getRarities() {
    try {
      const response = await apiRequest("/rarities", {
        params: {
          select: "name",
        },
      });

      return response.data?.map((rarity) => rarity.name) || [];
    } catch (error) {
      console.error("Supabase get rarities failed:", error);
      // Fallback to hardcoded rarities
      return [
        "Amazing Rare",
        "Common",
        "LEGEND",
        "Promo",
        "Rare",
        "Rare ACE",
        "Rare BREAK",
        "Rare Holo",
        "Rare Holo EX",
        "Rare Holo GX",
        "Rare Holo LV.X",
        "Rare Holo Star",
        "Rare Holo V",
        "Rare Holo VMAX",
        "Rare Prime",
        "Rare Prism Star",
        "Rare Rainbow",
        "Rare Secret",
        "Rare Shining",
        "Rare Shiny",
        "Rare Shiny GX",
        "Rare Ultra",
        "Uncommon",
      ];
    }
  },

  // Get all available supertypes
  async getSupertypes() {
    try {
      const response = await apiRequest("/supertypes", {
        params: {
          select: "name",
        },
      });

      return response.data?.map((supertype) => supertype.name) || [];
    } catch (error) {
      console.error("Supabase get supertypes failed:", error);
      // Fallback to hardcoded supertypes (from Pokemon TCG API docs)
      return ["Energy", "Pokémon", "Trainer"];
    }
  },

  // Utility functions
  utils: {
    // Clear all caches
    clearCache() {
      searchCache.clear();
      cardCache.clear();
      setCache.clear();
      metaCache.clear();
    },

    // Get cache stats
    getCacheStats() {
      return {
        searchCache: searchCache.cache.size,
        cardCache: cardCache.cache.size,
        setCache: setCache.cache.size,
      };
    },
  },
};

function getImageUrl(images, size) {
  if (!images) return null;

  // Handle object format
  if (typeof images === "object" && images !== null) {
    const url = images[size];
    return url || null;
  }

  // Handle string format (fallback)
  if (typeof images === "string") {
    return images;
  }

  return null;
}

// Helper function to normalize card data from Supabase format
export function normalizeSupabaseCardData(card) {
  if (!card) return null;

  const imageSmall = getImageUrl(card.images, "small");
  const imageLarge = getImageUrl(card.images, "large");
  const finalImage = imageLarge || imageSmall;

  return {
    // Essential identification
    id: card.id,
    name: card.name,

    // Images - More robust handling
    imageSmall: imageSmall,
    image: finalImage,

    // Card classification
    supertype: card.supertype,
    subtypes: card.subtypes || [],
    types: card.types || [],
    rarity: card.rarity,

    // Set information
    set: {
      id: card.set_id || "",
      name: card.set_name || "",
      series: card.set_series || "",
      symbol: card.set_symbol || "",
    },

    // Card number for identification
    number: card.number,

    // Artist credit
    artist: card.artist,

    // App metadata
    addedAt: new Date().toISOString(),
    source: "supabase-api",
  };
}

export default supabaseApi;

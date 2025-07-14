// Pokemon TCG API Service
// Handles all interactions with the Pokemon TCG API (pokemontcg.io)
// Includes fallback to Supabase API when Pokemon TCG API fails

// Direct API access - Pokemon TCG API supports CORS
const BASE_URL = "https://api.pokemontcg.io/v2";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 250;

// Import Supabase API for fallback
import { supabaseApi, normalizeSupabaseCardData } from "./supabaseApi.js";

// API configuration
const API_CONFIG = {
  baseURL: BASE_URL,
  timeout: 7000, // 7 seconds
  retries: 0, // Set to 1 to try the primary API once before fallback
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

// HTTP client with error handling, retries, and Supabase fallback
async function apiRequest(endpoint, options = {}) {
  const {
    params = {},
    retries = API_CONFIG.retries,
    retryDelay = API_CONFIG.retryDelay,
    useFallback = true, // Enable fallback by default
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

  // Determine which cache to use
  let cache;
  if (endpoint.startsWith("/cards/") && !endpoint.includes("?")) {
    cache = cardCache;
  } else if (endpoint.includes("/cards")) {
    cache = searchCache;
  } else if (endpoint.includes("/sets")) {
    cache = setCache;
  }

  // Check cache first
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
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the successful response
      if (cache) {
        cache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      lastError = error;
      // If it's the last attempt, don't wait, proceed to fallback
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // If we get here, the primary Pokemon TCG API failed.
  if (useFallback) {
    console.log("Pokemon TCG API failed, attempting Supabase fallback...");
    try {
      return await handleSupabaseFallback(endpoint, params);
    } catch (fallbackError) {
      console.error("Supabase fallback also failed:", fallbackError);
      throw new Error(
        `Primary API and Supabase fallback both failed. Original error: ${lastError.message}`
      );
    }
  }

  throw new Error(
    `API request failed after ${retries + 1} attempts: ${lastError.message}`
  );
}

// Handle fallback to Supabase API
async function handleSupabaseFallback(endpoint, params) {
  console.log("Using Supabase fallback for endpoint:", endpoint);

  if (endpoint === "/cards") {
    // Handle card search
    const searchParams = parseSearchParams(params);

    // Check if this is a set-specific search
    if (params.q && params.q.includes("set.id:")) {
      const setIdMatch = params.q.match(/set\.id:"([^"]+)"/);
      if (setIdMatch) {
        const setId = setIdMatch[1];
        console.log(
          "Detected set search, using Supabase getSetCards for setId:",
          setId
        );
        const cards = await supabaseApi.getSetCards(setId);

        const normalizedCards = cards.map((card) => {
          const normalized = normalizeSupabaseCardData(card);
          return normalized;
        });

        return {
          data: normalizedCards,
          totalCount: cards.length,
          page: 1,
          pageSize: cards.length,
        };
      }
    }

    // Regular search
    const result = await supabaseApi.searchCards(searchParams);

    console.log("Raw Supabase result:", result);
    console.log("First card before normalization:", result.cards[0]);

    // Convert Supabase format to Pokemon TCG API format
    const normalizedCards = result.cards.map((card) => {
      const normalized = normalizeSupabaseCardData(card);
      console.log("Normalized card:", normalized.name, "Images:", {
        small: normalized.imageSmall,
        large: normalized.image,
      });
      return normalized;
    });

    return {
      data: normalizedCards,
      totalCount: result.totalCount,
      page: result.page,
      pageSize: result.pageSize,
    };
  } else if (endpoint.startsWith("/cards/")) {
    // Handle individual card lookup
    const cardId = endpoint.split("/cards/")[1];
    const card = await supabaseApi.getCard(cardId);
    if (!card) throw new Error("Card not found in Supabase");

    console.log("Raw card before normalization:", card);
    const normalizedCard = normalizeSupabaseCardData(card);
    console.log("Normalized single card:", normalizedCard.name, "Images:", {
      small: normalizedCard.imageSmall,
      large: normalizedCard.image,
    });

    return { data: normalizedCard };
  } else if (endpoint === "/sets") {
    const sets = await supabaseApi.getSets();
    return {
      data: sets,
      totalCount: sets.length,
      page: 1,
      pageSize: sets.length,
    };
  } else if (endpoint === "/types") {
    const types = await supabaseApi.getTypes();
    return { data: types };
  } else if (endpoint === "/subtypes") {
    const subtypes = await supabaseApi.getSubtypes();
    return { data: subtypes };
  } else if (endpoint === "/rarities") {
    const rarities = await supabaseApi.getRarities();
    return { data: rarities };
  } else {
    throw new Error(`Unsupported endpoint for Supabase fallback: ${endpoint}`);
  }
}

// Parse search parameters from Pokemon TCG format to Supabase format
function parseSearchParams(params) {
  const searchParams = {
    page: params.page || 1,
    pageSize: params.pageSize || DEFAULT_PAGE_SIZE,
    orderBy: params.orderBy || "",
    filters: {},
  };

  if (params.q) {
    const query = params.q;
    // Basic name search extraction. This can be enhanced for more complex queries.
    const nameMatch = query.match(/name:(\*?"([^"]+)"\*?|\*([^*]+)\*)/);
    if (nameMatch) {
      searchParams.filters.name = nameMatch[2] || nameMatch[3];
    } else {
      // If no specific filter is found, treat the whole query as a name search
      searchParams.query = query.replace(/["*]/g, "").trim();
    }
  }

  return searchParams;
}

// Helper function to build fuzzy name queries for the primary API
function buildFuzzyNameQuery(searchTerm) {
  if (!searchTerm || typeof searchTerm !== "string") return "";
  const trimmed = searchTerm.trim();
  if (trimmed.includes(" ")) return `name:"${trimmed}"`;
  return `name:*${trimmed}*`;
}

// Main exported API object
export const pokemonTcgApi = {
  buildFuzzyNameQuery,

  async searchCards({
    query = "",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    orderBy = "",
    filters = {},
  } = {}) {
    let q = "";
    if (query) {
      q += this.buildFuzzyNameQuery(query.trim());
    }
    // Add other filters to the query string `q` as needed...

    const params = {
      ...(q && { q }),
      page,
      pageSize: Math.min(pageSize, MAX_PAGE_SIZE),
      ...(orderBy && { orderBy }),
    };

    try {
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

  async getCard(cardId) {
    if (!cardId) throw new Error("Card ID is required");
    try {
      const response = await apiRequest(`/cards/${cardId}`);
      return response.data;
    } catch (error) {
      console.error("Get card failed:", error);
      throw new Error(`Failed to get card: ${error.message}`);
    }
  },

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

  async getSets() {
    try {
      const allSets = [];
      let page = 1;
      let hasMore = true;
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

  async getTypes() {
    try {
      const response = await apiRequest("/types");
      return response.data || [];
    } catch (error) {
      console.error("Get types failed:", error);
      throw new Error(`Failed to get types: ${error.message}`);
    }
  },

  async getSubtypes() {
    try {
      const response = await apiRequest("/subtypes");
      return response.data || [];
    } catch (error) {
      console.error("Get subtypes failed:", error);
      throw new Error(`Failed to get subtypes: ${error.message}`);
    }
  },

  async getRarities() {
    try {
      const response = await apiRequest("/rarities");
      return response.data || [];
    } catch (error) {
      console.error("Get rarities failed:", error);
      throw new Error(`Failed to get rarities: ${error.message}`);
    }
  },

  utils: {
    clearCache() {
      searchCache.clear();
      cardCache.clear();
      setCache.clear();
    },
  },
};

// Helper function to normalize card data for our application
export function normalizeCardData(card) {
  if (!card) return null;

  // Handle both original Pokemon TCG API format and already-normalized Supabase format
  let imageSmall, image;

  if (card.imageSmall && card.image) {
    // Already normalized format (from Supabase)
    imageSmall = card.imageSmall;
    image = card.image;
  } else if (card.images) {
    // Original Pokemon TCG API format
    imageSmall = card.images.small || "";
    image = card.images.large || card.images.small || "";
  } else {
    // Fallback
    imageSmall = "";
    image = "";
  }

  return {
    id: card.id,
    name: card.name,
    imageSmall: imageSmall,
    image: image,
    supertype: card.supertype,
    subtypes: card.subtypes || [],
    types: card.types || [],
    rarity: card.rarity,
    set: {
      id: card.set?.id || "",
      name: card.set?.name || "",
      series: card.set?.series || "",
      symbol: card.set?.images?.symbol || "",
    },
    number: card.number,
    artist: card.artist,
    addedAt: new Date().toISOString(),
    source: card.source || "pokemon-tcg-api", // Keep source if normalized from Supabase
  };
}

export default pokemonTcgApi;

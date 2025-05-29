/**
 * Pokemon TCG API Service Layer
 * Centralized API functions for React Query
 */

const POKEMON_API_BASE = "https://api.pokemontcg.io/v2";

// Custom error class for API errors
export class PokemonAPIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = "PokemonAPIError";
    this.status = status;
    this.response = response;
  }
}

// Generic fetch wrapper with error handling
const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PokemonAPIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof PokemonAPIError) {
      throw error;
    }
    // Network or other errors
    throw new PokemonAPIError(`Network error: ${error.message}`, 0, null);
  }
};

// ===== CARDS API =====

/**
 * Fetch cards for a specific set
 * @param {string} setId - The set ID to fetch cards for
 * @param {object} options - Additional query options
 */
export const fetchCards = async (setId, options = {}) => {
  const params = new URLSearchParams({
    q: `set.id:${setId}`,
    orderBy: "number",
    pageSize: "500", // Get all cards for the set
    ...options,
  });

  const response = await apiRequest(`${POKEMON_API_BASE}/cards?${params}`);
  return response.data || [];
};

/**
 * Search cards with advanced filters
 * @param {string} query - Search query
 * @param {object} filters - Filter options (rarity, type, set)
 * @param {number} pageSize - Number of results per page
 */
export const searchCards = async (query, filters = {}, pageSize = 500) => {
  const searchParams = [];

  // Build search query
  if (query?.trim()) {
    const trimmedQuery = query.trim();

    // Enhanced search patterns
    const patterns = {
      nameWithNumber: /^(.+?)\s*#(\d+)$/i,
      artist: /^artist:\s*(.+)$/i,
      numberOnly: /^(?:number|num):\s*(\d+)$/i,
      setWithName: /^set:(\w+)\s+(.+)$/i,
    };

    let matched = false;

    // Check for name with number pattern
    if (patterns.nameWithNumber.test(trimmedQuery)) {
      const [, name, number] = trimmedQuery.match(patterns.nameWithNumber);
      searchParams.push(`name:"${name.trim()}"`, `number:${number}`);
      matched = true;
    }
    // Check for artist search
    else if (patterns.artist.test(trimmedQuery)) {
      const [, artist] = trimmedQuery.match(patterns.artist);
      searchParams.push(`artist:"${artist.trim()}"`);
      matched = true;
    }
    // Check for number only search
    else if (patterns.numberOnly.test(trimmedQuery)) {
      const [, number] = trimmedQuery.match(patterns.numberOnly);
      searchParams.push(`number:${number}`);
      matched = true;
    }
    // Check for set with name
    else if (patterns.setWithName.test(trimmedQuery)) {
      const [, setId, name] = trimmedQuery.match(patterns.setWithName);
      searchParams.push(`set.id:"${setId}"`, `name:"${name.trim()}"`);
      matched = true;
    }

    // Default search if no pattern matched
    if (!matched) {
      searchParams.push(`name:"${trimmedQuery}*"`);
    }
  }

  // Add filters
  if (filters.rarity) {
    searchParams.push(`rarity:"${filters.rarity}"`);
  }
  if (filters.type) {
    searchParams.push(`types:"${filters.type}"`);
  }
  if (filters.set) {
    searchParams.push(`set.id:"${filters.set}"`);
  }

  const params = new URLSearchParams({
    q: searchParams.join(" "),
    pageSize: pageSize.toString(),
    orderBy: "name",
  });

  const response = await apiRequest(`${POKEMON_API_BASE}/cards?${params}`);
  return response.data || [];
};

/**
 * Fetch a single card by ID
 * @param {string} cardId - The card ID
 */
export const fetchCard = async (cardId) => {
  const response = await apiRequest(`${POKEMON_API_BASE}/cards/${cardId}`);
  return response.data;
};

// ===== SETS API =====

/**
 * Fetch all Pokemon sets
 * @param {object} options - Query options
 */
export const fetchSets = async (options = {}) => {
  const params = new URLSearchParams({
    orderBy: "-releaseDate", // Most recent first
    pageSize: "500", // Get all sets
    ...options,
  });

  const response = await apiRequest(`${POKEMON_API_BASE}/sets?${params}`);
  return response.data || [];
};

/**
 * Fetch a single set by ID
 * @param {string} setId - The set ID
 */
export const fetchSet = async (setId) => {
  const response = await apiRequest(`${POKEMON_API_BASE}/sets/${setId}`);
  return response.data;
};

// ===== QUERY KEYS =====
// Centralized query key factory for consistency
export const queryKeys = {
  // Sets
  sets: ["sets"],
  set: (setId) => ["sets", setId],

  // Cards
  cards: ["cards"],
  cardsBySet: (setId) => ["cards", "set", setId],
  cardSearch: (query, filters) => ["cards", "search", { query, filters }],
  card: (cardId) => ["cards", cardId],

  // Binders (for future use with server state)
  binders: ["binders"],
  binder: (binderId) => ["binders", binderId],
  binderCards: (binderId) => ["binders", binderId, "cards"],
  binderHistory: (binderId) => ["binders", binderId, "history"],
};

// ===== CACHE UTILITIES =====

/**
 * Get cache time based on data type
 * Sets change infrequently, cards are more dynamic
 */
export const getCacheConfig = (type) => {
  const configs = {
    sets: {
      staleTime: 60 * 60 * 1000, // 1 hour
      cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    },
    cards: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    },
    search: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  };

  return configs[type] || configs.cards;
};

/**
 * OPTIMIZED BINDER SCHEMA FOR FIREBASE SYNC
 *
 * This schema is designed for:
 * - Conflict resolution between local and remote data
 * - Efficient Firebase sync with minimal data transfer
 * - Version control and change tracking
 * - Scalability and maintainability
 * - Multi-user support (future)
 */

// EXAMPLE OPTIMIZED BINDER OBJECT
const optimizedBinderExample = {
  // === CORE IDENTIFICATION ===
  id: "1736543210123-x8k9m2n4p", // Unique binder ID
  schemaVersion: "2.0", // For future migrations

  // === OWNERSHIP & PERMISSIONS ===
  ownerId: "user_abc123", // User who owns this binder
  permissions: {
    public: false, // Is binder publicly viewable
    collaborators: [], // Future: shared access
    shareCode: null, // Future: share links
  },

  // === VERSION CONTROL & SYNC ===
  version: 145, // Incremental version number
  lastModified: "2024-01-15T14:22:15.456Z", // Precise timestamp
  lastModifiedBy: "user_abc123", // Who made the last change

  sync: {
    status: "synced", // "synced" | "pending" | "conflict" | "error"
    lastSynced: "2024-01-15T14:22:15.456Z", // Last successful sync
    pendingChanges: [], // Array of unsynced changes
    conflictData: null, // Holds conflict resolution data
    retryCount: 0, // For exponential backoff
    lastError: null, // Last sync error details
  },

  // === METADATA ===
  metadata: {
    name: "My Charizard Collection",
    description: "All my favorite Charizard cards",
    createdAt: "2024-01-15T10:30:45.123Z",
    tags: ["fire", "charizard", "vintage"], // User-defined tags
    coverImageUrl: null, // Custom cover image
    isArchived: false, // Soft delete
    sortOrder: 0, // User's custom binder order
  },

  // === SETTINGS (IMMUTABLE UPDATES) ===
  settings: {
    gridSize: "3x3",
    theme: "default", // Future: custom themes
    viewMode: "grid", // "grid" | "list" | "carousel"
    autoSort: false,
    sortBy: "custom", // "custom" | "name" | "rarity" | "set"
    showStats: true,
    showGridNumbers: false,
    cardBackUrl: null, // Custom card back image
  },

  // === CARDS (OPTIMIZED STRUCTURE) ===
  cards: {
    // Using object instead of array for O(1) lookups and partial updates
    slot_0: {
      cardId: "base1-4",
      position: 0,
      addedAt: "2024-01-15T10:35:22.789Z",
      addedBy: "user_abc123",
      notes: "", // User notes for this card
      condition: "mint", // Card condition
      quantity: 1, // Number of this card
      isProtected: false, // Future: protected slots
    },
    slot_1: {
      cardId: "xy12-12",
      position: 1,
      addedAt: "2024-01-15T11:15:33.456Z",
      addedBy: "user_abc123",
      notes: "First Edition",
      condition: "near_mint",
      quantity: 1,
      isProtected: false,
    },
    slot_4: {
      cardId: "sm35-1",
      position: 4,
      addedAt: "2024-01-15T14:22:15.456Z",
      addedBy: "user_abc123",
      notes: "",
      condition: "mint",
      quantity: 1,
      isProtected: false,
    },
    // Empty slots are omitted (sparse array concept)
  },

  // === COMPUTED STATS (AUTO-GENERATED) ===
  stats: {
    totalCards: 3,
    uniqueCards: 3,
    totalValue: 1250.5, // Future: estimated value
    sets: [
      { id: "base1", name: "Base", count: 1 },
      { id: "xy12", name: "Evolutions", count: 1 },
      { id: "sm35", name: "Hidden Fates", count: 1 },
    ],
    types: [{ type: "Fire", count: 3 }],
    rarities: [
      { rarity: "Rare Holo", count: 1 },
      { rarity: "Rare Holo EX", count: 1 },
      { rarity: "Rare Holo GX", count: 1 },
    ],
    conditions: {
      mint: 2,
      near_mint: 1,
      excellent: 0,
      good: 0,
      poor: 0,
    },
  },

  // === CHANGE TRACKING ===
  changelog: [
    {
      id: "change_789",
      timestamp: "2024-01-15T14:22:15.456Z",
      type: "card_added", // "card_added" | "card_removed" | "card_moved" | "metadata_updated" | "settings_updated"
      userId: "user_abc123",
      data: {
        cardId: "sm35-1",
        position: 4,
        previousValue: null,
      },
    },
    {
      id: "change_788",
      timestamp: "2024-01-15T11:15:33.456Z",
      type: "card_added",
      userId: "user_abc123",
      data: {
        cardId: "xy12-12",
        position: 1,
        previousValue: null,
      },
    },
    // Keep only last 50 changes for performance
  ],
};

// === SEPARATE CARD CACHE ===
// Cards are stored separately to avoid duplication across binders
const cardCacheExample = {
  "base1-4": {
    id: "base1-4",
    name: "Charizard",
    image: "https://images.pokemontcg.io/base1/4_hires.png",
    supertype: "Pokémon",
    subtypes: ["Stage 2"],
    types: ["Fire"],
    rarity: "Rare Holo",
    set: {
      id: "base1",
      name: "Base",
      series: "Base",
      symbol: "https://images.pokemontcg.io/base1/symbol.png",
    },
    number: "4",
    artist: "Mitsuhiro Arita",
    // Cache metadata
    cachedAt: "2024-01-15T10:35:22.789Z",
    source: "pokemon-tcg-api",
    version: 1,
  },
  // Other cards...
};

// === USER PREFERENCES ===
const userPreferencesExample = {
  userId: "user_abc123",
  defaultGridSize: "3x3",
  defaultTheme: "dark",
  autoSync: true,
  syncOnlyOnWifi: false,
  compressionLevel: "medium",
  binderOrder: ["1736543210123-x8k9m2n4p", "1736543210456-a7b8c9d2e"],
};

// === FIREBASE STRUCTURE ===
const firebaseStructure = {
  // /users/{userId}/binders/{binderId}
  binders: {
    user_abc123: {
      "1736543210123-x8k9m2n4p": optimizedBinderExample,
    },
  },

  // /cards/{cardId} - Global card cache
  cards: cardCacheExample,

  // /users/{userId}/preferences
  userPreferences: {
    user_abc123: userPreferencesExample,
  },

  // /users/{userId}/syncQueue - Pending changes
  syncQueue: {
    user_abc123: [
      {
        id: "sync_001",
        binderId: "1736543210123-x8k9m2n4p",
        operation: "update",
        timestamp: "2024-01-15T14:22:15.456Z",
        data: {
          /* change data */
        },
      },
    ],
  },
};

/**
 * SYNC CONFLICT RESOLUTION ALGORITHM
 */
const conflictResolutionExamples = {
  // 1. Version-based resolution (simple)
  simpleVersion: {
    rule: "Higher version number wins",
    implementation: (local, remote) =>
      remote.version > local.version ? remote : local,
  },

  // 2. Timestamp-based resolution
  timestampBased: {
    rule: "Most recent lastModified wins",
    implementation: (local, remote) => {
      return new Date(remote.lastModified) > new Date(local.lastModified)
        ? remote
        : local;
    },
  },

  // 3. Operational Transform (advanced)
  operationalTransform: {
    rule: "Merge changes using operation log",
    implementation: (local, remote) => {
      // Apply remote changes that don't conflict
      // Flag conflicts for user resolution
      // Return merged result
    },
  },

  // 4. User choice (when conflicts can't be auto-resolved)
  userChoice: {
    rule: "Present both versions to user",
    data: {
      conflictType: "concurrent_edits",
      localVersion: {
        /* local data */
      },
      remoteVersion: {
        /* remote data */
      },
      conflictingFields: ["cards.slot_5", "metadata.name"],
      autoResolution: null,
    },
  },
};

/**
 * BENEFITS OF THIS STRUCTURE:
 *
 * 1. CONFLICT RESOLUTION:
 *    - Version numbers for simple conflicts
 *    - Timestamps for temporal resolution
 *    - Change logs for operation-based merging
 *
 * 2. PERFORMANCE:
 *    - Sparse card storage (no null values)
 *    - Separate card cache (no duplication)
 *    - Partial updates (only changed fields)
 *
 * 3. SCALABILITY:
 *    - User-based partitioning
 *    - Efficient Firebase queries
 *    - Compression-friendly structure
 *
 * 4. MAINTAINABILITY:
 *    - Schema versioning for migrations
 *    - Clear separation of concerns
 *    - Type-safe structure (even without TS)
 *
 * 5. FEATURES:
 *    - Multi-user support ready
 *    - Audit trail with changelog
 *    - Rich metadata and settings
 *    - Offline-first design
 */

export {
  optimizedBinderExample,
  cardCacheExample,
  userPreferencesExample,
  firebaseStructure,
  conflictResolutionExamples,
};

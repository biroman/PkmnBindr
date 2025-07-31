import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "react-hot-toast";
import { useRules } from "./RulesContext";
import { useAuth } from "../hooks/useAuth";
import { binderSyncService } from "../services/binderSyncService";
import { GLOBAL_CARD_LIMIT } from "../lib/globalRules.js";
import { PublicCollectionsCacheService } from "../services/PublicCollectionsCacheService";
import shareService from "../services/ShareService";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { sortCards } from "../utils/binderSorting";
import { getGridConfig } from "../hooks/useBinderDimensions";

// Grid configuration - centralized to avoid inconsistencies
const GRID_CONFIGS = {
  "1x1": { total: 1 },
  "2x2": { total: 4 },
  "3x3": { total: 9 },
  "4x3": { total: 12 },
  "4x4": { total: 16 },
};

// Storage keys
const STORAGE_KEYS = {
  BINDERS: "pokemon_binders",
  CURRENT_BINDER: "current_binder_id",
};

// Default binder settings
const DEFAULT_BINDER_SETTINGS = {
  gridSize: "3x3",
  theme: "default",
  viewMode: "grid",
  autoSort: false,
  sortBy: "custom",
  sortDirection: "asc", // asc or desc
  showGridNumbers: false,
  cardBackUrl: null,
  binderColor: null, // null = use theme-appropriate default color
  // Card back display settings
  showCardBackForEmpty: false, // Show card back instead of empty slots
  showCardBackForMissing: false, // Show card back instead of missing card overlay
  // Page management
  minPages: 1, // Minimum number of pages (including cover)
  maxPages: 100, // Maximum number of pages allowed
  pageCount: 1, // Actual number of pages in the binder
  pageOrder: null, // Array specifying custom page order (null = sequential 0,1,2,...)
  autoExpand: true, // Automatically add pages when cards are added beyond current pages
  autoShrink: false, // Automatically remove empty pages at the end
};

// Create context
const BinderContext = createContext();

// Local storage utilities
const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return null;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
    }
  },
};

// Helper functions
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const generateChangeId = () =>
  `change_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

// Sync helper functions
const markBinderAsModified = (binder, changeType, changeData, userId) => {
  const now = new Date().toISOString();

  // Skip changelog creation for card movements - they're not used anywhere and cause storage bloat
  const skipChangelogTypes = ["card_moved", "card_moved_optimistic"];

  let cleanedChangelog = [...(binder.changelog || [])];
  let change = null;

  // Only create changelog entries for meaningful actions
  if (!skipChangelogTypes.includes(changeType)) {
    const changeId = generateChangeId();

    change = {
      id: changeId,
      timestamp: now,
      type: changeType,
      userId: userId || "local_user",
      data: changeData,
    };

    // Add the new change
    cleanedChangelog.push(change);

    // Limit changelog size to prevent storage bloat (keep last 20 entries for truly important changes)
    if (cleanedChangelog.length > 20) {
      cleanedChangelog = cleanedChangelog.slice(-20);
    }
  }

  return {
    ...binder,
    version: (binder.version || 0) + 1,
    lastModified: now,
    lastModifiedBy: userId || "local_user",
    sync: {
      ...binder.sync,
      status: "local", // Mark as having local changes
      pendingChanges: change
        ? [...(binder.sync?.pendingChanges || []), change]
        : binder.sync?.pendingChanges || [],
    },
    changelog: cleanedChangelog,
  };
};

const updateBinderSyncStatus = (binder, syncStatus, additionalData = {}) => {
  return {
    ...binder,
    sync: {
      ...binder.sync,
      ...syncStatus,
      ...additionalData,
    },
  };
};

const createNewBinder = (name, description = "", ownerId = "local_user") => ({
  // Core identification
  id: generateId(),
  schemaVersion: "2.0",

  // Ownership (ready for Firebase)
  ownerId,
  permissions: {
    public: false,
    collaborators: [],
    shareCode: null,
  },

  // Version control & sync (ready for Firebase)
  version: 1,
  lastModified: new Date().toISOString(),
  lastModifiedBy: ownerId,

  sync: {
    status: "local", // "local" | "synced" | "pending" | "conflict" | "error"
    lastSynced: null,
    pendingChanges: [],
    conflictData: null,
    retryCount: 0,
    lastError: null,
  },

  // Metadata
  metadata: {
    name,
    description,
    createdAt: new Date().toISOString(),
    tags: [],
    coverImageUrl: null,
    isArchived: false,
    sortOrder: 0,
  },

  // Settings
  settings: { ...DEFAULT_BINDER_SETTINGS },

  // Cards (position-based object storage)
  cards: {},

  // Change tracking
  changelog: [
    {
      id: generateChangeId(),
      timestamp: new Date().toISOString(),
      type: "binder_created",
      userId: ownerId,
      data: { name, description },
    },
  ],

  // Card storage mode (embedded vs subcollection). New binders default to subcollection for unlimited cards.
  cardsStorage: "subcollection", // "embedded" (legacy) | "subcollection" (recommended)
});

// Position utilities
const getCardCount = (cards) => {
  return Object.keys(cards).length;
};

const findNextEmptyPosition = (cards, startFrom = 0) => {
  let position = startFrom;
  while (cards[position.toString()]) {
    position++;
  }
  return position;
};

const getOccupiedPositions = (cards) => {
  return Object.keys(cards)
    .map((pos) => parseInt(pos))
    .sort((a, b) => a - b);
};

// Enhanced validation functions for drag and drop
const validatePosition = (position, gridSize = "3x3") => {
  if (typeof position !== "number" || position < 0) {
    return { valid: false, error: "Position must be a non-negative number" };
  }

  // For now, we allow any reasonable position (future: add grid-based validation)
  const maxPosition = 10000; // Large limit for now
  if (position > maxPosition) {
    return { valid: false, error: `Position cannot exceed ${maxPosition}` };
  }

  return { valid: true };
};

const validateCardMove = (binder, fromPosition, toPosition) => {
  if (!binder || !binder.cards) {
    return { valid: false, error: "Invalid binder" };
  }

  // Validate positions
  const fromValidation = validatePosition(
    fromPosition,
    binder.settings?.gridSize
  );
  if (!fromValidation.valid) {
    return {
      valid: false,
      error: `Invalid from position: ${fromValidation.error}`,
    };
  }

  const toValidation = validatePosition(toPosition, binder.settings?.gridSize);
  if (!toValidation.valid) {
    return {
      valid: false,
      error: `Invalid to position: ${toValidation.error}`,
    };
  }

  // Check if source position has a card
  const fromKey = fromPosition.toString();
  if (!binder.cards[fromKey]) {
    return { valid: false, error: "No card at source position" };
  }

  // Same position move is not needed
  if (fromPosition === toPosition) {
    return {
      valid: false,
      error: "Source and destination positions are the same",
    };
  }

  return { valid: true };
};

// Batch operations for complex drag scenarios
const createBatchOperation = (operations, binder) => {
  return {
    id: generateChangeId(),
    timestamp: new Date().toISOString(),
    type: "batch_operation",
    userId: binder.ownerId,
    operations,
    data: {
      operationCount: operations.length,
      binderVersion: binder.version,
    },
  };
};

// Migration function to upgrade old binder format to new format
const migrateBinder = (oldBinder) => {
  // Check if already migrated to current schema
  if (
    oldBinder.schemaVersion === "2.0" &&
    oldBinder.settings?.pageCount !== undefined &&
    oldBinder.permissions !== undefined
  ) {
    return oldBinder;
  }

  console.log(
    `Migrating binder "${
      oldBinder.name || oldBinder.metadata?.name
    }" to new schema`
  );

  let newCards = {};
  let calculatedPageCount = 1;

  // Handle both array-based and object-based cards
  if (Array.isArray(oldBinder.cards)) {
    // Old array format
    oldBinder.cards.forEach((card, index) => {
      if (card && card.id) {
        newCards[index.toString()] = {
          cardId: card.id,
          addedAt:
            card.addedAt || oldBinder.createdAt || new Date().toISOString(),
          addedBy: oldBinder.ownerId || "local_user",
          notes: "",
          condition: "mint",
          quantity: 1,
          isProtected: false,
        };
      }
    });
  } else if (oldBinder.cards && typeof oldBinder.cards === "object") {
    // Already object format, keep as is
    newCards = oldBinder.cards;
  }

  // Calculate current page count based on existing cards
  if (Object.keys(newCards).length > 0) {
    const positions = Object.keys(newCards).map((pos) => parseInt(pos));
    const maxPosition = Math.max(...positions);
    const gridSize = oldBinder.settings?.gridSize || "3x3";
    const gridConfig = {
      "1x1": { total: 1 },
      "2x2": { total: 4 },
      "3x3": { total: 9 },
      "4x3": { total: 12 },
      "4x4": { total: 16 },
    };
    const cardsPerPage = gridConfig[gridSize]?.total || 9;
    calculatedPageCount = Math.ceil((maxPosition + 1) / cardsPerPage);
  }

  // Create migrated binder with new structure
  const migratedBinder = {
    // Core identification
    id: oldBinder.id,
    schemaVersion: "2.0",

    // Ownership
    ownerId: oldBinder.ownerId || "local_user",
    permissions: oldBinder.permissions || {
      public: false,
      collaborators: [],
      shareCode: null,
    },

    // Version control & sync
    version: oldBinder.version || 1,
    lastModified:
      oldBinder.lastModified ||
      oldBinder.updatedAt ||
      oldBinder.createdAt ||
      new Date().toISOString(),
    lastModifiedBy:
      oldBinder.lastModifiedBy || oldBinder.ownerId || "local_user",

    sync: oldBinder.sync || {
      status: "local",
      lastSynced: null,
      pendingChanges: [],
      conflictData: null,
      retryCount: 0,
      lastError: null,
    },

    // Metadata (handle both old and new formats)
    metadata: oldBinder.metadata || {
      name: oldBinder.name || "Untitled Binder",
      description: oldBinder.description || "",
      createdAt: oldBinder.createdAt || new Date().toISOString(),
      tags: [],
      coverImageUrl: null,
      isArchived: false,
      sortOrder: 0,
    },

    // Settings (merge old and new defaults, ensure pageCount is set)
    settings: {
      ...DEFAULT_BINDER_SETTINGS,
      ...oldBinder.settings,
      pageCount:
        oldBinder.settings?.pageCount ||
        Math.max(calculatedPageCount, oldBinder.settings?.minPages || 1),
    },

    // Cards (converted to new format)
    cards: newCards,

    // Change tracking
    changelog: oldBinder.changelog || [
      {
        id: generateChangeId(),
        timestamp: new Date().toISOString(),
        type: "binder_migrated",
        userId: oldBinder.ownerId || "local_user",
        data: {
          fromVersion: oldBinder.schemaVersion || "1.0",
          toVersion: "2.0",
          cardsCount: Object.keys(newCards).length,
          pageCount: Math.max(
            calculatedPageCount,
            oldBinder.settings?.minPages || 1
          ),
        },
      },
    ],
  };

  return migratedBinder;
};

// Utility function to clean up bloated changelogs in existing binders
const cleanupBinderChangelog = (binder) => {
  if (!binder.changelog || binder.changelog.length <= 100) {
    return binder; // No cleanup needed
  }

  console.log(
    `Cleaning up changelog for binder ${binder.id}: ${binder.changelog.length} entries -> 100 entries`
  );

  // Remove optimistic entries that have corresponding final entries
  let cleanedChangelog = [...binder.changelog];

  // Group entries by card and timestamp to find optimistic/final pairs
  const cardMoves = new Map();

  cleanedChangelog.forEach((entry, index) => {
    if (entry.type === "card_moved" || entry.type === "card_moved_optimistic") {
      const cardId = entry.data?.cardId;
      const timestamp = new Date(entry.timestamp).getTime();

      if (cardId) {
        if (!cardMoves.has(cardId)) {
          cardMoves.set(cardId, []);
        }
        cardMoves.get(cardId).push({ entry, index, timestamp });
      }
    }
  });

  // Find optimistic entries to remove
  const indicesToRemove = new Set();

  cardMoves.forEach((moves) => {
    moves.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < moves.length - 1; i++) {
      const currentMove = moves[i];
      const nextMove = moves[i + 1];

      // If current is optimistic and next is final within 30 seconds, mark optimistic for removal
      if (
        currentMove.entry.type === "card_moved_optimistic" &&
        nextMove.entry.type === "card_moved" &&
        nextMove.timestamp - currentMove.timestamp < 30000
      ) {
        indicesToRemove.add(currentMove.index);
      }
    }
  });

  // Remove optimistic entries
  if (indicesToRemove.size > 0) {
    cleanedChangelog = cleanedChangelog.filter(
      (_, index) => !indicesToRemove.has(index)
    );
    console.log(`Removed ${indicesToRemove.size} optimistic entries`);
  }

  // Limit to last 100 entries
  if (cleanedChangelog.length > 100) {
    cleanedChangelog = cleanedChangelog.slice(-100);
  }

  return {
    ...binder,
    changelog: cleanedChangelog,
    version: (binder.version || 0) + 1,
    lastModified: new Date().toISOString(),
  };
};

// Binder Context Provider
export const BinderProvider = ({ children }) => {
  const [binders, setBinders] = useState([]);
  const [currentBinder, setCurrentBinder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cache management state
  const [cache, setCache] = useState({
    data: null,
    timestamp: null,
    isValid: false,
  });
  const [syncStatus, setSyncStatus] = useState({}); // binderId -> sync status
  const { checkBinderLimits, canPerformAction } = useRules();
  const { user } = useAuth();

  // Cache configuration
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const CACHE_KEY = "binders_cache";
  const BACKGROUND_SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes

  // Cache management functions
  const isCacheValid = useCallback((cacheData) => {
    if (!cacheData || !cacheData.timestamp || !cacheData.isValid) return false;
    return Date.now() - cacheData.timestamp < CACHE_TTL;
  }, []);

  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (isCacheValid(parsedCache)) {
          return parsedCache.data;
        }
      }
    } catch (error) {
      console.warn("Failed to load cache:", error);
    }
    return null;
  }, [isCacheValid]);

  const setCachedData = useCallback((data) => {
    const cacheData = {
      data,
      timestamp: Date.now(),
      isValid: true,
    };

    setCache(cacheData);

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to save cache:", error);
    }
  }, []);

  const invalidateCache = useCallback(() => {
    setCache({ data: null, timestamp: null, isValid: false });
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }, []);

  // Initialize from localStorage with cache support
  useEffect(() => {
    const loadData = () => {
      try {
        setIsLoading(true);

        // Try to load from cache first if user is logged in
        if (user) {
          const cachedData = getCachedData();
          if (cachedData) {
            console.log("Loading binders from cache on initialization");
            setBinders(cachedData);
            setIsLoading(false);

            return;
          }
        }

        // Fallback to localStorage
        const savedBinders = storage.get(STORAGE_KEYS.BINDERS) || [];
        const migratedBinders = savedBinders.map(migrateBinder);
        setBinders(migratedBinders);

        // Save migrated binders back to localStorage if any were migrated
        if (
          migratedBinders.some(
            (binder, index) => binder !== savedBinders[index]
          )
        ) {
          storage.set(STORAGE_KEYS.BINDERS, migratedBinders);
          console.log("Binders migrated and saved to localStorage");
        }

        // Load current binder
        const currentBinderId = storage.get(STORAGE_KEYS.CURRENT_BINDER);
        if (currentBinderId) {
          const binder = migratedBinders.find((b) => b.id === currentBinderId);
          if (binder) {
            setCurrentBinder(binder);
          }
        }
      } catch (error) {
        console.error("Failed to load binder data:", error);
        toast.error("Failed to load binder data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, getCachedData]);

  // Save to localStorage whenever binders change
  useEffect(() => {
    if (!isLoading) {
      storage.set(STORAGE_KEYS.BINDERS, binders);
    }
  }, [binders, isLoading]);

  // Save current binder ID
  useEffect(() => {
    if (!isLoading) {
      if (currentBinder) {
        storage.set(STORAGE_KEYS.CURRENT_BINDER, currentBinder.id);
      } else {
        storage.remove(STORAGE_KEYS.CURRENT_BINDER);
      }
    }
  }, [currentBinder, isLoading]);

  // Create a new binder
  const createBinder = useCallback(
    async (name, description = "") => {
      try {
        if (!name.trim()) {
          throw new Error("Binder name is required");
        }

        // Check if user can create more binders
        const canCreate = await checkBinderLimits.canCreateBinder(
          { canPerformAction },
          user?.uid || "local_user",
          binders.length
        );

        if (!canCreate.allowed) {
          throw new Error(canCreate.reason || "Cannot create more binders");
        }

        const newBinder = createNewBinder(
          name.trim(),
          description.trim(),
          user?.uid || "local_user"
        );

        setBinders((prev) => [...prev, newBinder]);
        setCurrentBinder(newBinder);

        // Invalidate cache since we created a new binder
        invalidateCache();

        // Track usage for rate limiting
        await canPerformAction("create_binder_rate");

        toast.success(`Created binder "${name}"`);
        return newBinder;
      } catch (error) {
        console.error("Failed to create binder:", error);
        toast.error(error.message || "Failed to create binder");
        throw error;
      }
    },
    [binders.length, checkBinderLimits, canPerformAction, user, invalidateCache]
  );

  // Update binder
  const updateBinder = useCallback(
    async (binderId, updates) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const updatedBinder = {
            ...binder,
            ...updates,
            id: binderId,
            updatedAt: new Date().toISOString(),
          };

          // Use markBinderAsModified to properly track changes for sync
          return markBinderAsModified(
            updatedBinder,
            "binder_updated",
            {
              updates,
              timestamp: new Date().toISOString(),
            },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        // If updating permissions (public/private), sync to Firebase immediately
        if (updates.permissions && user) {
          const binder = binders.find((b) => b.id === binderId);
          if (binder) {
            const updatedBinder = updateBinder(binder);

            // Sync to Firebase for permission changes
            try {
              await binderSyncService.syncToCloud(updatedBinder, user.uid, {
                forceOverwrite: true,
                priority: "high", // High priority for permission changes
              });

              console.log(
                `Binder ${binderId} permissions synced to Firebase:`,
                updates.permissions
              );

              // Show success message
              if (updates.permissions.public !== undefined) {
                // Invalidate public collections cache when a binder's public status changes
                PublicCollectionsCacheService.invalidateCache();

                toast.success(
                  updates.permissions.public
                    ? "Binder is now public and visible on your profile"
                    : "Binder is now private"
                );
              }
            } catch (error) {
              console.error(
                "Failed to sync binder permissions to Firebase:",
                error
              );
              toast.error(
                "Failed to sync binder permissions. Changes saved locally."
              );
            }
          }
        }

        // Invalidate cache since we updated a binder
        invalidateCache();

        return { success: true };
      } catch (error) {
        console.error("Failed to update binder:", error);
        toast.error("Failed to update binder");
        throw error;
      }
    },
    [currentBinder, invalidateCache, binders, user]
  );

  // Delete binder
  const deleteBinder = useCallback(
    async (binderId) => {
      try {
        // Find the binder to check if it's synced to cloud
        const binderToDelete = binders.find((b) => b.id === binderId);
        if (!binderToDelete) {
          throw new Error("Binder not found");
        }

        // Check if binder is synced to cloud and user is signed in
        const isCloudBinder =
          binderToDelete.sync?.status === "synced" ||
          binderToDelete.sync?.lastSynced ||
          (binderToDelete.ownerId !== "local_user" && user);

        // Delete from cloud first if it's a cloud binder
        if (isCloudBinder && user) {
          try {
            await binderSyncService.deleteFromCloud(binderId, user.uid);
          } catch (cloudError) {
            console.error("Failed to delete from cloud:", cloudError);
            // Continue with local deletion but warn user
            toast.error("Deleted locally");
          }
        }

        // Delete from local state and localStorage
        setBinders((prev) => prev.filter((binder) => binder.id !== binderId));

        // If deleting current binder, clear it
        if (currentBinder?.id === binderId) {
          setCurrentBinder(null);
        }

        // Invalidate cache since we deleted a binder
        invalidateCache();

        toast.success("Binder deleted");
      } catch (error) {
        console.error("Failed to delete binder:", error);
        toast.error("Failed to delete binder");
        throw error;
      }
    },
    [currentBinder, binders, user, binderSyncService, invalidateCache]
  );

  // Set current binder with security check
  const selectBinder = useCallback(
    (binder) => {
      // Security check: Only allow selection of visible binders
      const isVisible = !user
        ? binder.ownerId === "local_user"
        : binder.ownerId === user.uid || binder.ownerId === "local_user";

      if (!isVisible) {
        console.warn(
          `Access denied: Binder "${binder.metadata?.name}" does not belong to current user`
        );
        toast.error("Access denied: This binder belongs to another user");
        return;
      }

      setCurrentBinder(binder);
    },
    [user]
  );

  // Add card to binder
  const addCardToBinder = useCallback(
    async (binderId, card, position = null, metadata = {}) => {
      try {
        if (!card || !card.id) {
          throw new Error("Invalid card data");
        }

        // Find the target binder for rule checking
        const targetBinder =
          binders.find((b) => b.id === binderId) || currentBinder;
        if (!targetBinder) {
          throw new Error("Binder not found");
        }

        // Check if user can add cards to this binder
        const canAdd = await checkBinderLimits.canAddCardsToBinder(
          { canPerformAction },
          user?.uid || "local_user",
          targetBinder,
          1
        );

        if (!canAdd.allowed) {
          const currentCards = Object.keys(targetBinder.cards || {}).length;
          const limit = canAdd.limit || GLOBAL_CARD_LIMIT;
          throw new Error(
            canAdd.reason ||
              `Card limit reached! You have ${currentCards}/${limit} cards in this binder.`
          );
        }

        // Note: Card will be cached when retrieved in useBinderPages hook

        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const targetPosition =
            position !== null ? position : findNextEmptyPosition(binder.cards);

          const cardEntry = {
            instanceId: generateId(), // Unique ID for this specific card instance
            cardId: card.id,
            // Store essential card data for cloud sync (filter out undefined values)
            cardData: {
              id: card.id || null,
              name: card.name || null,
              image: card.image || null,
              imageSmall: card.imageSmall || null,
              set: {
                id: card.set?.id || null,
                name: card.set?.name || null,
                series: card.set?.series || null,
              },
              number: card.number || null,
              artist: card.artist || null,
              rarity: card.rarity || null,
              types: card.types || null,
              reverseHolo: card.reverseHolo || false,
            },
            addedAt: new Date().toISOString(),
            addedBy: binder.ownerId,
            notes: metadata.notes || "",
            condition: metadata.condition || "mint",
            quantity: metadata.quantity || 1,
            isProtected: metadata.isProtected || false,
          };

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "card_added",
            userId: binder.ownerId,
            data: {
              cardId: card.id,
              position: targetPosition,
              previousValue: null,
            },
          };

          const updatedCards = {
            ...binder.cards,
            [targetPosition.toString()]: cardEntry,
          };

          // Calculate required pages after adding this card
          const gridConfig = {
            "1x1": { total: 1 },
            "2x2": { total: 4 },
            "3x3": { total: 9 },
            "4x3": { total: 12 },
            "4x4": { total: 16 },
          };

          const cardsPerPage =
            gridConfig[binder.settings?.gridSize || "3x3"]?.total || 9;
          const maxPosition = Math.max(
            ...Object.keys(updatedCards).map((pos) => parseInt(pos))
          );
          const requiredCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);

          // Convert card pages to binder pages
          // Page 1 is special (cover + 1 card page), subsequent pages are pairs of card pages
          let requiredBinderPages;
          if (requiredCardPages <= 1) {
            requiredBinderPages = 1; // Just the cover page with first card page
          } else {
            const pairsNeeded = Math.ceil((requiredCardPages - 1) / 2);
            requiredBinderPages = 1 + pairsNeeded; // Cover page + pairs
          }

          const currentPageCount = binder.settings?.pageCount || 1;

          // Update pageCount if we need more binder pages
          const newPageCount = Math.max(
            requiredBinderPages,
            currentPageCount,
            binder.settings?.minPages || 1
          );

          const updatedBinder = {
            ...binder,
            cards: updatedCards,
            settings: {
              ...binder.settings,
              pageCount: newPageCount,
            },
          };

          // Mark binder as modified
          let finalBinder = markBinderAsModified(
            updatedBinder,
            "card_added",
            {
              cardId: card.id,
              position: targetPosition,
              previousValue: null,
            },
            binder.ownerId
          );

          // Apply auto-sort if enabled and not using custom sorting
          if (
            binder.settings?.autoSort &&
            binder.settings?.sortBy &&
            binder.settings.sortBy !== "custom"
          ) {
            try {
              const sortedCards = sortCards(
                finalBinder.cards,
                binder.settings.sortBy
              );
              finalBinder = {
                ...finalBinder,
                cards: sortedCards,
              };
            } catch (sortError) {
              console.warn(
                "Auto-sort failed, card added without sorting:",
                sortError
              );
            }
          }

          return finalBinder;
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }
      } catch (error) {
        console.error("Failed to add card to binder:", error);
        toast.error("Failed to add card to binder");
        throw error;
      }
    },
    [currentBinder, binders, checkBinderLimits, canPerformAction]
  );

  // Remove card from binder
  const removeCardFromBinder = useCallback(
    async (binderId, position) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const positionKey = position.toString();
          const removedCard = binder.cards[positionKey];

          if (!removedCard) return binder; // No card to remove

          const updatedCards = { ...binder.cards };
          delete updatedCards[positionKey];

          const updatedBinder = {
            ...binder,
            cards: updatedCards,
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "card_removed",
            {
              cardId: removedCard.cardId,
              position,
              previousValue: removedCard,
            },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }
      } catch (error) {
        console.error("Failed to remove card from binder:", error);
        toast.error("Failed to remove card from binder");
        throw error;
      }
    },
    [currentBinder]
  );

  // Update card properties (e.g., reverse holo status)
  const updateCardInBinder = useCallback(
    async (binderId, position, cardUpdates) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const positionKey = position.toString();
          const existingCard = binder.cards[positionKey];

          if (!existingCard) return binder; // No card to update

          const updatedCard = {
            ...existingCard,
            ...cardUpdates,
          };

          // If updating cardData, merge it properly
          if (cardUpdates.cardData) {
            updatedCard.cardData = {
              ...(existingCard.cardData || {}),
              ...cardUpdates.cardData,
            };
          }

          // If updating binderMetadata, merge it properly
          if (cardUpdates.binderMetadata) {
            updatedCard.binderMetadata = {
              ...(existingCard.binderMetadata || {}),
              ...cardUpdates.binderMetadata,
            };
          }

          const updatedCards = {
            ...binder.cards,
            [positionKey]: updatedCard,
          };

          const updatedBinder = {
            ...binder,
            cards: updatedCards,
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "card_updated",
            {
              position,
              cardId: existingCard.cardId,
              updates: cardUpdates,
              previousValue: existingCard,
            },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }
      } catch (error) {
        console.error("Failed to update card in binder:", error);
        toast.error("Failed to update card");
        throw error;
      }
    },
    [currentBinder]
  );

  // Move card within binder (enhanced for drag and drop)
  const moveCard = useCallback(
    async (binderId, fromPosition, toPosition, options = {}) => {
      try {
        const { optimistic = false, skipValidation = false } = options;

        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          // Enhanced validation for drag and drop
          if (!skipValidation) {
            const validation = validateCardMove(
              binder,
              fromPosition,
              toPosition
            );
            if (!validation.valid) {
              console.warn("Move validation failed:", validation.error);
              if (!optimistic) {
                toast.error(validation.error);
              }
              return binder;
            }
          }

          const fromKey = fromPosition.toString();
          const toKey = toPosition.toString();

          const cardToMove = binder.cards[fromKey];
          const cardAtDestination = binder.cards[toKey];

          if (!cardToMove) {
            console.warn("No card to move at position", fromPosition);
            return binder;
          }

          const updatedCards = { ...binder.cards };

          // Swap or move cards
          const mode = options.mode || "swap"; // 'swap' (default) or 'shift'

          if (cardAtDestination) {
            if (mode === "shift") {
              // Shift mode: slide intervening cards

              // Remove the card we're moving from its original slot
              delete updatedCards[fromKey];

              if (fromPosition < toPosition) {
                // Moving card to the right – shift intervening cards left by one
                for (let pos = fromPosition + 1; pos <= toPosition; pos++) {
                  const currentKey = pos.toString();
                  const previousKey = (pos - 1).toString();
                  if (updatedCards[currentKey]) {
                    updatedCards[previousKey] = updatedCards[currentKey];
                  } else {
                    delete updatedCards[previousKey];
                  }
                }
              } else if (fromPosition > toPosition) {
                // Moving card to the left – shift intervening cards right by one
                for (let pos = fromPosition - 1; pos >= toPosition; pos--) {
                  const currentKey = pos.toString();
                  const nextKey = (pos + 1).toString();
                  if (updatedCards[currentKey]) {
                    updatedCards[nextKey] = updatedCards[currentKey];
                  } else {
                    delete updatedCards[nextKey];
                  }
                }
              }

              // Finally insert the dragged card at its new index
              updatedCards[toKey] = cardToMove;
            } else {
              // Swap mode: simple swap
              updatedCards[fromKey] = cardAtDestination;
              updatedCards[toKey] = cardToMove;
            }
          } else {
            // Move to empty slot (same in both modes)
            updatedCards[toKey] = cardToMove;
            delete updatedCards[fromKey];
          }

          const updatedBinder = {
            ...binder,
            cards: updatedCards,
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            optimistic ? "card_moved_optimistic" : "card_moved",
            {
              cardId: cardToMove.cardId,
              fromPosition,
              toPosition,
              swappedWith: cardAtDestination?.cardId || null,
              optimistic,
            },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        return { success: true };
      } catch (error) {
        console.error("Failed to move card:", error);
        if (!options.optimistic) {
          toast.error("Failed to move card");
        }
        return { success: false, error: error.message };
      }
    },
    [currentBinder]
  );

  // Optimistic move card for drag preview
  const moveCardOptimistic = useCallback(
    (binderId, fromPosition, toPosition) => {
      return moveCard(binderId, fromPosition, toPosition, { optimistic: true });
    },
    [moveCard]
  );

  // Batch add cards (much more efficient than adding one by one)
  const batchAddCards = useCallback(
    async (
      binderId,
      cards,
      startPosition = null,
      metadata = {},
      isReplacement = false
    ) => {
      try {
        if (!cards || !Array.isArray(cards) || cards.length === 0) {
          throw new Error("Invalid cards data");
        }

        // Find the target binder for rule checking
        const targetBinder =
          binders.find((b) => b.id === binderId) || currentBinder;
        if (!targetBinder) {
          throw new Error("Binder not found");
        }

        // Check if user can add this many cards to the binder
        // For replacement operations (complete sets), don't count existing cards
        const currentCards = isReplacement
          ? 0
          : Object.keys(targetBinder.cards || {}).length;
        const canAdd = await checkBinderLimits.canAddCardsToBinder(
          { canPerformAction },
          user?.uid || "local_user",
          { ...targetBinder, cards: isReplacement ? {} : targetBinder.cards },
          cards.length
        );

        if (!canAdd.allowed) {
          const limit = canAdd.limit || GLOBAL_CARD_LIMIT;
          const remainingSpace = Math.max(0, limit - currentCards);
          throw new Error(
            canAdd.reason ||
              `Cannot add ${cards.length} cards! ${
                isReplacement
                  ? `This would exceed the ${limit} card limit.`
                  : `Only ${remainingSpace} slots remaining (${currentCards}/${limit} used).`
              } `
          );
        }

        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const updatedCards = { ...binder.cards };
          let currentPosition =
            startPosition !== null
              ? startPosition
              : findNextEmptyPosition(binder.cards);

          const addedCards = [];

          // Add all cards in a single operation
          cards.forEach((card, index) => {
            if (card && card.id) {
              // Find next available position
              while (updatedCards[currentPosition.toString()]) {
                currentPosition++;
              }

              const cardEntry = {
                instanceId: generateId(),
                cardId: card.id,
                // Store essential card data for cloud sync (filter out undefined values)
                cardData: {
                  id: card.id || null,
                  name: card.name || null,
                  image: card.image || null,
                  imageSmall: card.imageSmall || null,
                  set: {
                    id: card.set?.id || null,
                    name: card.set?.name || null,
                    series: card.set?.series || null,
                  },
                  number: card.number || null,
                  artist: card.artist || null,
                  rarity: card.rarity || null,
                  types: card.types || null,
                  reverseHolo: card.reverseHolo || false,
                },
                addedAt: new Date().toISOString(),
                addedBy: binder.ownerId,
                notes: metadata.notes || "",
                condition: metadata.condition || "mint",
                quantity: metadata.quantity || 1,
                isProtected: metadata.isProtected || false,
              };

              updatedCards[currentPosition.toString()] = cardEntry;
              addedCards.push({
                cardId: card.id,
                position: currentPosition,
              });
              currentPosition++;
            }
          });

          if (addedCards.length === 0) {
            return binder; // No cards were added
          }

          // Calculate required pages after adding all cards
          const gridConfig = {
            "1x1": { total: 1 },
            "2x2": { total: 4 },
            "3x3": { total: 9 },
            "4x3": { total: 12 },
            "4x4": { total: 16 },
          };

          const cardsPerPage =
            gridConfig[binder.settings?.gridSize || "3x3"]?.total || 9;
          const maxPosition = Math.max(
            ...Object.keys(updatedCards).map((pos) => parseInt(pos))
          );
          const requiredCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);

          // Convert card pages to binder pages
          let requiredBinderPages;
          if (requiredCardPages <= 1) {
            requiredBinderPages = 1;
          } else {
            const pairsNeeded = Math.ceil((requiredCardPages - 1) / 2);
            requiredBinderPages = 1 + pairsNeeded;
          }

          const currentPageCount = binder.settings?.pageCount || 1;
          const newPageCount = Math.max(
            requiredBinderPages,
            currentPageCount,
            binder.settings?.minPages || 1
          );

          const updatedBinder = {
            ...binder,
            cards: updatedCards,
            settings: {
              ...binder.settings,
              pageCount: newPageCount,
            },
          };

          // Mark binder as modified
          let finalBinder = markBinderAsModified(
            updatedBinder,
            "cards_batch_added",
            {
              cardsAdded: addedCards,
              count: addedCards.length,
              startPosition: startPosition,
            },
            binder.ownerId
          );

          // Apply auto-sort if enabled and not using custom sorting
          // However, automatically disable auto-sort for complete sets to preserve their intended order
          const isLikelyCompleteSet = isReplacement || addedCards.length >= 15; // 15+ cards likely indicates a set

          if (
            binder.settings?.autoSort &&
            binder.settings?.sortBy &&
            binder.settings.sortBy !== "custom" &&
            !isLikelyCompleteSet
          ) {
            try {
              const sortedCards = sortCards(
                finalBinder.cards,
                binder.settings.sortBy
              );
              finalBinder = {
                ...finalBinder,
                cards: sortedCards,
              };
            } catch (sortError) {
              console.warn(
                "Auto-sort failed, cards added without sorting:",
                sortError
              );
            }
          } else if (isLikelyCompleteSet && binder.settings?.autoSort) {
            // Automatically turn off auto-sort when adding complete sets
            finalBinder = {
              ...finalBinder,
              settings: {
                ...finalBinder.settings,
                autoSort: false,
                sortBy: "custom", // Switch to custom order to preserve set order
              },
            };

            console.log("Auto-sort disabled: Complete set detected");
          }

          return finalBinder;
        };

        // Check if auto-sort was disabled before updating binders
        const binderToCheck =
          binders.find((b) => b.id === binderId) || currentBinder;
        const isLikelyCompleteSet = isReplacement || cards.length >= 15;
        const wasAutoSortDisabled =
          isLikelyCompleteSet && binderToCheck?.settings?.autoSort;

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        // Show notification only once after all updates are complete
        if (wasAutoSortDisabled && isReplacement) {
          setTimeout(() => {
            toast.success("Auto-sort turned off to preserve set order", {
              duration: 3000,
              icon: "🎯",
            });
          }, 500);
        }

        return { success: true, count: cards.length };
      } catch (error) {
        console.error("Failed to batch add cards to binder:", error);
        toast.error("Failed to add cards to binder");
        throw error;
      }
    },
    [currentBinder, binders, checkBinderLimits, canPerformAction]
  );

  // Clear all cards from binder (efficient batch operation for complete set replacement)
  const clearBinderCards = useCallback(
    async (binderId, reason = "clear_for_replacement") => {
      try {
        const targetBinder =
          binders.find((b) => b.id === binderId) || currentBinder;
        if (!targetBinder) {
          throw new Error("Binder not found");
        }

        const cardCount = Object.keys(targetBinder.cards || {}).length;
        if (cardCount === 0) {
          return { success: true, count: 0 }; // Already empty
        }

        console.log(`Clearing ${cardCount} cards from binder ${binderId}`);

        // Single atomic operation to clear all cards
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const clearedBinder = {
            ...binder,
            cards: {}, // Clear all cards in one operation
            settings: {
              ...binder.settings,
              pageCount: binder.settings?.minPages || 1, // Reset to minimum pages
            },
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            clearedBinder,
            "cards_batch_cleared",
            {
              reason,
              clearedCount: cardCount,
              timestamp: new Date().toISOString(),
            },
            binder.ownerId
          );
        };

        // Update all binders atomically
        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being cleared
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        toast.success(`Cleared ${cardCount} cards from binder`);

        return { success: true, count: cardCount };
      } catch (error) {
        console.error("Failed to clear binder cards:", error);
        toast.error("Failed to clear binder cards");
        throw error;
      }
    },
    [currentBinder, binders]
  );

  // Reorder pages within binder
  const reorderPages = useCallback(
    async (binderId, fromIndex, toIndex) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          // Prevent moving the cover page (position 0)
          if (fromIndex === 0 || toIndex === 0) {
            console.warn(
              "Cannot move cover page - it must remain at position 0"
            );
            return binder;
          }

          const currentPageOrder =
            binder.settings?.pageOrder ||
            Array.from(
              { length: binder.settings?.pageCount || 1 },
              (_, i) => i
            );

          // Create new page order array
          const newPageOrder = [...currentPageOrder];
          const [movedPage] = newPageOrder.splice(fromIndex, 1);
          newPageOrder.splice(toIndex, 0, movedPage);

          const updatedBinder = {
            ...binder,
            settings: {
              ...binder.settings,
              pageOrder: newPageOrder,
            },
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "pages_reordered",
            {
              fromIndex,
              toIndex,
              pageOrder: newPageOrder,
            },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        return { success: true };
      } catch (error) {
        console.error("Failed to reorder pages:", error);
        toast.error("Failed to reorder pages");
        return { success: false, error: error.message };
      }
    },
    [currentBinder]
  );

  // Get logical page from physical page index (considering page order)
  const getLogicalPageIndex = useCallback(
    (binderId, physicalPageIndex) => {
      const binder = binders.find((b) => b.id === binderId);
      if (!binder) return physicalPageIndex;

      const pageOrder =
        binder.settings?.pageOrder ||
        Array.from({ length: binder.settings?.pageCount || 1 }, (_, i) => i);

      return pageOrder.indexOf(physicalPageIndex);
    },
    [binders]
  );

  // Get physical page from logical page index (considering page order)
  const getPhysicalPageIndex = useCallback(
    (binderId, logicalPageIndex) => {
      const binder = binders.find((b) => b.id === binderId);
      if (!binder) return logicalPageIndex;

      const pageOrder =
        binder.settings?.pageOrder ||
        Array.from({ length: binder.settings?.pageCount || 1 }, (_, i) => i);

      return pageOrder[logicalPageIndex] || logicalPageIndex;
    },
    [binders]
  );

  // Reorder card pages within binder
  const reorderCardPages = useCallback(
    async (binderId, fromCardPageIndex, toCardPageIndex) => {
      try {
        const binder = binders.find((b) => b.id === binderId);
        if (!binder) {
          throw new Error("Binder not found");
        }

        // Prevent moving cover page (card page 0)
        if (fromCardPageIndex === 0 || toCardPageIndex === 0) {
          toast.error("Cannot move the cover page");
          return { success: false, error: "Cannot move cover page" };
        }

        // Get grid configuration - using centralized constant
        const cardsPerPage =
          GRID_CONFIGS[binder.settings?.gridSize || "3x3"]?.total || 9;

        // Calculate position ranges for each card page
        // Card page 1 starts at position 0, card page 2 at position cardsPerPage, etc.
        const fromStartPosition = (fromCardPageIndex - 1) * cardsPerPage;
        const fromEndPosition = fromStartPosition + cardsPerPage - 1;
        const toStartPosition = (toCardPageIndex - 1) * cardsPerPage;
        const toEndPosition = toStartPosition + cardsPerPage - 1;

        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const updatedCards = { ...binder.cards };

          // Get all cards from source card page
          const sourceCards = {};
          const targetCards = {};

          for (let pos = fromStartPosition; pos <= fromEndPosition; pos++) {
            const posKey = pos.toString();
            if (updatedCards[posKey]) {
              sourceCards[pos] = updatedCards[posKey];
              delete updatedCards[posKey];
            }
          }

          // Get all cards from target card page
          for (let pos = toStartPosition; pos <= toEndPosition; pos++) {
            const posKey = pos.toString();
            if (updatedCards[posKey]) {
              targetCards[pos] = updatedCards[posKey];
              delete updatedCards[posKey];
            }
          }

          // Place source cards in target positions
          Object.entries(sourceCards).forEach(([sourcePos, card]) => {
            const relativePos = parseInt(sourcePos) - fromStartPosition;
            const newPos = toStartPosition + relativePos;
            updatedCards[newPos.toString()] = card;
          });

          // Place target cards in source positions
          Object.entries(targetCards).forEach(([targetPos, card]) => {
            const relativePos = parseInt(targetPos) - toStartPosition;
            const newPos = fromStartPosition + relativePos;
            updatedCards[newPos.toString()] = card;
          });

          const updatedBinder = {
            ...binder,
            cards: updatedCards,
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "card_pages_reordered",
            {
              fromCardPageIndex,
              toCardPageIndex,
              sourceCardCount: Object.keys(sourceCards).length,
              targetCardCount: Object.keys(targetCards).length,
            },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        toast.success(
          `Moved card page ${fromCardPageIndex} to position ${toCardPageIndex}`
        );
        return { success: true };
      } catch (error) {
        console.error("Failed to reorder card pages:", error);
        toast.error("Failed to reorder card pages");
        return { success: false, error: error.message };
      }
    },
    [binders, currentBinder]
  );

  // Batch move operations for complex drag scenarios
  const batchMoveCards = useCallback(
    async (binderId, operations) => {
      try {
        if (!operations || operations.length === 0) {
          return { success: true, operations: [] };
        }

        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          let updatedCards = { ...binder.cards };
          const successfulOperations = [];
          const failedOperations = [];

          // Validate and execute each operation
          operations.forEach((op) => {
            const { fromPosition, toPosition } = op;
            const validation = validateCardMove(
              { ...binder, cards: updatedCards },
              fromPosition,
              toPosition
            );

            if (validation.valid) {
              const fromKey = fromPosition.toString();
              const toKey = toPosition.toString();

              const cardToMove = updatedCards[fromKey];
              const cardAtDestination = updatedCards[toKey];

              if (cardToMove) {
                if (cardAtDestination) {
                  // Swap cards
                  updatedCards[fromKey] = cardAtDestination;
                  updatedCards[toKey] = cardToMove;
                } else {
                  // Move to empty slot
                  updatedCards[toKey] = cardToMove;
                  delete updatedCards[fromKey];
                }
                successfulOperations.push(op);
              } else {
                failedOperations.push({
                  ...op,
                  error: "No card at source position",
                });
              }
            } else {
              failedOperations.push({ ...op, error: validation.error });
            }
          });

          if (successfulOperations.length === 0) {
            return binder; // No changes
          }

          const updatedBinder = {
            ...binder,
            cards: updatedCards,
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "batch_move_cards",
            { operations: successfulOperations },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        return { success: true, operations };
      } catch (error) {
        console.error("Failed to batch move cards:", error);
        toast.error("Failed to move cards");
        return { success: false, error: error.message };
      }
    },
    [currentBinder]
  );

  // Update binder settings
  const updateBinderSettings = useCallback(
    async (binderId, settings) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          let updatedSettings = { ...binder.settings, ...settings };

          // If grid size is changing, recalculate page count
          if (
            settings.gridSize &&
            settings.gridSize !== binder.settings.gridSize
          ) {
            // Get grid configuration for new size
            const gridConfig = {
              "1x1": { total: 1 },
              "2x2": { total: 4 },
              "3x3": { total: 9 },
              "4x3": { total: 12 },
              "4x4": { total: 16 },
            };

            const newCardsPerPage = gridConfig[settings.gridSize]?.total || 9;

            // Calculate required pages based on existing cards and new grid size
            if (binder.cards && typeof binder.cards === "object") {
              const positions = Object.keys(binder.cards).map((pos) =>
                parseInt(pos)
              );

              if (positions.length > 0) {
                const maxPosition = Math.max(...positions);
                const requiredCardPages = Math.ceil(
                  (maxPosition + 1) / newCardsPerPage
                );

                // Convert card pages to actual binder pages
                // Page 1 is special (cover + 1 card page)
                // All other pages are pairs of card pages
                let requiredBinderPages;
                if (requiredCardPages <= 1) {
                  requiredBinderPages = 1;
                } else {
                  const pairsNeeded = Math.ceil((requiredCardPages - 1) / 2);
                  requiredBinderPages = 1 + pairsNeeded;
                }

                // Update page count to accommodate all cards with new grid size
                // Don't use current pageCount in max() - recalculate based on actual needs
                const newPageCount = Math.max(
                  requiredBinderPages,
                  updatedSettings.minPages || 1
                );

                // Respect max pages setting
                const maxPages = updatedSettings.maxPages || 100;
                updatedSettings.pageCount = Math.min(newPageCount, maxPages);

                console.log(
                  `Grid size changed from ${binder.settings.gridSize} to ${settings.gridSize}`
                );
                console.log(
                  `Cards per page: ${binder.settings.gridSize} (${
                    gridConfig[binder.settings.gridSize]?.total || 9
                  }) → ${settings.gridSize} (${newCardsPerPage})`
                );
                console.log(`Max card position: ${maxPosition}`);
                console.log(`Required card pages: ${requiredCardPages}`);
                console.log(`Required binder pages: ${requiredBinderPages}`);
                console.log(
                  `Page count updated: ${binder.settings.pageCount} → ${updatedSettings.pageCount}`
                );
              }
            }
          }

          const updatedBinder = {
            ...binder,
            settings: updatedSettings,
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "settings_updated",
            {
              changes: settings,
              previousSettings: binder.settings,
              calculatedPageCount:
                updatedSettings.pageCount !== binder.settings.pageCount
                  ? updatedSettings.pageCount
                  : undefined,
            },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }
      } catch (error) {
        console.error("Failed to update binder settings:", error);
        toast.error("Failed to update binder settings");
        throw error;
      }
    },
    [currentBinder]
  );

  // Clear all data (for development/testing)
  const clearAllData = useCallback(() => {
    setBinders([]);
    setCurrentBinder(null);
    localStorage.removeItem(STORAGE_KEYS.BINDERS);
    storage.remove(STORAGE_KEYS.CURRENT_BINDER);
    toast.success("All binder data cleared");
  }, []);

  // Cleanup changelogs for all binders (fix for bloated changelogs)
  const cleanupAllBinderChangelogs = useCallback(() => {
    setBinders((prevBinders) => {
      const cleanedBinders = prevBinders.map((binder) => {
        const originalLength = binder.changelog?.length || 0;
        if (originalLength > 100) {
          const cleanedBinder = cleanupBinderChangelog(binder);
          console.log(
            `Cleaned binder ${
              binder.metadata?.name || binder.id
            }: ${originalLength} -> ${cleanedBinder.changelog.length} entries`
          );
          return cleanedBinder;
        }
        return binder;
      });

      // Save cleaned data
      storage.set(STORAGE_KEYS.BINDERS, cleanedBinders);

      // Show summary
      const cleanedCount = cleanedBinders.filter(
        (binder, index) =>
          (binder.changelog?.length || 0) !==
          (prevBinders[index]?.changelog?.length || 0)
      ).length;

      if (cleanedCount > 0) {
        toast.success(
          `Cleaned up changelogs for ${cleanedCount} binder${
            cleanedCount > 1 ? "s" : ""
          }`
        );
      } else {
        toast.success("No bloated changelogs found");
      }

      return cleanedBinders;
    });
  }, []);

  // Export binder data
  const exportBinderData = useCallback(() => {
    try {
      const data = {
        binders,
        currentBinderId: currentBinder?.id || null,
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pokemon-binders-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Binder data exported");
    } catch (error) {
      console.error("Failed to export data:", error);
      toast.error("Failed to export data");
    }
  }, [binders, currentBinder]);

  // Import data
  const importBinderData = useCallback((data) => {
    try {
      if (!data.binders || !Array.isArray(data.binders)) {
        throw new Error("Invalid data format");
      }

      setBinders(data.binders);

      if (data.currentBinderId) {
        const binder = data.binders.find((b) => b.id === data.currentBinderId);
        if (binder) {
          setCurrentBinder(binder);
        }
      }

      toast.success("Binder data imported");
    } catch (error) {
      console.error("Failed to import data:", error);
      toast.error("Failed to import data");
    }
  }, []);

  // Page management functions
  const addPage = useCallback(
    async (binderId) => {
      try {
        // Get the binder to check
        const binder = binders.find((b) => b.id === binderId);
        if (!binder) {
          toast.error("Binder not found");
          return;
        }

        // Get current page count from settings (ensure settings exist)
        const settings = binder.settings || DEFAULT_BINDER_SETTINGS;
        const currentPageCount = settings.pageCount || 1;

        // Check if we're within max pages limit using rules system
        const pageCheck = await canPerformAction("add_page_to_binder", {
          currentCount: currentPageCount,
        });

        if (!pageCheck.allowed) {
          toast.error(
            `Page limit reached! Maximum is ${pageCheck.limit || 50} pages. ${
              !user
                ? "Increase grid size to fit more cards."
                : "Increase grid size to fit more cards."
            }`
          );
          return;
        }

        const newPageCount = currentPageCount + 1;

        const updateBinder = (binderToUpdate) => {
          if (binderToUpdate.id !== binderId) return binderToUpdate;

          const updatedBinder = {
            ...binderToUpdate,
            settings: {
              ...(binderToUpdate.settings || DEFAULT_BINDER_SETTINGS),
              pageCount: newPageCount,
            },
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "page_added",
            {
              pageNumber: newPageCount,
              previousPageCount: currentPageCount,
            },
            binderToUpdate.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        // Show success message
        toast.success(`Added page ${newPageCount}`);
      } catch (error) {
        console.error("Failed to add page:", error);
        toast.error("Failed to add page");
        throw error;
      }
    },
    [currentBinder, binders, canPerformAction, user]
  );

  const batchAddPages = useCallback(
    async (binderId, pageCount) => {
      try {
        // Get the binder to check
        const binder = binders.find((b) => b.id === binderId);
        if (!binder) {
          toast.error("Binder not found");
          return;
        }

        // Get current page count from settings (ensure settings exist)
        const settings = binder.settings || DEFAULT_BINDER_SETTINGS;
        const currentPageCount = settings.pageCount || 1;

        // Check if we're within max pages limit using rules system
        const pageCheck = await canPerformAction("add_page_to_binder", {
          currentCount: currentPageCount,
        });

        const newPageCount = currentPageCount + pageCount;
        if (
          !pageCheck.allowed ||
          (pageCheck.limit && newPageCount > pageCheck.limit)
        ) {
          const maxPossible = pageCheck.limit
            ? pageCheck.limit - currentPageCount
            : 0;
          toast.error(
            `Cannot add ${pageCount} pages! Maximum is ${
              pageCheck.limit || 50
            }. Can only add ${maxPossible} more pages. ${
              !user
                ? "Increase grid size to fit more cards."
                : "Increase grid size to fit more cards."
            }`
          );
          return;
        }

        const updateBinder = (binderToUpdate) => {
          if (binderToUpdate.id !== binderId) return binderToUpdate;

          const updatedBinder = {
            ...binderToUpdate,
            settings: {
              ...(binderToUpdate.settings || DEFAULT_BINDER_SETTINGS),
              pageCount: newPageCount,
            },
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "pages_batch_added",
            {
              pagesAdded: pageCount,
              fromPageCount: currentPageCount,
              toPageCount: newPageCount,
            },
            binderToUpdate.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        // Show success message
        toast.success(
          `Added ${pageCount} page${pageCount > 1 ? "s" : ""} (${
            currentPageCount + 1
          }-${newPageCount})`
        );
      } catch (error) {
        console.error("Failed to add pages:", error);
        toast.error("Failed to add pages");
        throw error;
      }
    },
    [currentBinder, binders, canPerformAction, user]
  );

  const removePage = useCallback(
    async (binderId) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          // Get current page count from settings
          const currentPageCount = binder.settings?.pageCount || 1;

          // Check if we're at minimum pages
          if (currentPageCount <= binder.settings.minPages) {
            toast.error(
              `Cannot remove pages. Minimum is ${binder.settings.minPages}`
            );
            return binder;
          }

          // Get grid configuration to check if last page has cards
          const gridConfig = {
            "1x1": { total: 1 },
            "2x2": { total: 4 },
            "3x3": { total: 9 },
            "4x3": { total: 12 },
            "4x4": { total: 16 },
          };

          const cardsPerPage = gridConfig[binder.settings.gridSize]?.total || 9;

          // Calculate positions for the last card pages to be removed
          // Formula: First binder page has 1 card page, subsequent pages have 2 card pages each
          // So binder page N corresponds to card pages: 1 + (N-1)*2 = 2*N - 1 card pages total
          const totalCardPagesBefore =
            currentPageCount === 1 ? 0 : 1 + (currentPageCount - 2) * 2;
          const totalCardPagesAfter =
            currentPageCount === 1 ? 0 : 1 + (currentPageCount - 1) * 2;

          // Check if the card pages that would be removed contain any cards
          const lastPageStartPosition = totalCardPagesBefore * cardsPerPage;
          const lastPageEndPosition = totalCardPagesAfter * cardsPerPage - 1;

          const positions = Object.keys(binder.cards).map((pos) =>
            parseInt(pos)
          );
          const hasCardsOnLastPage = positions.some(
            (pos) => pos >= lastPageStartPosition && pos <= lastPageEndPosition
          );

          if (hasCardsOnLastPage) {
            toast.error("Cannot remove page - last page contains cards");
            return binder;
          }

          const newPageCount = currentPageCount - 1;

          const updatedBinder = {
            ...binder,
            settings: {
              ...binder.settings,
              pageCount: newPageCount,
            },
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "page_removed",
            {
              pageNumber: currentPageCount,
              newPageCount: newPageCount,
            },
            binder.ownerId
          );
        };

        // Get the page number before updating (for the toast message)
        const binder = binders.find((b) => b.id === binderId);
        const pageNumberToRemove = binder?.settings?.pageCount || 1;

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        // Show success message only once
        toast.success(`Removed page ${pageNumberToRemove}`);
      } catch (error) {
        console.error("Failed to remove page:", error);
        toast.error("Failed to remove page");
        throw error;
      }
    },
    [currentBinder, binders]
  );

  const getPageCount = useCallback(
    (binderId) => {
      const binder = binderId
        ? binders.find((b) => b.id === binderId)
        : currentBinder;

      if (!binder) return 1;

      // Get the stored page count from settings (this includes manually added pages)
      const storedPageCount = binder.settings?.pageCount || 1;

      // Calculate minimum pages needed based on cards (if any)
      if (binder.cards && typeof binder.cards === "object") {
        const positions = Object.keys(binder.cards).map((pos) => parseInt(pos));

        if (positions.length > 0) {
          // Get grid configuration
          const gridConfig = {
            "1x1": { total: 1 },
            "2x2": { total: 4 },
            "3x3": { total: 9 },
            "4x3": { total: 12 },
            "4x4": { total: 16 },
          };

          const cardsPerPage =
            gridConfig[binder.settings?.gridSize || "3x3"]?.total || 9;

          const maxPosition = Math.max(...positions);
          const requiredCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);

          // Convert card pages to binder pages
          // Formula: binder pages = 1 + Math.ceil((cardPages - 1) / 2)
          // This accounts for first binder page having 1 card page, rest having 2
          const requiredPages =
            requiredCardPages <= 1
              ? 1
              : 1 + Math.ceil((requiredCardPages - 1) / 2);

          // Return the higher of stored pages or required pages for cards
          return Math.max(
            storedPageCount,
            requiredPages,
            binder.settings?.minPages || 1
          );
        }
      }

      // No cards, return stored page count (respecting minimum)
      return Math.max(storedPageCount, binder.settings?.minPages || 1);
    },
    [binders, currentBinder]
  );

  const updateBinderMetadata = useCallback(
    async (binderId, metadataUpdates) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const updatedBinder = {
            ...binder,
            metadata: {
              ...binder.metadata,
              ...metadataUpdates,
            },
          };

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "metadata_updated",
            { updates: metadataUpdates },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        // Save to localStorage
        const updatedBinders = binders.map(updateBinder);
        storage.set(STORAGE_KEYS.BINDERS, updatedBinders);
      } catch (error) {
        console.error("Failed to update binder metadata:", error);
        toast.error("Failed to update binder metadata");
        throw error;
      }
    },
    [binders, currentBinder]
  );

  // Save binder to cloud with conflict detection
  const saveBinderToCloud = useCallback(
    async (binderId, options = {}) => {
      if (!user) {
        throw new Error("User must be signed in to save");
      }

      const binder = binders.find((b) => b.id === binderId);
      if (!binder) {
        throw new Error("Binder not found");
      }

      try {
        setSyncStatus((prev) => ({
          ...prev,
          [binderId]: { status: "saving", message: "Saving to cloud..." },
        }));

        // First check if there's a conflict
        const cloudDoc = await binderSyncService.getCloudBinder(
          binderId,
          user.uid
        );

        if (cloudDoc && !options.forceOverwrite) {
          const localModified = new Date(binder.lastModified || 0);
          const cloudModified = new Date(cloudDoc.lastModified || 0);

          // If cloud version is newer, ask user what to do
          if (cloudModified > localModified) {
            const shouldOverwrite = await new Promise((resolve) => {
              // Show conflict dialog
              const dialog = confirm(
                `The binder "${binder.metadata?.name}" in the cloud was modified more recently.\n\n` +
                  `Local version: ${localModified.toLocaleString()}\n` +
                  `Cloud version: ${cloudModified.toLocaleString()}\n\n` +
                  `Do you want to overwrite the cloud version with your local changes?\n\n` +
                  `Click OK to overwrite, Cancel to keep cloud version.`
              );
              resolve(dialog);
            });

            if (!shouldOverwrite) {
              setSyncStatus((prev) => ({
                ...prev,
                [binderId]: {
                  status: "conflict",
                  message: "Save cancelled - cloud version is newer",
                },
              }));
              throw new Error("Save cancelled - cloud version is newer");
            }
          }
        }

        // Save to cloud (with forceOverwrite if user confirmed)
        const result = await binderSyncService.syncToCloud(binder, user.uid, {
          ...options,
          forceOverwrite: options.forceOverwrite || cloudDoc,
        });

        if (result.success) {
          // Update local binder with synced version
          setBinders((prev) =>
            prev.map((b) => (b.id === binderId ? result.binder : b))
          );

          if (currentBinder?.id === binderId) {
            setCurrentBinder(result.binder);
          }

          setSyncStatus((prev) => ({
            ...prev,
            [binderId]: {
              status: "synced",
              message: "Saved to cloud successfully",
            },
          }));

          toast.success(`"${binder.metadata?.name}" saved to cloud`);
          return result;
        }
      } catch (error) {
        console.error("Failed to save binder to cloud:", error);
        setSyncStatus((prev) => ({
          ...prev,
          [binderId]: { status: "error", message: error.message },
        }));

        if (!error.message.includes("cancelled")) {
          toast.error(
            `Failed to save "${binder.metadata?.name}": ${error.message}`
          );
        }
        throw error;
      }
    },
    [binders, currentBinder, user]
  );

  // Legacy sync function - now just calls saveBinderToCloud
  const syncBinderToCloud = useCallback(
    async (binderId, options = {}) => {
      return await saveBinderToCloud(binderId, options);
    },
    [saveBinderToCloud]
  );

  const downloadBinderFromCloud = useCallback(
    async (binderId) => {
      if (!user) {
        throw new Error("User must be signed in to download");
      }

      try {
        // Invalidate cache before downloading to ensure fresh data
        invalidateCache();

        setSyncStatus((prev) => ({
          ...prev,
          [binderId]: {
            status: "downloading",
            message: "Downloading from cloud...",
          },
        }));

        const result = await binderSyncService.downloadFromCloud(
          binderId,
          user.uid
        );

        if (result.success) {
          // Update or add binder to local storage
          let updatedBinders;
          setBinders((prev) => {
            const existingIndex = prev.findIndex((b) => b.id === binderId);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = result.binder;
              updatedBinders = updated;
              return updated;
            } else {
              updatedBinders = [...prev, result.binder];
              return updatedBinders;
            }
          });

          if (currentBinder?.id === binderId) {
            setCurrentBinder(result.binder);
          }

          // Update cache with the fresh binder data after state update
          if (updatedBinders) {
            setCachedData(updatedBinders);
          }

          setSyncStatus((prev) => ({
            ...prev,
            [binderId]: {
              status: "synced",
              message: "Downloaded successfully",
            },
          }));

          return result;
        }
      } catch (error) {
        setSyncStatus((prev) => ({
          ...prev,
          [binderId]: { status: "error", message: error.message },
        }));
        throw error;
      }
    },
    [currentBinder, user, setCachedData, invalidateCache]
  );

  const getAllCloudBinders = useCallback(async () => {
    if (!user) {
      throw new Error("User must be signed in");
    }

    try {
      return await binderSyncService.getAllCloudBinders(user.uid);
    } catch (error) {
      console.error("Failed to get cloud binders:", error);
      throw error;
    }
  }, [user]);

  const deleteBinderFromCloud = useCallback(
    async (binderId) => {
      if (!user) {
        throw new Error("User must be signed in");
      }

      try {
        return await binderSyncService.deleteFromCloud(binderId, user.uid);
      } catch (error) {
        console.error("Failed to delete from cloud:", error);
        throw error;
      }
    },
    [user]
  );

  // Auto-sync cloud binders when user logs in
  const autoSyncCloudBinders = useCallback(
    async (forceRefresh = false) => {
      if (!user) {
        return;
      }

      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cachedData = getCachedData();
        if (cachedData) {
          console.log("Loading binders from cache");
          setBinders(cachedData);
          return;
        }
      }

      console.log("Loading binders from Firebase");

      try {
        // Get all cloud binders
        const cloudBinders = await binderSyncService.getAllCloudBinders(
          user.uid
        );

        if (cloudBinders.length === 0) {
          return;
        }

        // Merge with local binders
        setBinders((localBinders) => {
          const merged = [...localBinders];
          let addedCount = 0;
          let updatedCount = 0;
          let deletedCount = 0;
          const updatedBinderIds = []; // Track which binders were updated
          const cloudBinderIds = new Set(cloudBinders.map((b) => b.id));

          // First, remove local binders that no longer exist in cloud
          // Only remove binders that were previously synced (have sync status)
          for (let i = merged.length - 1; i >= 0; i--) {
            const localBinder = merged[i];
            const wasCloudBinder =
              localBinder.sync?.status === "synced" ||
              localBinder.sync?.lastSynced;

            // Never remove binders with "local" status - these are newly created and not yet saved
            const isNewLocalBinder = localBinder.sync?.status === "local";

            // If this was a cloud binder but no longer exists in cloud, remove it
            // But don't remove local-only binders that were never synced
            if (
              wasCloudBinder &&
              !isNewLocalBinder &&
              !cloudBinderIds.has(localBinder.id)
            ) {
              console.log(
                `Removing deleted cloud binder: "${localBinder.metadata?.name}"`
              );

              // Clear current binder if it's being deleted
              setCurrentBinder((currentBinder) => {
                if (currentBinder?.id === localBinder.id) {
                  console.log(
                    `Clearing current binder "${localBinder.metadata?.name}" - deleted from cloud`
                  );
                  return null;
                }
                return currentBinder;
              });

              merged.splice(i, 1);
              deletedCount++;
            }
          }

          cloudBinders.forEach((cloudBinder) => {
            const existingIndex = merged.findIndex(
              (b) => b.id === cloudBinder.id
            );

            if (existingIndex >= 0) {
              // Binder exists locally, check if cloud version is newer
              const localBinder = merged[existingIndex];
              const cloudVersion = cloudBinder.version || 0;
              const localVersion = localBinder.version || 0;
              const cloudModified = new Date(cloudBinder.lastModified || 0);
              const localModified = new Date(localBinder.lastModified || 0);

              // Use cloud version if it's newer (version or timestamp)
              if (
                cloudVersion > localVersion ||
                cloudModified > localModified
              ) {
                console.log(
                  `Cloud binder "${cloudBinder.metadata?.name}" is newer:`,
                  {
                    cloudVersion,
                    localVersion,
                    cloudModified: cloudModified.toISOString(),
                    localModified: localModified.toISOString(),
                  }
                );
                const updatedCloudBinder = {
                  ...cloudBinder,
                  sync: {
                    ...cloudBinder.sync,
                    status: "synced",
                    lastSynced:
                      cloudBinder.sync?.lastSynced || new Date().toISOString(),
                  },
                };
                merged[existingIndex] = updatedCloudBinder;
                updatedCount++;
                updatedBinderIds.push(cloudBinder.id);

                // Update current binder if it's the one being updated
                setCurrentBinder((currentBinder) => {
                  if (currentBinder?.id === cloudBinder.id) {
                    console.log(
                      `Updating current binder "${cloudBinder.metadata?.name}" with cloud version`
                    );
                    return updatedCloudBinder;
                  }
                  return currentBinder;
                });
              }
            } else {
              // New binder from cloud, add it
              const newCloudBinder = {
                ...cloudBinder,
                sync: {
                  ...cloudBinder.sync,
                  status: "synced",
                  lastSynced:
                    cloudBinder.sync?.lastSynced || new Date().toISOString(),
                },
              };
              merged.push(newCloudBinder);
              addedCount++;
            }
          });

          // Save merged binders to localStorage and cache
          storage.set(STORAGE_KEYS.BINDERS, merged);
          setCachedData(merged);

          if (addedCount > 0 || updatedCount > 0 || deletedCount > 0) {
            // Show a toast notification
            const messages = [];
            if (addedCount > 0) messages.push(`${addedCount} new`);
            if (updatedCount > 0) messages.push(`${updatedCount} updated`);
            if (deletedCount > 0) messages.push(`${deletedCount} deleted`);

            toast.success(
              `Synced ${messages.join(", ")} binder${
                addedCount + updatedCount + deletedCount > 1 ? "s" : ""
              } from cloud`
            );
          }

          return merged;
        });
      } catch (error) {
        console.error("Auto-sync failed:", error);
        // Don't show error toast for auto-sync failures to avoid being intrusive
      }
    },
    [user, getCachedData, setCachedData]
  );

  // Manual cache refresh function
  const refreshCache = useCallback(async () => {
    console.log("Manually refreshing cache");
    await autoSyncCloudBinders(true);
  }, [autoSyncCloudBinders]);

  // Force clear cache and resync (for debugging sync issues)
  const forceClearAndSync = useCallback(async () => {
    console.log("Force clearing cache and resyncing...");
    invalidateCache();
    await autoSyncCloudBinders(true);
    toast.success("Cache cleared and resynced from cloud");
  }, [invalidateCache, autoSyncCloudBinders]);

  // Initial cache refresh for logged-in users after initialization
  useEffect(() => {
    if (!user || isLoading) return;

    // If we loaded from cache, schedule a background refresh
    const cachedData = getCachedData();
    if (cachedData) {
      const timeoutId = setTimeout(() => {
        autoSyncCloudBinders(true);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [user, isLoading, getCachedData, autoSyncCloudBinders]);

  // Background sync interval - refresh every 2 minutes when user is active
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Only sync if document is visible (user is active)
      if (!document.hidden) {
        autoSyncCloudBinders(true);
      }
    }, BACKGROUND_SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [user, autoSyncCloudBinders]);

  // Migration function to add cardData to existing binder cards
  const migrateBinderCardData = useCallback(async (binderId) => {
    // Get current state inside the function to avoid dependency issues
    setBinders((currentBinders) => {
      const binder = currentBinders.find((b) => b.id === binderId);
      if (!binder?.cards) return currentBinders;

      let hasChanges = false;
      const updatedCards = { ...binder.cards };

      // Get card cache from localStorage
      const getCardCache = () => {
        try {
          const item = localStorage.getItem("pokemon_card_cache");
          return item ? JSON.parse(item) : {};
        } catch (error) {
          console.error("Error reading card cache:", error);
          return {};
        }
      };

      const cardCache = getCardCache();

      // Check each card entry for missing cardData
      for (const [position, cardEntry] of Object.entries(binder.cards)) {
        if (!cardEntry.cardData && cardEntry.cardId) {
          // Try to get card data from cache
          const cachedCard = cardCache[cardEntry.cardId];
          if (cachedCard) {
            updatedCards[position] = {
              ...cardEntry,
              cardData: {
                id: cachedCard.id,
                name: cachedCard.name,
                image: cachedCard.image,
                imageSmall: cachedCard.imageSmall,
                set: {
                  id: cachedCard.set?.id,
                  name: cachedCard.set?.name,
                  series: cachedCard.set?.series,
                },
                number: cachedCard.number,
                artist: cachedCard.artist,
                rarity: cachedCard.rarity,
                types: cachedCard.types,
              },
            };
            hasChanges = true;
          }
        }
      }

      // Return updated binders if we made changes
      if (hasChanges) {
        const updatedBinders = currentBinders.map((b) =>
          b.id === binderId
            ? { ...b, cards: updatedCards, version: b.version + 1 }
            : b
        );

        // Also update current binder if needed
        setCurrentBinder((prevCurrent) => {
          if (prevCurrent?.id === binderId) {
            return {
              ...prevCurrent,
              cards: updatedCards,
              version: prevCurrent.version + 1,
            };
          }
          return prevCurrent;
        });

        return updatedBinders;
      }

      return currentBinders;
    });
  }, []);

  // Filter binders based on current user context for privacy/security
  const getVisibleBinders = useCallback(() => {
    if (!user) {
      // When not logged in, only show guest binders (created while not logged in)
      return binders.filter((binder) => binder.ownerId === "local_user");
    } else {
      // When logged in, only show user's own binders and claimed binders
      return binders.filter(
        (binder) =>
          binder.ownerId === user.uid || binder.ownerId === "local_user" // Allow guest binders to be claimed
      );
    }
  }, [binders, user]);

  // Get filtered binders for current user context
  const visibleBinders = getVisibleBinders();

  // Auto-sync when user changes (logs in/out)
  useEffect(() => {
    if (user && !isLoading) {
      // Only sync if user is logged in and not loading
      autoSyncCloudBinders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isLoading]); // Only depend on user ID and loading state to avoid circular updates

  // Security check: Clear current binder if it doesn't belong to current user
  useEffect(() => {
    if (currentBinder) {
      const isCurrentBinderVisible = visibleBinders.some(
        (b) => b.id === currentBinder.id
      );
      if (!isCurrentBinderVisible) {
        console.log(
          `Clearing current binder "${currentBinder.metadata?.name}" - not accessible to current user`
        );
        setCurrentBinder(null);
      }
    }
  }, [currentBinder, visibleBinders]);

  // Security helper: Check if user can access binder
  const canAccessBinder = useCallback(
    (binderId) => {
      const binder = binders.find((b) => b.id === binderId);
      if (!binder) return false;

      return !user
        ? binder.ownerId === "local_user"
        : binder.ownerId === user.uid || binder.ownerId === "local_user";
    },
    [binders, user]
  );

  // Helper to mark binder as modified when any changes are made (with security check)
  const markAsModified = useCallback(
    (binderId, changeType, changeData) => {
      // Security check
      if (!canAccessBinder(binderId)) {
        console.warn(
          `Access denied: Cannot modify binder ${binderId} - not owned by current user`
        );
        return;
      }

      setBinders((prev) =>
        prev.map((binder) => {
          if (binder.id === binderId) {
            return markBinderAsModified(
              binder,
              changeType,
              changeData,
              user?.uid
            );
          }
          return binder;
        })
      );

      if (currentBinder?.id === binderId) {
        setCurrentBinder((prev) =>
          markBinderAsModified(prev, changeType, changeData, user?.uid)
        );
      }
    },
    [currentBinder, user, canAccessBinder]
  );

  // Helper to check if a binder is local-only (not synced to current user's cloud)
  const isLocalOnlyBinder = useCallback(
    (binder) => {
      if (!user) return false; // Don't show local-only warnings when not logged in

      // If binder belongs to a different user, it's local-only
      if (binder.ownerId !== user.uid && binder.ownerId !== "local_user") {
        return true;
      }

      // If binder was created before login (ownerId: "local_user"), it's local-only
      if (binder.ownerId === "local_user") {
        return true;
      }

      // If binder belongs to current user, it's NOT local-only (it's either synced or unsaved)
      // The LocalBinderWarning should only show for binders from OTHER users/sessions
      if (binder.ownerId === user.uid) {
        return false;
      }

      return false;
    },
    [user]
  );

  // Helper to check if a binder belongs to current user
  const isOwnedByCurrentUser = useCallback(
    (binder) => {
      if (!user) return false;
      return binder.ownerId === user.uid;
    },
    [user]
  );

  // Get local-only binders
  const getLocalOnlyBinders = useCallback(() => {
    if (!user) return []; // Don't show local-only warning when not logged in
    return binders.filter((binder) => isLocalOnlyBinder(binder));
  }, [binders, user, isLocalOnlyBinder]);

  // Claim a local binder (transfer ownership to current user)
  const claimLocalBinder = useCallback(
    async (binderId) => {
      if (!user) {
        throw new Error("Must be logged in to claim binders");
      }

      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const updatedBinder = {
            ...binder,
            ownerId: user.uid,
            lastModifiedBy: user.uid,
          };

          // Mark as modified so it shows as needing to be saved to cloud
          return markBinderAsModified(
            updatedBinder,
            "ownership_claimed",
            {
              previousOwner: binder.ownerId,
              newOwner: user.uid,
            },
            user.uid
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being claimed
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        const binderName =
          binders.find((b) => b.id === binderId)?.metadata?.name || "binder";
        toast.success(`Claimed "${binderName}" - save to cloud to keep it`);

        return true;
      } catch (error) {
        console.error("Failed to claim binder:", error);
        toast.error("Failed to claim binder");
        throw error;
      }
    },
    [binders, currentBinder, user]
  );

  // Clear all local-only binders (for privacy when switching users)
  const clearLocalOnlyBinders = useCallback(() => {
    if (!user) return;

    const localOnlyBinderIds = binders
      .filter((binder) => isLocalOnlyBinder(binder))
      .map((binder) => binder.id);

    if (localOnlyBinderIds.length === 0) return;

    setBinders((prev) =>
      prev.filter((binder) => !localOnlyBinderIds.includes(binder.id))
    );

    // Clear current binder if it was local-only
    if (currentBinder && localOnlyBinderIds.includes(currentBinder.id)) {
      setCurrentBinder(null);
    }

    toast.success(
      `Cleared ${localOnlyBinderIds.length} local binder${
        localOnlyBinderIds.length > 1 ? "s" : ""
      } from previous user`
    );
  }, [binders, currentBinder, user, isLocalOnlyBinder]);

  // Check if a binder exists in Firebase cloud (for verification)
  const checkBinderExistsInCloud = useCallback(
    async (binderId) => {
      if (!user) return false;

      try {
        const cloudBinder = await binderSyncService.getCloudBinder(
          binderId,
          user.uid
        );
        return !!cloudBinder;
      } catch (error) {
        // If error is "not found", that's expected for local-only binders
        if (
          error.message?.includes("not found") ||
          error.message?.includes("does not exist")
        ) {
          return false;
        }
        console.error("Error checking cloud binder:", error);
        return false;
      }
    },
    [user]
  );

  // Enhanced verification against Firebase (optional, for accuracy)
  const verifyLocalOnlyStatus = useCallback(
    async (binderId) => {
      const binder = binders.find((b) => b.id === binderId);
      if (!binder || !user) return false;

      // Quick local check first
      const localCheck = isLocalOnlyBinder(binder);
      if (!localCheck) return false; // If locally it's not local-only, no need to check cloud

      // For binders that might be questionable, verify against Firebase
      if (binder.ownerId === user.uid) {
        const existsInCloud = await checkBinderExistsInCloud(binderId);
        return !existsInCloud; // If doesn't exist in cloud, it's local-only
      }

      return localCheck; // For other users' binders, trust local check
    },
    [binders, user, isLocalOnlyBinder, checkBinderExistsInCloud]
  );

  // Check for unsaved changes when user logs out
  const checkUnsavedChanges = useCallback(() => {
    if (!user) return { hasUnsaved: false, binders: [] };

    const unsavedBinders = binders.filter((binder) => {
      // Only check binders owned by current user
      if (binder.ownerId !== user.uid) return false;

      // Check if binder has local changes that aren't synced
      return (
        binder.sync?.status === "local" ||
        binder.sync?.pendingChanges?.length > 0 ||
        !binder.sync?.lastSynced
      );
    });

    return {
      hasUnsaved: unsavedBinders.length > 0,
      binders: unsavedBinders,
      count: unsavedBinders.length,
    };
  }, [binders, user]);

  // Function to warn user about logout with unsaved changes
  const warnBeforeLogout = useCallback(() => {
    const unsavedInfo = checkUnsavedChanges();

    if (unsavedInfo.hasUnsaved) {
      const binderNames = unsavedInfo.binders
        .map((b) => b.metadata?.name || "Unnamed")
        .join(", ");
      const message = `You have ${unsavedInfo.count} binder${
        unsavedInfo.count > 1 ? "s" : ""
      } with unsaved changes:\n${binderNames}\n\nThese changes will not be accessible after logout. Save to cloud first?`;

      return window.confirm(message);
    }

    return true; // No unsaved changes, safe to logout
  }, [checkUnsavedChanges]);

  // Fetch public binders for a specific user (for profile viewing)
  const fetchUserPublicBinders = useCallback(async (userId) => {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Query Firebase for public binders by this user
      const publicBindersQuery = query(
        collection(db, "user_binders"),
        where("ownerId", "==", userId),
        where("permissions.public", "==", true),
        where("metadata.isArchived", "==", false),
        orderBy("metadata.createdAt", "desc")
      );

      const snapshot = await getDocs(publicBindersQuery);
      const publicBinders = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Remove server timestamp before adding to array
        const { serverTimestamp, ...binderData } = data;
        publicBinders.push(binderData);
      });

      console.log(
        `Found ${publicBinders.length} public binders for user ${userId}`
      );
      return publicBinders;
    } catch (error) {
      console.error("Error fetching user public binders:", error);

      // If Firebase query fails, return empty array instead of throwing
      if (
        error.code === "failed-precondition" ||
        error.code === "permission-denied"
      ) {
        console.warn("Firebase query failed, returning empty array");
        return [];
      }

      throw error;
    }
  }, []);

  // Get public binder by ID (for viewing other users' public binders)
  const getPublicBinder = useCallback(async (binderId, ownerId) => {
    try {
      if (!binderId || !ownerId) {
        throw new Error("Binder ID and Owner ID are required");
      }

      // Try to get the binder from Firebase
      const binderRef = doc(db, "user_binders", `${ownerId}_${binderId}`);
      const binderSnap = await getDoc(binderRef);

      if (!binderSnap.exists()) {
        throw new Error("Binder not found");
      }

      let binderData = binderSnap.data();

      // Check if binder is public
      if (!binderData.permissions?.public) {
        throw new Error("Binder is private");
      }

      // If using subcollection storage, load cards separately
      if (binderData.cardsStorage === "subcollection") {
        const cardsSnap = await getDocs(collection(binderRef, "cards"));
        const cards = {};
        cardsSnap.forEach((cardDoc) => {
          cards[cardDoc.id] = cardDoc.data();
        });
        binderData = { ...binderData, cards };
      }

      // Remove server timestamp before returning
      const { serverTimestamp, ...binder } = binderData;
      return binder;
    } catch (error) {
      console.error("Error fetching public binder:", error);
      throw error;
    }
  }, []);

  // Update binder privacy without triggering "unsaved changes" state
  const updateBinderPrivacy = useCallback(
    async (binderId, isPublic) => {
      try {
        const now = new Date().toISOString();
        const targetBinder = binders.find((b) => b.id === binderId);
        if (!targetBinder) {
          throw new Error("Binder not found");
        }

        const newVersion = (targetBinder.version || 0) + 1;

        // Update function that bypasses markAsModified
        const updateBinderDirectly = (binderToUpdate) => {
          if (binderToUpdate.id !== binderId) return binderToUpdate;

          return {
            ...binderToUpdate,
            permissions: {
              ...binderToUpdate.permissions,
              public: isPublic,
            },
            version: newVersion,
            lastModified: now,
            lastModifiedBy: user?.uid || binderToUpdate.ownerId,
            sync: {
              ...binderToUpdate.sync,
              status: "synced",
              lastSynced: now,
              pendingChanges: [],
              conflictData: null,
              retryCount: 0,
              lastError: null,
            },
          };
        };

        // Update local state directly
        setBinders((prev) => prev.map(updateBinderDirectly));
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinderDirectly(prev));
        }

        // If user is logged in, sync to Firebase
        if (user) {
          try {
            const binderRef = doc(
              db,
              "user_binders",
              `${user.uid}_${binderId}`
            );
            await updateDoc(binderRef, {
              "permissions.public": isPublic,
              lastModified: now,
              lastModifiedBy: user.uid,
              version: newVersion,
            });

            return { success: true };
          } catch (syncError) {
            console.error("Failed to sync privacy change to cloud:", syncError);

            // Revert local sync status on error
            const revertSyncStatus = (binderToUpdate) => {
              if (binderToUpdate.id !== binderId) return binderToUpdate;
              return {
                ...binderToUpdate,
                sync: {
                  ...binderToUpdate.sync,
                  status: "local",
                  lastError: syncError.message,
                },
              };
            };

            setBinders((prev) => prev.map(revertSyncStatus));
            if (currentBinder?.id === binderId) {
              setCurrentBinder((prev) => revertSyncStatus(prev));
            }

            throw syncError;
          }
        }

        return { success: true };
      } catch (error) {
        console.error("Failed to update binder privacy:", error);
        throw error;
      }
    },
    [binders, currentBinder, user]
  );

  // Share link management functions
  const createShareLink = useCallback(
    async (binderId, options = {}) => {
      try {
        if (!user) {
          throw new Error("User must be logged in to create share links");
        }

        const binder = binders.find((b) => b.id === binderId);
        if (!binder) {
          throw new Error("Binder not found");
        }

        if (!binder.permissions?.public) {
          throw new Error("Binder must be public to create share links");
        }

        const result = await shareService.createShareLink(
          binderId,
          user.uid,
          options
        );
        return result;
      } catch (error) {
        console.error("Error creating share link:", error);
        throw error;
      }
    },
    [binders, user]
  );

  const getShareLinks = useCallback(
    async (binderId) => {
      try {
        if (!user) {
          throw new Error("User must be logged in to view share links");
        }

        return await shareService.getShareLinks(binderId, user.uid);
      } catch (error) {
        console.error("Error fetching share links:", error);
        throw error;
      }
    },
    [user]
  );

  const revokeShareLink = useCallback(
    async (shareToken) => {
      try {
        if (!user) {
          throw new Error("User must be logged in to revoke share links");
        }

        await shareService.revokeShareLink(shareToken, user.uid);
        return true;
      } catch (error) {
        console.error("Error revoking share link:", error);
        throw error;
      }
    },
    [user]
  );

  const getShareAnalytics = useCallback(
    async (binderId) => {
      try {
        if (!user) {
          throw new Error("User must be logged in to view share analytics");
        }

        return await shareService.getShareAnalytics(binderId, user.uid);
      } catch (error) {
        console.error("Error fetching share analytics:", error);
        throw error;
      }
    },
    [user]
  );

  // Sorting functionality
  const sortBinder = useCallback(
    (binderId, sortBy, sortDirection) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          // Get the sorting function from the utility
          const sortedCards = sortCards(binder.cards, sortBy, sortDirection);

          const updatedBinder = {
            ...binder,
            cards: sortedCards,
          };

          // Use markBinderAsModified to properly track changes
          return markBinderAsModified(
            updatedBinder,
            "binder_sorted",
            { sortBy, sortDirection },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        toast.success(`Binder sorted by ${sortBy}`);
      } catch (error) {
        console.error("Failed to sort binder:", error);
        toast.error("Failed to sort binder");
      }
    },
    [currentBinder]
  );

  // Update auto-sort setting
  const updateAutoSort = useCallback(
    (binderId, autoSort) => {
      if (!binderId) {
        throw new Error("Binder ID is required");
      }

      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          return markBinderAsModified(
            {
              ...binder,
              settings: {
                ...binder.settings,
                autoSort,
              },
            },
            "settings_updated",
            { autoSort },
            user?.uid || binder.ownerId
          );
        };

        // Update binders state and ensure currentBinder is synchronized
        setBinders((prev) => {
          const updatedBinders = prev.map(updateBinder);

          // If the current binder is being updated, update it synchronously
          if (currentBinder?.id === binderId) {
            const updatedCurrentBinder = updatedBinders.find(
              (b) => b.id === binderId
            );
            if (updatedCurrentBinder) {
              setCurrentBinder(updatedCurrentBinder);
            }
          }

          return updatedBinders;
        });

        // Invalidate cache since we modified binder settings
        invalidateCache();

        toast.success(`Auto-sort ${autoSort ? "enabled" : "disabled"}`);
        return true;
      } catch (error) {
        console.error("Failed to update auto-sort:", error);
        toast.error("Failed to update auto-sort setting");
        throw error;
      }
    },
    [binders, currentBinder, user, invalidateCache]
  );

  // =============================
  // Card Compaction (Remove Gaps)
  // =============================
  const compactBinderCards = useCallback(
    (
      binderId,
      {
        scope = "binder", // 'binder' | 'page'
        pageIndices = [], // array of cardPageIndex numbers when scope==='page'
      } = {}
    ) => {
      try {
        if (!binderId) throw new Error("Binder ID is required");

        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          // Helper – returns new cards object after compaction
          const performCompaction = () => {
            const gridConfig = getGridConfig(
              binder.settings?.gridSize || "3x3"
            );
            const cardsPerPage = gridConfig.total;
            const originalCards = binder.cards || {};

            // Utility to compact a range [start, end)
            const compactRange = (cardsObj, start, endExclusive) => {
              const positionsInRange = Object.keys(cardsObj)
                .map((p) => parseInt(p, 10))
                .filter((pos) => pos >= start && pos < endExclusive)
                .sort((a, b) => a - b);

              let newCardsObj = { ...cardsObj };
              positionsInRange.forEach((oldPos, idx) => {
                const newPos = start + idx;
                if (newPos !== oldPos) {
                  newCardsObj[newPos.toString()] =
                    newCardsObj[oldPos.toString()];
                  delete newCardsObj[oldPos.toString()];
                }
              });
              return newCardsObj;
            };

            if (scope === "binder") {
              // Global compaction – move every occupied position to the next free slot starting at 0
              const occupied = Object.keys(originalCards)
                .map((p) => parseInt(p, 10))
                .sort((a, b) => a - b);

              const newCards = {};
              occupied.forEach((oldPos, idx) => {
                newCards[idx.toString()] = originalCards[oldPos.toString()];
              });
              return newCards;
            } else if (scope === "page") {
              if (!pageIndices || pageIndices.length === 0)
                return originalCards;

              let compacted = { ...originalCards };
              pageIndices.forEach((pageIdx) => {
                const start = pageIdx * cardsPerPage;
                const end = start + cardsPerPage;
                compacted = compactRange(compacted, start, end);
              });

              return compacted;
            }

            return originalCards;
          };

          const newCards = performCompaction();

          // If no changes, return original binder
          if (JSON.stringify(newCards) === JSON.stringify(binder.cards)) {
            return binder;
          }

          const updatedBinder = {
            ...binder,
            cards: newCards,
          };

          return markBinderAsModified(
            updatedBinder,
            "cards_compacted",
            { scope, pageIndices },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        toast.success(
          scope === "binder"
            ? "Binder compacted successfully"
            : "Page compacted successfully"
        );
        return true;
      } catch (error) {
        console.error("Failed to compact cards:", error);
        toast.error("Failed to compact cards");
        return false;
      }
    },
    [binders, currentBinder]
  );

  const value = {
    // State
    binders: visibleBinders, // Only expose visible binders for current user context
    allBinders: binders, // Keep reference to all binders for internal operations
    currentBinder,
    isLoading,
    syncStatus,

    // Actions
    createBinder,
    updateBinder,
    deleteBinder,
    selectBinder,
    addCardToBinder,
    batchAddCards,
    removeCardFromBinder,
    updateCardInBinder,
    clearBinderCards,
    moveCard,
    moveCardOptimistic,
    batchMoveCards,
    updateBinderSettings,
    updateBinderMetadata,

    // Sorting Actions
    sortBinder,
    updateAutoSort,

    // Compaction
    compactBinderCards,

    // Sync Actions
    saveBinderToCloud,
    syncBinderToCloud, // Legacy - same as saveBinderToCloud
    downloadBinderFromCloud,
    getAllCloudBinders,
    deleteBinderFromCloud,
    autoSyncCloudBinders,
    refreshCache,
    forceClearAndSync,
    migrateBinderCardData,
    markAsModified,

    // Page Management
    addPage,
    batchAddPages,
    removePage,
    getPageCount,
    reorderPages,
    reorderCardPages,
    getLogicalPageIndex,
    getPhysicalPageIndex,

    // Utilities
    clearAllData,
    cleanupAllBinderChangelogs,
    exportBinderData,
    importBinderData,

    // Security & access control
    canAccessBinder,
    getVisibleBinders,
    checkUnsavedChanges,
    warnBeforeLogout,

    // Local binder management
    isLocalOnlyBinder,
    isOwnedByCurrentUser,
    getLocalOnlyBinders,
    claimLocalBinder,
    clearLocalOnlyBinders,
    checkBinderExistsInCloud,
    verifyLocalOnlyStatus,

    // Validation helpers (for drag and drop)
    validatePosition,
    validateCardMove,

    // Firebase functions
    fetchUserPublicBinders,
    getPublicBinder,
    updateBinderPrivacy,

    // Share link functions
    createShareLink,
    getShareLinks,
    revokeShareLink,
    getShareAnalytics,
  };

  return (
    <BinderContext.Provider value={value}>{children}</BinderContext.Provider>
  );
};

// Hook to use the context
export const useBinderContext = () => {
  const context = useContext(BinderContext);
  if (!context) {
    throw new Error("useBinderContext must be used within a BinderProvider");
  }
  return context;
};

// Alias for backward compatibility
export const useBinder = useBinderContext;

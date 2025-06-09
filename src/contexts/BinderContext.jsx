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
  showGridNumbers: false,
  cardBackUrl: null,
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
  const changeId = generateChangeId();

  const change = {
    id: changeId,
    timestamp: now,
    type: changeType,
    userId: userId || "local_user",
    data: changeData,
  };

  return {
    ...binder,
    version: (binder.version || 0) + 1,
    lastModified: now,
    lastModifiedBy: userId || "local_user",
    sync: {
      ...binder.sync,
      status: "local", // Mark as having local changes
      pendingChanges: [...(binder.sync?.pendingChanges || []), change],
    },
    changelog: [...(binder.changelog || []), change],
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
    oldBinder.settings?.pageCount !== undefined
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
      "3x3": { total: 9 },
      "4x4": { total: 16 },
      "5x5": { total: 25 },
      "6x6": { total: 36 },
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

// Binder Context Provider
export const BinderProvider = ({ children }) => {
  const [binders, setBinders] = useState([]);
  const [currentBinder, setCurrentBinder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState({}); // binderId -> sync status
  const { checkBinderLimits, canPerformAction } = useRules();
  const { user } = useAuth();

  // Initialize from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        setIsLoading(true);

        // Load binders and migrate if necessary
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
  }, []);

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
          "local_user", // TODO: Replace with actual user ID
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
    [binders.length, checkBinderLimits, canPerformAction]
  );

  // Update binder
  const updateBinder = useCallback(
    async (binderId, updates) => {
      try {
        const updatedBinder = {
          ...updates,
          id: binderId,
          updatedAt: new Date().toISOString(),
        };

        setBinders((prev) =>
          prev.map((binder) =>
            binder.id === binderId ? { ...binder, ...updatedBinder } : binder
          )
        );

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => ({ ...prev, ...updatedBinder }));
        }

        return updatedBinder;
      } catch (error) {
        console.error("Failed to update binder:", error);
        toast.error("Failed to update binder");
        throw error;
      }
    },
    [currentBinder]
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
            toast.error("Failed to delete from cloud, but deleted locally");
          }
        }

        // Delete from local state and localStorage
        setBinders((prev) => prev.filter((binder) => binder.id !== binderId));

        // If deleting current binder, clear it
        if (currentBinder?.id === binderId) {
          setCurrentBinder(null);
        }

        toast.success("Binder deleted");
      } catch (error) {
        console.error("Failed to delete binder:", error);
        toast.error("Failed to delete binder");
        throw error;
      }
    },
    [currentBinder, binders, user, binderSyncService]
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
          "local_user", // TODO: Replace with actual user ID
          targetBinder,
          1
        );

        if (!canAdd.allowed) {
          throw new Error(
            canAdd.reason || "Cannot add more cards to this binder"
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
            "3x3": { total: 9 },
            "4x4": { total: 16 },
            "5x5": { total: 25 },
            "6x6": { total: 36 },
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

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "card_added",
            {
              cardId: card.id,
              position: targetPosition,
              previousValue: null,
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
          if (cardAtDestination) {
            // Swap cards
            updatedCards[fromKey] = cardAtDestination;
            updatedCards[toKey] = cardToMove;
          } else {
            // Move to empty slot
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
    async (binderId, cards, startPosition = null, metadata = {}) => {
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
        const canAdd = await checkBinderLimits.canAddCardsToBinder(
          { canPerformAction },
          "local_user", // TODO: Replace with actual user ID
          targetBinder,
          cards.length
        );

        if (!canAdd.allowed) {
          throw new Error(
            canAdd.reason || `Cannot add ${cards.length} cards to this binder`
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
            "3x3": { total: 9 },
            "4x4": { total: 16 },
            "5x5": { total: 25 },
            "6x6": { total: 36 },
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

          // Use markBinderAsModified to properly track changes and sync status
          return markBinderAsModified(
            updatedBinder,
            "cards_batch_added",
            {
              cardsAdded: addedCards,
              count: addedCards.length,
              startPosition: startPosition,
            },
            binder.ownerId
          );
        };

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
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

        // Get grid configuration
        const gridConfig = {
          "3x3": { total: 9 },
          "4x4": { total: 16 },
          "5x5": { total: 25 },
          "6x6": { total: 36 },
        };
        const cardsPerPage =
          gridConfig[binder.settings?.gridSize || "3x3"]?.total || 9;

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
    storage.remove(STORAGE_KEYS.BINDERS);
    storage.remove(STORAGE_KEYS.CURRENT_BINDER);
    toast.success("All binder data cleared");
  }, []);

  // Export data
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
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          // Get current page count from settings
          const currentPageCount = binder.settings?.pageCount || 1;

          // Check if we're within max pages limit
          if (currentPageCount >= binder.settings.maxPages) {
            toast.error(
              `Cannot add more pages. Maximum is ${binder.settings.maxPages}`
            );
            return binder;
          }

          const newPageCount = currentPageCount + 1;

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
            "page_added",
            {
              pageNumber: newPageCount,
              previousPageCount: currentPageCount,
            },
            binder.ownerId
          );
        };

        // Get the current page count before updating (for the toast message)
        const binder = binders.find((b) => b.id === binderId);
        const newPageNumber = (binder?.settings?.pageCount || 1) + 1;

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        // Show success message only once
        toast.success(`Added page ${newPageNumber}`);
      } catch (error) {
        console.error("Failed to add page:", error);
        toast.error("Failed to add page");
        throw error;
      }
    },
    [currentBinder, binders]
  );

  const batchAddPages = useCallback(
    async (binderId, pageCount) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          // Get current page count from settings
          const currentPageCount = binder.settings?.pageCount || 1;

          // Check if we're within max pages limit
          const newPageCount = currentPageCount + pageCount;
          if (newPageCount > binder.settings.maxPages) {
            const maxPossible = binder.settings.maxPages - currentPageCount;
            toast.error(
              `Cannot add ${pageCount} pages. Maximum is ${binder.settings.maxPages}. Can only add ${maxPossible} more pages.`
            );
            return binder;
          }

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
            "pages_batch_added",
            {
              pagesAdded: pageCount,
              fromPageCount: currentPageCount,
              toPageCount: newPageCount,
            },
            binder.ownerId
          );
        };

        // Get the current page count before updating (for the toast message)
        const binder = binders.find((b) => b.id === binderId);
        const currentPageCount = binder?.settings?.pageCount || 1;
        const newPageCount = currentPageCount + pageCount;

        setBinders((prev) => prev.map(updateBinder));

        // Update current binder if it's the one being updated
        if (currentBinder?.id === binderId) {
          setCurrentBinder((prev) => updateBinder(prev));
        }

        // Show success message only once
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
    [currentBinder, binders]
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
            "3x3": { total: 9 },
            "4x4": { total: 16 },
            "5x5": { total: 25 },
            "6x6": { total: 36 },
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
            "3x3": { total: 9 },
            "4x4": { total: 16 },
            "5x5": { total: 25 },
            "6x6": { total: 36 },
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
          setBinders((prev) => {
            const existingIndex = prev.findIndex((b) => b.id === binderId);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = result.binder;
              return updated;
            } else {
              return [...prev, result.binder];
            }
          });

          if (currentBinder?.id === binderId) {
            setCurrentBinder(result.binder);
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
    [currentBinder, user]
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
  const autoSyncCloudBinders = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      // Get all cloud binders
      const cloudBinders = await binderSyncService.getAllCloudBinders(user.uid);

      if (cloudBinders.length === 0) {
        return;
      }

      // Merge with local binders
      setBinders((localBinders) => {
        const merged = [...localBinders];
        let addedCount = 0;
        let updatedCount = 0;
        const updatedBinderIds = []; // Track which binders were updated

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
            if (cloudVersion > localVersion || cloudModified > localModified) {
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

        // Save merged binders to localStorage
        if (addedCount > 0 || updatedCount > 0) {
          storage.set(STORAGE_KEYS.BINDERS, merged);

          // Show a toast notification
          if (addedCount > 0 && updatedCount > 0) {
            toast.success(
              `Synced ${addedCount} new and ${updatedCount} updated binders from cloud`
            );
          } else if (addedCount > 0) {
            toast.success(
              `Downloaded ${addedCount} binder${
                addedCount > 1 ? "s" : ""
              } from cloud`
            );
          } else if (updatedCount > 0) {
            toast.success(
              `Updated ${updatedCount} binder${
                updatedCount > 1 ? "s" : ""
              } from cloud`
            );
          }
        }

        return merged;
      });
    } catch (error) {
      console.error("Auto-sync failed:", error);
      // Don't show error toast for auto-sync failures to avoid being intrusive
    }
  }, [user]);

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

      // If binder belongs to current user, check if it has never been synced
      if (binder.ownerId === user.uid) {
        // Check if it has sync metadata indicating it exists in cloud
        const hasCloudSync =
          binder.sync &&
          (binder.sync.status === "synced" ||
            binder.sync.lastSynced ||
            binder.sync.cloudVersion);
        return !hasCloudSync;
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
    moveCard,
    moveCardOptimistic,
    batchMoveCards,
    updateBinderSettings,
    updateBinderMetadata,

    // Sync Actions
    saveBinderToCloud,
    syncBinderToCloud, // Legacy - same as saveBinderToCloud
    downloadBinderFromCloud,
    getAllCloudBinders,
    deleteBinderFromCloud,
    autoSyncCloudBinders,
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

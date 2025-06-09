import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "react-hot-toast";
import { useRules } from "./RulesContext";

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
  const { checkBinderLimits, canPerformAction } = useRules();

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

        const newBinder = createNewBinder(name.trim(), description.trim());

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
    [currentBinder]
  );

  // Set current binder
  const selectBinder = useCallback((binder) => {
    setCurrentBinder(binder);
  }, []);

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
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50), // Keep last 50 changes
          };

          return updatedBinder;
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "card_removed",
            userId: binder.ownerId,
            data: {
              cardId: removedCard.cardId,
              position,
              previousValue: removedCard,
            },
          };

          return {
            ...binder,
            cards: updatedCards,
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50),
          };
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: optimistic ? "card_moved_optimistic" : "card_moved",
            userId: binder.ownerId,
            data: {
              cardId: cardToMove.cardId,
              fromPosition,
              toPosition,
              swappedWith: cardAtDestination?.cardId || null,
              optimistic,
            },
          };

          return {
            ...binder,
            cards: updatedCards,
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50),
          };
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

          // Create a single batch entry for all cards added
          const batchEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "cards_batch_added",
            userId: binder.ownerId,
            data: {
              cardsAdded: addedCards,
              count: addedCards.length,
              startPosition: startPosition,
            },
          };

          return {
            ...binder,
            cards: updatedCards,
            settings: {
              ...binder.settings,
              pageCount: newPageCount,
            },
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, batchEntry].slice(-50),
          };
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "pages_reordered",
            userId: binder.ownerId,
            data: {
              fromIndex,
              toIndex,
              pageOrder: newPageOrder,
            },
          };

          return {
            ...binder,
            settings: {
              ...binder.settings,
              pageOrder: newPageOrder,
            },
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50),
          };
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "card_pages_reordered",
            userId: binder.ownerId,
            data: {
              fromCardPageIndex,
              toCardPageIndex,
              sourceCardCount: Object.keys(sourceCards).length,
              targetCardCount: Object.keys(targetCards).length,
            },
          };

          return {
            ...binder,
            cards: updatedCards,
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50),
          };
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

          const batchEntry = createBatchOperation(successfulOperations, binder);

          return {
            ...binder,
            cards: updatedCards,
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, batchEntry].slice(-50),
          };
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "settings_updated",
            userId: binder.ownerId,
            data: {
              changes: settings,
              previousSettings: binder.settings,
              calculatedPageCount:
                updatedSettings.pageCount !== binder.settings.pageCount
                  ? updatedSettings.pageCount
                  : undefined,
            },
          };

          return {
            ...binder,
            settings: updatedSettings,
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50),
          };
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "page_added",
            userId: binder.ownerId,
            data: {
              pageNumber: newPageCount,
              previousPageCount: currentPageCount,
            },
          };

          return {
            ...binder,
            settings: {
              ...binder.settings,
              pageCount: newPageCount,
            },
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50),
          };
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "pages_batch_added",
            userId: binder.ownerId,
            data: {
              pagesAdded: pageCount,
              fromPageCount: currentPageCount,
              toPageCount: newPageCount,
            },
          };

          return {
            ...binder,
            settings: {
              ...binder.settings,
              pageCount: newPageCount,
            },
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50),
          };
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "page_removed",
            userId: binder.ownerId,
            data: {
              pageNumber: currentPageCount,
              newPageCount: newPageCount,
            },
          };

          return {
            ...binder,
            settings: {
              ...binder.settings,
              pageCount: newPageCount,
            },
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50),
          };
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "metadata_updated",
            userId: binder.ownerId,
            data: { updates: metadataUpdates },
          };

          return {
            ...binder,
            metadata: {
              ...binder.metadata,
              ...metadataUpdates,
            },
            version: binder.version + 1,
            lastModified: new Date().toISOString(),
            lastModifiedBy: binder.ownerId,
            changelog: [...binder.changelog, changeEntry].slice(-50),
          };
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

  const value = {
    // State
    binders,
    currentBinder,
    isLoading,

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

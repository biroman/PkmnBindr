import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "react-hot-toast";

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
  // Check if already migrated
  if (oldBinder.schemaVersion === "2.0") {
    return oldBinder;
  }

  console.log(`Migrating binder "${oldBinder.name}" to new schema`);

  // Convert old array-based cards to new position-based object
  let newCards = {};
  if (Array.isArray(oldBinder.cards)) {
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
  }

  // Create migrated binder with new structure
  const migratedBinder = {
    // Core identification
    id: oldBinder.id,
    schemaVersion: "2.0",

    // Ownership
    ownerId: oldBinder.ownerId || "local_user",
    permissions: {
      public: false,
      collaborators: [],
      shareCode: null,
    },

    // Version control & sync
    version: oldBinder.version || 1,
    lastModified:
      oldBinder.updatedAt || oldBinder.createdAt || new Date().toISOString(),
    lastModifiedBy: oldBinder.ownerId || "local_user",

    sync: {
      status: "local",
      lastSynced: null,
      pendingChanges: [],
      conflictData: null,
      retryCount: 0,
      lastError: null,
    },

    // Metadata (from old root-level properties)
    metadata: {
      name: oldBinder.name || "Untitled Binder",
      description: oldBinder.description || "",
      createdAt: oldBinder.createdAt || new Date().toISOString(),
      tags: [],
      coverImageUrl: null,
      isArchived: false,
      sortOrder: 0,
    },

    // Settings (merge old and new defaults)
    settings: {
      ...DEFAULT_BINDER_SETTINGS,
      ...oldBinder.settings,
    },

    // Cards (converted to new format)
    cards: newCards,

    // Change tracking
    changelog: [
      {
        id: generateChangeId(),
        timestamp: new Date().toISOString(),
        type: "binder_migrated",
        userId: oldBinder.ownerId || "local_user",
        data: {
          fromVersion: oldBinder.schemaVersion || "1.0",
          toVersion: "2.0",
          cardsCount: Object.keys(newCards).length,
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
  const createBinder = useCallback(async (name, description = "") => {
    try {
      if (!name.trim()) {
        throw new Error("Binder name is required");
      }

      const newBinder = createNewBinder(name.trim(), description.trim());

      setBinders((prev) => [...prev, newBinder]);
      setCurrentBinder(newBinder);

      toast.success(`Created binder "${name}"`);
      return newBinder;
    } catch (error) {
      console.error("Failed to create binder:", error);
      toast.error(error.message || "Failed to create binder");
      throw error;
    }
  }, []);

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

        // Note: Card will be cached when retrieved in useBinderPages hook

        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          const targetPosition =
            position !== null ? position : findNextEmptyPosition(binder.cards);

          const cardEntry = {
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

          const updatedBinder = {
            ...binder,
            cards: {
              ...binder.cards,
              [targetPosition.toString()]: cardEntry,
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
    [currentBinder]
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

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "settings_updated",
            userId: binder.ownerId,
            data: {
              changes: settings,
              previousSettings: binder.settings,
            },
          };

          return {
            ...binder,
            settings: { ...binder.settings, ...settings },
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

          // Get grid configuration
          const gridConfig = {
            "3x3": { total: 9 },
            "4x4": { total: 16 },
            "5x5": { total: 25 },
            "6x6": { total: 36 },
          };

          const cardsPerPage = gridConfig[binder.settings.gridSize]?.total || 9;

          // Calculate current max position
          const positions = Object.keys(binder.cards).map((pos) =>
            parseInt(pos)
          );
          const maxPosition =
            positions.length > 0 ? Math.max(...positions) : -1;

          // Calculate what page this would be adding (considering cover page)
          const totalCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);
          const newPageNumber = totalCardPages + 1;

          // Check if we're within max pages limit
          if (newPageNumber > binder.settings.maxPages) {
            toast.error(
              `Cannot add more pages. Maximum is ${binder.settings.maxPages}`
            );
            return binder;
          }

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "page_added",
            userId: binder.ownerId,
            data: {
              pageNumber: newPageNumber,
              cardsPerPage,
            },
          };

          toast.success(`Added page ${newPageNumber}`);

          return {
            ...binder,
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
        console.error("Failed to add page:", error);
        toast.error("Failed to add page");
        throw error;
      }
    },
    [currentBinder]
  );

  const removePage = useCallback(
    async (binderId) => {
      try {
        const updateBinder = (binder) => {
          if (binder.id !== binderId) return binder;

          // Get grid configuration
          const gridConfig = {
            "3x3": { total: 9 },
            "4x4": { total: 16 },
            "5x5": { total: 25 },
            "6x6": { total: 36 },
          };

          const cardsPerPage = gridConfig[binder.settings.gridSize]?.total || 9;

          // Calculate current max position and pages
          const positions = Object.keys(binder.cards).map((pos) =>
            parseInt(pos)
          );
          if (positions.length === 0) {
            toast.error("Cannot remove pages - binder is empty");
            return binder;
          }

          const maxPosition = Math.max(...positions);
          const totalCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);

          // Check if we're at minimum pages
          if (totalCardPages <= binder.settings.minPages) {
            toast.error(
              `Cannot remove pages. Minimum is ${binder.settings.minPages}`
            );
            return binder;
          }

          // Check if last page has cards
          const lastPageStartPosition = (totalCardPages - 1) * cardsPerPage;
          const lastPageEndPosition = totalCardPages * cardsPerPage - 1;

          const hasCardsOnLastPage = positions.some(
            (pos) => pos >= lastPageStartPosition && pos <= lastPageEndPosition
          );

          if (hasCardsOnLastPage) {
            toast.error("Cannot remove page - last page contains cards");
            return binder;
          }

          const changeEntry = {
            id: generateChangeId(),
            timestamp: new Date().toISOString(),
            type: "page_removed",
            userId: binder.ownerId,
            data: {
              pageNumber: totalCardPages,
              cardsPerPage,
            },
          };

          toast.success(`Removed page ${totalCardPages}`);

          return {
            ...binder,
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
        console.error("Failed to remove page:", error);
        toast.error("Failed to remove page");
        throw error;
      }
    },
    [currentBinder]
  );

  const getPageCount = useCallback(
    (binderId) => {
      const binder = binderId
        ? binders.find((b) => b.id === binderId)
        : currentBinder;

      if (!binder?.cards || typeof binder.cards !== "object") return 1;

      // Get grid configuration
      const gridConfig = {
        "3x3": { total: 9 },
        "4x4": { total: 16 },
        "5x5": { total: 25 },
        "6x6": { total: 36 },
      };

      const cardsPerPage =
        gridConfig[binder.settings?.gridSize || "3x3"]?.total || 9;

      // Calculate pages based on highest position
      const positions = Object.keys(binder.cards).map((pos) => parseInt(pos));
      if (positions.length === 0)
        return Math.max(binder.settings?.minPages || 1, 1);

      const maxPosition = Math.max(...positions);
      const cardPages = Math.ceil((maxPosition + 1) / cardsPerPage);

      // Ensure we respect minimum pages setting
      return Math.max(cardPages, binder.settings?.minPages || 1);
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
    removeCardFromBinder,
    moveCard,
    moveCardOptimistic,
    batchMoveCards,
    updateBinderSettings,

    // Page Management
    addPage,
    removePage,
    getPageCount,

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

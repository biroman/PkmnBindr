// IndexedDB wrapper utilities for Pokemon Binder app
// Provides the same interface as localStorage but with better storage capacity

import logger from "./logger";

// Database configuration
const DB_NAME = "PokemonBinderDB";
const DB_VERSION = 1;
const STORE_NAME = "storage";

// Storage keys (keeping the same keys for easy migration)
export const STORAGE_KEYS = {
  BINDERS: "pkmnbinder_binders",
  CURRENT_BINDER: "pkmnbinder_current_binder",
  LAYOUT_PREFS: "pkmnbinder_layout_prefs",
  SET_CACHE: "pkmnbinder_set_cache",
  CARD_CLIPBOARD: "pkmnbinder_card_clipboard",
  BINDER_HISTORY: "pkmnbinder_binder_history",
  THEME: "pkmnbindr-theme",
  DARK_MODE: "pkmnbindr-darkmode",
  SEARCH_STATE: "pkmnbinder_card_search_state",
  MIGRATION_COMPLETE: "pkmnbinder_migration_complete",
};

// Initialize IndexedDB database
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error("Failed to open IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
};

// Get database instance (with caching)
let dbInstance = null;
const getDB = async () => {
  if (!dbInstance) {
    dbInstance = await initDB();
  }
  return dbInstance;
};

// Generic get function
export const getItem = async (key) => {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => {
        logger.error(`Failed to get item ${key}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    logger.error(`Error getting item ${key}:`, error);
    return null;
  }
};

// Generic set function
export const setItem = async (key, value) => {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ key, value });

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(true);
      };
      request.onerror = () => {
        logger.error(`Failed to set item ${key}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    logger.error(`Error setting item ${key}:`, error);
    return false;
  }
};

// Generic remove function
export const removeItem = async (key) => {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(true);
      };
      request.onerror = () => {
        logger.error(`Failed to remove item ${key}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    logger.error(`Error removing item ${key}:`, error);
    return false;
  }
};

// Get all keys (useful for migration)
export const getAllKeys = async () => {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        logger.error("Failed to get all keys:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    logger.error("Error getting all keys:", error);
    return [];
  }
};

// Clear all data (useful for testing)
export const clear = async () => {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(true);
      };
      request.onerror = () => {
        logger.error("Failed to clear storage:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    logger.error("Error clearing storage:", error);
    return false;
  }
};

// Migration function to move data from localStorage to IndexedDB
export const migrateFromLocalStorage = async () => {
  try {
    // Check if migration has already been completed
    const migrationComplete = await getItem(STORAGE_KEYS.MIGRATION_COMPLETE);
    if (migrationComplete) {
      logger.info("Migration already completed, skipping...");
      return true;
    }

    logger.info("Starting migration from localStorage to IndexedDB...");

    // Get all localStorage keys that belong to our app
    const localStorageKeys = Object.values(STORAGE_KEYS).filter(
      (key) => key !== STORAGE_KEYS.MIGRATION_COMPLETE
    );

    let migratedCount = 0;

    for (const key of localStorageKeys) {
      try {
        const localStorageValue = localStorage.getItem(key);
        if (localStorageValue !== null) {
          await setItem(key, localStorageValue);
          migratedCount++;
          logger.info(`Migrated ${key} to IndexedDB`);
        }
      } catch (error) {
        logger.error(`Failed to migrate ${key}:`, error);
      }
    }

    // Mark migration as complete
    await setItem(STORAGE_KEYS.MIGRATION_COMPLETE, "true");

    logger.info(
      `Migration completed! Migrated ${migratedCount} items from localStorage to IndexedDB`
    );

    // Optionally, clean up localStorage data after successful migration
    // Uncomment the following lines if you want to remove localStorage data after migration
    /*
    for (const key of localStorageKeys) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        logger.warn(`Failed to remove ${key} from localStorage:`, error);
      }
    }
    logger.info("Cleaned up localStorage data");
    */

    return true;
  } catch (error) {
    logger.error("Migration failed:", error);
    return false;
  }
};

// Convenience functions for common operations (async versions of localStorage methods)
export const getItemJSON = async (key) => {
  const value = await getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    logger.error(`Failed to parse JSON for key ${key}:`, error);
    return null;
  }
};

export const setItemJSON = async (key, value) => {
  try {
    const jsonString = JSON.stringify(value);
    return await setItem(key, jsonString);
  } catch (error) {
    logger.error(`Failed to stringify value for key ${key}:`, error);
    return false;
  }
};

// Health check function
export const isIndexedDBAvailable = () => {
  return typeof indexedDB !== "undefined";
};

// Export a fallback to localStorage if IndexedDB is not available
export const createStorageInterface = () => {
  if (!isIndexedDBAvailable()) {
    logger.warn("IndexedDB not available, falling back to localStorage");
    return {
      getItem: (key) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
          return Promise.resolve(true);
        } catch (error) {
          return Promise.resolve(false);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
          return Promise.resolve(true);
        } catch (error) {
          return Promise.resolve(false);
        }
      },
      getItemJSON: (key) => {
        const value = localStorage.getItem(key);
        if (!value) return Promise.resolve(null);
        try {
          return Promise.resolve(JSON.parse(value));
        } catch (error) {
          return Promise.resolve(null);
        }
      },
      setItemJSON: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return Promise.resolve(true);
        } catch (error) {
          return Promise.resolve(false);
        }
      },
    };
  }

  return {
    getItem,
    setItem,
    removeItem,
    getItemJSON,
    setItemJSON,
  };
};

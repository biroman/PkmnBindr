// Storage initialization and migration utility
import { initializeStorage } from "./storageUtilsIndexedDB";
import {
  migrateFromLocalStorage,
  isIndexedDBAvailable,
} from "./indexedDbUtils";
import logger from "./logger";

let initializationPromise = null;
let isInitialized = false;

// Initialize storage system with migration
export const initializeStorageSystem = async () => {
  // If already initialized, return success
  if (isInitialized) {
    return true;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return await initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      // Check if IndexedDB is available
      if (!isIndexedDBAvailable()) {
        logger.warn("IndexedDB not available, falling back to localStorage");
        isInitialized = true;
        return true;
      }

      logger.info("Initializing storage system...");

      // Initialize IndexedDB and handle migration
      const success = await initializeStorage();

      if (success) {
        logger.info("Storage system initialized successfully");
        isInitialized = true;
        return true;
      } else {
        logger.error("Failed to initialize storage system");
        return false;
      }
    } catch (error) {
      logger.error("Error during storage initialization:", error);
      return false;
    }
  })();

  return await initializationPromise;
};

// Wait for storage to be ready before proceeding
export const waitForStorageReady = async () => {
  if (isInitialized) {
    return true;
  }

  return await initializeStorageSystem();
};

// Get initialization status
export const isStorageInitialized = () => {
  return isInitialized;
};

// Manual migration trigger (for debugging/admin purposes)
export const triggerMigration = async () => {
  try {
    logger.info("Manually triggering migration...");
    await migrateFromLocalStorage();
    return true;
  } catch (error) {
    logger.error("Manual migration failed:", error);
    return false;
  }
};

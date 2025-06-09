import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";

const COLLECTION_NAME = "user_binders";

// Helper function to recursively remove undefined values from an object
const removeUndefinedValues = (obj) => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter((item) => item !== undefined);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefinedValues(value);
    }
  }
  return cleaned;
};

export class BinderSyncService {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000; // ms
    this.syncQueue = new Map(); // binderid -> sync promise
  }

  /**
   * Upload a binder to Firebase with conflict resolution
   */
  async syncToCloud(binder, userId, options = {}) {
    const {
      forceOverwrite = false,
      resolveConflicts = true,
      retryOnError = true,
    } = options;

    if (!userId) {
      throw new Error("User must be authenticated to sync");
    }

    if (!binder || !binder.id) {
      throw new Error("Invalid binder data");
    }

    // Prevent concurrent syncs of the same binder
    if (this.syncQueue.has(binder.id)) {
      return await this.syncQueue.get(binder.id);
    }

    const syncPromise = this._performSync(binder, userId, {
      forceOverwrite,
      resolveConflicts,
      retryOnError,
    });

    this.syncQueue.set(binder.id, syncPromise);

    try {
      const result = await syncPromise;
      return result;
    } finally {
      this.syncQueue.delete(binder.id);
    }
  }

  async _performSync(binder, userId, options) {
    const binderRef = doc(db, COLLECTION_NAME, `${userId}_${binder.id}`);

    try {
      // Get current cloud version if it exists
      const cloudDoc = await getDoc(binderRef);
      const cloudBinder = cloudDoc.exists() ? cloudDoc.data() : null;

      // Check for conflicts
      if (cloudBinder && !options.forceOverwrite) {
        const conflict = this._detectConflict(binder, cloudBinder);
        if (conflict.hasConflict) {
          if (options.resolveConflicts) {
            const resolved = await this._resolveConflict(
              binder,
              cloudBinder,
              conflict
            );
            return await this._saveBinder(binderRef, resolved, userId);
          } else {
            throw new Error("Sync conflict detected", {
              code: "SYNC_CONFLICT",
              conflict,
            });
          }
        }
      }

      // No conflicts, proceed with save
      return await this._saveBinder(binderRef, binder, userId);
    } catch (error) {
      if (options.retryOnError && error.code !== "SYNC_CONFLICT") {
        return await this._retrySync(binder, userId, options, error);
      }
      throw error;
    }
  }

  async _saveBinder(binderRef, binder, userId) {
    const now = new Date().toISOString();

    const syncedBinder = {
      ...binder,
      // Ensure ownerId is set correctly
      ownerId: userId,
      // Update sync metadata
      sync: {
        ...binder.sync,
        status: "synced",
        lastSynced: now,
        pendingChanges: [],
        conflictData: null,
        retryCount: 0,
        lastError: null,
      },
      // Update version and timestamps
      version: (binder.version || 0) + 1,
      lastModified: now,
      lastModifiedBy: userId,
      // Add server timestamp
      serverTimestamp: serverTimestamp(),
    };

    // Remove undefined values to prevent Firebase errors
    const cleanedBinder = removeUndefinedValues(syncedBinder);

    console.log("Saving binder to Firebase:", {
      docId: binderRef.id,
      ownerId: cleanedBinder.ownerId,
      binderId: cleanedBinder.id,
      binderName: cleanedBinder.metadata?.name,
    });

    await setDoc(binderRef, cleanedBinder);

    return {
      success: true,
      binder: cleanedBinder,
      message: "Binder synced successfully",
    };
  }

  async _retrySync(binder, userId, options, lastError) {
    const updatedBinder = {
      ...binder,
      sync: {
        ...binder.sync,
        retryCount: (binder.sync.retryCount || 0) + 1,
        lastError: lastError.message,
      },
    };

    if (updatedBinder.sync.retryCount >= this.retryAttempts) {
      updatedBinder.sync.status = "error";
      throw new Error(
        `Sync failed after ${this.retryAttempts} attempts: ${lastError.message}`
      );
    }

    // Exponential backoff
    const delay =
      this.retryDelay * Math.pow(2, updatedBinder.sync.retryCount - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));

    return await this._performSync(updatedBinder, userId, {
      ...options,
      retryOnError: false, // Prevent infinite retry loops
    });
  }

  /**
   * Get a binder from Firebase without downloading (for conflict checking)
   */
  async getCloudBinder(binderId, userId) {
    if (!userId || !binderId) {
      throw new Error("User ID and Binder ID are required");
    }

    const binderRef = doc(db, COLLECTION_NAME, `${userId}_${binderId}`);
    const docSnap = await getDoc(binderRef);

    if (!docSnap.exists()) {
      return null; // Binder doesn't exist in cloud
    }

    const cloudBinder = docSnap.data();
    const { serverTimestamp, ...binder } = cloudBinder;
    return binder;
  }

  /**
   * Download a binder from Firebase
   */
  async downloadFromCloud(binderId, userId) {
    if (!userId || !binderId) {
      throw new Error("User ID and Binder ID are required");
    }

    const binderRef = doc(db, COLLECTION_NAME, `${userId}_${binderId}`);
    const docSnap = await getDoc(binderRef);

    if (!docSnap.exists()) {
      throw new Error("Binder not found in cloud storage");
    }

    const cloudBinder = docSnap.data();

    // Remove server timestamp before returning
    const { serverTimestamp, ...binder } = cloudBinder;

    return {
      success: true,
      binder,
      message: "Binder downloaded successfully",
    };
  }

  /**
   * Get all cloud binders for a user
   */
  async getAllCloudBinders(userId) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      // First try a simple query to see if any documents exist
      const allDocsQuery = query(
        collection(db, COLLECTION_NAME),
        where("ownerId", "==", userId)
      );

      const allDocsSnapshot = await getDocs(allDocsQuery);

      // Try the full query with fallback
      let querySnapshot;
      try {
        const bindersQuery = query(
          collection(db, COLLECTION_NAME),
          where("ownerId", "==", userId),
          where("metadata.isArchived", "==", false),
          orderBy("metadata.createdAt", "desc")
        );
        querySnapshot = await getDocs(bindersQuery);
      } catch (indexError) {
        console.log(
          "Index error, falling back to simple query:",
          indexError.message
        );
        // Fall back to simple query and filter manually
        querySnapshot = allDocsSnapshot;
      }

      const binders = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Manual filter if we're using fallback
        const isArchived = data.metadata?.isArchived;
        if (isArchived === true) {
          return;
        }

        const { serverTimestamp, ...binder } = data;
        binders.push(binder);
      });

      return binders.sort((a, b) => {
        const aDate = new Date(a.metadata?.createdAt || 0);
        const bDate = new Date(b.metadata?.createdAt || 0);
        return bDate - aDate; // desc order
      });
    } catch (error) {
      console.error("Error in getAllCloudBinders:", error);
      throw error;
    }
  }

  /**
   * Real-time listener for cloud binder changes
   */
  subscribeToCloudBinder(binderId, userId, callback) {
    if (!userId || !binderId) {
      throw new Error("User ID and Binder ID are required");
    }

    const binderRef = doc(db, COLLECTION_NAME, `${userId}_${binderId}`);

    return onSnapshot(
      binderRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const { serverTimestamp, ...binder } = data;
          callback({ exists: true, binder });
        } else {
          callback({ exists: false, binder: null });
        }
      },
      (error) => {
        console.error("Cloud binder subscription error:", error);
        callback({ error: error.message });
      }
    );
  }

  /**
   * Conflict detection between local and cloud versions
   */
  _detectConflict(localBinder, cloudBinder) {
    const conflict = {
      hasConflict: false,
      type: null,
      details: {},
    };

    // Version conflict
    if (cloudBinder.version > localBinder.version) {
      conflict.hasConflict = true;
      conflict.type = "version_newer_remote";
      conflict.details.localVersion = localBinder.version;
      conflict.details.cloudVersion = cloudBinder.version;
    }

    // Timestamp conflict
    const localModified = new Date(localBinder.lastModified);
    const cloudModified = new Date(cloudBinder.lastModified);

    if (cloudModified > localModified) {
      conflict.hasConflict = true;
      conflict.type = conflict.type || "timestamp_newer_remote";
      conflict.details.localModified = localBinder.lastModified;
      conflict.details.cloudModified = cloudBinder.lastModified;
    }

    // Content conflict (different cards)
    const localCardCount = Object.keys(localBinder.cards || {}).length;
    const cloudCardCount = Object.keys(cloudBinder.cards || {}).length;

    if (localCardCount !== cloudCardCount) {
      conflict.hasConflict = true;
      conflict.type = conflict.type || "content_different";
      conflict.details.localCardCount = localCardCount;
      conflict.details.cloudCardCount = cloudCardCount;
    }

    return conflict;
  }

  /**
   * Intelligent conflict resolution
   */
  async _resolveConflict(localBinder, cloudBinder, conflict) {
    console.log("Resolving conflict:", conflict);

    switch (conflict.type) {
      case "version_newer_remote":
        // Cloud is newer, merge changes carefully
        return this._mergeChanges(localBinder, cloudBinder, "cloud_wins");

      case "timestamp_newer_remote":
        // Cloud was modified more recently
        return this._mergeChanges(localBinder, cloudBinder, "cloud_wins");

      case "content_different":
        // Different content, try to merge intelligently
        return this._mergeChanges(
          localBinder,
          cloudBinder,
          "intelligent_merge"
        );

      default:
        // Default to local wins if unsure
        return this._mergeChanges(localBinder, cloudBinder, "local_wins");
    }
  }

  /**
   * Merge changes between local and cloud versions
   */
  _mergeChanges(localBinder, cloudBinder, strategy) {
    const now = new Date().toISOString();

    switch (strategy) {
      case "cloud_wins":
        return {
          ...cloudBinder,
          sync: {
            ...cloudBinder.sync,
            status: "synced",
            lastSynced: now,
            pendingChanges: [],
            conflictData: null,
          },
        };

      case "local_wins":
        return {
          ...localBinder,
          version:
            Math.max(localBinder.version || 0, cloudBinder.version || 0) + 1,
          lastModified: now,
        };

      case "intelligent_merge":
        // Merge cards intelligently - combine both sets
        const mergedCards = { ...cloudBinder.cards };

        // Add local cards that aren't in cloud
        Object.entries(localBinder.cards || {}).forEach(([position, card]) => {
          if (!mergedCards[position]) {
            mergedCards[position] = card;
          } else {
            // Position conflict - local card takes precedence if newer
            const localAdded = new Date(card.addedAt);
            const cloudAdded = new Date(mergedCards[position].addedAt);
            if (localAdded > cloudAdded) {
              mergedCards[position] = card;
            }
          }
        });

        return {
          ...localBinder,
          ...cloudBinder,
          cards: mergedCards,
          version:
            Math.max(localBinder.version || 0, cloudBinder.version || 0) + 1,
          lastModified: now,
          metadata: {
            ...cloudBinder.metadata,
            ...localBinder.metadata, // Local metadata wins
          },
          settings: {
            ...cloudBinder.settings,
            ...localBinder.settings, // Local settings win
          },
        };

      default:
        return localBinder;
    }
  }

  /**
   * Delete a binder from cloud storage
   */
  async deleteFromCloud(binderId, userId) {
    if (!userId || !binderId) {
      throw new Error("User ID and Binder ID are required");
    }

    const binderRef = doc(db, COLLECTION_NAME, `${userId}_${binderId}`);

    // Check if binder exists before deleting
    const docSnap = await getDoc(binderRef);
    if (!docSnap.exists()) {
      throw new Error("Binder not found in cloud");
    }

    // Hard delete - completely remove the document
    await deleteDoc(binderRef);

    return { success: true, message: "Binder permanently deleted from cloud" };
  }

  /**
   * Batch sync multiple binders
   */
  async batchSync(binders, userId, options = {}) {
    const results = [];
    const batch = writeBatch(db);

    for (const binder of binders) {
      try {
        const result = await this.syncToCloud(binder, userId, options);
        results.push({ binderId: binder.id, success: true, result });
      } catch (error) {
        results.push({
          binderId: binder.id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Check sync status of multiple binders
   */
  async checkSyncStatus(binderIds, userId) {
    const statusMap = new Map();

    for (const binderId of binderIds) {
      try {
        const binderRef = doc(db, COLLECTION_NAME, `${userId}_${binderId}`);
        const docSnap = await getDoc(binderRef);

        statusMap.set(binderId, {
          existsInCloud: docSnap.exists(),
          cloudVersion: docSnap.exists() ? docSnap.data().version : 0,
          lastSynced: docSnap.exists() ? docSnap.data().sync?.lastSynced : null,
        });
      } catch (error) {
        statusMap.set(binderId, {
          existsInCloud: false,
          error: error.message,
        });
      }
    }

    return statusMap;
  }
}

// Create singleton instance
export const binderSyncService = new BinderSyncService();

// Helper hooks for React components
export const useBinder = () => {
  const { user } = useAuth();

  return {
    syncToCloud: (binder, options) =>
      binderSyncService.syncToCloud(binder, user?.uid, options),
    downloadFromCloud: (binderId) =>
      binderSyncService.downloadFromCloud(binderId, user?.uid),
    getAllCloudBinders: () => binderSyncService.getAllCloudBinders(user?.uid),
    subscribeToCloudBinder: (binderId, callback) =>
      binderSyncService.subscribeToCloudBinder(binderId, user?.uid, callback),
    deleteFromCloud: (binderId) =>
      binderSyncService.deleteFromCloud(binderId, user?.uid),
    checkSyncStatus: (binderIds) =>
      binderSyncService.checkSyncStatus(binderIds, user?.uid),
  };
};

export default binderSyncService;

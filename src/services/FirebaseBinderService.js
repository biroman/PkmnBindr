import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";

class FirebaseBinderService {
  constructor() {
    this.unsubscribes = new Map();
  }

  // Collection references
  getBinderRef(binderId) {
    return doc(db, "binders", binderId);
  }

  getUserBindersQuery(userId) {
    return query(
      collection(db, "binders"),
      where("ownerId", "==", userId),
      where("metadata.isArchived", "==", false),
      orderBy("metadata.sortOrder"),
      orderBy("lastModified", "desc")
    );
  }

  // Sync individual binder to Firebase
  async syncBinder(binder) {
    try {
      const binderRef = this.getBinderRef(binder.id);

      // Check for conflicts before syncing
      const serverDoc = await getDoc(binderRef);

      if (serverDoc.exists()) {
        const serverData = serverDoc.data();

        // Version conflict detection
        if (serverData.version > binder.version) {
          return {
            success: false,
            conflict: true,
            serverData,
            localData: binder,
          };
        }
      }

      // Prepare data for Firebase (add server timestamp)
      const firebaseData = {
        ...binder,
        lastModified: serverTimestamp(),
        sync: {
          ...binder.sync,
          status: "synced",
          lastSynced: serverTimestamp(),
          pendingChanges: [],
          lastError: null,
        },
      };

      await setDoc(binderRef, firebaseData);

      return { success: true, data: firebaseData };
    } catch (error) {
      console.error("Error syncing binder:", error);
      return {
        success: false,
        error: error.message,
        retryable: this.isRetryableError(error),
      };
    }
  }

  // Batch sync multiple binders
  async batchSyncBinders(binders) {
    const batch = writeBatch(db);
    const results = [];

    for (const binder of binders) {
      try {
        const binderRef = this.getBinderRef(binder.id);
        const firebaseData = {
          ...binder,
          lastModified: serverTimestamp(),
          sync: {
            ...binder.sync,
            status: "synced",
            lastSynced: serverTimestamp(),
            pendingChanges: [],
          },
        };

        batch.set(binderRef, firebaseData);
        results.push({ id: binder.id, success: true });
      } catch (error) {
        results.push({ id: binder.id, success: false, error: error.message });
      }
    }

    try {
      await batch.commit();
      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message, results };
    }
  }

  // Real-time listener for user's binders
  subscribeToUserBinders(userId, onUpdate, onError) {
    const q = this.getUserBindersQuery(userId);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const binders = [];
        snapshot.forEach((doc) => {
          binders.push({ id: doc.id, ...doc.data() });
        });
        onUpdate(binders);
      },
      (error) => {
        console.error("Error listening to binders:", error);
        onError?.(error);
      }
    );

    this.unsubscribes.set(`user-binders-${userId}`, unsubscribe);
    return unsubscribe;
  }

  // Real-time listener for specific binder
  subscribeToBinderChanges(binderId, onUpdate, onError) {
    const binderRef = this.getBinderRef(binderId);

    const unsubscribe = onSnapshot(
      binderRef,
      (doc) => {
        if (doc.exists()) {
          onUpdate({ id: doc.id, ...doc.data() });
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.error("Error listening to binder changes:", error);
        onError?.(error);
      }
    );

    this.unsubscribes.set(`binder-${binderId}`, unsubscribe);
    return unsubscribe;
  }

  // Fetch user's binders from Firebase
  async fetchUserBinders(userId) {
    try {
      const q = this.getUserBindersQuery(userId);
      const snapshot = await getDocs(q);

      const binders = [];
      snapshot.forEach((doc) => {
        binders.push({ id: doc.id, ...doc.data() });
      });

      return { success: true, binders };
    } catch (error) {
      console.error("Error fetching binders:", error);
      return { success: false, error: error.message };
    }
  }

  // Resolve sync conflicts using operational transformation
  async resolveConflict(localBinder, serverBinder, resolution = "server") {
    try {
      let resolvedBinder;

      switch (resolution) {
        case "server":
          resolvedBinder = {
            ...serverBinder,
            sync: { ...serverBinder.sync, status: "synced" },
          };
          break;

        case "local":
          resolvedBinder = {
            ...localBinder,
            version: serverBinder.version + 1,
            lastModified: serverTimestamp(),
          };
          break;

        case "merge":
          // Implement sophisticated merge logic
          resolvedBinder = await this.mergeConflictedBinders(
            localBinder,
            serverBinder
          );
          break;

        default:
          throw new Error("Invalid conflict resolution strategy");
      }

      // Save resolved binder
      const result = await this.syncBinder(resolvedBinder);
      return result;
    } catch (error) {
      console.error("Error resolving conflict:", error);
      return { success: false, error: error.message };
    }
  }

  // Advanced merge logic for conflicted binders
  async mergeConflictedBinders(localBinder, serverBinder) {
    // This is a simplified merge - you might want more sophisticated logic
    return {
      ...serverBinder,
      // Merge cards by keeping the most recent timestamp for each position
      cards: this.mergeCards(localBinder.cards, serverBinder.cards),
      // Merge changelog
      changelog: this.mergeChangelog(
        localBinder.changelog,
        serverBinder.changelog
      ),
      // Use server metadata but local settings if newer
      settings:
        localBinder.lastModified > serverBinder.lastModified
          ? localBinder.settings
          : serverBinder.settings,
      version: Math.max(localBinder.version, serverBinder.version) + 1,
      lastModified: serverTimestamp(),
      sync: {
        status: "synced",
        lastSynced: serverTimestamp(),
        pendingChanges: [],
        conflictData: null,
      },
    };
  }

  mergeCards(localCards, serverCards) {
    const merged = { ...serverCards };

    for (const [position, localCard] of Object.entries(localCards)) {
      const serverCard = serverCards[position];

      if (!serverCard || localCard.addedAt > serverCard.addedAt) {
        merged[position] = localCard;
      }
    }

    return merged;
  }

  mergeChangelog(localChangelog, serverChangelog) {
    // Merge and deduplicate changelog entries
    const allEntries = [...localChangelog, ...serverChangelog];
    const uniqueEntries = allEntries.filter(
      (entry, index, arr) => arr.findIndex((e) => e.id === entry.id) === index
    );

    return uniqueEntries
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-50); // Keep last 50 entries
  }

  // Utility methods
  isRetryableError(error) {
    const retryableCodes = [
      "unavailable",
      "deadline-exceeded",
      "resource-exhausted",
      "internal",
      "unknown",
    ];
    return retryableCodes.includes(error.code);
  }

  // Cleanup subscriptions
  unsubscribeAll() {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.unsubscribes.clear();
  }

  unsubscribe(key) {
    const unsubscribe = this.unsubscribes.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribes.delete(key);
    }
  }
}

// Export singleton instance
export const firebaseBinderService = new FirebaseBinderService();
export default firebaseBinderService;

# Firestore Subcollection Migration Plan

## Moving Pokemon Cards from Document Objects to Subcollections

### 🎯 Overview

We're migrating from storing all cards in a binder document's `cards` object (which can hit the 1MB Firestore limit) to using subcollections where each card is its own document. This provides unlimited scalability and better performance.

### 📊 Current vs New Structure

#### Current Structure (Legacy)

```
user_binders/{userId}_{binderId} (document)
  - metadata: { name, description, etc. }
  - settings: { gridSize, theme, etc. }
  - cards: {                           // ❌ This object can exceed 1MB
      "0": { cardData, addedAt, etc. }
      "1": { cardData, addedAt, etc. }
      "999": { cardData, addedAt, etc. }
    }
  - schemaVersion: "v1" (legacy)
```

#### New Structure (Subcollection)

```
user_binders/{userId}_{binderId} (document)
  - metadata: { name, description, etc. }
  - settings: { gridSize, theme, etc. }
  - cards: {}                          // ✅ Empty object for compatibility
  - schemaVersion: "v2" (subcollection)

  cards (subcollection) ✅ Unlimited scalability
    - {instanceId1} (document)
        - position: 0
        - cardData: { id, name, image, etc. }
        - addedAt: "2025-06-19T02:03:37.928Z"
        - addedBy: "userId"
        - condition: "mint"
        - notes: ""
        - quantity: 1
        - isProtected: false
    - {instanceId2} (document)
        - position: 1
        - cardData: { ... }
        - etc.
```

## 🏗️ Implementation Phases

### Phase 1: Core Infrastructure

**Goal:** Set up dual-mode support without breaking existing functionality

#### Step 1.1: Create Schema Detection Service

File: `src/services/BinderSchemaService.js`

```javascript
export class BinderSchemaService {
  static SCHEMA_VERSIONS = {
    V1_LEGACY: "v1",
    V2_SUBCOLLECTION: "v2",
  };

  static detectSchemaVersion(binder) {
    // Explicit version check first
    if (binder.schemaVersion) {
      return binder.schemaVersion;
    }

    // Legacy detection: if cards object has content
    if (
      binder.cards &&
      typeof binder.cards === "object" &&
      Object.keys(binder.cards).length > 0
    ) {
      return this.SCHEMA_VERSIONS.V1_LEGACY;
    }

    // Default to v2 for new binders
    return this.SCHEMA_VERSIONS.V2_SUBCOLLECTION;
  }

  static isLegacyBinder(binder) {
    return this.detectSchemaVersion(binder) === this.SCHEMA_VERSIONS.V1_LEGACY;
  }

  static isSubcollectionBinder(binder) {
    return (
      this.detectSchemaVersion(binder) === this.SCHEMA_VERSIONS.V2_SUBCOLLECTION
    );
  }

  static shouldMigrate(binder) {
    return (
      this.isLegacyBinder(binder) && Object.keys(binder.cards || {}).length > 0
    );
  }
}
```

#### Step 1.2: Create Enhanced Binder Service

File: `src/services/BinderV2Service.js`

```javascript
import {
  doc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  orderBy,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { BinderSchemaService } from "./BinderSchemaService";

export class BinderV2Service {
  /**
   * Get cards for any binder version
   */
  async getBinderCards(binderId, userId) {
    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    const binderDoc = await getDoc(binderRef);

    if (!binderDoc.exists()) {
      return [];
    }

    const binder = binderDoc.data();
    const schemaVersion = BinderSchemaService.detectSchemaVersion(binder);

    if (schemaVersion === BinderSchemaService.SCHEMA_VERSIONS.V1_LEGACY) {
      return this.getLegacyCards(binder);
    } else {
      return this.getSubcollectionCards(binderId, userId);
    }
  }

  /**
   * Legacy cards from document object
   */
  getLegacyCards(binder) {
    const cards = [];
    if (binder.cards && typeof binder.cards === "object") {
      Object.entries(binder.cards).forEach(([position, cardData]) => {
        cards.push({
          ...cardData,
          position: parseInt(position),
          id: cardData.instanceId || `${position}_${cardData.cardId}`,
        });
      });
    }
    return cards.sort((a, b) => a.position - b.position);
  }

  /**
   * Subcollection cards
   */
  async getSubcollectionCards(binderId, userId) {
    const cardsRef = collection(
      db,
      "user_binders",
      `${userId}_${binderId}`,
      "cards"
    );
    const q = query(cardsRef, orderBy("position", "asc"));
    const snapshot = await getDocs(q);

    const cards = [];
    snapshot.forEach((doc) => {
      cards.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return cards;
  }

  /**
   * Add card - works with both versions
   */
  async addCard(binderId, userId, cardData, position) {
    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    const binderDoc = await getDoc(binderRef);

    if (!binderDoc.exists()) {
      throw new Error("Binder not found");
    }

    const binder = binderDoc.data();
    const schemaVersion = BinderSchemaService.detectSchemaVersion(binder);

    if (schemaVersion === BinderSchemaService.SCHEMA_VERSIONS.V1_LEGACY) {
      return this.addLegacyCard(binderRef, cardData, position);
    } else {
      return this.addSubcollectionCard(binderId, userId, cardData, position);
    }
  }

  /**
   * Legacy card addition
   */
  async addLegacyCard(binderRef, cardData, position) {
    const binderDoc = await getDoc(binderRef);
    const binder = binderDoc.data();

    const updatedCards = {
      ...binder.cards,
      [position.toString()]: cardData,
    };

    await updateDoc(binderRef, {
      cards: updatedCards,
      lastModified: serverTimestamp(),
    });
  }

  /**
   * Subcollection card addition
   */
  async addSubcollectionCard(binderId, userId, cardData, position) {
    const cardsRef = collection(
      db,
      "user_binders",
      `${userId}_${binderId}`,
      "cards"
    );

    const cardDoc = {
      ...cardData,
      position,
      addedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(cardsRef, cardDoc);

    // Update binder last modified
    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    await updateDoc(binderRef, {
      lastModified: serverTimestamp(),
    });

    return docRef.id;
  }

  /**
   * Remove card - works with both versions
   */
  async removeCard(binderId, userId, cardIdentifier) {
    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    const binderDoc = await getDoc(binderRef);

    if (!binderDoc.exists()) {
      throw new Error("Binder not found");
    }

    const binder = binderDoc.data();
    const schemaVersion = BinderSchemaService.detectSchemaVersion(binder);

    if (schemaVersion === BinderSchemaService.SCHEMA_VERSIONS.V1_LEGACY) {
      return this.removeLegacyCard(binderRef, cardIdentifier);
    } else {
      return this.removeSubcollectionCard(binderId, userId, cardIdentifier);
    }
  }

  /**
   * Legacy card removal (cardIdentifier is position)
   */
  async removeLegacyCard(binderRef, position) {
    const binderDoc = await getDoc(binderRef);
    const binder = binderDoc.data();

    const updatedCards = { ...binder.cards };
    delete updatedCards[position.toString()];

    await updateDoc(binderRef, {
      cards: updatedCards,
      lastModified: serverTimestamp(),
    });
  }

  /**
   * Subcollection card removal (cardIdentifier is document ID)
   */
  async removeSubcollectionCard(binderId, userId, cardId) {
    const cardRef = doc(
      db,
      "user_binders",
      `${userId}_${binderId}`,
      "cards",
      cardId
    );
    await deleteDoc(cardRef);

    // Update binder last modified
    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    await updateDoc(binderRef, {
      lastModified: serverTimestamp(),
    });
  }

  /**
   * Create new binder (always v2)
   */
  async createBinder(binderData, userId) {
    const binderRef = doc(db, "user_binders", `${userId}_${binderData.id}`);

    const newBinder = {
      ...binderData,
      schemaVersion: BinderSchemaService.SCHEMA_VERSIONS.V2_SUBCOLLECTION,
      cards: {}, // Empty for compatibility
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      ownerId: userId,
    };

    await setDoc(binderRef, newBinder);
    return newBinder;
  }

  /**
   * Batch add cards - optimized for both versions
   */
  async batchAddCards(binderId, userId, cardsData, startPosition = 0) {
    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    const binderDoc = await getDoc(binderRef);

    if (!binderDoc.exists()) {
      throw new Error("Binder not found");
    }

    const binder = binderDoc.data();
    const schemaVersion = BinderSchemaService.detectSchemaVersion(binder);

    if (schemaVersion === BinderSchemaService.SCHEMA_VERSIONS.V1_LEGACY) {
      return this.batchAddLegacyCards(binderRef, cardsData, startPosition);
    } else {
      return this.batchAddSubcollectionCards(
        binderId,
        userId,
        cardsData,
        startPosition
      );
    }
  }

  /**
   * Batch add legacy cards
   */
  async batchAddLegacyCards(binderRef, cardsData, startPosition) {
    const binderDoc = await getDoc(binderRef);
    const binder = binderDoc.data();

    const updatedCards = { ...binder.cards };
    cardsData.forEach((cardData, index) => {
      const position = startPosition + index;
      updatedCards[position.toString()] = cardData;
    });

    await updateDoc(binderRef, {
      cards: updatedCards,
      lastModified: serverTimestamp(),
    });
  }

  /**
   * Batch add subcollection cards
   */
  async batchAddSubcollectionCards(binderId, userId, cardsData, startPosition) {
    const batch = writeBatch(db);

    cardsData.forEach((cardData, index) => {
      const position = startPosition + index;
      const cardsRef = collection(
        db,
        "user_binders",
        `${userId}_${binderId}`,
        "cards"
      );
      const cardDocRef = doc(cardsRef); // Auto-generated ID

      batch.set(cardDocRef, {
        ...cardData,
        position,
        addedAt: new Date().toISOString(),
      });
    });

    // Update binder last modified
    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    batch.update(binderRef, {
      lastModified: serverTimestamp(),
    });

    await batch.commit();
  }
}
```

### Phase 2: Context Integration

**Goal:** Update BinderContext to work with both legacy and new systems

#### Step 2.1: Update BinderContext.jsx

Add imports:

```javascript
import { BinderV2Service } from "../services/BinderV2Service";
import { BinderSchemaService } from "../services/BinderSchemaService";
```

Add service instance:

```javascript
const binderV2Service = new BinderV2Service();
```

Update key functions:

```javascript
// Update createNewBinder to always use v2
const createNewBinder = useCallback(
  async (name, description = "") => {
    // ... existing validation code ...

    const newBinder = createEmptyBinder(
      name,
      description,
      user?.uid || "local_user"
    );

    if (user?.uid) {
      // Create as v2 binder in cloud
      try {
        const cloudBinder = await binderV2Service.createBinder(
          newBinder,
          user.uid
        );
        setBinders((prev) => [cloudBinder, ...prev]);
        return cloudBinder;
      } catch (error) {
        console.error("Failed to create cloud binder:", error);
        throw error;
      }
    } else {
      // Local binder (still legacy for now)
      setBinders((prev) => [newBinder, ...prev]);
      return newBinder;
    }
  },
  [user, checkBinderLimits, canPerformAction]
);

// Update addCardToBinder
const addCardToBinder = useCallback(
  async (binderId, card, targetPosition, metadata = {}) => {
    const binder = binders.find((b) => b.id === binderId);
    if (!binder) throw new Error("Binder not found");

    if (user?.uid && binder.ownerId === user.uid) {
      // Use new service for cloud binders
      await binderV2Service.addCard(
        binderId,
        user.uid,
        {
          cardId: card.id,
          instanceId: generateInstanceId(),
          cardData: card,
          condition: metadata.condition || "mint",
          notes: metadata.notes || "",
          quantity: metadata.quantity || 1,
          isProtected: metadata.isProtected || false,
        },
        targetPosition
      );

      // Reload binder cards
      await refreshBinderCards(binderId);
    } else {
      // Local binder - use existing logic
      // ... existing local logic ...
    }
  },
  [binders, user, binderV2Service]
);

// Add new function to refresh cards
const refreshBinderCards = useCallback(
  async (binderId) => {
    if (!user?.uid) return;

    try {
      const cards = await binderV2Service.getBinderCards(binderId, user.uid);

      setBinders((prev) =>
        prev.map((binder) => {
          if (binder.id === binderId) {
            if (BinderSchemaService.isSubcollectionBinder(binder)) {
              // For v2 binders, store cards separately
              return { ...binder, _subcollectionCards: cards };
            } else {
              // For v1 binders, convert back to cards object
              const cardsObject = {};
              cards.forEach((card) => {
                cardsObject[card.position.toString()] = card;
              });
              return { ...binder, cards: cardsObject };
            }
          }
          return binder;
        })
      );
    } catch (error) {
      console.error("Failed to refresh binder cards:", error);
    }
  },
  [user, binderV2Service]
);
```

### Phase 3: Component Updates

**Goal:** Update all components to work with new card loading system

#### Components to Update:

- `src/pages/BinderPage.jsx`
- `src/pages/PublicBinderViewPage.jsx`
- `src/components/binder/BinderCore.jsx`
- `src/components/admin/BinderViewer.jsx`

#### Example BinderPage.jsx Update:

```javascript
import { BinderV2Service } from "../services/BinderV2Service";
import { BinderSchemaService } from "../services/BinderSchemaService";

const BinderPage = () => {
  const [cardsLoading, setCardsLoading] = useState(false);
  const [binderCards, setBinderCards] = useState([]);
  const binderV2Service = new BinderV2Service();

  // Load cards when binder changes
  useEffect(() => {
    const loadCards = async () => {
      if (!currentBinder || !user?.uid) {
        setBinderCards([]);
        return;
      }

      setCardsLoading(true);
      try {
        const cards = await binderV2Service.getBinderCards(
          currentBinder.id,
          user.uid
        );
        setBinderCards(cards);
      } catch (error) {
        console.error("Failed to load cards:", error);
        toast.error("Failed to load binder cards");
      } finally {
        setCardsLoading(false);
      }
    };

    loadCards();
  }, [currentBinder, user]);

  // Pass cards to components
  return (
    <BinderCore
      binder={currentBinder}
      cards={binderCards}
      cardsLoading={cardsLoading}
      onCardsUpdate={() => loadCards()}
      // ... other props
    />
  );
};
```

### Phase 4: Migration Tools

**Goal:** Provide tools to migrate existing binders

#### Step 4.1: Create Migration Service

File: `src/services/BinderMigrationService.js`

```javascript
import {
  doc,
  collection,
  writeBatch,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { BinderSchemaService } from "./BinderSchemaService";

export class BinderMigrationService {
  async migrateBinder(binderId, userId, options = {}) {
    const {
      dryRun = false,
      preserveOriginal = true,
      onProgress = null,
    } = options;

    console.log(
      `${dryRun ? "[DRY RUN] " : ""}Starting migration for binder ${binderId}`
    );

    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    const binderDoc = await getDoc(binderRef);

    if (!binderDoc.exists()) {
      throw new Error("Binder not found");
    }

    const binder = binderDoc.data();

    // Check if already migrated
    if (BinderSchemaService.isSubcollectionBinder(binder)) {
      console.log("Binder already migrated");
      return { success: true, alreadyMigrated: true };
    }

    // Prepare cards for migration
    const cardsToMigrate = [];
    if (binder.cards && typeof binder.cards === "object") {
      Object.entries(binder.cards).forEach(([position, cardData]) => {
        cardsToMigrate.push({
          ...cardData,
          position: parseInt(position),
        });
      });
    }

    console.log(
      `${dryRun ? "[DRY RUN] " : ""}Migrating ${cardsToMigrate.length} cards`
    );
    onProgress?.(0, cardsToMigrate.length, "Starting migration...");

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        cardsToMigrate: cardsToMigrate.length,
        preview: cardsToMigrate.slice(0, 5), // Show first 5 cards
      };
    }

    // Create subcollection cards
    const batch = writeBatch(db);
    let processedCards = 0;

    cardsToMigrate.forEach((cardData) => {
      const cardRef = doc(
        collection(db, "user_binders", `${userId}_${binderId}`, "cards")
      );
      batch.set(cardRef, cardData);
      processedCards++;
      onProgress?.(
        processedCards,
        cardsToMigrate.length,
        `Migrating card ${processedCards}`
      );
    });

    // Update binder to v2 schema
    const updateData = {
      schemaVersion: BinderSchemaService.SCHEMA_VERSIONS.V2_SUBCOLLECTION,
      migratedAt: new Date().toISOString(),
      migratedFrom: "v1",
      migratedCardCount: cardsToMigrate.length,
    };

    if (!preserveOriginal) {
      updateData.cards = {}; // Clear legacy cards
    } else {
      updateData.originalCards = binder.cards; // Backup original
    }

    batch.update(binderRef, updateData);

    await batch.commit();

    console.log(`Migration completed for binder ${binderId}`);
    onProgress?.(
      cardsToMigrate.length,
      cardsToMigrate.length,
      "Migration complete"
    );

    return {
      success: true,
      migratedCards: cardsToMigrate.length,
      preservedOriginal: preserveOriginal,
    };
  }

  async migrateBulk(binderIds, userId, options = {}) {
    const { onProgress = null, onBatchProgress = null } = options;
    const results = [];

    for (let i = 0; i < binderIds.length; i++) {
      const binderId = binderIds[i];
      try {
        onBatchProgress?.(i, binderIds.length, `Starting ${binderId}...`);

        const result = await this.migrateBinder(binderId, userId, {
          ...options,
          onProgress: (current, total, message) => {
            onProgress?.(
              i,
              binderIds.length,
              binderId,
              current,
              total,
              message
            );
          },
        });

        results.push({ binderId, ...result });
        onBatchProgress?.(i + 1, binderIds.length, `Completed ${binderId}`);
      } catch (error) {
        console.error(`Migration failed for binder ${binderId}:`, error);
        results.push({ binderId, success: false, error: error.message });
        onBatchProgress?.(
          i + 1,
          binderIds.length,
          `Failed ${binderId}: ${error.message}`
        );
      }
    }

    return results;
  }

  async rollbackMigration(binderId, userId) {
    console.log(`Rolling back migration for binder ${binderId}`);

    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    const binderDoc = await getDoc(binderRef);

    if (!binderDoc.exists()) {
      throw new Error("Binder not found");
    }

    const binder = binderDoc.data();

    if (!binder.originalCards) {
      throw new Error("No backup data found for rollback");
    }

    // Restore original cards
    const batch = writeBatch(db);

    // Delete subcollection cards
    const cardsRef = collection(
      db,
      "user_binders",
      `${userId}_${binderId}`,
      "cards"
    );
    const cardsSnapshot = await getDocs(cardsRef);
    cardsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Restore binder to v1
    batch.update(binderRef, {
      schemaVersion: BinderSchemaService.SCHEMA_VERSIONS.V1_LEGACY,
      cards: binder.originalCards,
      rolledBackAt: new Date().toISOString(),
      originalCards: null, // Remove backup
      migratedAt: null,
      migratedFrom: null,
      migratedCardCount: null,
    });

    await batch.commit();

    console.log(`Rollback completed for binder ${binderId}`);
    return { success: true };
  }
}
```

#### Step 4.2: Create Admin Migration Tool

File: `src/components/admin/BinderMigrationTool.jsx`

```javascript
import { useState } from "react";
import { BinderMigrationService } from "../../services/BinderMigrationService";
import { toast } from "react-hot-toast";

const BinderMigrationTool = () => {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [userId, setUserId] = useState("");

  const migrationService = new BinderMigrationService();

  const handleMigrateUser = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    setMigrating(true);
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setBatchProgress({ current: 0, total: 0 });

    try {
      // Get all user binders first
      const userBinders = await getUserBinders(userId);
      const binderIds = userBinders.map((b) => b.id);

      toast.info(`Found ${binderIds.length} binders to migrate`);

      const migrationResults = await migrationService.migrateBulk(
        binderIds,
        userId,
        {
          preserveOriginal: true,
          onProgress: (
            binderIndex,
            totalBinders,
            binderId,
            cardCurrent,
            cardTotal,
            message
          ) => {
            setProgress({ current: cardCurrent, total: cardTotal });
          },
          onBatchProgress: (current, total, message) => {
            setBatchProgress({ current, total });
            setResults((prev) => [
              ...prev.slice(0, -1),
              { message, inProgress: true },
            ]);
          },
        }
      );

      setResults(migrationResults);
      toast.success(
        `Migration completed! ${migrationResults.length} binders processed.`
      );
    } catch (error) {
      console.error("Bulk migration failed:", error);
      toast.error("Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  const handleDryRun = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    try {
      const userBinders = await getUserBinders(userId);
      const binderIds = userBinders.slice(0, 3).map((b) => b.id); // Test first 3

      const dryRunResults = await Promise.all(
        binderIds.map((binderId) =>
          migrationService.migrateBinder(binderId, userId, { dryRun: true })
        )
      );

      setResults(
        dryRunResults.map((result, i) => ({
          binderId: binderIds[i],
          ...result,
        }))
      );

      toast.info("Dry run completed - check results below");
    } catch (error) {
      console.error("Dry run failed:", error);
      toast.error("Dry run failed");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">🔄 Binder Migration Tool</h3>
      <p className="text-sm text-gray-600 mb-4">
        Migrate legacy binders to the new subcollection structure.
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          User ID to migrate
        </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter user ID"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleDryRun}
          disabled={migrating}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          Dry Run (Test)
        </button>
        <button
          onClick={handleMigrateUser}
          disabled={migrating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {migrating ? "Migrating..." : "Start Migration"}
        </button>
      </div>

      {migrating && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Binder Progress</span>
            <span>
              {batchProgress.current} / {batchProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${
                  (batchProgress.current / batchProgress.total) * 100
                }%`,
              }}
            />
          </div>

          <div className="flex justify-between text-sm mb-2">
            <span>Cards in Current Binder</span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="max-h-60 overflow-y-auto">
          <h4 className="font-medium mb-2">Migration Results:</h4>
          {results.map((result, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded mb-1 ${
                result.success
                  ? "bg-green-50 text-green-800"
                  : result.dryRun
                  ? "bg-blue-50 text-blue-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {result.binderId}:{" "}
              {result.dryRun
                ? `[DRY RUN] ${result.cardsToMigrate} cards to migrate`
                : result.success
                ? result.alreadyMigrated
                  ? "Already migrated"
                  : `✅ Migrated ${result.migratedCards} cards`
                : `❌ Failed: ${result.error}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BinderMigrationTool;
```

### Phase 5: Firestore Rules

**Goal:** Update security rules for subcollections

#### Step 5.1: Update firestore.rules

```javascript
// Add to existing rules after user_binders rules
match /user_binders/{binderId}/cards/{cardId} {
  // Only binder owner can read/write cards
  allow read, write: if request.auth != null &&
                        resource != null &&
                        get(/databases/$(database)/documents/user_binders/$(binderId)).data.ownerId == request.auth.uid;

  // Allow creation if user owns the parent binder
  allow create: if request.auth != null &&
                   get(/databases/$(database)/documents/user_binders/$(binderId)).data.ownerId == request.auth.uid;

  // Admin access
  allow read, write: if isOwner();

  // Block if emergency mode (except for owners)
  allow read, write: if !isEmergencyMode();
}
```

### Phase 6: Testing & Validation

**Goal:** Comprehensive testing of both systems

#### Step 6.1: Create Validation Scripts

File: `src/utils/migrationValidation.js`

```javascript
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BinderSchemaService } from "../services/BinderSchemaService";

export async function validateBinder(binderId, userId) {
  const validation = {
    exists: false,
    schemaVersion: null,
    cardCount: 0,
    subcollectionCardCount: 0,
    issues: [],
    recommendations: [],
  };

  try {
    const binderRef = doc(db, "user_binders", `${userId}_${binderId}`);
    const binderDoc = await getDoc(binderRef);

    if (!binderDoc.exists()) {
      validation.issues.push("Binder document not found");
      return validation;
    }

    validation.exists = true;
    const binder = binderDoc.data();
    validation.schemaVersion = BinderSchemaService.detectSchemaVersion(binder);

    // Count legacy cards
    if (binder.cards && typeof binder.cards === "object") {
      validation.cardCount = Object.keys(binder.cards).length;
    }

    // Count subcollection cards
    const cardsRef = collection(
      db,
      "user_binders",
      `${userId}_${binderId}`,
      "cards"
    );
    const cardsSnapshot = await getDocs(cardsRef);
    validation.subcollectionCardCount = cardsSnapshot.size;

    // Validate consistency
    if (validation.schemaVersion === "v2" && validation.cardCount > 0) {
      validation.issues.push("V2 binder should not have legacy cards");
    }

    if (
      validation.schemaVersion === "v1" &&
      validation.subcollectionCardCount > 0
    ) {
      validation.issues.push("V1 binder should not have subcollection cards");
    }

    // Check for migration candidates
    if (validation.schemaVersion === "v1" && validation.cardCount > 100) {
      validation.recommendations.push(
        "Consider migrating - high card count may hit limits"
      );
    }

    if (validation.schemaVersion === "v1" && validation.cardCount > 500) {
      validation.recommendations.push(
        "URGENT: Migrate soon - approaching 1MB limit"
      );
    }
  } catch (error) {
    validation.issues.push(`Validation error: ${error.message}`);
  }

  return validation;
}

export async function validateUserBinders(userId) {
  const summary = {
    totalBinders: 0,
    v1Binders: 0,
    v2Binders: 0,
    needsMigration: 0,
    urgentMigration: 0,
    issues: [],
  };

  try {
    // Get all user binders
    const userBinders = await getUserBinders(userId);
    summary.totalBinders = userBinders.length;

    for (const binder of userBinders) {
      const validation = await validateBinder(binder.id, userId);

      if (validation.schemaVersion === "v1") {
        summary.v1Binders++;
        if (validation.cardCount > 100) summary.needsMigration++;
        if (validation.cardCount > 500) summary.urgentMigration++;
      } else if (validation.schemaVersion === "v2") {
        summary.v2Binders++;
      }

      summary.issues.push(
        ...validation.issues.map((issue) => `${binder.id}: ${issue}`)
      );
    }
  } catch (error) {
    summary.issues.push(`Validation error: ${error.message}`);
  }

  return summary;
}
```

#### Step 6.2: Test Checklist

- [ ] ✅ Create new binder (should use v2)
- [ ] ✅ Load legacy binder (should work normally)
- [ ] ✅ Add cards to legacy binder (should work)
- [ ] ✅ Add cards to v2 binder (should use subcollection)
- [ ] ✅ Migration tool (should convert v1 to v2)
- [ ] ✅ Public binder view (should work with both)
- [ ] ✅ Admin panel (should work with both)
- [ ] ✅ Batch operations (should work with both)
- [ ] ✅ Card removal (should work with both)
- [ ] ✅ Rollback functionality
- [ ] ✅ Security rules validation

## 🚀 Deployment Strategy

### Phase 1: Infrastructure Deployment

1. Deploy new services with feature flags
2. Test in development environment
3. Deploy to staging with real data

### Phase 2: Gradual Rollout

1. Enable for admin users only
2. Enable for select power users
3. Monitor error rates and performance
4. Gradual expansion to all users

### Phase 3: Migration Campaign

1. Notify users of new features
2. Provide migration tools in admin panel
3. Optional user-initiated migration
4. Bulk migration for large binders

### Safety Measures

- **Backup before migration**: Store original data
- **Rollback capability**: Keep migration reversible
- **Monitoring**: Track migration success rates
- **Feature flags**: Quick disable if issues arise

## 📊 Benefits After Migration

### Scalability ✅

- No more 1MB document limit
- Unlimited cards per binder
- Better performance for large binders

### Performance ✅

- Faster individual card operations
- Better query performance with proper indexing
- Reduced memory usage

### Maintainability ✅

- Cleaner data structure
- Better separation of concerns
- Easier to extend functionality

### Future Features ✅

- Card-level permissions
- Card-level real-time updates
- Advanced card querying and filtering
- Card analytics and insights
- Individual card sharing
- Card-level comments and notes

## 🎯 Success Metrics

### Technical Metrics

- Migration success rate > 99%
- Zero data loss incidents
- Performance improvement > 50% for large binders
- Error rate < 0.1%

### User Experience

- No downtime during migration
- Seamless user experience
- Faster loading times
- Support for unlimited cards

### Business Impact

- Reduced support tickets about size limits
- Improved user satisfaction
- Enablement of premium features
- Better scalability for growth

This migration plan provides a robust, backwards-compatible solution that will solve your 1MB limit issue while maintaining full functionality for existing users.

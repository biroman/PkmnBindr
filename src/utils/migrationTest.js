// Test utility for IndexedDB migration
// Use this in browser console to test migration manually

import {
  migrateFromLocalStorage,
  getItem,
  setItem,
  STORAGE_KEYS,
} from "./indexedDbUtils";
import logger from "./logger";

// Test function to check if migration works
export const testMigration = async () => {
  try {
    console.log("🧪 Testing IndexedDB Migration...");

    // Check if we have any localStorage data
    const localStorageKeys = Object.values(STORAGE_KEYS);
    const localDataExists = localStorageKeys.some(
      (key) => localStorage.getItem(key) !== null
    );

    console.log(`📦 Local storage data exists: ${localDataExists}`);

    if (!localDataExists) {
      console.log("⚠️ No localStorage data found. Creating test data...");
      // Create some test data
      localStorage.setItem(
        "pkmnbinder_binders",
        JSON.stringify([
          {
            id: "test_binder",
            name: "Test Binder",
            customCards: [],
            createdAt: new Date().toISOString(),
          },
        ])
      );
      console.log("✅ Test data created");
    }

    // Run migration
    console.log("🔄 Starting migration...");
    const migrationResult = await migrateFromLocalStorage();
    console.log(`Migration result: ${migrationResult}`);

    // Test if data was migrated
    console.log("🔍 Checking migrated data...");
    const migratedBinders = await getItem(STORAGE_KEYS.BINDERS);
    console.log("Migrated binders:", migratedBinders);

    // Test writing new data
    console.log("✍️ Testing write operation...");
    await setItem("test_key", "test_value");
    const testValue = await getItem("test_key");
    console.log(`Test write/read: ${testValue}`);

    console.log("✅ Migration test completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Migration test failed:", error);
    return false;
  }
};

// Test function to check IndexedDB availability
export const testIndexedDB = () => {
  if (typeof indexedDB === "undefined") {
    console.log("❌ IndexedDB not available");
    return false;
  }
  console.log("✅ IndexedDB is available");
  return true;
};

// Quick status check
export const checkMigrationStatus = async () => {
  try {
    const migrationComplete = await getItem(STORAGE_KEYS.MIGRATION_COMPLETE);
    console.log(`Migration completed: ${migrationComplete === "true"}`);

    const binders = await getItem(STORAGE_KEYS.BINDERS);
    console.log(
      `Binders in IndexedDB: ${binders ? JSON.parse(binders).length : 0}`
    );

    return migrationComplete === "true";
  } catch (error) {
    console.error("Error checking migration status:", error);
    return false;
  }
};

// Expose functions to window for manual testing
if (typeof window !== "undefined") {
  window.migrationTest = {
    test: testMigration,
    checkIndexedDB: testIndexedDB,
    checkStatus: checkMigrationStatus,
  };
  console.log("🛠️ Migration test utilities available at window.migrationTest");
}

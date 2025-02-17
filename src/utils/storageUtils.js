// Constants for storage keys
const STORAGE_KEYS = {
  BINDERS: "pkmnbinder_binders",
  CURRENT_BINDER: "pkmnbinder_current_binder",
  LAYOUT_PREFS: "pkmnbinder_layout_prefs",
  SET_CACHE: "pkmnbinder_set_cache", // New key for set cache
};

const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// Default binder structure
const DEFAULT_BINDER = {
  id: "default",
  name: "My Collection",
  sets: [], // Array of selected sets
  missingCards: {}, // Object with set IDs as keys and arrays of missing card numbers as values
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Initialize storage with default values if empty
export const initializeStorage = () => {
  const binders = localStorage.getItem(STORAGE_KEYS.BINDERS);
  if (!binders) {
    localStorage.setItem(
      STORAGE_KEYS.BINDERS,
      JSON.stringify([DEFAULT_BINDER])
    );
    localStorage.setItem(STORAGE_KEYS.CURRENT_BINDER, DEFAULT_BINDER.id);
  }
};

// Get all binders
export const getBinders = () => {
  const binders = localStorage.getItem(STORAGE_KEYS.BINDERS);
  return binders ? JSON.parse(binders) : [];
};

// Get current binder
export const getCurrentBinder = () => {
  const binderId = localStorage.getItem(STORAGE_KEYS.CURRENT_BINDER);
  const binders = getBinders();
  return binders.find((b) => b.id === binderId) || binders[0];
};

// Save binder data
export const saveBinder = (binderData) => {
  const binders = getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderData.id);

  binderData.updatedAt = new Date().toISOString();

  if (binderIndex >= 0) {
    binders[binderIndex] = binderData;
  } else {
    binders.push(binderData);
  }

  localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));
};

// Save missing cards for current set
export const saveMissingCards = (setId, missingCards) => {
  const currentBinder = getCurrentBinder();
  currentBinder.missingCards[setId] = Array.from(missingCards);
  saveBinder(currentBinder);
};

// Get missing cards for a set
export const getMissingCards = (setId) => {
  const currentBinder = getCurrentBinder();
  return new Set(currentBinder.missingCards[setId] || []);
};

// Save layout preferences
export const saveLayoutPrefs = (layout) => {
  localStorage.setItem(STORAGE_KEYS.LAYOUT_PREFS, JSON.stringify(layout));
};

// Get layout preferences
export const getLayoutPrefs = () => {
  const prefs = localStorage.getItem(STORAGE_KEYS.LAYOUT_PREFS);
  return prefs ? JSON.parse(prefs) : null;
};

// Create a new binder
export const createBinder = (name) => {
  const newBinder = {
    ...DEFAULT_BINDER,
    id: `binder_${Date.now()}`,
    name: name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const binders = getBinders();
  binders.push(newBinder);
  localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));

  return newBinder;
};

// Delete a binder
export const deleteBinder = (binderId) => {
  let binders = getBinders();

  // Don't delete if it's the last binder
  if (binders.length <= 1) return false;

  binders = binders.filter((b) => b.id !== binderId);
  localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));

  // If deleted binder was current, switch to first available
  const currentBinderId = localStorage.getItem(STORAGE_KEYS.CURRENT_BINDER);
  if (binderId === currentBinderId) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_BINDER, binders[0].id);
  }

  return true;
};

// Rename a binder
export const renameBinder = (binderId, newName) => {
  const binders = getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex >= 0) {
    binders[binderIndex].name = newName;
    binders[binderIndex].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));
    return true;
  }

  return false;
};

// Set current binder
export const setCurrentBinder = (binderId) => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_BINDER, binderId);
};

// Export binder data
export const exportBinderData = () => {
  const data = {
    binders: getBinders(),
    currentBinder: localStorage.getItem(STORAGE_KEYS.CURRENT_BINDER),
    layoutPrefs: getLayoutPrefs(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `pkmnbinder_backup_${
    new Date().toISOString().split("T")[0]
  }.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Import binder data
export const importBinderData = async (file) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate data structure
    if (!data.binders || !Array.isArray(data.binders)) {
      throw new Error("Invalid backup file format");
    }

    localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(data.binders));
    localStorage.setItem(STORAGE_KEYS.CURRENT_BINDER, data.currentBinder);
    if (data.layoutPrefs) {
      localStorage.setItem(
        STORAGE_KEYS.LAYOUT_PREFS,
        JSON.stringify(data.layoutPrefs)
      );
    }

    return true;
  } catch (error) {
    console.error("Error importing data:", error);
    return false;
  }
};

// Save set data to cache
export const saveSetToCache = (setId, cards) => {
  const cache = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.SET_CACHE) || "{}"
  );
  cache[setId] = {
    cards,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEYS.SET_CACHE, JSON.stringify(cache));
};

// Get set data from cache
export const getSetFromCache = (setId) => {
  const cache = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.SET_CACHE) || "{}"
  );
  const cachedData = cache[setId];

  if (!cachedData) return null;

  // Check if cache is expired
  if (Date.now() - cachedData.timestamp > CACHE_EXPIRY) {
    // Remove expired cache
    delete cache[setId];
    localStorage.setItem(STORAGE_KEYS.SET_CACHE, JSON.stringify(cache));
    return null;
  }

  return cachedData.cards;
};

// Clear specific set from cache
export const clearSetFromCache = (setId) => {
  const cache = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.SET_CACHE) || "{}"
  );
  delete cache[setId];
  localStorage.setItem(STORAGE_KEYS.SET_CACHE, JSON.stringify(cache));
};

// Clear entire cache
export const clearSetCache = () => {
  localStorage.removeItem(STORAGE_KEYS.SET_CACHE);
};

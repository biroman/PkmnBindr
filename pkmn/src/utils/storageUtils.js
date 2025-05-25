// Constants for storage keys
const STORAGE_KEYS = {
  BINDERS: "pkmnbinder_binders",
  CURRENT_BINDER: "pkmnbinder_current_binder",
  LAYOUT_PREFS: "pkmnbinder_layout_prefs",
  SET_CACHE: "pkmnbinder_set_cache", // New key for set cache
  CARD_CLIPBOARD: "pkmnbinder_card_clipboard", // New key for card clipboard
};

const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// Default binder structure
const DEFAULT_BINDER = {
  id: "default",
  name: "My Collection",
  sets: [], // Array of selected sets
  missingCards: {}, // Object with set IDs as keys and arrays of missing card numbers as values
  customCards: [], // Array of custom cards added individually
  binderType: "set", // "set" or "custom"
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

// Custom binder functions
export const addCustomCard = (binderId, card, position = null) => {
  const binders = getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex >= 0) {
    const binder = binders[binderIndex];
    if (!binder.customCards) {
      binder.customCards = [];
    }

    // Add card with unique position ID
    const cardWithPosition = {
      ...card,
      positionId: `${Date.now()}_${Math.random()}`,
      addedAt: new Date().toISOString(),
    };

    if (position !== null && position >= 0) {
      // Insert at specific position, extending array if necessary
      while (binder.customCards.length <= position) {
        binder.customCards.push(null);
      }
      binder.customCards[position] = cardWithPosition;
    } else {
      // Find the first empty slot or add to the end
      const emptyIndex = binder.customCards.findIndex((card) => card === null);
      if (emptyIndex >= 0) {
        binder.customCards[emptyIndex] = cardWithPosition;
      } else {
        binder.customCards.push(cardWithPosition);
      }
    }

    binder.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));
    return cardWithPosition;
  }
  return null;
};

export const removeCustomCard = (binderId, cardIndex) => {
  const binders = getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex >= 0) {
    const binder = binders[binderIndex];
    if (binder.customCards && cardIndex < binder.customCards.length) {
      // Set the position to null instead of removing to maintain positions
      binder.customCards[cardIndex] = null;
      binder.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));
      return true;
    }
  }
  return false;
};

export const reorderCustomCards = (
  binderId,
  fromIndex,
  toIndex,
  isSwap = false
) => {
  const binders = getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex >= 0) {
    const binder = binders[binderIndex];
    if (binder.customCards) {
      // Create a sparse array to handle positioning
      const maxIndex = Math.max(
        fromIndex,
        toIndex,
        binder.customCards.length - 1
      );
      const sparseArray = new Array(maxIndex + 1).fill(null);

      // Fill the sparse array with existing cards
      binder.customCards.forEach((card, index) => {
        if (card !== null && index < sparseArray.length) {
          sparseArray[index] = card;
        }
      });

      // Ensure both indices exist in the array
      if (toIndex >= sparseArray.length) {
        sparseArray.length = toIndex + 1;
        for (let i = maxIndex + 1; i < sparseArray.length; i++) {
          if (sparseArray[i] === undefined) {
            sparseArray[i] = null;
          }
        }
      }

      if (fromIndex < sparseArray.length && sparseArray[fromIndex]) {
        const fromCard = sparseArray[fromIndex];

        if (isSwap && sparseArray[toIndex]) {
          // Swap the two cards
          const toCard = sparseArray[toIndex];
          sparseArray[fromIndex] = toCard;
          sparseArray[toIndex] = fromCard;
        } else {
          // Move to empty position
          sparseArray[fromIndex] = null;
          sparseArray[toIndex] = fromCard;
        }

        // Update the binder with the new sparse array
        binder.customCards = sparseArray;
        binder.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));
        return true;
      }
    }
  }
  return false;
};

export const getCustomCards = (binderId) => {
  const binders = getBinders();
  const binder = binders.find((b) => b.id === binderId);
  return binder?.customCards || [];
};

export const setBinderType = (binderId, type) => {
  const binders = getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex >= 0) {
    binders[binderIndex].binderType = type;
    binders[binderIndex].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));
    return true;
  }
  return false;
};

// Card Clipboard functions
export const getCardClipboard = () => {
  const clipboard = localStorage.getItem(STORAGE_KEYS.CARD_CLIPBOARD);
  return clipboard ? JSON.parse(clipboard) : [];
};

export const addToCardClipboard = (card) => {
  const clipboard = getCardClipboard();

  // Check if card already exists (same id and reverse holo status)
  const existingIndex = clipboard.findIndex(
    (c) => c.id === card.id && c.isReverseHolo === card.isReverseHolo
  );

  if (existingIndex >= 0) {
    return false; // Card already in clipboard
  }

  // Limit clipboard to 5 cards
  if (clipboard.length >= 5) {
    return false; // Clipboard full
  }

  const cardWithTimestamp = {
    ...card,
    clipboardAddedAt: new Date().toISOString(),
  };

  clipboard.push(cardWithTimestamp);
  localStorage.setItem(STORAGE_KEYS.CARD_CLIPBOARD, JSON.stringify(clipboard));
  return true;
};

export const removeFromCardClipboard = (index) => {
  const clipboard = getCardClipboard();

  if (index >= 0 && index < clipboard.length) {
    clipboard.splice(index, 1);
    localStorage.setItem(
      STORAGE_KEYS.CARD_CLIPBOARD,
      JSON.stringify(clipboard)
    );
    return true;
  }
  return false;
};

export const clearCardClipboard = () => {
  localStorage.removeItem(STORAGE_KEYS.CARD_CLIPBOARD);
};

export const moveCardFromClipboard = (
  clipboardIndex,
  binderId,
  position = null
) => {
  const clipboard = getCardClipboard();

  if (clipboardIndex >= 0 && clipboardIndex < clipboard.length) {
    const card = clipboard[clipboardIndex];

    // Remove clipboard-specific properties
    // eslint-disable-next-line no-unused-vars
    const { clipboardAddedAt, ...cleanCard } = card;

    // Add to binder
    const result = addCustomCard(binderId, cleanCard, position);

    if (result) {
      // Remove from clipboard
      removeFromCardClipboard(clipboardIndex);
      return result;
    }
  }
  return null;
};

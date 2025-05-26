// Constants for storage keys
const STORAGE_KEYS = {
  BINDERS: "pkmnbinder_binders",
  CURRENT_BINDER: "pkmnbinder_current_binder",
  LAYOUT_PREFS: "pkmnbinder_layout_prefs",
  SET_CACHE: "pkmnbinder_set_cache", // New key for set cache
  CARD_CLIPBOARD: "pkmnbinder_card_clipboard", // New key for card clipboard
  BINDER_HISTORY: "pkmnbinder_binder_history", // New key for binder history
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

    // Determine final position for history
    let finalPosition = position;
    if (position === null || position < 0) {
      const emptyIndex = binder.customCards.findIndex((card) => card === null);
      finalPosition = emptyIndex >= 0 ? emptyIndex : binder.customCards.length;
    }

    // Add history entry before making changes
    addHistoryEntry(binderId, "add", {
      cardName: card.name,
      cardImage: card.images?.small,
      position: finalPosition,
    });

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
      const cardToRemove = binder.customCards[cardIndex];

      if (cardToRemove) {
        // Add history entry before making changes
        addHistoryEntry(binderId, "remove", {
          cardName: cardToRemove.name,
          cardImage: cardToRemove.images?.small,
          position: cardIndex,
        });
      }

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

        // Add history entry before making changes
        if (isSwap && sparseArray[toIndex]) {
          addHistoryEntry(binderId, "swap", {
            cardName: fromCard.name,
            cardImage: fromCard.images?.small,
            fromPosition: fromIndex,
            toPosition: toIndex,
          });
          // Swap the two cards
          const toCard = sparseArray[toIndex];
          sparseArray[fromIndex] = toCard;
          sparseArray[toIndex] = fromCard;
        } else {
          addHistoryEntry(binderId, "move", {
            cardName: fromCard.name,
            cardImage: fromCard.images?.small,
            fromPosition: fromIndex,
            toPosition: toIndex,
          });
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

// Binder History functions
export const getBinderHistory = (binderId) => {
  const historyKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}`;
  const history = localStorage.getItem(historyKey);
  return history ? JSON.parse(history) : [];
};

// Helper function to create lightweight card snapshots for history
const createCardSnapshot = (card) => {
  // Handle null cards (empty slots) - preserve them as null
  if (card === null || card === undefined) {
    return null;
  }

  return {
    id: card.id,
    name: card.name,
    set: card.set,
    number: card.number,
    rarity: card.rarity,
    // Store only small image URL if available
    images: card.images ? { small: card.images.small } : null,
    // Keep any custom properties but remove large data
    ...(card.customCard && { customCard: true }),
    ...(card.position && { position: card.position }),
    // Preserve important metadata for restoration
    ...(card.positionId && { positionId: card.positionId }),
    ...(card.addedAt && { addedAt: card.addedAt }),
  };
};

// Helper function to create lightweight binder state snapshot
const createBinderSnapshot = (cards) => {
  // Preserve the exact array structure including null values
  return cards.map(createCardSnapshot);
};

export const addHistoryEntry = (binderId, action, details) => {
  const historyKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}`;
  const history = getBinderHistory(binderId);

  // If we're currently viewing a historical state, truncate history from that point
  const currentPosition = getHistoryPosition(binderId);
  if (currentPosition !== -1) {
    history.splice(currentPosition + 1);
    setHistoryPosition(binderId, -1); // Reset to current state
  }

  const entry = {
    id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action, // "add", "remove", "move", "swap"
    ...details, // Additional details like cardName, position, etc.
    binderState: createBinderSnapshot(getCustomCards(binderId)), // Lightweight snapshot
  };

  history.push(entry);

  // Keep only last 20 entries to prevent storage bloat (reduced from 50)
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  try {
    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      // If still hitting quota, reduce history further and try again
      console.warn("localStorage quota exceeded, reducing history size");
      history.splice(0, Math.floor(history.length / 2)); // Keep only half
      try {
        localStorage.setItem(historyKey, JSON.stringify(history));
      } catch (secondError) {
        console.error(
          "Unable to save history even after reduction:",
          secondError
        );
        // Clear history as last resort
        localStorage.removeItem(historyKey);
        return null;
      }
    } else {
      throw error;
    }
  }

  return entry;
};

// Store the final state after an action is completed
export const updateHistoryWithFinalState = (binderId) => {
  const historyKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}`;
  const history = getBinderHistory(binderId);

  if (history.length > 0) {
    // Update the last entry with the final state after the action
    const lastEntry = history[history.length - 1];
    lastEntry.finalState = createBinderSnapshot(getCustomCards(binderId));

    try {
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
      if (error.name === "QuotaExceededError") {
        console.warn(
          "localStorage quota exceeded in updateHistoryWithFinalState, clearing old history"
        );
        // Remove older entries and try again
        history.splice(0, Math.floor(history.length / 2));
        try {
          localStorage.setItem(historyKey, JSON.stringify(history));
        } catch (secondError) {
          console.error(
            "Unable to save final state even after reduction:",
            secondError
          );
          // Clear history as last resort
          localStorage.removeItem(historyKey);
        }
      } else {
        throw error;
      }
    }
  }

  // Also update the current state if we're not in history navigation mode
  const currentPosition = getHistoryPosition(binderId);
  if (currentPosition === -1) {
    saveCurrentState(binderId);
  }
};

export const revertToHistoryEntry = (binderId, entryId) => {
  const history = getBinderHistory(binderId);
  const entryIndex = history.findIndex((entry) => entry.id === entryId);

  if (entryIndex >= 0) {
    const entry = history[entryIndex];
    const binders = getBinders();
    const binderIndex = binders.findIndex((b) => b.id === binderId);

    if (binderIndex >= 0) {
      // Restore the binder state from the history entry
      binders[binderIndex].customCards = [...entry.binderState];
      binders[binderIndex].updatedAt = new Date().toISOString();

      try {
        localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));

        // Remove all history entries after this one (since we're reverting)
        const newHistory = history.slice(0, entryIndex);
        const historyKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}`;
        localStorage.setItem(historyKey, JSON.stringify(newHistory));

        return true;
      } catch (error) {
        if (error.name === "QuotaExceededError") {
          console.warn(
            "localStorage quota exceeded in revertToHistoryEntry, unable to save state"
          );
          return false;
        } else {
          throw error;
        }
      }
    }
  }
  return false;
};

export const clearBinderHistory = (binderId) => {
  const historyKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}`;
  localStorage.removeItem(historyKey);
  // Also clear the current position
  const positionKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}_position`;
  localStorage.removeItem(positionKey);
  // Also clear the current state
  const currentStateKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}_current`;
  localStorage.removeItem(currentStateKey);
};

// Utility function to free up localStorage space when quota is exceeded
export const freeUpStorageSpace = () => {
  try {
    // Clear set cache first (usually largest)
    clearSetCache();

    // Clear all binder history for all binders
    const binders = getBinders();
    binders.forEach((binder) => {
      clearBinderHistory(binder.id);
    });

    console.log("Cleared cache and history to free up storage space");
    return true;
  } catch (error) {
    console.error("Error freeing up storage space:", error);
    return false;
  }
};

// Enhanced history navigation functions
export const getHistoryPosition = (binderId) => {
  const positionKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}_position`;
  const position = localStorage.getItem(positionKey);
  return position ? parseInt(position, 10) : -1; // -1 means current state (no history navigation)
};

export const setHistoryPosition = (binderId, position) => {
  const positionKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}_position`;
  if (position === -1) {
    localStorage.removeItem(positionKey);
  } else {
    localStorage.setItem(positionKey, position.toString());
  }
};

// Store current state separately for proper navigation
export const saveCurrentState = (binderId) => {
  const currentStateKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}_current`;
  const currentCards = createBinderSnapshot(getCustomCards(binderId));

  try {
    localStorage.setItem(currentStateKey, JSON.stringify(currentCards));
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      console.warn(
        "localStorage quota exceeded in saveCurrentState, skipping save"
      );
      // Don't save current state if quota exceeded
    } else {
      throw error;
    }
  }
};

export const getCurrentState = (binderId) => {
  const currentStateKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}_current`;
  const currentState = localStorage.getItem(currentStateKey);
  return currentState ? JSON.parse(currentState) : [];
};

export const navigateHistory = (binderId, direction) => {
  const history = getBinderHistory(binderId);
  if (history.length === 0) return false;

  const currentPosition = getHistoryPosition(binderId);
  let newPosition;

  // Save current state before first navigation
  if (currentPosition === -1 && direction === "back") {
    saveCurrentState(binderId);
  }

  if (direction === "back") {
    // Going back in history (undo)
    if (currentPosition === -1) {
      // Currently at latest state, go to last history entry
      newPosition = history.length - 1;
    } else if (currentPosition > 0) {
      // Go to previous history entry
      newPosition = currentPosition - 1;
    } else {
      // Already at oldest state
      return false;
    }
  } else if (direction === "forward") {
    // Going forward in history (redo)
    if (currentPosition === -1) {
      // Already at latest state
      return false;
    } else if (currentPosition < history.length - 1) {
      // Go to next history entry
      newPosition = currentPosition + 1;
    } else {
      // Go back to current state
      newPosition = -1;
    }
  } else {
    return false;
  }

  // Apply the state
  const binders = getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex >= 0) {
    if (newPosition === -1) {
      // Restore to current state (latest)
      const currentState = getCurrentState(binderId);
      if (currentState && currentState.length > 0) {
        binders[binderIndex].customCards = [...currentState];
      } else {
        // Fallback: reconstruct from history
        const lastEntry = history[history.length - 1];
        if (lastEntry && lastEntry.finalState) {
          binders[binderIndex].customCards = [...lastEntry.finalState];
        } else {
          binders[binderIndex].customCards = getCustomCards(binderId);
        }
      }
    } else {
      // Restore to specific history entry state (before the action)
      const targetEntry = history[newPosition];
      binders[binderIndex].customCards = [...targetEntry.binderState];
    }

    binders[binderIndex].updatedAt = new Date().toISOString();

    try {
      localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));
    } catch (error) {
      if (error.name === "QuotaExceededError") {
        console.warn(
          "localStorage quota exceeded in navigateHistory, unable to save state"
        );
        return false;
      } else {
        throw error;
      }
    }

    setHistoryPosition(binderId, newPosition);
    return true;
  }

  return false;
};

export const canNavigateHistory = (binderId, direction) => {
  const history = getBinderHistory(binderId);
  if (history.length === 0) return false;

  const currentPosition = getHistoryPosition(binderId);

  if (direction === "back") {
    return currentPosition === -1 || currentPosition > 0;
  } else if (direction === "forward") {
    return currentPosition !== -1; // Can always go forward if not at current state
  }

  return false;
};

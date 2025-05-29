// Updated storage utilities using IndexedDB instead of localStorage
// Maintains the same API but with async functions

import logger from "./logger";
import {
  STORAGE_KEYS,
  getItemJSON,
  setItemJSON,
  getItem,
  setItem,
  removeItem,
  migrateFromLocalStorage,
} from "./indexedDbUtils";

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

// Initialize the storage system and handle migration
export const initializeStorage = async () => {
  try {
    await migrateFromLocalStorage();
    logger.info("Storage system initialized successfully");
    return true;
  } catch (error) {
    logger.error("Failed to initialize storage system:", error);
    return false;
  }
};

// Get all binders
export const getBinders = async () => {
  const binders = await getItemJSON(STORAGE_KEYS.BINDERS);
  return binders || [];
};

// Get current binder
export const getCurrentBinder = async () => {
  const binderId = await getItem(STORAGE_KEYS.CURRENT_BINDER);
  const binders = await getBinders();
  return binders.find((b) => b.id === binderId) || binders[0];
};

// Save binder data
export const saveBinder = async (binderData) => {
  const binders = await getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderData.id);

  binderData.updatedAt = new Date().toISOString();

  if (binderIndex >= 0) {
    binders[binderIndex] = binderData;
  } else {
    binders.push(binderData);
  }

  await setItemJSON(STORAGE_KEYS.BINDERS, binders);
};

// Save missing cards for current set
export const saveMissingCards = async (setId, missingCards) => {
  const currentBinder = await getCurrentBinder();
  currentBinder.missingCards[setId] = Array.from(missingCards);
  await saveBinder(currentBinder);
};

// Get missing cards for a set
export const getMissingCards = async (setId) => {
  const currentBinder = await getCurrentBinder();
  return new Set(currentBinder.missingCards[setId] || []);
};

// Save layout preferences
export const saveLayoutPrefs = async (layout) => {
  await setItemJSON(STORAGE_KEYS.LAYOUT_PREFS, layout);
};

// Get layout preferences
export const getLayoutPrefs = async () => {
  return await getItemJSON(STORAGE_KEYS.LAYOUT_PREFS);
};

// Create a new binder
export const createBinder = async (name) => {
  const newBinder = {
    ...DEFAULT_BINDER,
    id: `binder_${Date.now()}`,
    name: name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const binders = await getBinders();
  binders.push(newBinder);
  await setItemJSON(STORAGE_KEYS.BINDERS, binders);

  return newBinder;
};

// Delete a binder
export const deleteBinder = async (binderId) => {
  let binders = await getBinders();

  binders = binders.filter((b) => b.id !== binderId);
  await setItemJSON(STORAGE_KEYS.BINDERS, binders);

  // If deleted binder was current and there are still binders left, switch to first available
  const currentBinderId = await getItem(STORAGE_KEYS.CURRENT_BINDER);
  if (binderId === currentBinderId) {
    if (binders.length > 0) {
      await setItem(STORAGE_KEYS.CURRENT_BINDER, binders[0].id);
    } else {
      // No binders left, clear current binder
      await removeItem(STORAGE_KEYS.CURRENT_BINDER);
    }
  }

  return true;
};

// Rename a binder
export const renameBinder = async (binderId, newName) => {
  const binders = await getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex >= 0) {
    binders[binderIndex].name = newName;
    binders[binderIndex].updatedAt = new Date().toISOString();
    await setItemJSON(STORAGE_KEYS.BINDERS, binders);
    return true;
  }

  return false;
};

// Set current binder
export const setCurrentBinder = async (binderId) => {
  await setItem(STORAGE_KEYS.CURRENT_BINDER, binderId);
};

// Export binder data
export const exportBinderData = async () => {
  const data = {
    binders: await getBinders(),
    currentBinder: await getItem(STORAGE_KEYS.CURRENT_BINDER),
    layoutPrefs: await getLayoutPrefs(),
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

    await setItemJSON(STORAGE_KEYS.BINDERS, data.binders);
    await setItem(STORAGE_KEYS.CURRENT_BINDER, data.currentBinder);
    if (data.layoutPrefs) {
      await setItemJSON(STORAGE_KEYS.LAYOUT_PREFS, data.layoutPrefs);
    }

    return true;
  } catch (error) {
    logger.error("Error importing data:", error);
    return false;
  }
};

// Save set data to cache
export const saveSetToCache = async (setId, cards) => {
  const cache = (await getItemJSON(STORAGE_KEYS.SET_CACHE)) || {};
  cache[setId] = {
    cards,
    timestamp: Date.now(),
  };
  await setItemJSON(STORAGE_KEYS.SET_CACHE, cache);
};

// Get set from cache
export const getSetFromCache = async (setId) => {
  const cache = (await getItemJSON(STORAGE_KEYS.SET_CACHE)) || {};
  const cachedSet = cache[setId];

  if (cachedSet && Date.now() - cachedSet.timestamp < CACHE_EXPIRY) {
    return cachedSet.cards;
  }

  // Remove expired cache
  if (cachedSet) {
    delete cache[setId];
    await setItemJSON(STORAGE_KEYS.SET_CACHE, cache);
  }

  return null;
};

// Clear specific set from cache
export const clearSetFromCache = async (setId) => {
  const cache = (await getItemJSON(STORAGE_KEYS.SET_CACHE)) || {};
  delete cache[setId];
  await setItemJSON(STORAGE_KEYS.SET_CACHE, cache);
};

// Clear entire set cache
export const clearSetCache = async () => {
  await removeItem(STORAGE_KEYS.SET_CACHE);
};

// Add custom card to binder
export const addCustomCard = async (binderId, card, position = null) => {
  const binders = await getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex === -1) {
    logger.error(`Binder with ID ${binderId} not found`);
    return false;
  }

  const binder = binders[binderIndex];

  // Ensure customCards array exists
  if (!binder.customCards) {
    binder.customCards = [];
  }

  // Create a unique ID for the custom card if it doesn't have one
  const customCard = {
    ...card,
    customId:
      card.customId ||
      `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    addedAt: new Date().toISOString(),
  };

  // Allow duplicates - users should be able to add multiple copies of the same card
  // Each card gets a unique customId for tracking purposes

  // Add to specified position or end
  if (position !== null && position >= 0) {
    // For custom binders, extend array if needed and place at exact position
    while (binder.customCards.length <= position) {
      binder.customCards.push(null);
    }
    // Place at the exact position (may overwrite existing card)
    binder.customCards[position] = customCard;
  } else {
    // Add to the end
    binder.customCards.push(customCard);
  }

  binder.updatedAt = new Date().toISOString();
  await setItemJSON(STORAGE_KEYS.BINDERS, binders);

  return customCard;
};

// Remove custom card from binder
export const removeCustomCard = async (binderId, cardIndex) => {
  const binders = await getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex === -1) {
    logger.error(`Binder with ID ${binderId} not found`);
    return false;
  }

  const binder = binders[binderIndex];

  if (
    !binder.customCards ||
    cardIndex < 0 ||
    cardIndex >= binder.customCards.length
  ) {
    logger.error(`Invalid card index ${cardIndex} for binder ${binderId}`);
    return false;
  }

  // Remove the card
  const removedCard = binder.customCards.splice(cardIndex, 1)[0];
  binder.updatedAt = new Date().toISOString();

  await setItemJSON(STORAGE_KEYS.BINDERS, binders);

  return removedCard;
};

// API throttling functions (these don't need IndexedDB, keeping as-is)
export const throttleApiCall = async () => {
  const recentCalls = getRecentApiCalls();
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Filter calls from the last minute
  const callsInLastMinute = recentCalls.filter(
    (timestamp) => timestamp > oneMinuteAgo
  );

  if (callsInLastMinute.length >= 60) {
    const oldestCall = Math.min(...callsInLastMinute);
    const waitTime = oldestCall + 60000 - now;
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime + 100));
    }
  }
};

export const getApiDelay = () => {
  const recentCalls = getRecentApiCalls();
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Filter calls from the last minute
  const callsInLastMinute = recentCalls.filter(
    (timestamp) => timestamp > oneMinuteAgo
  );

  if (callsInLastMinute.length === 0) return 0;
  if (callsInLastMinute.length < 30) return 500;
  if (callsInLastMinute.length < 50) return 1000;
  return 1500;
};

const getRecentApiCalls = () => {
  try {
    const calls = localStorage.getItem("pokemon_api_calls");
    return calls ? JSON.parse(calls) : [];
  } catch {
    return [];
  }
};

export const recordApiCall = () => {
  const calls = getRecentApiCalls();
  calls.push(Date.now());
  localStorage.setItem("pokemon_api_calls", JSON.stringify(calls.slice(-100)));
};

// Theme management functions
export const getTheme = async () => {
  return (await getItem(STORAGE_KEYS.THEME)) || "aqua";
};

export const saveTheme = async (themeName) => {
  await setItem(STORAGE_KEYS.THEME, themeName);
};

// Additional missing functions that might be needed

// Get all binders (alias for consistency)
export const getAllBinders = async () => {
  return await getBinders();
};

// Get custom cards for a binder
export const getCustomCards = async (binderId) => {
  const binders = await getBinders();
  const binder = binders.find((b) => b.id === binderId);
  return binder?.customCards || [];
};

// Reorder custom cards
export const reorderCustomCards = async (
  binderId,
  fromIndex,
  toIndex,
  isSwap = false
) => {
  const binders = await getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex === -1) {
    logger.error(`Binder with ID ${binderId} not found`);
    return { success: false, error: "Binder not found" };
  }

  const binder = binders[binderIndex];

  if (!binder.customCards) {
    binder.customCards = [];
  }

  const cards = [...binder.customCards];

  if (isSwap) {
    // Swap two cards (this preserves sparse array structure)
    [cards[fromIndex], cards[toIndex]] = [cards[toIndex], cards[fromIndex]];
  } else {
    // For custom binders, we should replace at the target position without shifting
    // This maintains the sparse array structure that custom binders expect
    const movedCard = cards[fromIndex];

    // Clear the source position
    cards[fromIndex] = null;

    // Place at the target position (this might overwrite existing card)
    cards[toIndex] = movedCard;
  }

  binder.customCards = cards;
  binder.updatedAt = new Date().toISOString();

  await setItemJSON(STORAGE_KEYS.BINDERS, binders);

  return { success: true, updatedCards: cards };
};

// Set binder type
export const setBinderType = async (binderId, binderType) => {
  const binders = await getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex >= 0) {
    binders[binderIndex].binderType = binderType;
    binders[binderIndex].updatedAt = new Date().toISOString();
    await setItemJSON(STORAGE_KEYS.BINDERS, binders);
    return binders[binderIndex];
  }

  return null;
};

// History management functions (simplified for now)
export const getBinderHistory = async (binderId) => {
  const historyKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}`;
  return (await getItemJSON(historyKey)) || [];
};

export const addHistoryEntry = async (binderId, action, data) => {
  const historyKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}`;
  const history = await getBinderHistory(binderId);

  const entry = {
    id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action,
    data,
    timestamp: new Date().toISOString(),
  };

  history.push(entry);

  // Keep only last 50 entries
  if (history.length > 50) {
    history.splice(0, history.length - 50);
  }

  await setItemJSON(historyKey, history);
  return entry;
};

export const updateHistoryWithFinalState = async (binderId) => {
  // This function would typically update the history with the final state
  // For now, it's a placeholder that could be enhanced later
  return true;
};

export const clearBinderHistory = async (binderId) => {
  const historyKey = `${STORAGE_KEYS.BINDER_HISTORY}_${binderId}`;
  await removeItem(historyKey);
};

export const undoLastAction = async (binderId) => {
  // Simplified undo function - would need more sophisticated implementation
  logger.warn("Undo functionality not fully implemented yet");
  return false;
};

export const redoLastAction = async (binderId) => {
  // Simplified redo function - would need more sophisticated implementation
  logger.warn("Redo functionality not fully implemented yet");
  return false;
};

// Card clipboard functions (simplified)
export const getCardClipboard = async () => {
  return (await getItemJSON(STORAGE_KEYS.CARD_CLIPBOARD)) || [];
};

export const addToCardClipboard = async (card) => {
  const clipboard = await getCardClipboard();
  clipboard.push(card);
  await setItemJSON(STORAGE_KEYS.CARD_CLIPBOARD, clipboard);
  return true;
};

export const removeFromCardClipboard = async (index) => {
  const clipboard = await getCardClipboard();
  if (index >= 0 && index < clipboard.length) {
    clipboard.splice(index, 1);
    await setItemJSON(STORAGE_KEYS.CARD_CLIPBOARD, clipboard);
    return true;
  }
  return false;
};

export const clearCardClipboard = async () => {
  await removeItem(STORAGE_KEYS.CARD_CLIPBOARD);
};

export const moveCardFromClipboard = async (
  clipboardIndex,
  binderId,
  position
) => {
  const clipboard = await getCardClipboard();

  if (clipboardIndex >= 0 && clipboardIndex < clipboard.length) {
    const card = clipboard[clipboardIndex];

    // Remove from clipboard
    clipboard.splice(clipboardIndex, 1);
    await setItemJSON(STORAGE_KEYS.CARD_CLIPBOARD, clipboard);

    // Add to binder
    const result = await addCustomCard(binderId, card, position);
    return !!result;
  }

  return false;
};

// Aliases for backward compatibility with existing imports
export const saveCustomCard = addCustomCard;
export const deleteCustomCard = removeCustomCard;
export const updateCustomCard = async (binderId, cardIndex, updatedCard) => {
  // Simple implementation: remove old card and add updated one at same position
  const removedCard = await removeCustomCard(binderId, cardIndex);
  if (removedCard) {
    return await addCustomCard(binderId, updatedCard, cardIndex);
  }
  return false;
};

// Additional missing functions that some components might need
export const updateCardClipboard = async (newClipboard) => {
  await setItemJSON(STORAGE_KEYS.CARD_CLIPBOARD, newClipboard);
  return true;
};

export const saveToClipboard = addToCardClipboard;

export const parseMissingCards = (missingCardsText, allCards = []) => {
  // Simple parser that extracts card numbers from text
  const lines = missingCardsText.split("\n");
  const missingCards = new Set();

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      const number = trimmed.substring(1);
      missingCards.add(number);
    }
  });

  return missingCards;
};

export const addToMissingCards = async (setId, cardNumber) => {
  const missingCards = await getMissingCards(setId);
  missingCards.add(cardNumber);
  await saveMissingCards(setId, missingCards);
  return missingCards;
};

export const updateMissingCards = saveMissingCards;

// Page management functions
export const addPageToBinder = async (binderId, cardsPerPage = 9) => {
  const binders = await getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex === -1) {
    logger.error(`Binder with ID ${binderId} not found`);
    return { success: false, error: "Binder not found" };
  }

  const binder = binders[binderIndex];

  if (!binder.customCards) {
    binder.customCards = [];
  }

  // Add empty slots for a new page
  const emptySlots = new Array(cardsPerPage).fill(null);
  binder.customCards.push(...emptySlots);
  binder.updatedAt = new Date().toISOString();

  await setItemJSON(STORAGE_KEYS.BINDERS, binders);

  return {
    success: true,
    newLength: binder.customCards.length,
    addedSlots: cardsPerPage,
  };
};

export const removePageFromBinder = async (
  binderId,
  pageIndex,
  cardsPerPage = 9
) => {
  const binders = await getBinders();
  const binderIndex = binders.findIndex((b) => b.id === binderId);

  if (binderIndex === -1) {
    logger.error(`Binder with ID ${binderId} not found`);
    return { success: false, error: "Binder not found" };
  }

  const binder = binders[binderIndex];

  if (!binder.customCards) {
    binder.customCards = [];
  }

  // Calculate page boundaries
  let pageStart, pageEnd;

  if (pageIndex === 0) {
    // Cover page (right side only)
    pageStart = 0;
    pageEnd = cardsPerPage;
  } else {
    // Calculate for left and right pages
    const leftPhysicalPage = 2 * pageIndex - 1;
    const rightPhysicalPage = 2 * pageIndex;

    pageStart = leftPhysicalPage * cardsPerPage;
    pageEnd = (rightPhysicalPage + 1) * cardsPerPage;
  }

  // Check if page has any cards
  const pageCards = binder.customCards.slice(pageStart, pageEnd);
  const hasCards = pageCards.some(
    (card) => card !== null && card !== undefined
  );
  const cardCount = pageCards.filter(
    (card) => card !== null && card !== undefined
  ).length;

  if (hasCards) {
    return {
      success: false,
      hasCards: true,
      cardCount,
    };
  }

  // Remove the page (empty slots)
  binder.customCards.splice(pageStart, pageEnd - pageStart);
  binder.updatedAt = new Date().toISOString();

  await setItemJSON(STORAGE_KEYS.BINDERS, binders);

  // Calculate new max page
  const totalPhysicalPages = Math.ceil(
    binder.customCards.length / cardsPerPage
  );
  const newMaxPage = Math.ceil((totalPhysicalPages + 1) / 2) - 1;
  const shouldNavigateBack = pageIndex > newMaxPage;

  return {
    success: true,
    newLength: binder.customCards.length,
    newMaxPage,
    shouldNavigateBack,
  };
};

// ===== SEARCH STATE STORAGE =====

// Save search state to IndexedDB
export const saveSearchState = async (searchState) => {
  try {
    await setItemJSON("pkmnbinder_card_search_state", searchState);
  } catch (error) {
    logger.error("Failed to save search state:", error);
  }
};

// Load search state from IndexedDB
export const loadSearchState = async () => {
  try {
    const state = await getItemJSON("pkmnbinder_card_search_state");
    if (state) {
      return {
        searchQuery: state.searchQuery || "",
        selectedFilters: state.selectedFilters || {
          rarity: "",
          type: "",
          set: "",
        },
        scrollPosition: state.scrollPosition || 0,
      };
    }
  } catch (error) {
    logger.error("Failed to load search state:", error);
  }

  // Return default state if loading fails
  return {
    searchQuery: "",
    selectedFilters: { rarity: "", type: "", set: "" },
    scrollPosition: 0,
  };
};

// Clear search state from IndexedDB
export const clearSearchState = async () => {
  try {
    await removeItem("pkmnbinder_card_search_state");
  } catch (error) {
    logger.error("Failed to clear search state:", error);
  }
};

// Search state storage utilities using IndexedDB
import {
  STORAGE_KEYS,
  getItemJSON,
  setItemJSON,
  removeItem,
} from "./indexedDbUtils";
import logger from "./logger";

// Save search state
export const saveSearchState = async (state) => {
  try {
    const stateToSave = {
      searchQuery: state.searchQuery || "",
      selectedFilters: state.selectedFilters || {
        rarity: "",
        type: "",
        set: "",
      },
      scrollPosition: state.scrollPosition || 0,
      timestamp: Date.now(),
    };
    await setItemJSON(STORAGE_KEYS.SEARCH_STATE, stateToSave);
    return true;
  } catch (error) {
    logger.error("Failed to save search state:", error);
    return false;
  }
};

// Load search state
export const loadSearchState = async () => {
  try {
    const saved = await getItemJSON(STORAGE_KEYS.SEARCH_STATE);
    if (saved) {
      return {
        searchQuery: saved.searchQuery || "",
        selectedFilters: saved.selectedFilters || {
          rarity: "",
          type: "",
          set: "",
        },
        scrollPosition: saved.scrollPosition || 0,
      };
    }
  } catch (error) {
    logger.error("Failed to load search state:", error);
  }

  // Return default state
  return {
    searchQuery: "",
    selectedFilters: { rarity: "", type: "", set: "" },
    scrollPosition: 0,
  };
};

// Clear search state
export const clearSearchState = async () => {
  try {
    await removeItem(STORAGE_KEYS.SEARCH_STATE);
    return true;
  } catch (error) {
    logger.error("Failed to clear search state:", error);
    return false;
  }
};

// Utility to clear card cache
export const clearCardCache = () => {
  try {
    localStorage.removeItem("pokemon_card_cache");
    console.log("Card cache cleared successfully");
    return true;
  } catch (error) {
    console.error("Error clearing card cache:", error);
    return false;
  }
};

// Function to clear cache and reload page
export const clearCacheAndReload = () => {
  clearCardCache();
  window.location.reload();
};

// Export for console debugging
if (typeof window !== "undefined") {
  window.clearCardCache = clearCardCache;
  window.clearCacheAndReload = clearCacheAndReload;
}

import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect } from "react";
import logger from "../utils/logger";

/**
 * Custom hook to manage URL state parameters
 * Handles: binderId, page (1-indexed in URL, 0-indexed internally), setId
 */
const useUrlState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current values from URL
  const binderId = searchParams.get("binder") || null;
  // Convert 1-indexed URL page to 0-indexed internal page
  const urlPage = searchParams.get("page");
  const currentPage = urlPage ? Math.max(0, parseInt(urlPage, 10) - 1) : 0;
  const selectedSetId = searchParams.get("set") || null;

  // Debug logging for URL state (removed for production)
  useEffect(() => {
    logger.debug("URL State updated:", {
      binderId,
      currentPage: currentPage,
      urlPage: urlPage,
      selectedSetId,
    });
  }, [binderId, currentPage, urlPage, selectedSetId]);

  // Update binder ID in URL
  const setBinderId = useCallback(
    (newBinderId) => {
      logger.debug("Setting binder ID in URL:", newBinderId);
      const newParams = new URLSearchParams(searchParams);

      if (newBinderId) {
        newParams.set("binder", newBinderId);
        // Reset page when changing binders (page=1 in URL = page 0 internally = cover page)
        newParams.set("page", "1");
        // Always clear set when changing binders (set will be loaded from binder data)
        newParams.delete("set");
      } else {
        // Remove all params when no binder selected
        newParams.delete("binder");
        newParams.delete("page");
        newParams.delete("set");
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  // Update current page in URL (convert 0-indexed internal to 1-indexed URL)
  const setCurrentPage = useCallback(
    (newPage) => {
      if (binderId) {
        logger.debug(
          "Setting page in URL:",
          newPage,
          "→ URL page:",
          newPage + 1
        );
        const newParams = new URLSearchParams(searchParams);

        // Convert 0-indexed internal page to 1-indexed URL page
        const urlPageNumber = newPage + 1;
        newParams.set("page", urlPageNumber.toString());

        setSearchParams(newParams);
      }
    },
    [binderId, searchParams, setSearchParams]
  );

  // Update selected set in URL
  const setSelectedSetId = useCallback(
    (newSetId) => {
      if (binderId) {
        logger.debug("Setting set ID in URL:", newSetId);
        const newParams = new URLSearchParams(searchParams);

        if (newSetId) {
          newParams.set("set", newSetId);
          // Reset to cover page when changing sets (page=1 in URL = page 0 internally)
          newParams.set("page", "1");
        } else {
          newParams.delete("set");
        }

        setSearchParams(newParams);
      }
    },
    [binderId, searchParams, setSearchParams]
  );

  // Clear all URL state
  const clearUrlState = useCallback(() => {
    logger.debug("Clearing URL state");
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Batch update multiple URL params (useful for navigation)
  const updateUrlState = useCallback(
    (updates) => {
      logger.debug("Batch updating URL state:", updates);
      const newParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (key === "page" && value !== null && value !== undefined) {
          // Convert internal page (0-indexed) to URL page (1-indexed)
          newParams.set(key, (parseInt(value) + 1).toString());
        } else if (value !== null && value !== undefined) {
          newParams.set(key, value.toString());
        } else {
          newParams.delete(key);
        }
      });

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return {
    // Current values (currentPage is 0-indexed for internal use)
    binderId,
    currentPage,
    selectedSetId,

    // Setters (handle the conversion internally)
    setBinderId,
    setCurrentPage,
    setSelectedSetId,

    // Utilities
    clearUrlState,
    updateUrlState,

    // Raw access to search params
    searchParams,
    setSearchParams,
  };
};

export default useUrlState;

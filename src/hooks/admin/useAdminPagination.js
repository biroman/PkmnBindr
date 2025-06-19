import { useState, useCallback, useMemo } from "react";

/**
 * Custom hook for managing pagination in admin interfaces
 *
 * This hook handles:
 * - Current page state
 * - Items per page configuration
 * - Total items tracking
 * - Page navigation functions
 * - Pagination calculations
 *
 * @param {Object} options - Pagination configuration
 * @returns {Object} Pagination state and operations
 */
export const useAdminPagination = (options = {}) => {
  const { initialPage = 1, itemsPerPage = 20, maxPagesToShow = 5 } = options;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalItems, setTotalItems] = useState(0);

  /**
   * Navigate to a specific page
   * @param {number} page - Page number to navigate to
   */
  const goToPage = useCallback(
    (page) => {
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalItems, itemsPerPage]
  );

  /**
   * Navigate to the next page
   */
  const goToNextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  /**
   * Navigate to the previous page
   */
  const goToPreviousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  /**
   * Navigate to the first page
   */
  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  /**
   * Navigate to the last page
   */
  const goToLastPage = useCallback(() => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    goToPage(totalPages);
  }, [totalItems, itemsPerPage, goToPage]);

  /**
   * Reset pagination to first page
   */
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  /**
   * Update total items count
   * @param {number} count - Total number of items
   */
  const updateTotalItems = useCallback(
    (count) => {
      setTotalItems(count);

      // If current page is beyond the new total, reset to last valid page
      const newTotalPages = Math.ceil(count / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    },
    [currentPage, itemsPerPage]
  );

  /**
   * Paginate an array of items
   * @param {Array} items - Array of items to paginate
   * @returns {Array} Paginated items for current page
   */
  const paginateItems = useCallback(
    (items) => {
      if (!Array.isArray(items)) return [];

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;

      return items.slice(startIndex, endIndex);
    },
    [currentPage, itemsPerPage]
  );

  /**
   * Get pagination info for the current state
   */
  const paginationInfo = useMemo(() => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const hasItems = totalItems > 0;

    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      startIndex: hasItems ? startIndex + 1 : 0, // 1-indexed for display
      endIndex,
      hasItems,
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages || totalPages === 0,
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
    };
  }, [currentPage, totalItems, itemsPerPage]);

  /**
   * Get array of page numbers to display in pagination
   */
  const visiblePages = useMemo(() => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfRange = Math.floor(maxPagesToShow / 2);
    let startPage = Math.max(1, currentPage - halfRange);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  }, [currentPage, totalItems, itemsPerPage, maxPagesToShow]);

  /**
   * Get pagination summary text
   */
  const paginationSummary = useMemo(() => {
    const {
      startIndex,
      endIndex,
      totalItems: total,
      hasItems,
    } = paginationInfo;

    if (!hasItems) {
      return "No items found";
    }

    if (total === 1) {
      return "1 item";
    }

    return `Showing ${startIndex} to ${endIndex} of ${total} items`;
  }, [paginationInfo]);

  /**
   * Check if a specific page is the current page
   * @param {number} page - Page number to check
   * @returns {boolean} Whether the page is current
   */
  const isCurrentPage = useCallback(
    (page) => {
      return page === currentPage;
    },
    [currentPage]
  );

  /**
   * Get pagination state for a specific page
   * @param {number} page - Page number
   * @returns {Object} Page state information
   */
  const getPageState = useCallback(
    (page) => {
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      return {
        page,
        isValid: page >= 1 && page <= totalPages,
        isCurrent: page === currentPage,
        isDisabled: page < 1 || page > totalPages,
        navigate: () => goToPage(page),
      };
    },
    [currentPage, totalItems, itemsPerPage, goToPage]
  );

  return {
    // Current state
    currentPage,
    totalItems,
    itemsPerPage,

    // Navigation functions
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    resetPagination,

    // Data management
    updateTotalItems,
    paginateItems,

    // Computed values
    paginationInfo,
    visiblePages,
    paginationSummary,

    // Helper functions
    isCurrentPage,
    getPageState,

    // Convenience properties
    hasPages: paginationInfo.totalPages > 1,
    canGoNext: paginationInfo.hasNextPage,
    canGoPrevious: paginationInfo.hasPreviousPage,
  };
};

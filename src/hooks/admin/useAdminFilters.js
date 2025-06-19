import { useState, useCallback, useMemo } from "react";

/**
 * Custom hook for managing admin filtering, searching, and sorting
 *
 * This hook handles:
 * - Search functionality
 * - Filter management (role, status, etc.)
 * - Sorting configuration
 * - Filter application logic
 * - Filter state persistence
 *
 * @param {Object} initialFilters - Initial filter values
 * @returns {Object} Filter state and operations
 */
export const useAdminFilters = (initialFilters = {}) => {
  // Default filter values
  const defaultFilters = {
    searchTerm: "",
    filterRole: "all",
    filterStatus: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
    ...initialFilters,
  };

  // Filter state
  const [searchTerm, setSearchTerm] = useState(defaultFilters.searchTerm);
  const [filterRole, setFilterRole] = useState(defaultFilters.filterRole);
  const [filterStatus, setFilterStatus] = useState(defaultFilters.filterStatus);
  const [sortBy, setSortBy] = useState(defaultFilters.sortBy);
  const [sortOrder, setSortOrder] = useState(defaultFilters.sortOrder);

  /**
   * Reset all filters to default values
   */
  const resetFilters = useCallback(() => {
    setSearchTerm(defaultFilters.searchTerm);
    setFilterRole(defaultFilters.filterRole);
    setFilterStatus(defaultFilters.filterStatus);
    setSortBy(defaultFilters.sortBy);
    setSortOrder(defaultFilters.sortOrder);
  }, [defaultFilters]);

  /**
   * Update search term
   * @param {string} term - Search term
   */
  const updateSearchTerm = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  /**
   * Update role filter
   * @param {string} role - Role filter value
   */
  const updateRoleFilter = useCallback((role) => {
    setFilterRole(role);
  }, []);

  /**
   * Update status filter
   * @param {string} status - Status filter value
   */
  const updateStatusFilter = useCallback((status) => {
    setFilterStatus(status);
  }, []);

  /**
   * Update sort configuration
   * @param {string} field - Field to sort by
   * @param {string} order - Sort order (asc/desc)
   */
  const updateSort = useCallback((field, order = null) => {
    setSortBy(field);

    // If order is not provided, toggle current order
    if (order === null) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortOrder(order);
    }
  }, []);

  /**
   * Set sort from combined string (for select inputs)
   * @param {string} sortString - Combined sort string like "createdAt-desc"
   */
  const setSortFromString = useCallback((sortString) => {
    const [field, order] = sortString.split("-");
    setSortBy(field);
    setSortOrder(order);
  }, []);

  /**
   * Check if search term matches user data
   * @param {Object} user - User object to check
   * @param {string} term - Search term
   * @returns {boolean} Whether user matches search
   */
  const matchesSearch = useCallback(
    (user, term = searchTerm) => {
      if (!term || term.trim() === "") return true;

      const lowerTerm = term.toLowerCase();
      return (
        user.email?.toLowerCase().includes(lowerTerm) ||
        user.displayName?.toLowerCase().includes(lowerTerm) ||
        user.uid?.toLowerCase().includes(lowerTerm)
      );
    },
    [searchTerm]
  );

  /**
   * Check if user matches role filter
   * @param {Object} user - User object to check
   * @param {string} role - Role filter
   * @returns {boolean} Whether user matches role filter
   */
  const matchesRole = useCallback(
    (user, role = filterRole) => {
      return role === "all" || user.role === role;
    },
    [filterRole]
  );

  /**
   * Check if user matches status filter
   * @param {Object} user - User object to check
   * @param {string} status - Status filter
   * @returns {boolean} Whether user matches status filter
   */
  const matchesStatus = useCallback(
    (user, status = filterStatus) => {
      return status === "all" || user.status === status;
    },
    [filterStatus]
  );

  /**
   * Apply all filters to a user
   * @param {Object} user - User object to check
   * @returns {boolean} Whether user passes all filters
   */
  const passesFilters = useCallback(
    (user) => {
      return matchesSearch(user) && matchesRole(user) && matchesStatus(user);
    },
    [matchesSearch, matchesRole, matchesStatus]
  );

  /**
   * Filter and sort an array of users
   * @param {Array} users - Array of users to filter and sort
   * @returns {Array} Filtered and sorted users
   */
  const filterAndSortUsers = useCallback(
    (users) => {
      if (!Array.isArray(users)) return [];

      // Apply filters
      let filteredUsers = users.filter(passesFilters);

      // Apply sorting
      filteredUsers.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        // Handle date fields
        if (sortBy === "createdAt" || sortBy === "lastSeen") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        // Handle string fields
        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        // Apply sort order
        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });

      return filteredUsers;
    },
    [passesFilters, sortBy, sortOrder]
  );

  /**
   * Get current filter state as object
   */
  const currentFilters = useMemo(
    () => ({
      searchTerm,
      filterRole,
      filterStatus,
      sortBy,
      sortOrder,
    }),
    [searchTerm, filterRole, filterStatus, sortBy, sortOrder]
  );

  /**
   * Get sort string for select inputs
   */
  const sortString = useMemo(() => {
    return `${sortBy}-${sortOrder}`;
  }, [sortBy, sortOrder]);

  /**
   * Check if any filters are active (non-default)
   */
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== defaultFilters.searchTerm ||
      filterRole !== defaultFilters.filterRole ||
      filterStatus !== defaultFilters.filterStatus ||
      sortBy !== defaultFilters.sortBy ||
      sortOrder !== defaultFilters.sortOrder
    );
  }, [searchTerm, filterRole, filterStatus, sortBy, sortOrder, defaultFilters]);

  /**
   * Get filter summary for display
   */
  const filterSummary = useMemo(() => {
    const active = [];

    if (searchTerm) active.push(`Search: "${searchTerm}"`);
    if (filterRole !== "all") active.push(`Role: ${filterRole}`);
    if (filterStatus !== "all") active.push(`Status: ${filterStatus}`);
    if (
      sortBy !== defaultFilters.sortBy ||
      sortOrder !== defaultFilters.sortOrder
    ) {
      active.push(`Sort: ${sortBy} (${sortOrder})`);
    }

    return active;
  }, [searchTerm, filterRole, filterStatus, sortBy, sortOrder, defaultFilters]);

  return {
    // Current filter values
    searchTerm,
    filterRole,
    filterStatus,
    sortBy,
    sortOrder,
    currentFilters,
    sortString,

    // Filter actions
    setSearchTerm: updateSearchTerm,
    setFilterRole: updateRoleFilter,
    setFilterStatus: updateStatusFilter,
    setSortBy,
    setSortOrder,
    updateSort,
    setSortFromString,
    resetFilters,

    // Filter logic
    matchesSearch,
    matchesRole,
    matchesStatus,
    passesFilters,
    filterAndSortUsers,

    // Computed state
    hasActiveFilters,
    filterSummary,
  };
};

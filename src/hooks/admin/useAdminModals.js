import { useState, useCallback, useEffect, useMemo } from "react";

/**
 * Custom hook for managing modals and dropdown state in admin panel
 *
 * This hook handles:
 * - Modal visibility state management
 * - Dropdown visibility and positioning
 * - User action dropdown state
 * - Modal data management
 * - Event handlers for outside clicks
 * - Focus management for accessibility
 *
 * @returns {Object} Modal and dropdown state and operations
 */
export const useAdminModals = () => {
  // Modal state
  const [modals, setModals] = useState({
    userDetails: false,
    createRule: false,
    binderCustomization: false,
    deleteConfirmation: false,
    replyMessage: false,
  });

  // Modal data state
  const [modalData, setModalData] = useState({
    selectedUser: null,
    selectedRule: null,
    selectedThread: null,
    deleteTarget: null,
    confirmationMessage: "",
  });

  // Dropdown state
  const [dropdowns, setDropdowns] = useState({
    userActions: null, // stores user ID if dropdown is open
    adminActions: null,
    filterDropdown: null,
    sortDropdown: null,
  });

  // Loading states for modals
  const [modalLoading, setModalLoading] = useState({
    userDetails: false,
    saveChanges: false,
    deleteAction: false,
    replyMessage: false,
  });

  /**
   * Open a specific modal
   * @param {string} modalName - Name of the modal to open
   * @param {Object} data - Optional data to pass to the modal
   */
  const openModal = useCallback((modalName, data = null) => {
    setModals((prev) => ({
      ...prev,
      [modalName]: true,
    }));

    if (data) {
      setModalData((prev) => ({
        ...prev,
        ...data,
      }));
    }

    // Close all dropdowns when opening a modal
    setDropdowns({
      userActions: null,
      adminActions: null,
      filterDropdown: null,
      sortDropdown: null,
    });
  }, []);

  /**
   * Close a specific modal
   * @param {string} modalName - Name of the modal to close
   * @param {boolean} clearData - Whether to clear modal data
   */
  const closeModal = useCallback((modalName, clearData = false) => {
    setModals((prev) => ({
      ...prev,
      [modalName]: false,
    }));

    if (clearData) {
      setModalData((prev) => ({
        ...prev,
        selectedUser: modalName === "userDetails" ? null : prev.selectedUser,
        selectedRule: modalName === "createRule" ? null : prev.selectedRule,
        selectedThread:
          modalName === "replyMessage" ? null : prev.selectedThread,
        deleteTarget:
          modalName === "deleteConfirmation" ? null : prev.deleteTarget,
        confirmationMessage:
          modalName === "deleteConfirmation" ? "" : prev.confirmationMessage,
      }));
    }

    // Clear loading state
    setModalLoading((prev) => ({
      ...prev,
      [modalName]: false,
    }));
  }, []);

  /**
   * Close all modals
   */
  const closeAllModals = useCallback(() => {
    setModals({
      userDetails: false,
      createRule: false,
      binderCustomization: false,
      deleteConfirmation: false,
      replyMessage: false,
    });

    setModalData({
      selectedUser: null,
      selectedRule: null,
      selectedThread: null,
      deleteTarget: null,
      confirmationMessage: "",
    });

    setModalLoading({
      userDetails: false,
      saveChanges: false,
      deleteAction: false,
      replyMessage: false,
    });
  }, []);

  /**
   * Toggle dropdown visibility
   * @param {string} dropdownName - Name of the dropdown
   * @param {string|null} identifier - Identifier for the dropdown (e.g., user ID)
   */
  const toggleDropdown = useCallback((dropdownName, identifier = null) => {
    setDropdowns((prev) => {
      const isCurrentlyOpen = prev[dropdownName] === identifier;

      return {
        ...prev,
        [dropdownName]: isCurrentlyOpen ? null : identifier,
      };
    });
  }, []);

  /**
   * Close all dropdowns
   */
  const closeAllDropdowns = useCallback(() => {
    setDropdowns({
      userActions: null,
      adminActions: null,
      filterDropdown: null,
      sortDropdown: null,
    });
  }, []);

  /**
   * Set modal loading state
   * @param {string} operation - Loading operation name
   * @param {boolean} isLoading - Loading state
   */
  const setModalLoadingState = useCallback((operation, isLoading) => {
    setModalLoading((prev) => ({
      ...prev,
      [operation]: isLoading,
    }));
  }, []);

  /**
   * Update modal data
   * @param {Object} updates - Data updates
   */
  const updateModalData = useCallback((updates) => {
    setModalData((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Open user details modal
   * @param {Object} user - User object
   */
  const openUserDetailsModal = useCallback(
    (user) => {
      openModal("userDetails", { selectedUser: user });
    },
    [openModal]
  );

  /**
   * Open delete confirmation modal
   * @param {Object} target - Target to delete
   * @param {string} message - Confirmation message
   */
  const openDeleteConfirmationModal = useCallback(
    (target, message) => {
      openModal("deleteConfirmation", {
        deleteTarget: target,
        confirmationMessage: message,
      });
    },
    [openModal]
  );

  /**
   * Open reply message modal
   * @param {Object} thread - Message thread
   */
  const openReplyMessageModal = useCallback(
    (thread) => {
      openModal("replyMessage", { selectedThread: thread });
    },
    [openModal]
  );

  /**
   * Handle escape key press
   */
  const handleEscapeKey = useCallback(
    (event) => {
      if (event.key === "Escape") {
        // Close modals first (in reverse order of importance)
        const openModalNames = Object.entries(modals)
          .filter(([_, isOpen]) => isOpen)
          .map(([name]) => name);

        if (openModalNames.length > 0) {
          const lastOpenModal = openModalNames[openModalNames.length - 1];
          closeModal(lastOpenModal);
        } else {
          // If no modals are open, close dropdowns
          closeAllDropdowns();
        }
      }
    },
    [modals, closeModal, closeAllDropdowns]
  );

  /**
   * Handle outside clicks
   */
  const handleOutsideClick = useCallback(
    (event) => {
      // Close dropdowns if clicking outside
      if (!event.target.closest("[data-dropdown-container]")) {
        closeAllDropdowns();
      }
    },
    [closeAllDropdowns]
  );

  /**
   * Check if any modal is open
   */
  const hasOpenModal = useMemo(() => {
    return Object.values(modals).some((isOpen) => isOpen);
  }, [modals]);

  /**
   * Check if any dropdown is open
   */
  const hasOpenDropdown = useMemo(() => {
    return Object.values(dropdowns).some((isOpen) => isOpen !== null);
  }, [dropdowns]);

  /**
   * Get currently open modals
   */
  const openModals = useMemo(() => {
    return Object.entries(modals)
      .filter(([_, isOpen]) => isOpen)
      .map(([name]) => name);
  }, [modals]);

  /**
   * Get currently open dropdowns
   */
  const openDropdowns = useMemo(() => {
    return Object.entries(dropdowns)
      .filter(([_, identifier]) => identifier !== null)
      .reduce((acc, [name, identifier]) => {
        acc[name] = identifier;
        return acc;
      }, {});
  }, [dropdowns]);

  /**
   * Check if specific modal is open
   * @param {string} modalName - Modal name to check
   */
  const isModalOpen = useCallback(
    (modalName) => {
      return modals[modalName] || false;
    },
    [modals]
  );

  /**
   * Check if specific dropdown is open
   * @param {string} dropdownName - Dropdown name to check
   * @param {string} identifier - Optional identifier to check
   */
  const isDropdownOpen = useCallback(
    (dropdownName, identifier = null) => {
      if (identifier) {
        return dropdowns[dropdownName] === identifier;
      }
      return dropdowns[dropdownName] !== null;
    },
    [dropdowns]
  );

  /**
   * Get modal loading state
   * @param {string} operation - Operation name
   */
  const isModalLoading = useCallback(
    (operation) => {
      return modalLoading[operation] || false;
    },
    [modalLoading]
  );

  // Set up event listeners
  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [handleEscapeKey, handleOutsideClick]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (hasOpenModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [hasOpenModal]);

  return {
    // Modal state
    modals,
    modalData,
    modalLoading,

    // Dropdown state
    dropdowns,

    // Modal operations
    openModal,
    closeModal,
    closeAllModals,
    openUserDetailsModal,
    openDeleteConfirmationModal,
    openReplyMessageModal,

    // Dropdown operations
    toggleDropdown,
    closeAllDropdowns,

    // Data operations
    updateModalData,
    setModalLoadingState,

    // State checkers
    isModalOpen,
    isDropdownOpen,
    isModalLoading,

    // Computed values
    hasOpenModal,
    hasOpenDropdown,
    openModals,
    openDropdowns,

    // Getters for specific modal data
    selectedUser: modalData.selectedUser,
    selectedRule: modalData.selectedRule,
    selectedThread: modalData.selectedThread,
    deleteTarget: modalData.deleteTarget,
    confirmationMessage: modalData.confirmationMessage,

    // Common modal actions
    userActionsDropdown: dropdowns.userActions,
    isUserDetailsModalOpen: modals.userDetails,
    isCreateRuleModalOpen: modals.createRule,
    isReplyMessageModalOpen: modals.replyMessage,
    isDeleteConfirmationModalOpen: modals.deleteConfirmation,
  };
};

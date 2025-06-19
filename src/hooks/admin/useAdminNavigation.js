import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for managing admin navigation state
 *
 * This hook handles:
 * - Active tab management
 * - Mobile menu state
 * - Mobile device detection
 * - Navigation helpers
 *
 * @param {string} initialTab - Initial active tab
 * @returns {Object} Navigation state and operations
 */
export const useAdminNavigation = (initialTab = "dashboard") => {
  // Navigation state
  const [activeTab, setActiveTab] = useState(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /**
   * Check if current device is mobile
   */
  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);

    // Auto-close mobile menu when switching to desktop
    if (!mobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [mobileMenuOpen]);

  /**
   * Mobile detection and responsive handling
   */
  useEffect(() => {
    // Initial check
    checkMobile();

    // Listen for window resize
    window.addEventListener("resize", checkMobile);

    // Cleanup listener
    return () => window.removeEventListener("resize", checkMobile);
  }, [checkMobile]);

  /**
   * Navigate to a specific tab
   * @param {string} tabId - Tab identifier to navigate to
   */
  const navigateToTab = useCallback(
    (tabId) => {
      setActiveTab(tabId);

      // Auto-close mobile menu when navigating
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    },
    [mobileMenuOpen]
  );

  /**
   * Toggle mobile menu
   */
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  /**
   * Close mobile menu
   */
  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  /**
   * Open mobile menu
   */
  const openMobileMenu = useCallback(() => {
    setMobileMenuOpen(true);
  }, []);

  /**
   * Handle escape key to close mobile menu
   */
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [mobileMenuOpen]);

  /**
   * Handle click outside mobile menu to close it
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen && !event.target.closest("[data-mobile-menu]")) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [mobileMenuOpen]);

  /**
   * Check if a tab is currently active
   * @param {string} tabId - Tab identifier to check
   * @returns {boolean} Whether the tab is active
   */
  const isTabActive = useCallback(
    (tabId) => {
      return activeTab === tabId;
    },
    [activeTab]
  );

  /**
   * Get navigation state for a specific tab
   * @param {string} tabId - Tab identifier
   * @returns {Object} Tab navigation state
   */
  const getTabState = useCallback(
    (tabId) => {
      return {
        isActive: activeTab === tabId,
        navigate: () => navigateToTab(tabId),
      };
    },
    [activeTab, navigateToTab]
  );

  return {
    // State
    activeTab,
    mobileMenuOpen,
    isMobile,

    // Actions
    setActiveTab,
    navigateToTab,
    toggleMobileMenu,
    closeMobileMenu,
    openMobileMenu,
    isTabActive,
    getTabState,

    // Computed
    canShowDesktopNav: !isMobile,
    shouldShowMobileMenu: isMobile && mobileMenuOpen,
  };
};

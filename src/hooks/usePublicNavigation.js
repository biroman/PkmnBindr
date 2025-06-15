import { useNavigate, useLocation } from "react-router-dom";
import { getPublicBinderUrl, getPublicProfileUrl } from "../utils/publicUtils";

/**
 * Custom hook for handling public content navigation
 * Provides consistent navigation patterns for public profiles and binders
 */
export const usePublicNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Navigate to a user's public profile
   * @param {string} userId - The user ID
   * @param {Object} options - Navigation options
   */
  const goToProfile = (userId, options = {}) => {
    const profileUrl = getPublicProfileUrl(userId);
    navigate(profileUrl, options);
  };

  /**
   * Navigate to a public binder with comprehensive state
   * @param {Object} binder - The binder object
   * @param {Object} owner - The owner user object
   * @param {Object} options - Additional navigation options
   */
  const goToBinder = (binder, owner, options = {}) => {
    const binderUrl = getPublicBinderUrl(binder.ownerId, binder.id);

    const navigationState = {
      ownerId: binder.ownerId,
      isPublic: true,
      binderName: binder.metadata?.name,
      ownerDisplayName: owner?.displayName,
      ownerPhotoURL: owner?.photoURL,
      // Add fallback data in case state is lost
      fallbackOwnerData: {
        uid: binder.ownerId,
        displayName: owner?.displayName || "Unknown User",
        photoURL: owner?.photoURL || null,
        email: owner?.email || null,
      },
      ...options.state,
    };

    navigate(binderUrl, {
      ...options,
      state: navigationState,
    });
  };

  /**
   * Navigate back with intelligent fallback
   * If there's no history, go to home page
   */
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  /**
   * Navigate to home page
   */
  const goHome = () => {
    navigate("/");
  };

  /**
   * Check if current route is a public content route
   */
  const isPublicRoute = () => {
    const path = location.pathname;
    return (
      path.startsWith("/profile/") ||
      path.includes("/user/") ||
      path.includes("/binder/")
    );
  };

  /**
   * Extract owner ID from current URL if it's a public route
   */
  const getCurrentOwnerId = () => {
    const path = location.pathname;

    // Check for /user/:userId/binder/:binderId pattern
    const userBinderMatch = path.match(/\/user\/([^\/]+)\/binder\/([^\/]+)/);
    if (userBinderMatch) {
      return userBinderMatch[1];
    }

    // Check for /profile/:userId pattern
    const profileMatch = path.match(/\/profile\/([^\/]+)/);
    if (profileMatch) {
      return profileMatch[1];
    }

    return null;
  };

  /**
   * Get breadcrumb data for current route
   */
  const getBreadcrumbData = () => {
    const path = location.pathname;
    const state = location.state;

    // For binder routes
    const userBinderMatch = path.match(/\/user\/([^\/]+)\/binder\/([^\/]+)/);
    if (userBinderMatch) {
      return {
        type: "binder",
        ownerId: userBinderMatch[1],
        binderId: userBinderMatch[2],
        ownerName:
          state?.ownerDisplayName || state?.fallbackOwnerData?.displayName,
        ownerPhotoURL:
          state?.ownerPhotoURL || state?.fallbackOwnerData?.photoURL,
        contentName: state?.binderName,
      };
    }

    // For profile routes
    const profileMatch = path.match(/\/profile\/([^\/]+)/);
    if (profileMatch) {
      return {
        type: "profile",
        ownerId: profileMatch[1],
      };
    }

    return null;
  };

  return {
    goToProfile,
    goToBinder,
    goBack,
    goHome,
    isPublicRoute,
    getCurrentOwnerId,
    getBreadcrumbData,
  };
};

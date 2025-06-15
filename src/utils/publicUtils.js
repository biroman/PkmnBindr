/**
 * Utility functions for handling public content access
 */

/**
 * Generate a public binder URL with proper structure
 * @param {string} userId - The owner's user ID
 * @param {string} binderId - The binder ID
 * @returns {string} - The public binder URL
 */
export const getPublicBinderUrl = (userId, binderId) => {
  return `/user/${userId}/binder/${binderId}`;
};

/**
 * Generate a public profile URL
 * @param {string} userId - The user ID
 * @returns {string} - The public profile URL
 */
export const getPublicProfileUrl = (userId) => {
  return `/profile/${userId}`;
};

/**
 * Extract user ID from public binder URL
 * @param {string} url - The URL to parse
 * @returns {string|null} - The user ID or null if not found
 */
export const extractUserIdFromUrl = (url) => {
  const match = url.match(/\/user\/([^\/]+)\/binder\/([^\/]+)/);
  return match ? match[1] : null;
};

/**
 * Extract binder ID from public binder URL
 * @param {string} url - The URL to parse
 * @returns {string|null} - The binder ID or null if not found
 */
export const extractBinderIdFromUrl = (url) => {
  const match = url.match(/\/user\/([^\/]+)\/binder\/([^\/]+)/);
  return match ? match[2] : null;
};

/**
 * Check if a URL is a public binder URL
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's a public binder URL
 */
export const isPublicBinderUrl = (url) => {
  return /\/user\/[^\/]+\/binder\/[^\/]+/.test(url);
};

/**
 * Generate sharing data for public content
 * @param {Object} options - Sharing options
 * @param {string} options.type - 'binder' or 'profile'
 * @param {string} options.ownerName - Owner's display name
 * @param {string} options.title - Content title
 * @param {string} options.url - Content URL
 * @returns {Object} - Sharing data object
 */
export const generateSharingData = ({ type, ownerName, title, url }) => {
  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}${url}`;

  if (type === "binder") {
    return {
      title: `${title} by ${ownerName}`,
      text: `Check out this Pokemon card binder collection by ${ownerName}!`,
      url: fullUrl,
    };
  } else if (type === "profile") {
    return {
      title: `${ownerName}'s Profile`,
      text: `Check out ${ownerName}'s Pokemon card collection!`,
      url: fullUrl,
    };
  }

  return {
    title: `${title}`,
    text: `Check out this content by ${ownerName}!`,
    url: fullUrl,
  };
};

/**
 * Handle sharing with fallback for browsers that don't support Web Share API
 * @param {Object} shareData - Data to share
 * @returns {Promise<boolean>} - True if shared successfully
 */
export const handleShare = async (shareData) => {
  try {
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      await navigator.share(shareData);
      return true;
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareData.url);
      return true;
    }
  } catch (error) {
    console.error("Error sharing:", error);

    // Final fallback: try to copy to clipboard
    try {
      await navigator.clipboard.writeText(shareData.url);
      return true;
    } catch (clipboardError) {
      console.error("Error copying to clipboard:", clipboardError);
      return false;
    }
  }
};

/**
 * Create fallback owner data when profile fetch fails
 * @param {string} userId - The user ID
 * @param {string} displayName - Optional display name
 * @param {string} photoURL - Optional photo URL
 * @returns {Object} - Minimal user profile object
 */
export const createFallbackOwnerData = (
  userId,
  displayName = null,
  photoURL = null
) => {
  // Create a date that's clearly a fallback (e.g., account creation date unknown)
  const fallbackDate = new Date("2024-01-01");

  return {
    uid: userId,
    email: "Unknown",
    displayName: displayName || "Unknown User",
    photoURL: photoURL || null,
    role: "user",
    status: "active",
    customStatus: "Passionate Pokemon card collector 🎴",
    bannerColor: "#3B82F6", // Nice blue color
    emailVerified: false,
    binderCount: 1, // At least one binder (the one we're viewing)
    cardCount: 0,
    createdAt: fallbackDate,
    lastSignIn: fallbackDate,
    updatedAt: fallbackDate,
  };
};

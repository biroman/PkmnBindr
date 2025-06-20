/**
 * Enhanced sharing utilities for shareable binder links
 * Builds upon existing publicUtils.js functionality
 */

/**
 * Generate share URL from share ID
 * @param {string} shareId - The share ID
 * @param {string} customSlug - Optional custom slug
 * @returns {string} Share URL
 */
export const generateShareUrl = (shareId, customSlug = null) => {
  // Use current domain in development, production domain in production
  const baseUrl = window.location.origin;

  if (customSlug) {
    return `${baseUrl}/s/${customSlug}`;
  }

  return `${baseUrl}/share/${shareId}`;
};

/**
 * Generate social media share data for shared binders
 * @param {Object} binder - Binder data
 * @param {string} shareUrl - Share URL
 * @param {Object} owner - Owner data
 * @param {Object} shareData - Share metadata
 * @returns {Object} Social share data
 */
export const generateSocialShareData = (
  binder,
  shareUrl,
  owner,
  shareData = {}
) => {
  const title =
    shareData.title || binder.metadata?.name || "Pokemon Card Collection";
  const ownerName = owner?.displayName || "Anonymous";
  const cardCount = Object.keys(binder.cards || {}).length;

  const description =
    shareData.description ||
    binder.metadata?.description ||
    `Check out ${ownerName}'s Pokemon card collection with ${cardCount} cards!`;

  return {
    title: `${title} by ${ownerName}`,
    text: description,
    url: shareUrl,
    hashtags: ["Pokemon", "Cards", "Collection", "TCG"],
  };
};

/**
 * Copy share link to clipboard with user feedback
 * @param {string} shareUrl - URL to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyShareLink = async (shareUrl) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } else {
      // Fallback for older browsers or non-HTTPS
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      return successful;
    }
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    return false;
  }
};

/**
 * Handle sharing with fallback options
 * @param {Object} shareData - Data to share
 * @returns {Promise<string>} Result status: 'shared' | 'copied' | 'failed'
 */
export const handleShare = async (shareData) => {
  try {
    // Try native Web Share API first
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      await navigator.share(shareData);
      return "shared";
    } else {
      // Fallback to clipboard
      const success = await copyShareLink(shareData.url);
      return success ? "copied" : "failed";
    }
  } catch (error) {
    if (error.name === "AbortError") {
      // User cancelled the share dialog
      return "cancelled";
    }

    console.error("Error sharing:", error);

    // Try clipboard as final fallback
    try {
      const success = await copyShareLink(shareData.url);
      return success ? "copied" : "failed";
    } catch (clipboardError) {
      console.error("Clipboard fallback failed:", clipboardError);
      return "failed";
    }
  }
};

/**
 * Validate share URL format
 * @param {string} url - URL to validate
 * @returns {Object} Validation result
 */
export const isValidShareUrl = (url) => {
  if (!url || typeof url !== "string") {
    return { isValid: false, reason: "URL is required" };
  }

  // Check for share ID pattern
  const shareIdPattern = /\/share\/([A-Za-z0-9]{12})/;
  const shareIdMatch = url.match(shareIdPattern);

  // Check for custom slug pattern
  const customSlugPattern = /\/s\/([a-z0-9-]+)/;
  const customSlugMatch = url.match(customSlugPattern);

  if (shareIdMatch) {
    return {
      isValid: true,
      type: "shareId",
      identifier: shareIdMatch[1],
    };
  }

  if (customSlugMatch) {
    return {
      isValid: true,
      type: "customSlug",
      identifier: customSlugMatch[1],
    };
  }

  return {
    isValid: false,
    reason: "URL does not match share link format",
  };
};

/**
 * Extract share identifier from URL
 * @param {string} url - Share URL or path
 * @returns {Object|null} Share identifier info
 */
export const extractShareIdentifier = (url) => {
  const validation = isValidShareUrl(url);

  if (validation.isValid) {
    return {
      type: validation.type,
      identifier: validation.identifier,
    };
  }

  return null;
};

/**
 * Generate QR code data URL for share link
 * @param {string} shareUrl - Share URL
 * @returns {Promise<string>} QR code data URL
 */
export const generateQRCode = async (shareUrl) => {
  try {
    // Use a simple QR code generation approach
    // In production, you might want to use a proper QR code library
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      shareUrl
    )}`;

    // Create a canvas to convert the QR code to data URL
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL());
      };

      img.onerror = () => {
        reject(new Error("Failed to generate QR code"));
      };

      img.src = qrApiUrl;
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
};

/**
 * Create share link with expiration
 * @param {Date} expirationDate - When the link should expire
 * @returns {Object} Expiration options
 */
export const createExpirationOptions = (expirationDate) => {
  if (!expirationDate) {
    return { expiresAt: null };
  }

  return {
    expiresAt: expirationDate.toISOString(),
  };
};

/**
 * Validate custom slug format
 * @param {string} slug - Custom slug to validate
 * @returns {Object} Validation result
 */
export const validateCustomSlug = (slug) => {
  if (!slug) {
    return { isValid: true }; // Optional field
  }

  if (typeof slug !== "string") {
    return { isValid: false, reason: "Slug must be a string" };
  }

  // Must be 3-50 characters, lowercase letters, numbers, and hyphens only
  const slugPattern = /^[a-z0-9-]{3,50}$/;

  if (!slugPattern.test(slug)) {
    return {
      isValid: false,
      reason:
        "Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only",
    };
  }

  // Cannot start or end with hyphen
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return {
      isValid: false,
      reason: "Slug cannot start or end with a hyphen",
    };
  }

  // Cannot have consecutive hyphens
  if (slug.includes("--")) {
    return {
      isValid: false,
      reason: "Slug cannot contain consecutive hyphens",
    };
  }

  // Reserved words
  const reservedWords = [
    "share",
    "api",
    "admin",
    "www",
    "app",
    "help",
    "support",
  ];
  if (reservedWords.includes(slug)) {
    return {
      isValid: false,
      reason: "This slug is reserved and cannot be used",
    };
  }

  return { isValid: true };
};

/**
 * Generate social media specific share URLs
 * @param {Object} shareData - Share data
 * @returns {Object} Platform-specific URLs
 */
export const generateSocialUrls = (shareData) => {
  const { title, text, url, hashtags = [] } = shareData;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text);
  const hashtagString = hashtags.map((tag) => `%23${tag}`).join("%20");

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=${hashtags.join(
      ","
    )}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`,
    discord: `https://discord.com/channels/@me`, // Discord doesn't have direct share URLs
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };
};

/**
 * Track share event for analytics
 * @param {string} platform - Platform name
 * @param {string} shareId - Share ID
 * @param {string} method - Share method (native, copy, etc.)
 */
export const trackShareEvent = (platform, shareId, method) => {
  // This would integrate with your analytics system
  console.log("Share event:", {
    platform,
    shareId,
    method,
    timestamp: new Date().toISOString(),
  });

  // Example: Send to analytics service
  // analytics.track('share_link_used', {
  //   platform,
  //   shareId,
  //   method,
  //   timestamp: new Date().toISOString()
  // });
};

/**
 * Format share link for display
 * @param {string} shareUrl - Share URL
 * @param {number} maxLength - Maximum display length
 * @returns {string} Formatted URL for display
 */
export const formatShareUrlForDisplay = (shareUrl, maxLength = 50) => {
  if (!shareUrl) return "";

  if (shareUrl.length <= maxLength) {
    return shareUrl;
  }

  // Extract the domain and share identifier
  try {
    const url = new URL(shareUrl);
    const path = url.pathname;

    if (path.length <= maxLength - url.hostname.length - 3) {
      return `${url.hostname}${path}`;
    }

    // Truncate the path
    const truncatedPath =
      path.substring(0, maxLength - url.hostname.length - 6) + "...";
    return `${url.hostname}${truncatedPath}`;
  } catch (error) {
    // Fallback for invalid URLs
    return shareUrl.substring(0, maxLength - 3) + "...";
  }
};

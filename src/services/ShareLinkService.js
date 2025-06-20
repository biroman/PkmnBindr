import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { generateId } from "../lib/utils";

/**
 * Service for managing shareable binder links
 * Handles creation, validation, analytics, and lifecycle management
 */
class ShareLinkService {
  constructor() {
    this.collectionName = "shared_binders";
  }

  /**
   * Generate a unique share ID
   * @returns {string} Unique share identifier
   */
  generateShareId() {
    // Generate a URL-safe, unique identifier
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new share link for a binder
   * @param {string} binderId - The binder ID to share
   * @param {string} ownerId - The owner's user ID
   * @param {Object} options - Share options
   * @returns {Promise<Object>} Share link data
   */
  async createShareLink(binderId, ownerId, options = {}) {
    try {
      if (!binderId || !ownerId) {
        throw new Error("Binder ID and Owner ID are required");
      }

      // Generate unique share ID
      const shareId = this.generateShareId();

      // Ensure share ID is unique
      const existingDoc = await getDoc(doc(db, this.collectionName, shareId));
      if (existingDoc.exists()) {
        // Recursively try again with new ID (very unlikely collision)
        return this.createShareLink(binderId, ownerId, options);
      }

      // Create share link document
      const shareData = {
        shareId,
        binderId,
        ownerId,
        createdAt: serverTimestamp(),
        expiresAt: options.expiresAt || null,
        isActive: true,
        accessCount: 0,
        lastAccessedAt: null,
        settings: {
          allowAnonymous: options.allowAnonymous ?? true,
          customSlug: options.customSlug || null,
          title: options.title || null,
          description: options.description || null,
        },
        analytics: {
          totalViews: 0,
          uniqueVisitors: [],
          lastViewedAt: null,
        },
      };

      await setDoc(doc(db, this.collectionName, shareId), shareData);

      // Return the created share data (without server timestamp)
      return {
        ...shareData,
        createdAt: new Date().toISOString(),
        shareUrl: this.generateShareUrl(shareId, options.customSlug),
      };
    } catch (error) {
      console.error("Error creating share link:", error);
      throw new Error(`Failed to create share link: ${error.message}`);
    }
  }

  /**
   * Get share link details
   * @param {string} shareId - The share ID
   * @returns {Promise<Object|null>} Share link data or null if not found
   */
  async getShareLink(shareId) {
    try {
      if (!shareId) {
        throw new Error("Share ID is required");
      }

      const shareDoc = await getDoc(doc(db, this.collectionName, shareId));

      if (!shareDoc.exists()) {
        return null;
      }

      const shareData = shareDoc.data();

      // Check if share is expired
      if (shareData.expiresAt && shareData.expiresAt.toDate() < new Date()) {
        return null;
      }

      // Check if share is active
      if (!shareData.isActive) {
        return null;
      }

      return {
        ...shareData,
        createdAt: shareData.createdAt?.toDate()?.toISOString(),
        expiresAt: shareData.expiresAt?.toDate()?.toISOString(),
        lastAccessedAt: shareData.lastAccessedAt?.toDate()?.toISOString(),
      };
    } catch (error) {
      console.error("Error getting share link:", error);
      throw new Error(`Failed to get share link: ${error.message}`);
    }
  }

  /**
   * Validate share link access
   * @param {string} shareId - The share ID
   * @returns {Promise<Object>} Validation result
   */
  async validateShareAccess(shareId) {
    try {
      const shareData = await this.getShareLink(shareId);

      if (!shareData) {
        return {
          isValid: false,
          reason: "Share link not found or expired",
        };
      }

      // Check expiration
      if (shareData.expiresAt && new Date(shareData.expiresAt) < new Date()) {
        return {
          isValid: false,
          reason: "Share link has expired",
        };
      }

      // Check if active
      if (!shareData.isActive) {
        return {
          isValid: false,
          reason: "Share link has been deactivated",
        };
      }

      return {
        isValid: true,
        shareData,
      };
    } catch (error) {
      console.error("Error validating share access:", error);
      return {
        isValid: false,
        reason: "Error validating share link",
      };
    }
  }

  /**
   * Track access to a share link
   * @param {string} shareId - The share ID
   * @param {string} visitorFingerprint - Unique visitor identifier
   * @returns {Promise<boolean>} Success status
   */
  async trackShareAccess(shareId, visitorFingerprint) {
    try {
      const shareRef = doc(db, this.collectionName, shareId);
      const shareDoc = await getDoc(shareRef);

      if (!shareDoc.exists()) {
        return false;
      }

      const shareData = shareDoc.data();
      const uniqueVisitors = shareData.analytics?.uniqueVisitors || [];

      // Check if this is a new unique visitor
      const isNewVisitor = !uniqueVisitors.includes(visitorFingerprint);

      // Prepare update data
      const updateData = {
        accessCount: increment(1),
        lastAccessedAt: serverTimestamp(),
        "analytics.totalViews": increment(1),
        "analytics.lastViewedAt": serverTimestamp(),
      };

      // Add to unique visitors if new
      if (isNewVisitor) {
        updateData["analytics.uniqueVisitors"] = [
          ...uniqueVisitors.slice(-99), // Keep last 100 unique visitors
          visitorFingerprint,
        ];
      }

      await updateDoc(shareRef, updateData);
      return true;
    } catch (error) {
      console.error("Error tracking share access:", error);
      return false;
    }
  }

  /**
   * Deactivate a share link
   * @param {string} shareId - The share ID
   * @param {string} ownerId - The owner's user ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async deactivateShareLink(shareId, ownerId) {
    try {
      const shareRef = doc(db, this.collectionName, shareId);
      const shareDoc = await getDoc(shareRef);

      if (!shareDoc.exists()) {
        throw new Error("Share link not found");
      }

      const shareData = shareDoc.data();

      // Verify ownership
      if (shareData.ownerId !== ownerId) {
        throw new Error(
          "Unauthorized: You can only deactivate your own share links"
        );
      }

      await updateDoc(shareRef, {
        isActive: false,
        deactivatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error("Error deactivating share link:", error);
      throw new Error(`Failed to deactivate share link: ${error.message}`);
    }
  }

  /**
   * Get all share links for a binder
   * @param {string} binderId - The binder ID
   * @param {string} ownerId - The owner's user ID
   * @returns {Promise<Array>} Array of share links
   */
  async getBinderShares(binderId, ownerId) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("binderId", "==", binderId),
        where("ownerId", "==", ownerId),
        where("isActive", "==", true),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const shares = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        shares.push({
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString(),
          expiresAt: data.expiresAt?.toDate()?.toISOString(),
          lastAccessedAt: data.lastAccessedAt?.toDate()?.toISOString(),
          shareUrl: this.generateShareUrl(
            data.shareId,
            data.settings?.customSlug
          ),
        });
      });

      return shares;
    } catch (error) {
      console.error("Error getting binder shares:", error);
      throw new Error(`Failed to get binder shares: ${error.message}`);
    }
  }

  /**
   * Generate share URL
   * @param {string} shareId - The share ID
   * @param {string} customSlug - Optional custom slug
   * @returns {string} Share URL
   */
  generateShareUrl(shareId, customSlug = null) {
    // Use current domain in development, production domain in production
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://pkmnbindr.com";

    if (customSlug) {
      return `${baseUrl}/s/${customSlug}`;
    }

    return `${baseUrl}/share/${shareId}`;
  }

  /**
   * Generate visitor fingerprint for analytics
   * @returns {string} Visitor fingerprint
   */
  generateVisitorFingerprint() {
    // Create a simple fingerprint based on browser characteristics
    // This is privacy-conscious and doesn't track personal information
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Fingerprint test", 2, 2);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join("|");

    // Hash the fingerprint to create a shorter, anonymized identifier
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Cleanup expired shares (should be run periodically)
   * @returns {Promise<number>} Number of shares cleaned up
   */
  async cleanupExpiredShares() {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.collectionName),
        where("expiresAt", "<=", now),
        where("isActive", "==", true),
        limit(100) // Process in batches
      );

      const querySnapshot = await getDocs(q);
      let cleanedCount = 0;

      const cleanupPromises = querySnapshot.docs.map(async (docSnapshot) => {
        await updateDoc(docSnapshot.ref, {
          isActive: false,
          expiredAt: serverTimestamp(),
        });
        cleanedCount++;
      });

      await Promise.all(cleanupPromises);

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired share links`);
      }

      return cleanedCount;
    } catch (error) {
      console.error("Error cleaning up expired shares:", error);
      return 0;
    }
  }
}

// Create singleton instance
export const shareLinkService = new ShareLinkService();

// Export the class for testing
export default ShareLinkService;

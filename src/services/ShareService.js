import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";

/**
 * ShareService - Manages binder sharing functionality
 * Handles share token generation, validation, and access control
 */
class ShareService {
  constructor() {
    this.collectionName = "publicShares";
    this.binderCollectionName = "user_binders";
  }

  /**
   * Generate a cryptographically secure share token
   * @returns {string} - 16 character share token
   */
  generateShareToken() {
    // Generate a secure random token
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";

    // Use crypto.getRandomValues for security
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);

    for (let i = 0; i < 16; i++) {
      token += chars[array[i] % chars.length];
    }

    return token;
  }

  /**
   * Create a share link for a public binder
   * @param {string} binderId - The binder ID
   * @param {string} ownerId - The owner's user ID
   * @param {Object} options - Share options
   * @param {Date} options.expiresAt - Optional expiration date
   * @param {string} options.description - Optional description
   * @returns {Promise<Object>} - Share data including token and URL
   */
  async createShareLink(binderId, ownerId, options = {}) {
    try {
      // Verify the binder exists and is public
      const binderRef = doc(
        db,
        this.binderCollectionName,
        `${ownerId}_${binderId}`
      );
      const binderSnap = await getDoc(binderRef);

      if (!binderSnap.exists()) {
        throw new Error("Binder not found");
      }

      const binderData = binderSnap.data();
      if (!binderData.permissions?.public) {
        throw new Error("Binder must be public to create share links");
      }

      // Check if user already has active share links for this binder
      const existingSharesQuery = query(
        collection(db, this.collectionName),
        where("binderId", "==", binderId),
        where("ownerId", "==", ownerId),
        where("isActive", "==", true)
      );

      const existingShares = await getDocs(existingSharesQuery);

      // Limit to 5 active share links per binder (rate limiting)
      if (existingShares.size >= 5) {
        throw new Error(
          "Maximum number of active share links reached (5). Please revoke some existing links first."
        );
      }

      // Generate unique token
      let shareToken;
      let tokenExists = true;
      let attempts = 0;

      while (tokenExists && attempts < 10) {
        shareToken = this.generateShareToken();
        const tokenDoc = await getDoc(doc(db, this.collectionName, shareToken));
        tokenExists = tokenDoc.exists();
        attempts++;
      }

      if (tokenExists) {
        throw new Error(
          "Failed to generate unique share token. Please try again."
        );
      }

      // Create share document
      const shareData = {
        shareToken,
        binderId,
        ownerId,
        binderName: binderData.metadata?.name || "Unnamed Binder",
        ownerDisplayName: binderData.lastModifiedBy || "Unknown User",
        createdAt: serverTimestamp(),
        expiresAt: options.expiresAt || null,
        description: options.description || null,
        isActive: true,
        // viewCount: 0,  // Disabled
        // lastViewed: null,  // Disabled
        metadata: {
          userAgent: navigator.userAgent,
          referrer: document.referrer,
        },
      };

      await setDoc(doc(db, this.collectionName, shareToken), shareData);

      // Generate the share URL
      const shareUrl = `${window.location.origin}/share/${shareToken}`;

      return {
        success: true,
        shareToken,
        shareUrl,
        shareData: {
          ...shareData,
          shareUrl,
        },
      };
    } catch (error) {
      console.error("Error creating share link:", error);
      throw error;
    }
  }

  /**
   * Get all active share links for a binder
   * @param {string} binderId - The binder ID
   * @param {string} ownerId - The owner's user ID
   * @returns {Promise<Array>} - Array of share links
   */
  async getShareLinks(binderId, ownerId) {
    try {
      const sharesQuery = query(
        collection(db, this.collectionName),
        where("binderId", "==", binderId),
        where("ownerId", "==", ownerId),
        where("isActive", "==", true),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(sharesQuery);
      const shareLinks = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        shareLinks.push({
          ...data,
          shareUrl: `${window.location.origin}/share/${data.shareToken}`,
        });
      });

      return shareLinks;
    } catch (error) {
      console.error("Error fetching share links:", error);
      throw error;
    }
  }

  /**
   * Revoke a share link
   * @param {string} shareToken - The share token to revoke
   * @param {string} ownerId - The owner's user ID (for authorization)
   * @returns {Promise<boolean>} - Success status
   */
  async revokeShareLink(shareToken, ownerId) {
    try {
      const shareRef = doc(db, this.collectionName, shareToken);
      const shareSnap = await getDoc(shareRef);

      if (!shareSnap.exists()) {
        throw new Error("Share link not found");
      }

      const shareData = shareSnap.data();

      // Verify ownership
      if (shareData.ownerId !== ownerId) {
        throw new Error("Unauthorized to revoke this share link");
      }

      // Deactivate the share link
      await updateDoc(shareRef, {
        isActive: false,
        revokedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error("Error revoking share link:", error);
      throw error;
    }
  }

  /**
   * Get binder data by share token (for public viewing)
   * @param {string} shareToken - The share token
   * @returns {Promise<Object>} - Binder data and owner info
   */
  async getBinderByShareToken(shareToken) {
    try {
      // Get share data
      const shareRef = doc(db, this.collectionName, shareToken);
      const shareSnap = await getDoc(shareRef);

      if (!shareSnap.exists()) {
        throw new Error("Share link not found or has been revoked");
      }

      const shareData = shareSnap.data();

      // Check if share is active and not expired
      if (!shareData.isActive) {
        throw new Error("Share link has been revoked");
      }

      if (shareData.expiresAt && shareData.expiresAt.toDate() < new Date()) {
        throw new Error("Share link has expired");
      }

      // Get binder data
      const binderRef = doc(
        db,
        this.binderCollectionName,
        `${shareData.ownerId}_${shareData.binderId}`
      );
      const binderSnap = await getDoc(binderRef);

      if (!binderSnap.exists()) {
        throw new Error("Binder not found");
      }

      const binderData = binderSnap.data();

      // Verify binder is still public
      if (!binderData.permissions?.public) {
        throw new Error("Binder is no longer public");
      }

      // Track view - DISABLED
      // await this.trackView(shareToken);

      // Remove server timestamp before returning
      const { serverTimestamp, ...binder } = binderData;

      return {
        binder,
        shareData: {
          ...shareData,
          shareUrl: `${window.location.origin}/share/${shareToken}`,
        },
        owner: {
          uid: shareData.ownerId,
          displayName: shareData.ownerDisplayName,
          // Note: We don't expose email or other sensitive owner data
        },
      };
    } catch (error) {
      console.error("Error getting binder by share token:", error);
      throw error;
    }
  }

  /**
   * Track a view of a shared binder - DISABLED
   * @param {string} shareToken - The share token
   * @returns {Promise<void>}
   */
  async trackView(shareToken) {
    // View tracking disabled
    return;

    // try {
    //   const shareRef = doc(db, this.collectionName, shareToken);
    //
    //   await updateDoc(shareRef, {
    //     viewCount: increment(1),
    //     lastViewed: serverTimestamp(),
    //   });
    // } catch (error) {
    //   console.error("Error tracking view:", error);
    //   // Don't throw error for analytics tracking failures
    // }
  }

  /**
   * Get share analytics for a binder
   * @param {string} binderId - The binder ID
   * @param {string} ownerId - The owner's user ID
   * @returns {Promise<Object>} - Analytics data
   */
  async getShareAnalytics(binderId, ownerId) {
    try {
      const sharesQuery = query(
        collection(db, this.collectionName),
        where("binderId", "==", binderId),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(sharesQuery);
      // let totalViews = 0;  // Disabled
      let activeLinks = 0;
      let totalLinks = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalLinks++;
        // totalViews += data.viewCount || 0;  // Disabled

        if (data.isActive) {
          const isExpired =
            data.expiresAt && data.expiresAt.toDate() < new Date();
          if (!isExpired) {
            activeLinks++;
          }
        }
      });

      return {
        // totalViews,  // Disabled
        activeLinks,
        totalLinks,
        shares: snapshot.docs.map((doc) => ({
          ...doc.data(),
          shareUrl: `${window.location.origin}/share/${doc.data().shareToken}`,
        })),
      };
    } catch (error) {
      console.error("Error getting share analytics:", error);
      throw error;
    }
  }

  /**
   * Clean up expired share links
   * @returns {Promise<number>} - Number of links cleaned up
   */
  async cleanupExpiredLinks() {
    try {
      const now = new Date();
      const expiredQuery = query(
        collection(db, this.collectionName),
        where("expiresAt", "<=", now),
        where("isActive", "==", true)
      );

      const snapshot = await getDocs(expiredQuery);
      let cleanedUp = 0;

      const batch = [];
      snapshot.forEach((doc) => {
        batch.push(
          updateDoc(doc.ref, {
            isActive: false,
            expiredAt: serverTimestamp(),
          })
        );
      });

      await Promise.all(batch);
      cleanedUp = snapshot.size;

      return cleanedUp;
    } catch (error) {
      console.error("Error cleaning up expired links:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const shareService = new ShareService();
export default shareService;

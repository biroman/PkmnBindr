import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { shareLinkService } from "./ShareLinkService";

/**
 * Service for handling anonymous binder access via share links
 * Allows non-authenticated users to view shared binders
 */
class AnonymousBinderService {
  /**
   * Get a shared binder via share link (no authentication required)
   * @param {string} shareId - The share ID
   * @returns {Promise<Object>} Binder data and metadata
   */
  async getSharedBinder(shareId) {
    try {
      if (!shareId) {
        throw new Error("Share ID is required");
      }

      // Validate share link access
      const validation = await shareLinkService.validateShareAccess(shareId);

      if (!validation.isValid) {
        throw new Error(validation.reason);
      }

      const { shareData } = validation;

      // Get the actual binder data
      const binderRef = doc(
        db,
        "user_binders",
        `${shareData.ownerId}_${shareData.binderId}`
      );
      const binderDoc = await getDoc(binderRef);

      if (!binderDoc.exists()) {
        throw new Error("Binder not found");
      }

      const binderData = binderDoc.data();

      // Verify binder is public (additional safety check)
      if (!binderData.permissions?.public) {
        throw new Error("Binder is not publicly accessible");
      }

      // Fetch owner profile data
      let ownerData = null;
      try {
        const ownerRef = doc(db, "users", shareData.ownerId);
        const ownerDoc = await getDoc(ownerRef);

        if (ownerDoc.exists()) {
          const ownerProfile = ownerDoc.data();
          ownerData = {
            uid: shareData.ownerId,
            displayName:
              ownerProfile.displayName || ownerProfile.email || "Unknown User",
            photoURL: ownerProfile.photoURL || null,
            email: ownerProfile.email || null,
            bio: ownerProfile.bio || null,
            location: ownerProfile.location || null,
            website: ownerProfile.website || null,
            joinedAt: ownerProfile.createdAt,
            isPublic: ownerProfile.isPublic !== false, // Default to true if not set
          };
        } else {
          // Fallback owner data if profile doesn't exist
          ownerData = {
            uid: shareData.ownerId,
            displayName: "Unknown User",
            photoURL: null,
            email: null,
            bio: null,
            location: null,
            website: null,
            joinedAt: null,
            isPublic: true,
          };
        }
      } catch (ownerError) {
        console.error("Error fetching owner profile:", ownerError);
        // Create minimal fallback owner data
        ownerData = {
          uid: shareData.ownerId,
          displayName: "Unknown User",
          photoURL: null,
          email: null,
          bio: null,
          location: null,
          website: null,
          joinedAt: null,
          isPublic: true,
        };
      }

      // Track the access
      const visitorFingerprint = shareLinkService.generateVisitorFingerprint();
      await shareLinkService.trackShareAccess(shareId, visitorFingerprint);

      // Remove server timestamp and prepare for frontend
      const { serverTimestamp, ...cleanBinderData } = binderData;

      return {
        success: true,
        binder: cleanBinderData,
        owner: ownerData,
        shareData: {
          shareId: shareData.shareId,
          title: shareData.settings?.title,
          description: shareData.settings?.description,
          createdAt: shareData.createdAt,
          accessCount: shareData.accessCount,
          analytics: shareData.analytics,
        },
        metadata: {
          isSharedView: true,
          isAnonymousAccess: true,
          allowsAnonymous: shareData.settings?.allowAnonymous,
        },
      };
    } catch (error) {
      console.error("Error getting shared binder:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get shared binder by custom slug
   * @param {string} customSlug - The custom slug
   * @returns {Promise<Object>} Binder data and metadata
   */
  async getSharedBinderBySlug(customSlug) {
    try {
      if (!customSlug) {
        throw new Error("Custom slug is required");
      }

      // First, find the share link with this custom slug
      // Note: In a real implementation, you might want to create a separate collection
      // or index for custom slugs for better performance
      const { query, where, getDocs, collection, limit } = await import(
        "firebase/firestore"
      );

      const q = query(
        collection(db, "shared_binders"),
        where("settings.customSlug", "==", customSlug),
        where("isActive", "==", true),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return {
          success: false,
          error: "Custom slug not found",
        };
      }

      const shareDoc = querySnapshot.docs[0];
      const shareId = shareDoc.id;

      // Use the regular getSharedBinder method
      return await this.getSharedBinder(shareId);
    } catch (error) {
      console.error("Error getting shared binder by slug:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get basic binder info for preview (without full content)
   * @param {string} shareId - The share ID
   * @returns {Promise<Object>} Basic binder info
   */
  async getSharedBinderPreview(shareId) {
    try {
      const validation = await shareLinkService.validateShareAccess(shareId);

      if (!validation.isValid) {
        throw new Error(validation.reason);
      }

      const { shareData } = validation;

      // Get just the binder metadata (not full content)
      const binderRef = doc(
        db,
        "user_binders",
        `${shareData.ownerId}_${shareData.binderId}`
      );
      const binderDoc = await getDoc(binderRef);

      if (!binderDoc.exists()) {
        throw new Error("Binder not found");
      }

      const binderData = binderDoc.data();

      if (!binderData.permissions?.public) {
        throw new Error("Binder is not publicly accessible");
      }

      // Return just the essential preview data
      return {
        metadata: {
          name: binderData.metadata?.name,
          description: binderData.metadata?.description,
          coverImageUrl: binderData.metadata?.coverImageUrl,
          createdAt: binderData.metadata?.createdAt,
        },
        owner: {
          id: shareData.ownerId,
          // Note: You might want to fetch owner display name separately
        },
        shareInfo: {
          title: shareData.settings?.title,
          description: shareData.settings?.description,
          accessCount: shareData.accessCount,
        },
        stats: {
          cardCount: Object.keys(binderData.cards || {}).length,
          pageCount: binderData.settings?.pageCount || 1,
        },
      };
    } catch (error) {
      console.error("Error getting shared binder preview:", error);
      throw new Error(`Failed to get binder preview: ${error.message}`);
    }
  }

  /**
   * Check if a share link exists and is valid (lightweight check)
   * @param {string} shareId - The share ID
   * @returns {Promise<boolean>} True if share is valid
   */
  async isValidShareLink(shareId) {
    try {
      const validation = await shareLinkService.validateShareAccess(shareId);
      return validation.isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get share link analytics (public facing)
   * @param {string} shareId - The share ID
   * @returns {Promise<Object>} Public analytics data
   */
  async getShareAnalytics(shareId) {
    try {
      const shareData = await shareLinkService.getShareLink(shareId);

      if (!shareData) {
        throw new Error("Share link not found");
      }

      // Return only non-sensitive analytics
      return {
        totalViews: shareData.analytics?.totalViews || 0,
        uniqueVisitors: shareData.analytics?.uniqueVisitors?.length || 0,
        lastViewedAt: shareData.analytics?.lastViewedAt,
        createdAt: shareData.createdAt,
      };
    } catch (error) {
      console.error("Error getting share analytics:", error);
      return {
        totalViews: 0,
        uniqueVisitors: 0,
        lastViewedAt: null,
        createdAt: null,
      };
    }
  }

  /**
   * Generate SEO metadata for shared binder
   * @param {string} shareId - The share ID
   * @returns {Promise<Object>} SEO metadata
   */
  async generateSEOMetadata(shareId) {
    try {
      const preview = await this.getSharedBinderPreview(shareId);

      const title =
        preview.shareInfo?.title ||
        preview.metadata?.name ||
        "Pokemon Card Collection";
      const description =
        preview.shareInfo?.description ||
        preview.metadata?.description ||
        `A Pokemon card binder with ${preview.stats?.cardCount || 0} cards`;

      return {
        title: `${title} - Shared Pokemon Collection`,
        description,
        image: preview.metadata?.coverImageUrl,
        url: `${window.location.origin}/share/${shareId}`,
        type: "website",
        siteName: "PkmnBindr",
        cardCount: preview.stats?.cardCount,
        pageCount: preview.stats?.pageCount,
      };
    } catch (error) {
      console.error("Error generating SEO metadata:", error);
      return {
        title: "Pokemon Card Collection - PkmnBindr",
        description: "Check out this Pokemon card collection!",
        image: null,
        url: `${window.location.origin}/share/${shareId}`,
        type: "website",
        siteName: "PkmnBindr",
      };
    }
  }
}

// Create singleton instance
export const anonymousBinderService = new AnonymousBinderService();

// Export the class for testing
export default AnonymousBinderService;

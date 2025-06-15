import {
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";

export class BinderInteractionService {
  // Cache to prevent spam clicking
  static pendingOperations = new Set();
  static lastOperationTime = new Map();
  static OPERATION_COOLDOWN = 1000; // 1 second cooldown

  /**
   * Like or unlike a binder
   * @param {string} binderId - The binder ID
   * @param {string} userId - The current user's ID
   * @param {boolean} isLiked - Current like state
   * @param {string} ownerId - The binder owner's ID
   * @returns {Promise<boolean>} - New like state
   */
  static async toggleLike(binderId, userId, isLiked, ownerId) {
    const operationKey = `like_${binderId}_${userId}`;

    try {
      // Prevent spam clicking
      if (this.pendingOperations.has(operationKey)) {
        console.log("Like operation already in progress");
        return isLiked; // Return current state
      }

      // Check cooldown
      const lastOperation = this.lastOperationTime.get(operationKey);
      const now = Date.now();
      if (lastOperation && now - lastOperation < this.OPERATION_COOLDOWN) {
        console.log("Like operation on cooldown");
        return isLiked; // Return current state
      }

      this.pendingOperations.add(operationKey);
      this.lastOperationTime.set(operationKey, now);

      const newLikeState = await runTransaction(db, async (transaction) => {
        // Get current binder data - construct proper document ID
        const binderDocId = `${ownerId}_${binderId}`;
        const binderRef = doc(db, "user_binders", binderDocId);
        const binderDoc = await transaction.get(binderRef);

        if (!binderDoc.exists()) {
          throw new Error("Binder not found");
        }

        const binderData = binderDoc.data();
        const currentLikes = binderData.likes || [];
        const currentLikeCount = binderData.likeCount || 0;

        let newLikes;
        let newLikeCount;
        let newIsLiked;

        if (isLiked) {
          // Unlike: remove user from likes array
          newLikes = currentLikes.filter((id) => id !== userId);
          newLikeCount = Math.max(0, currentLikeCount - 1);
          newIsLiked = false;
        } else {
          // Like: add user to likes array (if not already there)
          if (!currentLikes.includes(userId)) {
            newLikes = [...currentLikes, userId];
            newLikeCount = currentLikeCount + 1;
            newIsLiked = true;
          } else {
            // User already liked, no change
            newLikes = currentLikes;
            newLikeCount = currentLikeCount;
            newIsLiked = true;
          }
        }

        // Update binder document
        transaction.update(binderRef, {
          likes: newLikes,
          likeCount: newLikeCount,
          lastInteraction: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return newIsLiked;
      });

      // Show success message
      if (newLikeState) {
        toast.success("Binder liked! ❤️");
      } else {
        toast.success("Like removed");
      }

      return newLikeState;
    } catch (error) {
      console.error("Error toggling like:", error);

      if (error.code === "permission-denied") {
        toast.error("You don't have permission to like this binder");
      } else if (error.message === "Binder not found") {
        toast.error("Binder not found");
      } else if (error.code === "unavailable") {
        toast.error("Service temporarily unavailable. Please try again.");
      } else {
        toast.error("Failed to update like. Please try again.");
      }

      return isLiked; // Return original state on error
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  /**
   * Add or remove binder from user's favorites
   * @param {string} binderId - The binder ID
   * @param {string} userId - The current user's ID
   * @param {boolean} isFavorited - Current favorite state
   * @param {Object} binderMetadata - Basic binder info for favorites list
   * @returns {Promise<boolean>} - New favorite state
   */
  static async toggleFavorite(
    binderId,
    userId,
    isFavorited,
    binderMetadata = {}
  ) {
    const operationKey = `favorite_${binderId}_${userId}`;

    try {
      // Prevent spam clicking
      if (this.pendingOperations.has(operationKey)) {
        console.log("Favorite operation already in progress");
        return isFavorited; // Return current state
      }

      // Check cooldown
      const lastOperation = this.lastOperationTime.get(operationKey);
      const now = Date.now();
      if (lastOperation && now - lastOperation < this.OPERATION_COOLDOWN) {
        console.log("Favorite operation on cooldown");
        return isFavorited; // Return current state
      }

      this.pendingOperations.add(operationKey);
      this.lastOperationTime.set(operationKey, now);

      const newFavoriteState = await runTransaction(db, async (transaction) => {
        // Get current user data and binder data
        const userRef = doc(db, "users", userId);
        const binderDocId = `${binderMetadata.ownerId}_${binderId}`;
        const binderRef = doc(db, "user_binders", binderDocId);

        const [userDoc, binderDoc] = await Promise.all([
          transaction.get(userRef),
          transaction.get(binderRef),
        ]);

        if (!userDoc.exists()) {
          throw new Error("User not found");
        }

        if (!binderDoc.exists()) {
          throw new Error("Binder not found");
        }

        const userData = userDoc.data();
        const binderData = binderDoc.data();
        const currentFavorites = userData.favoriteBinders || [];
        const currentFavoriteUsers = binderData.favoriteUsers || [];
        const currentFavoriteCount = binderData.favoriteCount || 0;

        let newFavorites;
        let newFavoriteUsers;
        let newFavoriteCount;
        let newIsFavorited;

        if (isFavorited) {
          // Remove from favorites
          newFavorites = currentFavorites.filter(
            (fav) => fav.binderId !== binderId
          );
          newFavoriteUsers = currentFavoriteUsers.filter((id) => id !== userId);
          newFavoriteCount = Math.max(0, currentFavoriteCount - 1);
          newIsFavorited = false;
        } else {
          // Add to favorites (if not already there)
          const existingFavorite = currentFavorites.find(
            (fav) => fav.binderId === binderId
          );

          if (!existingFavorite) {
            const favoriteEntry = {
              binderId,
              addedAt: new Date().toISOString(),
              binderName: binderMetadata.name || "Untitled Binder",
              ownerName: binderMetadata.ownerName || "Unknown User",
              ownerId: binderMetadata.ownerId || null,
              cardCount: binderMetadata.cardCount || 0,
            };

            newFavorites = [...currentFavorites, favoriteEntry];
            newFavoriteUsers = currentFavoriteUsers.includes(userId)
              ? currentFavoriteUsers
              : [...currentFavoriteUsers, userId];
            newFavoriteCount = currentFavoriteCount + 1;
            newIsFavorited = true;
          } else {
            // Already favorited, no change
            newFavorites = currentFavorites;
            newFavoriteUsers = currentFavoriteUsers;
            newFavoriteCount = currentFavoriteCount;
            newIsFavorited = true;
          }
        }

        // Update both user document and binder document
        transaction.update(userRef, {
          favoriteBinders: newFavorites,
          updatedAt: serverTimestamp(),
        });

        transaction.update(binderRef, {
          favoriteUsers: newFavoriteUsers,
          favoriteCount: newFavoriteCount,
          lastInteraction: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return newIsFavorited;
      });

      // Show success message
      if (newFavoriteState) {
        toast.success("Added to favorites! ⭐");
      } else {
        toast.success("Removed from favorites");
      }

      return newFavoriteState;
    } catch (error) {
      console.error("Error toggling favorite:", error);

      if (error.code === "permission-denied") {
        toast.error("You don't have permission to favorite this binder");
      } else if (error.message === "User not found") {
        toast.error("User account not found");
      } else if (error.code === "unavailable") {
        toast.error("Service temporarily unavailable. Please try again.");
      } else {
        toast.error("Failed to update favorite. Please try again.");
      }

      return isFavorited; // Return original state on error
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  /**
   * Track a view for a binder (unique per user)
   * @param {string} binderId - The binder ID
   * @param {string} userId - The current user's ID
   * @param {string} ownerId - The binder owner's ID
   * @returns {Promise<boolean>} - Whether the view was counted (true) or already existed (false)
   */
  static async trackView(binderId, userId, ownerId) {
    const operationKey = `view_${binderId}_${userId}`;

    try {
      // Prevent spam tracking
      if (this.pendingOperations.has(operationKey)) {
        return false;
      }

      // Check cooldown (shorter for views since they're less frequent)
      const lastOperation = this.lastOperationTime.get(operationKey);
      const now = Date.now();
      if (lastOperation && now - lastOperation < 5000) {
        // 5 second cooldown
        return false;
      }

      this.pendingOperations.add(operationKey);
      this.lastOperationTime.set(operationKey, now);

      const wasNewView = await runTransaction(db, async (transaction) => {
        // Get current binder data
        const binderDocId = `${ownerId}_${binderId}`;
        const binderRef = doc(db, "user_binders", binderDocId);
        const binderDoc = await transaction.get(binderRef);

        if (!binderDoc.exists()) {
          throw new Error("Binder not found");
        }

        const binderData = binderDoc.data();
        const currentViews = binderData.views || [];
        const currentViewCount = binderData.viewCount || 0;

        // Check if user has already viewed this binder
        if (currentViews.includes(userId)) {
          // User has already viewed, don't increment
          return false;
        }

        // Add user to views array and increment count
        const newViews = [...currentViews, userId];
        const newViewCount = currentViewCount + 1;

        // Update binder document
        transaction.update(binderRef, {
          views: newViews,
          viewCount: newViewCount,
          lastViewed: serverTimestamp(),
          lastInteraction: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return true;
      });

      return wasNewView;
    } catch (error) {
      console.error("Error tracking view:", error);
      if (error.code === "permission-denied") {
      } else if (error.message === "Binder not found") {
      } else if (error.code === "unavailable") {
      }

      return false; // Fail silently for views
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  /**
   * Get binder interaction data for a user (including views)
   * @param {string} binderId - The binder ID
   * @param {string} userId - The current user's ID
   * @param {string} ownerId - The binder owner's ID
   * @returns {Promise<Object>} - Interaction data
   */
  static async getBinderInteractions(binderId, userId, ownerId) {
    try {
      const [binderDoc, userDoc] = await Promise.all([
        getDoc(doc(db, "user_binders", `${ownerId}_${binderId}`)),
        getDoc(doc(db, "users", userId)),
      ]);

      const binderData = binderDoc.exists() ? binderDoc.data() : {};
      const userData = userDoc.exists() ? userDoc.data() : {};

      const likes = binderData.likes || [];
      const likeCount = binderData.likeCount || 0;
      const isLiked = likes.includes(userId);

      const favoriteUsers = binderData.favoriteUsers || [];
      const favoriteCount = binderData.favoriteCount || 0;
      const favoriteBinders = userData.favoriteBinders || [];
      const isFavorited = favoriteBinders.some(
        (fav) => fav.binderId === binderId
      );

      const views = binderData.views || [];
      const viewCount = binderData.viewCount || 0;
      const hasViewed = views.includes(userId);

      return {
        isLiked,
        isFavorited,
        hasViewed,
        likeCount,
        favoriteCount,
        viewCount,
        totalLikes: likeCount,
        totalFavorites: favoriteCount,
        totalViews: viewCount,
      };
    } catch (error) {
      console.error("Error getting binder interactions:", error);

      // Return default values on error
      return {
        isLiked: false,
        isFavorited: false,
        hasViewed: false,
        likeCount: 0,
        favoriteCount: 0,
        viewCount: 0,
        totalLikes: 0,
        totalFavorites: 0,
        totalViews: 0,
      };
    }
  }

  /**
   * Get binder stats (likes, favorites, and views count) without user context
   * @param {string} binderId - The binder ID
   * @param {string} ownerId - The binder owner's ID
   * @returns {Promise<Object>} - Binder stats
   */
  static async getBinderStats(binderId, ownerId) {
    try {
      const binderDoc = await getDoc(
        doc(db, "user_binders", `${ownerId}_${binderId}`)
      );

      if (!binderDoc.exists()) {
        return {
          likeCount: 0,
          favoriteCount: 0,
          viewCount: 0,
          totalLikes: 0,
          totalFavorites: 0,
          totalViews: 0,
        };
      }

      const binderData = binderDoc.data();
      const likeCount = binderData.likeCount || 0;
      const favoriteCount = binderData.favoriteCount || 0;
      const viewCount = binderData.viewCount || 0;

      console.log(`getBinderStats for ${binderId}:`, {
        likeCount,
        favoriteCount,
        viewCount,
        rawData: {
          likeCount: binderData.likeCount,
          favoriteCount: binderData.favoriteCount,
          viewCount: binderData.viewCount,
          likes: binderData.likes,
          favoriteUsers: binderData.favoriteUsers,
          views: binderData.views,
        },
      });

      return {
        likeCount,
        favoriteCount,
        viewCount,
        totalLikes: likeCount,
        totalFavorites: favoriteCount,
        totalViews: viewCount,
      };
    } catch (error) {
      console.error("Error getting binder stats:", error);

      // Return default values on error
      return {
        likeCount: 0,
        favoriteCount: 0,
        viewCount: 0,
        totalLikes: 0,
        totalFavorites: 0,
        totalViews: 0,
      };
    }
  }

  /**
   * Get user's favorite binders
   * @param {string} userId - The user's ID
   * @returns {Promise<Array>} - Array of favorite binders
   */
  static async getUserFavorites(userId) {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));

      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      return userData.favoriteBinders || [];
    } catch (error) {
      console.error("Error getting user favorites:", error);
      return [];
    }
  }

  /**
   * Clean up old operation cache entries
   */
  static cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, timestamp] of this.lastOperationTime.entries()) {
      if (now - timestamp > this.OPERATION_COOLDOWN * 10) {
        // Keep for 10x cooldown
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => {
      this.lastOperationTime.delete(key);
    });
  }
}

// Clean up cache periodically
setInterval(() => {
  BinderInteractionService.cleanupCache();
}, 60000); // Every minute

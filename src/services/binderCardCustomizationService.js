import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const COLLECTION_NAME = "binderCardCustomizations";

/**
 * Service for managing binder card visual customizations
 * This is separate from binder content to avoid triggering "unsaved changes"
 */
export class BinderCardCustomizationService {
  /**
   * Save binder card customization to Firebase
   * @param {string} binderId - The binder ID
   * @param {string} userId - The user ID (owner of the binder)
   * @param {Object} customization - The customization data
   */
  async saveCustomization(binderId, userId, customization) {
    if (!binderId || !userId) {
      throw new Error("Binder ID and User ID are required");
    }

    const docId = `${userId}_${binderId}`;
    const customizationRef = doc(db, COLLECTION_NAME, docId);

    const customizationData = {
      binderId,
      userId,
      ...customization,
      updatedAt: new Date().toISOString(),
      version: (customization.version || 0) + 1,
    };

    try {
      await setDoc(customizationRef, customizationData);
      console.log(`Binder card customization saved for ${binderId}`);
      return { success: true, data: customizationData };
    } catch (error) {
      console.error("Failed to save binder card customization:", error);
      throw error;
    }
  }

  /**
   * Get binder card customization from Firebase
   * @param {string} binderId - The binder ID
   * @param {string} userId - The user ID (owner of the binder)
   */
  async getCustomization(binderId, userId) {
    if (!binderId || !userId) {
      throw new Error("Binder ID and User ID are required");
    }

    const docId = `${userId}_${binderId}`;
    const customizationRef = doc(db, COLLECTION_NAME, docId);

    try {
      const docSnap = await getDoc(customizationRef);

      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      } else {
        return { success: true, data: null }; // No customization found
      }
    } catch (error) {
      console.error("Failed to get binder card customization:", error);
      throw error;
    }
  }

  /**
   * Get multiple binder customizations for a user
   * @param {string} userId - The user ID
   * @param {string[]} binderIds - Array of binder IDs (optional)
   */
  async getUserCustomizations(userId, binderIds = null) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      let q;
      if (binderIds && binderIds.length > 0) {
        // Get specific binder customizations
        q = query(
          collection(db, COLLECTION_NAME),
          where("userId", "==", userId),
          where("binderId", "in", binderIds)
        );
      } else {
        // Get all user's customizations
        q = query(
          collection(db, COLLECTION_NAME),
          where("userId", "==", userId)
        );
      }

      const querySnapshot = await getDocs(q);
      const customizations = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        customizations[data.binderId] = data;
      });

      return { success: true, data: customizations };
    } catch (error) {
      console.error("Failed to get user customizations:", error);
      throw error;
    }
  }

  /**
   * Delete binder card customization
   * @param {string} binderId - The binder ID
   * @param {string} userId - The user ID
   */
  async deleteCustomization(binderId, userId) {
    if (!binderId || !userId) {
      throw new Error("Binder ID and User ID are required");
    }

    const docId = `${userId}_${binderId}`;
    const customizationRef = doc(db, COLLECTION_NAME, docId);

    try {
      await deleteDoc(customizationRef);
      console.log(`Binder card customization deleted for ${binderId}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to delete binder card customization:", error);
      throw error;
    }
  }
}

// Create singleton instance
export const binderCardCustomizationService =
  new BinderCardCustomizationService();

// Default export
export default binderCardCustomizationService;

import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";

export class UserStatusService {
  // Maximum status length (Discord uses 128, we'll use 100 for good UX)
  static MAX_STATUS_LENGTH = 100;

  /**
   * Update user status
   * @param {string} userId - User's UID
   * @param {string} status - New status message
   * @returns {Promise<boolean>} - Success status
   */
  static async updateUserStatus(userId, status) {
    try {
      // Validate status
      const validation = this.validateStatus(status);
      if (!validation.isValid) {
        toast.error(validation.error);
        return false;
      }

      // Clean the status (trim whitespace)
      const cleanStatus = status.trim();

      // Update the user's status in Firestore
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        customStatus: cleanStatus || null, // Store null if empty
        statusUpdatedAt: new Date(),
        updatedAt: new Date(),
      });

      // Success message
      if (cleanStatus) {
        toast.success("Status updated successfully!");
      } else {
        toast.success("Status cleared!");
      }

      return true;
    } catch (error) {
      console.error("Error updating user status:", error);

      if (error.code === "permission-denied") {
        toast.error("You don't have permission to update your status.");
      } else if (error.code === "unavailable") {
        toast.error("Service temporarily unavailable. Please try again.");
      } else {
        toast.error("Failed to update status. Please try again.");
      }

      return false;
    }
  }

  /**
   * Validate status message
   * @param {string} status - Status to validate
   * @returns {Object} - Validation result
   */
  static validateStatus(status) {
    if (typeof status !== "string") {
      return {
        isValid: false,
        error: "Status must be text",
      };
    }

    if (status.length > this.MAX_STATUS_LENGTH) {
      return {
        isValid: false,
        error: `Status must be ${this.MAX_STATUS_LENGTH} characters or less`,
      };
    }

    // Check for potentially harmful content (basic check)
    const forbiddenPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // onclick, onload, etc.
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(status)) {
        return {
          isValid: false,
          error: "Status contains invalid content",
        };
      }
    }

    return {
      isValid: true,
      error: null,
    };
  }

  /**
   * Get character count info for UI
   * @param {string} status - Current status
   * @returns {Object} - Character count info
   */
  static getCharacterInfo(status = "") {
    const length = status.length;
    const remaining = this.MAX_STATUS_LENGTH - length;
    const isNearLimit = remaining <= 20;
    const isOverLimit = remaining < 0;

    return {
      current: length,
      max: this.MAX_STATUS_LENGTH,
      remaining,
      isNearLimit,
      isOverLimit,
    };
  }
}

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export class UploadRateLimitService {
  static RATE_LIMIT = {
    MAX_UPLOADS: 5,
    TIME_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  };

  /**
   * Check if user can upload (rate limit check)
   * @param {string} userId - User's UID
   * @returns {Promise<{canUpload: boolean, remainingUploads: number, resetTime?: Date, error?: string}>}
   */
  static async checkUploadLimit(userId) {
    try {
      const limitRef = doc(db, "userUploadLimits", userId);
      const limitDoc = await getDoc(limitRef);

      const now = new Date();

      if (!limitDoc.exists()) {
        // First time upload - create limit document
        await setDoc(limitRef, {
          uploads: 0,
          lastReset: serverTimestamp(),
          canUpload: true,
        });

        return {
          canUpload: true,
          remainingUploads: this.RATE_LIMIT.MAX_UPLOADS,
        };
      }

      const data = limitDoc.data();
      const lastReset = data.lastReset?.toDate();
      const uploads = data.uploads || 0;

      // Check if time window has expired
      const timeSinceReset = now.getTime() - (lastReset?.getTime() || 0);

      if (timeSinceReset >= this.RATE_LIMIT.TIME_WINDOW_MS) {
        // Reset the counter
        await setDoc(limitRef, {
          uploads: 0,
          lastReset: serverTimestamp(),
          canUpload: true,
        });

        return {
          canUpload: true,
          remainingUploads: this.RATE_LIMIT.MAX_UPLOADS,
        };
      }

      // Check if user has exceeded limit
      if (uploads >= this.RATE_LIMIT.MAX_UPLOADS) {
        const resetTime = new Date(
          lastReset.getTime() + this.RATE_LIMIT.TIME_WINDOW_MS
        );
        const minutesLeft = Math.ceil(
          (resetTime.getTime() - now.getTime()) / (60 * 1000)
        );

        return {
          canUpload: false,
          remainingUploads: 0,
          resetTime,
          error: `Upload limit reached! You can upload up to ${
            this.RATE_LIMIT.MAX_UPLOADS
          } profile pictures every 5 minutes. Try again in ${minutesLeft} minute${
            minutesLeft !== 1 ? "s" : ""
          }.`,
        };
      }

      return {
        canUpload: true,
        remainingUploads: this.RATE_LIMIT.MAX_UPLOADS - uploads,
      };
    } catch (error) {
      console.error("Error checking upload limit:", error);
      return {
        canUpload: false,
        remainingUploads: 0,
        error: "Unable to verify upload permissions. Please try again.",
      };
    }
  }

  /**
   * Increment upload counter
   * @param {string} userId - User's UID
   * @returns {Promise<boolean>} Success status
   */
  static async incrementUploadCount(userId) {
    try {
      const limitRef = doc(db, "userUploadLimits", userId);
      const limitDoc = await getDoc(limitRef);

      if (!limitDoc.exists()) {
        // Create new limit document
        await setDoc(limitRef, {
          uploads: 1,
          lastReset: serverTimestamp(),
          canUpload: true,
        });
        return true;
      }

      const data = limitDoc.data();
      const newCount = (data.uploads || 0) + 1;
      const canUpload = newCount < this.RATE_LIMIT.MAX_UPLOADS;

      await setDoc(limitRef, {
        uploads: newCount,
        lastReset: data.lastReset,
        canUpload,
      });

      return true;
    } catch (error) {
      console.error("Error incrementing upload count:", error);
      return false;
    }
  }

  /**
   * Get formatted time remaining for rate limit reset
   * @param {Date} resetTime - When the rate limit resets
   * @returns {string} Formatted time string
   */
  static getTimeRemaining(resetTime) {
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();

    if (diff <= 0) return "now";

    const minutes = Math.ceil(diff / (60 * 1000));
    const seconds = Math.ceil((diff % (60 * 1000)) / 1000);

    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else {
      return `${seconds} second${seconds !== 1 ? "s" : ""}`;
    }
  }

  /**
   * Validate file type client-side
   * @param {File} file - File to validate
   * @returns {{isValid: boolean, error?: string}}
   */
  static validateFileType(file) {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    if (!file) {
      return { isValid: false, error: "No file selected" };
    }

    // Check MIME type
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return {
        isValid: false,
        error: "Only JPEG, PNG, and WebP images are allowed",
      };
    }

    // Check file extension as additional validation
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some((ext) =>
      fileName.endsWith(ext)
    );

    if (!hasValidExtension) {
      return {
        isValid: false,
        error:
          "File must have a valid image extension (.jpg, .jpeg, .png, .webp)",
      };
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: "Image size must be less than 5MB",
      };
    }

    return { isValid: true };
  }
}

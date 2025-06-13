import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../lib/firebase";
import { toast } from "react-hot-toast";
import { UploadRateLimitService } from "./UploadRateLimitService";

export class ProfileImageService {
  /**
   * Upload profile image to Firebase Storage and update user profile
   * @param {string} userId - User's UID
   * @param {Blob} imageBlob - Cropped image blob
   * @param {string} oldImageUrl - Previous image URL to delete (optional)
   * @returns {Promise<string>} - New image URL
   */
  static async uploadProfileImage(userId, imageBlob, oldImageUrl = null) {
    try {
      // Check rate limit before upload
      const rateLimitCheck = await UploadRateLimitService.checkUploadLimit(
        userId
      );

      if (!rateLimitCheck.canUpload) {
        const error = new Error(
          rateLimitCheck.error || "Upload limit exceeded"
        );
        error.code = "upload/rate-limit-exceeded";
        error.rateLimitInfo = rateLimitCheck;
        toast.error(rateLimitCheck.error);
        throw error;
      }

      // Create a reference to the profile image location
      const timestamp = Date.now();
      const imageRef = ref(
        storage,
        `profile-images/${userId}/${timestamp}.jpg`
      );

      // Upload the image
      const snapshot = await uploadBytes(imageRef, imageBlob, {
        contentType: "image/jpeg",
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
      });

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update the user's profile in Firestore
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        photoURL: downloadURL,
        updatedAt: new Date(),
      });

      // Increment upload counter after successful upload
      await UploadRateLimitService.incrementUploadCount(userId);

      // Delete the old image if it exists and is from our storage
      if (oldImageUrl && oldImageUrl.includes("profile-images")) {
        try {
          // Extract the path from the URL for deletion
          const urlParts = oldImageUrl.split("/o/")[1];
          if (urlParts) {
            const filePath = decodeURIComponent(urlParts.split("?")[0]);
            const oldImageRef = ref(storage, filePath);
            await deleteObject(oldImageRef);
          }
        } catch (error) {
          console.warn("Could not delete old profile image:", error);
          // Don't throw error for this - it's not critical
        }
      }

      // Simple success message
      toast.success("Profile picture updated successfully!");

      return downloadURL;
    } catch (error) {
      console.error("Error uploading profile image:", error);

      // Handle specific error types
      if (error.code === "upload/rate-limit-exceeded") {
        // Rate limit error already handled above
        throw error;
      } else if (error.code === "storage/unauthorized") {
        toast.error(
          "Upload failed: Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        );
      } else if (error.code === "storage/quota-exceeded") {
        toast.error(
          "Upload failed: Storage quota exceeded. Please try again later."
        );
      } else if (error.code === "storage/invalid-format") {
        toast.error(
          "Upload failed: Invalid file format. Please select a valid image file."
        );
      } else {
        toast.error("Failed to upload profile picture. Please try again.");
      }

      throw error;
    }
  }

  /**
   * Validate image file (enhanced with rate limiting service)
   * @param {File} file - Image file to validate
   * @returns {Object} - {isValid, error}
   */
  static validateImageFile(file) {
    // Use the enhanced validation from UploadRateLimitService
    return UploadRateLimitService.validateFileType(file);
  }
}

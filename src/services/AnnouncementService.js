import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";

class AnnouncementService {
  static COLLECTION_NAME = "announcements";

  /**
   * Create a new announcement
   */
  async createAnnouncement(announcementData, adminUser) {
    try {
      const announcement = {
        title: announcementData.title.trim(),
        content: announcementData.content.trim(),
        type: announcementData.type || "feature", // feature, bugfix, maintenance, announcement
        isPublished: announcementData.isPublished || false,
        priority: announcementData.priority || "normal", // high, normal, low
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: {
          uid: adminUser.uid,
          name: adminUser.displayName || adminUser.email,
          email: adminUser.email,
        },
      };

      const docRef = await addDoc(
        collection(db, AnnouncementService.COLLECTION_NAME),
        announcement
      );

      toast.success("Announcement created successfully!");
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create announcement");
      throw error;
    }
  }

  /**
   * Get all announcements (admin view)
   */
  async getAllAnnouncements() {
    try {
      const q = query(
        collection(db, AnnouncementService.COLLECTION_NAME),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching all announcements:", error);
      throw error;
    }
  }

  /**
   * Get published announcements (user view)
   */
  async getPublishedAnnouncements(limitCount = 10) {
    try {
      const q = query(
        collection(db, AnnouncementService.COLLECTION_NAME),
        where("isPublished", "==", true),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching published announcements:", error);
      throw error;
    }
  }

  /**
   * Update an announcement
   */
  async updateAnnouncement(announcementId, updateData, adminUser) {
    try {
      const announcementRef = doc(
        db,
        AnnouncementService.COLLECTION_NAME,
        announcementId
      );

      const updatePayload = {
        ...updateData,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: {
          uid: adminUser.uid,
          name: adminUser.displayName || adminUser.email,
          email: adminUser.email,
        },
      };

      await updateDoc(announcementRef, updatePayload);

      toast.success("Announcement updated successfully!");
      return { success: true };
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("Failed to update announcement");
      throw error;
    }
  }

  /**
   * Delete an announcement
   */
  async deleteAnnouncement(announcementId) {
    try {
      const announcementRef = doc(
        db,
        AnnouncementService.COLLECTION_NAME,
        announcementId
      );

      await deleteDoc(announcementRef);

      toast.success("Announcement deleted successfully!");
      return { success: true };
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
      throw error;
    }
  }

  /**
   * Toggle published status
   */
  async togglePublishStatus(announcementId, currentStatus, adminUser) {
    try {
      const announcementRef = doc(
        db,
        AnnouncementService.COLLECTION_NAME,
        announcementId
      );

      await updateDoc(announcementRef, {
        isPublished: !currentStatus,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: {
          uid: adminUser.uid,
          name: adminUser.displayName || adminUser.email,
          email: adminUser.email,
        },
      });

      toast.success(
        `Announcement ${!currentStatus ? "published" : "unpublished"}!`
      );
      return { success: true };
    } catch (error) {
      console.error("Error toggling publish status:", error);
      toast.error("Failed to update publish status");
      throw error;
    }
  }

  /**
   * Get announcement by ID
   */
  async getAnnouncementById(announcementId) {
    try {
      const announcementRef = doc(
        db,
        AnnouncementService.COLLECTION_NAME,
        announcementId
      );
      const snapshot = await getDoc(announcementRef);

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data(),
        };
      } else {
        throw new Error("Announcement not found");
      }
    } catch (error) {
      console.error("Error fetching announcement:", error);
      throw error;
    }
  }
}

export const announcementService = new AnnouncementService();

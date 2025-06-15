import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase"; // Correct path to your Firebase config

export class UserRoleService {
  // Available roles in the system
  static ROLES = {
    USER: "user",
    ADMIN: "admin",
    OWNER: "owner",
  };

  /**
   * Check if a user is the app owner
   * @param {Object} user - User object from Firebase
   * @returns {boolean} - True if user is owner
   */
  static isOwner(user) {
    if (!user) return false;
    return user.role === this.ROLES.OWNER;
  }

  /**
   * Check if a user has admin privileges (admin or owner)
   * @param {Object} user - User object from Firebase
   * @returns {boolean} - True if user is admin or owner
   */
  static isAdmin(user) {
    if (!user) return false;
    return user.role === this.ROLES.ADMIN || this.isOwner(user);
  }

  /**
   * Set user role in Firebase
   * @param {string} userId - Firebase user ID
   * @param {string} role - Role to assign
   */
  static async setUserRole(userId, role) {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        role,
        updatedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error("Error setting user role:", error);
      throw error;
    }
  }

  /**
   * Get user role from Firebase
   * @param {string} userId - Firebase user ID
   * @returns {string} - User role
   */
  static async getUserRole(userId) {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        return userDoc.data().role || this.ROLES.USER;
      }
      return this.ROLES.USER;
    } catch (error) {
      console.error("Error getting user role:", error);
      return this.ROLES.USER;
    }
  }

  /**
   * Get role display name and styling
   * @param {Object} user - User object
   * @returns {Object} - Role display info
   */
  static getRoleDisplayInfo(user) {
    if (this.isOwner(user)) {
      return {
        label: "Owner",
        color:
          "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-yellow-500",
        textColor:
          "text-transparent bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 bg-clip-text",
        priority: 3,
      };
    }

    if (this.isAdmin(user)) {
      return {
        label: "Admin",
        color:
          "bg-gradient-to-r from-purple-400 to-purple-600 text-white border-purple-500",
        textColor:
          "text-transparent bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text",
        priority: 2,
      };
    }

    return {
      label: "User",
      color: "bg-gray-100 text-gray-700 border-gray-200",
      textColor: "text-gray-900",
      priority: 1,
    };
  }
}

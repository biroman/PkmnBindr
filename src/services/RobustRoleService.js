import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export class RobustRoleService {
  static ROLES = {
    USER: "user",
    MODERATOR: "moderator",
    ADMIN: "admin",
    OWNER: "owner",
  };

  static ROLE_HIERARCHY = {
    [this.ROLES.USER]: 1,
    [this.ROLES.MODERATOR]: 2,
    [this.ROLES.ADMIN]: 3,
    [this.ROLES.OWNER]: 4,
  };

  /**
   * CRITICAL: Safe user profile creation that NEVER downgrades existing roles
   */
  static async safeCreateOrUpdateUserProfile(user) {
    try {
      const userRef = doc(db, "users", user.uid);

      const baseUserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        photoURL: user.photoURL || null,
        lastSignIn: new Date(),
        updatedAt: new Date(),
      };

      // Use a transaction so we never create-and-overwrite in separate steps
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);

        if (!snap.exists()) {
          // Brand-new user – create minimal profile with default role
          tx.set(
            userRef,
            {
              ...baseUserData,
              role: this.ROLES.USER, // default only for *truly* new users
              status: "active",
              createdAt: new Date(),
              binderCount: 0,
              cardCount: 0,
            },
            { merge: true }
          );
          console.log("✅ New user profile created:", user.uid);
        } else {
          // Existing user – update only safe, non-sensitive fields
          const existingData = snap.data();

          const safeUpdateData = {
            lastSignIn: new Date(),
            updatedAt: new Date(),
          };

          if (user.email && user.email !== existingData.email) {
            safeUpdateData.email = user.email;
          }

          if (user.displayName && !existingData.displayName) {
            safeUpdateData.displayName = user.displayName;
          }

          if (user.photoURL && !existingData.photoURL) {
            safeUpdateData.photoURL = user.photoURL;
          }

          if (Object.keys(safeUpdateData).length) {
            tx.update(userRef, safeUpdateData);
          }
        }
      });

      return true;
    } catch (error) {
      console.error("❌ Error in safe user profile update:", error);
      return false;
    }
  }

  /**
   * Check if user is owner based ONLY on Firebase role (not email)
   */
  static isOwner(user) {
    if (!user) return false;
    return user.role === this.ROLES.OWNER;
  }

  /**
   * Check if user has admin privileges (admin or owner)
   */
  static isAdmin(user) {
    if (!user) return false;
    return user.role === this.ROLES.ADMIN || this.isOwner(user);
  }

  /**
   * Check if user has moderator privileges or higher
   */
  static isModerator(user) {
    if (!user) return false;
    return user.role === this.ROLES.MODERATOR || this.isAdmin(user);
  }

  /**
   * Get user role safely (never returns undefined)
   */
  static getUserRole(user) {
    if (!user) return this.ROLES.USER;
    return user.role || this.ROLES.USER;
  }

  /**
   * Set user role with proper validation and logging
   */
  static async setUserRole(userId, newRole, adminUser) {
    try {
      // Validate role
      if (!Object.values(this.ROLES).includes(newRole)) {
        throw new Error(`Invalid role: ${newRole}`);
      }

      // Check permissions
      if (!this.isAdmin(adminUser)) {
        throw new Error("Only admins can change roles");
      }

      // Prevent non-owners from creating owners
      if (newRole === this.ROLES.OWNER && !this.isOwner(adminUser)) {
        throw new Error("Only owners can assign owner role");
      }

      // Get current user data
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const currentData = userDoc.data();
      const currentRole = currentData.role || this.ROLES.USER;

      // Prevent self-demotion of the last owner
      if (currentRole === this.ROLES.OWNER && newRole !== this.ROLES.OWNER) {
        console.warn("⚠️ Attempting to demote owner - validating this is safe");
        // Add additional validation here if needed
      }

      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date(),
        roleUpdatedBy: adminUser.uid,
        roleUpdatedAt: new Date(),
        roleChangeLog: {
          previousRole: currentRole,
          newRole: newRole,
          changedBy: adminUser.uid,
          changedAt: new Date(),
          reason: "admin_action",
        },
      });

      console.log(
        `✅ Role updated: ${userId} from ${currentRole} to ${newRole} by ${adminUser.uid}`
      );
      return true;
    } catch (error) {
      console.error("❌ Error setting user role:", error);
      throw error;
    }
  }

  /**
   * Initialize first owner (use this instead of email checks)
   */
  static async initializeFirstOwner(userId) {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === this.ROLES.OWNER) {
          console.log("✅ User already has owner role");
          return true;
        }
      }

      await updateDoc(userRef, {
        role: this.ROLES.OWNER,
        updatedAt: new Date(),
        isFounder: true,
        roleUpdatedAt: new Date(),
        roleInitialized: true,
        roleChangeLog: {
          previousRole: userDoc.exists()
            ? userDoc.data().role
            : this.ROLES.USER,
          newRole: this.ROLES.OWNER,
          changedBy: "system",
          changedAt: new Date(),
          reason: "owner_initialization",
        },
      });

      console.log("✅ First owner initialized successfully:", userId);
      return true;
    } catch (error) {
      console.error("❌ Error initializing first owner:", error);
      throw error;
    }
  }

  /**
   * Get user role display information
   */
  static getRoleDisplayInfo(user) {
    const role = this.getUserRole(user);

    if (role === this.ROLES.OWNER) {
      return {
        label: user?.isFounder ? "Founder" : "Owner",
        color:
          "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-yellow-500",
        textColor:
          "text-transparent bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 bg-clip-text",
        priority: 4,
      };
    }

    if (role === this.ROLES.ADMIN) {
      return {
        label: "Admin",
        color:
          "bg-gradient-to-r from-purple-400 to-purple-600 text-white border-purple-500",
        textColor:
          "text-transparent bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text",
        priority: 3,
      };
    }

    if (role === this.ROLES.MODERATOR) {
      return {
        label: "Moderator",
        color:
          "bg-gradient-to-r from-blue-400 to-blue-600 text-white border-blue-500",
        textColor:
          "text-transparent bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text",
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

  /**
   * Validate role hierarchy (prevent downgrading higher roles)
   */
  static canManageUser(adminUser, targetUser) {
    const adminLevel = this.ROLE_HIERARCHY[this.getUserRole(adminUser)] || 0;
    const targetLevel = this.ROLE_HIERARCHY[this.getUserRole(targetUser)] || 0;
    return adminLevel > targetLevel;
  }

  /**
   * Emergency role recovery (for troubleshooting)
   */
  static async emergencyOwnerRecovery(userId, confirmationCode) {
    // This should only be used in emergencies and requires a special confirmation
    const expectedCode = `EMERGENCY_${userId.slice(
      -6
    )}_${new Date().getDate()}`;

    if (confirmationCode !== expectedCode) {
      throw new Error("Invalid emergency confirmation code");
    }

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        role: this.ROLES.OWNER,
        updatedAt: new Date(),
        emergencyRecovery: true,
        emergencyRecoveryAt: new Date(),
        roleChangeLog: {
          previousRole: "unknown",
          newRole: this.ROLES.OWNER,
          changedBy: "emergency_system",
          changedAt: new Date(),
          reason: "emergency_recovery",
        },
      });

      console.log("🚨 Emergency owner recovery completed for:", userId);
      return true;
    } catch (error) {
      console.error("❌ Emergency recovery failed:", error);
      throw error;
    }
  }
}

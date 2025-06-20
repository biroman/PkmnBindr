import { doc, updateDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export class UserRoleService {
  // Available roles in the system
  static ROLES = {
    USER: "user",
    MODERATOR: "moderator",
    ADMIN: "admin",
    OWNER: "owner",
  };

  // Role hierarchy (higher number = more permissions)
  static ROLE_HIERARCHY = {
    [this.ROLES.USER]: 1,
    [this.ROLES.MODERATOR]: 2,
    [this.ROLES.ADMIN]: 3,
    [this.ROLES.OWNER]: 4,
  };

  // Permission mapping for each role
  static PERMISSIONS = {
    [this.ROLES.USER]: [
      "manage_own_binders",
      "create_binder",
      "view_public_binders",
      "contact_support",
      "basic_features",
    ],
    [this.ROLES.MODERATOR]: [
      "manage_own_binders",
      "create_binder",
      "view_public_binders",
      "contact_support",
      "basic_features",
      "moderate_content",
      "view_user_reports",
      "manage_announcements",
      "moderate_comments",
      "temporary_user_actions",
    ],
    [this.ROLES.ADMIN]: [
      "manage_own_binders",
      "create_binder",
      "view_public_binders",
      "contact_support",
      "basic_features",
      "moderate_content",
      "view_user_reports",
      "manage_announcements",
      "moderate_comments",
      "temporary_user_actions",
      "view_all_binders",
      "manage_users",
      "view_analytics",
      "manage_system_config",
      "manage_rules",
      "access_admin_panel",
      "manage_subscription_limits",
    ],
    [this.ROLES.OWNER]: [
      "manage_own_binders",
      "create_binder",
      "view_public_binders",
      "contact_support",
      "basic_features",
      "moderate_content",
      "view_user_reports",
      "manage_announcements",
      "moderate_comments",
      "temporary_user_actions",
      "view_all_binders",
      "manage_users",
      "view_analytics",
      "manage_system_config",
      "manage_rules",
      "access_admin_panel",
      "manage_subscription_limits",
      "manage_roles",
      "system_administration",
      "emergency_controls",
      "billing_management",
      "database_access",
      "security_settings",
    ],
  };

  /**
   * Get the role level for hierarchy comparisons
   * @param {Object} user - User object with role property
   * @returns {number} - Role level (higher = more permissions)
   */
  static getRoleLevel(user) {
    if (!user || !user.role) return this.ROLE_HIERARCHY[this.ROLES.USER];
    return (
      this.ROLE_HIERARCHY[user.role] || this.ROLE_HIERARCHY[this.ROLES.USER]
    );
  }

  /**
   * Check if a user has a specific role or higher
   * @param {Object} user - User object from Firebase
   * @param {string} requiredRole - Required role level
   * @returns {boolean} - True if user has required role or higher
   */
  static hasRole(user, requiredRole) {
    if (!user) return false;
    return this.getRoleLevel(user) >= this.getRoleLevel({ role: requiredRole });
  }

  /**
   * Check if a user has a specific permission
   * @param {Object} user - User object from Firebase
   * @param {string} permission - Permission to check
   * @returns {boolean} - True if user has permission
   */
  static hasPermission(user, permission) {
    const userPermissions = this.getUserPermissions(user);
    return userPermissions.includes(permission);
  }

  /**
   * Get all permissions for a user's role
   * @param {Object} user - User object from Firebase
   * @returns {Array} - Array of permission strings
   */
  static getUserPermissions(user) {
    if (!user || !user.role) return this.PERMISSIONS[this.ROLES.USER];
    return this.PERMISSIONS[user.role] || this.PERMISSIONS[this.ROLES.USER];
  }

  /**
   * Check if a user is the app owner
   * @param {Object} user - User object from Firebase
   * @returns {boolean} - True if user is owner
   */
  static isOwner(user) {
    return this.hasRole(user, this.ROLES.OWNER);
  }

  /**
   * Check if a user has admin privileges (admin or owner)
   * @param {Object} user - User object from Firebase
   * @returns {boolean} - True if user is admin or owner
   */
  static isAdmin(user) {
    return this.hasRole(user, this.ROLES.ADMIN);
  }

  /**
   * Check if a user has moderator privileges or higher
   * @param {Object} user - User object from Firebase
   * @returns {boolean} - True if user is moderator, admin, or owner
   */
  static isModerator(user) {
    return this.hasRole(user, this.ROLES.MODERATOR);
  }

  /**
   * Check if user has specific permission
   * @param {Object} user - User object from Firebase
   * @param {string} permission - Permission to check
   * @returns {boolean} - True if user has permission
   */
  static hasPermission(user, permission) {
    if (!user || !user.role) return false;
    const userPermissions = this.PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  }

  /**
   * Check if user can perform action on target user (role hierarchy)
   * @param {Object} actor - User performing the action
   * @param {Object} target - User being acted upon
   * @returns {boolean} - True if action is allowed
   */
  static canManageUser(actor, target) {
    if (!actor || !target) return false;

    const actorLevel = this.ROLE_HIERARCHY[actor.role] || 0;
    const targetLevel = this.ROLE_HIERARCHY[target.role] || 0;

    // Can only manage users with lower role level
    return actorLevel > targetLevel;
  }

  /**
   * Set user role in Firebase (with permission check)
   * @param {string} userId - Firebase user ID
   * @param {string} role - Role to assign
   * @param {Object} adminUser - User performing the action
   */
  static async setUserRole(userId, role, adminUser) {
    try {
      // Check if admin has permission to assign this role
      if (!this.hasPermission(adminUser, "manage_roles")) {
        throw new Error("Insufficient permissions to manage roles");
      }

      // Check if the role being assigned is valid
      if (!Object.values(this.ROLES).includes(role)) {
        throw new Error("Invalid role specified");
      }

      // Prevent non-owners from creating owners
      if (role === this.ROLES.OWNER && !this.isOwner(adminUser)) {
        throw new Error("Only owners can assign owner role");
      }

      // Get target user to check role hierarchy
      const targetUserRef = doc(db, "users", userId);
      const targetUserDoc = await getDoc(targetUserRef);

      if (targetUserDoc.exists()) {
        const targetUser = targetUserDoc.data();
        if (!this.canManageUser(adminUser, targetUser)) {
          throw new Error("Cannot modify user with equal or higher role");
        }
      }

      await updateDoc(targetUserRef, {
        role,
        updatedAt: new Date(),
        roleUpdatedBy: adminUser.uid,
        roleUpdatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error setting user role:", error);
      throw error;
    }
  }

  /**
   * Initialize first owner (only use during setup)
   * @param {string} userId - Firebase user ID of first owner
   */
  static async initializeFirstOwner(userId) {
    try {
      // This should only be called during initial setup
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        role: this.ROLES.OWNER,
        updatedAt: new Date(),
        isFounder: true, // Special flag for the original owner
        roleUpdatedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error("Error initializing first owner:", error);
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
   * Get user role information with metadata
   * @param {Object} user - User object from Firebase
   * @returns {Object} - Role information with metadata
   */
  static getUserRoleInfo(user) {
    const role = user?.role || this.ROLES.USER;
    const level = this.getRoleLevel(user);
    const permissions = this.getUserPermissions(user);

    return {
      role,
      level,
      permissions,
      isOwner: this.isOwner(user),
      isAdmin: this.isAdmin(user),
      isModerator: this.isModerator(user),
      isStaff: role !== this.ROLES.USER,
      canManageUsers: this.hasPermission(user, "manage_users"),
      canModerateContent: this.hasPermission(user, "moderate_content"),
    };
  }

  /**
   * Subscribe to real-time role updates for a user
   * @param {string} userId - User ID to monitor
   * @param {Function} callback - Callback function for role updates
   * @returns {Function} - Unsubscribe function
   */
  static subscribeToUserRole(userId, callback) {
    if (!userId) return () => {};

    const userRef = doc(db, "users", userId);
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        callback({
          uid: userId,
          role: userData.role || this.ROLES.USER,
          permissions: this.getUserPermissions(userData),
          ...userData,
        });
      } else {
        callback({
          uid: userId,
          role: this.ROLES.USER,
          permissions: this.PERMISSIONS[this.ROLES.USER],
        });
      }
    });
  }

  /**
   * Validate role assignment permissions
   * @param {Object} adminUser - User performing the action
   * @param {string} targetUserId - ID of user being modified
   * @param {string} newRole - New role to assign
   * @returns {Object} - Validation result
   */
  static validateRoleAssignment(adminUser, targetUserId, newRole) {
    const errors = [];
    const warnings = [];

    // Check if admin has permission to manage roles
    if (!this.hasPermission(adminUser, "manage_roles")) {
      errors.push("Insufficient permissions to manage roles");
    }

    // Check if the role being assigned is valid
    if (!Object.values(this.ROLES).includes(newRole)) {
      errors.push("Invalid role specified");
    }

    // Prevent non-owners from creating owners
    if (newRole === this.ROLES.OWNER && !this.isOwner(adminUser)) {
      errors.push("Only owners can assign owner role");
    }

    // Warn about self-modification
    if (adminUser.uid === targetUserId) {
      warnings.push("Modifying your own role may affect your permissions");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get role display name and styling
   * @param {Object} user - User object
   * @returns {Object} - Role display info
   */
  static getRoleDisplayInfo(user) {
    if (this.isOwner(user)) {
      return {
        label: user.isFounder ? "Founder" : "Owner",
        color:
          "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-yellow-500",
        textColor:
          "text-transparent bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 bg-clip-text",
        priority: 4,
      };
    }

    if (this.isAdmin(user)) {
      return {
        label: "Admin",
        color:
          "bg-gradient-to-r from-purple-400 to-purple-600 text-white border-purple-500",
        textColor:
          "text-transparent bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text",
        priority: 3,
      };
    }

    if (this.isModerator(user)) {
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
   * Get all available roles that a user can assign
   * @param {Object} user - User performing the action
   * @returns {Array} - Array of assignable roles
   */
  static getAssignableRoles(user) {
    if (!user) return [];

    const userLevel = this.ROLE_HIERARCHY[user.role] || 0;
    const assignableRoles = [];

    Object.entries(this.ROLE_HIERARCHY).forEach(([role, level]) => {
      // Can assign roles with lower level than own
      if (level < userLevel) {
        assignableRoles.push(role);
      }
    });

    return assignableRoles;
  }
}

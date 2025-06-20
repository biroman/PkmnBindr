import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { UserRoleService } from "../services/UserRoleService";

// Create context
const RoleContext = createContext();

// Role provider component
export const RoleProvider = ({ children }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [roleInfo, setRoleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time role updates
  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      setError(null);

      const unsubscribe = UserRoleService.subscribeToUserRole(
        user.uid,
        (roleData) => {
          try {
            setUserRole(roleData.role);
            setPermissions(roleData.permissions);
            setRoleInfo(UserRoleService.getUserRoleInfo(roleData));
            setLoading(false);
          } catch (err) {
            console.error("Error processing role data:", err);
            setError(err.message);
            setLoading(false);
          }
        }
      );

      return unsubscribe;
    } else {
      // No user logged in - reset to default
      setUserRole(UserRoleService.ROLES.USER);
      setPermissions(UserRoleService.PERMISSIONS[UserRoleService.ROLES.USER]);
      setRoleInfo(
        UserRoleService.getUserRoleInfo({ role: UserRoleService.ROLES.USER })
      );
      setLoading(false);
    }
  }, [user]);

  // Helper functions
  const hasRole = (requiredRole) => {
    // Must be logged in to have any elevated role
    if (!user) return false;
    return UserRoleService.hasRole({ role: userRole }, requiredRole);
  };

  const hasPermission = (permission) => {
    // Must be logged in to have permissions
    if (!user) return false;
    return permissions.includes(permission);
  };

  const canManageUser = (targetUser) => {
    // Must be logged in to manage users
    if (!user) return false;
    return UserRoleService.canManageUser({ role: userRole }, targetUser);
  };

  const isOwner = () => {
    // Must be logged in to be an owner
    if (!user) return false;
    return UserRoleService.isOwner({ role: userRole });
  };

  const isAdmin = () => {
    // Must be logged in to be an admin
    if (!user) return false;
    return UserRoleService.isAdmin({ role: userRole });
  };

  const isModerator = () => {
    // Must be logged in to be a moderator
    if (!user) return false;
    return UserRoleService.isModerator({ role: userRole });
  };

  const isStaff = () => {
    return roleInfo?.isStaff || false;
  };

  // Role assignment function (for admin use)
  const assignRole = async (targetUserId, newRole) => {
    if (!user) throw new Error("Must be logged in to assign roles");

    const validation = UserRoleService.validateRoleAssignment(
      { role: userRole, uid: user.uid },
      targetUserId,
      newRole
    );

    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await UserRoleService.setUserRole(targetUserId, newRole, {
      role: userRole,
      uid: user.uid,
    });
  };

  // Get role display information
  const getRoleDisplayInfo = (targetUser = null) => {
    const targetUserData = targetUser || { role: userRole };
    return UserRoleService.getRoleDisplayInfo(targetUserData);
  };

  const value = {
    // Current user role state
    userRole,
    permissions,
    roleInfo,
    loading,
    error,

    // Role checking functions
    hasRole,
    hasPermission,
    canManageUser,

    // Convenience role checkers (as boolean values)
    isOwner: isOwner(),
    isAdmin: isAdmin(),
    isModerator: isModerator(),
    isStaff: isStaff(),

    // Function versions for backward compatibility
    checkIsOwner: isOwner,
    checkIsAdmin: isAdmin,
    checkIsModerator: isModerator,
    checkIsStaff: isStaff,

    // Admin functions
    assignRole,
    validateRoleAssignment: (targetUserId, newRole) =>
      UserRoleService.validateRoleAssignment(
        { role: userRole, uid: user?.uid },
        targetUserId,
        newRole
      ),

    // Utility functions
    getRoleDisplayInfo,
    getUserRoleInfo: UserRoleService.getUserRoleInfo,

    // Role constants for convenience
    ROLES: UserRoleService.ROLES,
    PERMISSIONS: UserRoleService.PERMISSIONS,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

// Hook to use the role context
export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};

// Hook for role-based conditional rendering
export const useRoleGuard = (requiredRole, requiredPermission) => {
  const { hasRole, hasPermission } = useRole();

  const canAccess = () => {
    if (requiredRole && !hasRole(requiredRole)) return false;
    if (requiredPermission && !hasPermission(requiredPermission)) return false;
    return true;
  };

  return {
    canAccess: canAccess(),
    hasRole: requiredRole ? hasRole(requiredRole) : true,
    hasPermission: requiredPermission
      ? hasPermission(requiredPermission)
      : true,
  };
};

// Component for role-based conditional rendering
export const RoleGuard = ({
  requiredRole,
  requiredPermission,
  fallback = null,
  children,
}) => {
  const { canAccess } = useRoleGuard(requiredRole, requiredPermission);

  if (!canAccess) {
    return fallback;
  }

  return children;
};

// Higher-order component for role protection
export const withRoleProtection = (
  WrappedComponent,
  requiredRole,
  requiredPermission
) => {
  return function ProtectedComponent(props) {
    const { canAccess } = useRoleGuard(requiredRole, requiredPermission);

    if (!canAccess) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600">
              You don't have permission to access this content.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

# Role System Implementation Plan

## Overview

This document outlines the comprehensive implementation of a robust role-based access control (RBAC) system to replace the current email-based ownership detection. The system is designed to be scalable, secure, and easily extensible for future subscription tiers and additional roles.

## Current State Analysis

### Existing Issues

1. **Email-based ownership detection** using `VITE_OWNER_EMAIL` environment variable
2. **Inconsistent role checking** across different files and services
3. **Mixed permission systems** between role-based and email-based checks
4. **Security vulnerabilities** with client-side role determination
5. **Scalability issues** for adding new roles and subscription tiers

### Files Currently Using Email-Based Detection

- `src/lib/rules.js` - Lines 359-360, 365-366
- `src/hooks/useAuth.js` - Lines 56-57
- `src/stores/authStore.js` - Lines 82-85, 274-275, 312-313, etc.
- `src/services/rulesService.js` - Line 412
- `src/utils/getUserProfile.js` - Lines 16-20
- `firestore.rules` - Throughout the file
- `storage.rules` - Lines 9+
- And many more...

## System Design

### Core Roles

```javascript
const USER_ROLES = {
  USER: "user", // Regular users - basic features
  MODERATOR: "moderator", // Community moderation + user features
  ADMIN: "admin", // Full system administration + moderator features
  OWNER: "owner", // Ultimate system control + all features
};
```

### Role Hierarchy

```javascript
const ROLE_HIERARCHY = {
  user: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};
```

### Permission System

Each role inherits permissions from lower roles and adds additional capabilities:

#### User Permissions

- `manage_own_binders`
- `create_binder`
- `view_public_binders`
- `contact_support`
- `basic_features`

#### Moderator Permissions (+ User)

- `moderate_content`
- `view_user_reports`
- `manage_announcements`
- `moderate_comments`
- `temporary_user_actions` (warnings, temporary restrictions)

#### Admin Permissions (+ Moderator)

- `view_all_binders`
- `manage_users`
- `view_analytics`
- `manage_system_config`
- `manage_rules`
- `access_admin_panel`
- `manage_subscription_limits`

#### Owner Permissions (+ Admin)

- `manage_roles`
- `system_administration`
- `emergency_controls`
- `billing_management`
- `database_access`
- `security_settings`

### Subscription Integration

The role system will integrate with subscription tiers for feature limits:

```javascript
const SUBSCRIPTION_ROLES = {
  FREE: "free",
  BASIC: "basic",
  PREMIUM: "premium",
  PRO: "pro",
};
```

Effective permissions = Base Role Permissions + Subscription Tier Limits

## Implementation Phases

## Phase 1: Core Infrastructure Setup

### 1.1 Enhanced UserRoleService

**File**: `src/services/UserRoleService.js`

```javascript
export class UserRoleService {
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

  static PERMISSIONS = {
    // Detailed permission mapping per role
  };

  // Role checking methods
  static hasRole(user, requiredRole) {
    return this.getRoleLevel(user) >= this.getRoleLevel({ role: requiredRole });
  }

  static hasPermission(user, permission) {
    const userPermissions = this.getUserPermissions(user);
    return userPermissions.includes(permission);
  }

  static canManageUser(admin, targetUser) {
    return this.getRoleLevel(admin) > this.getRoleLevel(targetUser);
  }

  // Firebase operations
  static async updateUserRole(userId, newRole, adminUser) {
    // Validation and Firebase update logic
  }
}
```

### 1.2 Create RoleContext

**File**: `src/contexts/RoleContext.jsx`

```javascript
export const RoleProvider = ({ children }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time role updates
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = UserRoleService.subscribeToUserRole(
        user.uid,
        (roleData) => {
          setUserRole(roleData.role);
          setPermissions(UserRoleService.getUserPermissions(roleData));
          setLoading(false);
        }
      );
      return unsubscribe;
    }
  }, [user]);

  const value = {
    userRole,
    permissions,
    loading,
    hasRole: (role) => UserRoleService.hasRole({ role: userRole }, role),
    hasPermission: (permission) => permissions.includes(permission),
    canManageUser: (targetUser) =>
      UserRoleService.canManageUser({ role: userRole }, targetUser),
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};
```

### 1.3 Update Firebase Security Rules

**File**: `firestore.rules`

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Enhanced role checking functions
    function getUserRole(userId) {
      return exists(/databases/$(database)/documents/users/$(userId)) ?
             get(/databases/$(database)/documents/users/$(userId)).data.get('role', 'user') : 'user';
    }

    function hasRole(userId, requiredRole) {
      let userRole = getUserRole(userId);
      let roleHierarchy = {
        'user': 1,
        'moderator': 2,
        'admin': 3,
        'owner': 4
      };
      return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    }

    function isOwner(userId) {
      return hasRole(userId, 'owner');
    }

    function isAdmin(userId) {
      return hasRole(userId, 'admin');
    }

    function isModerator(userId) {
      return hasRole(userId, 'moderator');
    }

    // Apply role-based rules throughout
    match /users/{userId} {
      allow read: if request.auth != null &&
                     (request.auth.uid == userId || hasRole(request.auth.uid, 'moderator'));
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if hasRole(request.auth.uid, 'admin');
    }

    // ... rest of rules updated with role-based checks
  }
}
```

## Phase 2: Migration from Email-Based System

### 2.1 Update Authentication Store

**File**: `src/stores/authStore.js`

```javascript
// Remove all VITE_OWNER_EMAIL references
// Replace with role-based checks

isOwner: () => {
  const user = get().user;
  return UserRoleService.hasRole(user, 'owner');
},

isAdmin: () => {
  const user = get().user;
  return UserRoleService.hasRole(user, 'admin');
},

hasPermission: (permission) => {
  const user = get().user;
  return UserRoleService.hasPermission(user, permission);
}
```

### 2.2 Update useAuth Hook

**File**: `src/hooks/useAuth.js`

```javascript
// Remove useOwner hook completely
// Replace with role-based alternatives

export const useRole = () => {
  const { userRole } = useContext(RoleContext);
  return userRole;
};

export const usePermissions = () => {
  const { permissions, hasPermission } = useContext(RoleContext);
  return { permissions, hasPermission };
};
```

### 2.3 Database Migration Script

**File**: `src/scripts/migrateToRoleSystem.js`

```javascript
export const migrateToRoleSystem = async () => {
  // 1. Identify current owner by email
  // 2. Update their user document with role: 'owner'
  // 3. Ensure all other users have role: 'user'
  // 4. Validate migration
  // 5. Clean up environment variables
};
```

## Phase 3: Component and Service Updates

### 3.1 Update All Role Checks

Search and replace across codebase:

```bash
# Find all email-based owner checks
grep -r "VITE_OWNER_EMAIL" src/
grep -r "ownerEmail" src/
grep -r "user.email.*===" src/

# Replace with role-based equivalents
```

### 3.2 Update Admin Components

**Files to update**:

- `src/pages/AdminPage.jsx`
- `src/components/admin/*`
- `src/services/admin/*`

```javascript
// Before
if (user?.email === ownerEmail) {
  // admin logic
}

// After
if (hasRole("admin")) {
  // admin logic
}
```

### 3.3 Update Binder Access Control

**File**: `src/contexts/BinderContext.jsx`

```javascript
const canAccessBinder = useCallback(
  (binderId) => {
    const binder = binders.find((b) => b.id === binderId);
    if (!binder) return false;

    // Owner can access their own binders
    if (binder.ownerId === user?.uid) return true;

    // Admins can access all binders
    if (hasRole("admin")) return true;

    // Moderators can access public binders for moderation
    if (hasRole("moderator") && binder.permissions?.public) return true;

    // Users can access public binders
    if (binder.permissions?.public) return true;

    return false;
  },
  [binders, user, hasRole]
);
```

## Phase 4: Advanced Features

### 4.1 Role Management UI

**File**: `src/components/admin/RoleManagement.jsx`

```javascript
const RoleManagement = () => {
  // UI for viewing and managing user roles
  // Only accessible to owners
  // Bulk role operations
  // Role change history
  // Permission matrix view
};
```

### 4.2 Audit Logging

**File**: `src/services/AuditService.js`

```javascript
export class AuditService {
  static async logRoleChange(adminUserId, targetUserId, oldRole, newRole) {
    // Log role changes for security audit
  }

  static async logPermissionDenied(userId, action, reason) {
    // Log access attempts for security monitoring
  }
}
```

### 4.3 Emergency Access System

**File**: `src/services/EmergencyAccessService.js`

```javascript
export class EmergencyAccessService {
  // Emergency owner access recovery
  // Multi-factor authentication for role changes
  // Temporary emergency permissions
}
```

## Phase 5: Subscription Integration

### 5.1 Combined Permission System

**File**: `src/lib/permissionSystem.js`

```javascript
export const getEffectivePermissions = (user) => {
  const rolePermissions = UserRoleService.getUserPermissions(user);
  const subscriptionLimits = SubscriptionService.getUserLimits(user);

  return {
    role: user.role,
    subscription: user.subscriptionTier,
    permissions: rolePermissions,
    limits: subscriptionLimits,
    canPerform: (action) =>
      checkCombinedPermissions(action, rolePermissions, subscriptionLimits),
  };
};
```

### 5.2 Feature Gates

```javascript
// Role-based feature gates
const FeatureGate = ({ requiredRole, requiredPermission, children }) => {
  const { hasRole, hasPermission } = useRole();

  if (requiredRole && !hasRole(requiredRole)) return null;
  if (requiredPermission && !hasPermission(requiredPermission)) return null;

  return children;
};
```

## Phase 6: Testing and Validation

### 6.1 Role Testing Suite

**File**: `src/tests/roleSystem.test.js`

```javascript
describe("Role System", () => {
  test("Role hierarchy enforcement", () => {});
  test("Permission inheritance", () => {});
  test("Firebase rule validation", () => {});
  test("Cross-role access control", () => {});
});
```

### 6.2 Security Validation

- Penetration testing for role bypass attempts
- Firebase rules testing with different user contexts
- Permission escalation vulnerability testing

## Phase 7: Documentation and Training

### 7.1 Developer Documentation

- Role system architecture
- How to add new roles/permissions
- Best practices for role checks
- Troubleshooting guide

### 7.2 Admin User Guide

- How to manage user roles
- Understanding permission levels
- Emergency procedures

## Implementation Timeline

### Week 1: Infrastructure ✅ COMPLETED

- [x] ✅ Create enhanced UserRoleService (`src/services/UserRoleService.js`)
- [x] ✅ Set up RoleContext (`src/contexts/RoleContext.jsx`)
- [x] ✅ Update Firebase rules (`firestore.rules`, `storage.rules`)
- [x] ✅ Create migration script (`src/scripts/migrateToRoleSystem.js`)

### Week 2: Core Migration

- [x] ✅ Migrate authentication system
- [x] ✅ Update all role checks in core files
- [x] ✅ Test basic functionality
- [ ] Deploy to staging

### Week 3: Component Updates ✅ COMPLETED

- [x] ✅ Update admin components (AdminPage.jsx, DashboardPage.jsx, MessagesPage.jsx)
- [x] ✅ Update binder access control (RulesContext.jsx, rulesService.js)
- [x] ✅ Update navigation components (Navbar.jsx)
- [x] ✅ Update service layer (rules.js utilities)
- [x] ✅ Add RoleProvider to App.jsx context hierarchy
- [ ] Implement role management UI
- [ ] Add audit logging

### Week 4: Advanced Features

- [ ] Subscription integration
- [ ] Emergency access system
- [ ] Security testing
- [ ] Documentation

### Week 5: Validation & Deploy

- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Production deployment
- [ ] Monitor and fix issues

## Security Considerations

### Client-Side Security

- Never trust client-side role information
- Always validate permissions server-side
- Use Firebase security rules as the source of truth

### Role Transition Security

- Require current password for role changes
- Log all role modifications
- Implement role change cooldown periods
- Multi-factor authentication for sensitive role changes

### Emergency Procedures

- Owner account recovery process
- Emergency role reset procedures
- System lockdown capabilities
- Audit trail requirements

## Migration Strategy

### Pre-Migration

1. Backup all user data
2. Document current owner email
3. Test migration script on staging
4. Prepare rollback plan

### Migration Process

1. Run migration script to set owner role
2. Deploy updated codebase
3. Validate all role-based features
4. Remove email-based environment variables
5. Update documentation

### Post-Migration

1. Monitor for role-related issues
2. Validate all admin functionality
3. Test user access patterns
4. Performance monitoring

## Future Extensibility

The system is designed to easily accommodate:

### Additional Roles

- `PREMIUM_USER`: Users with paid subscriptions
- `CONTENT_CREATOR`: Special content creation privileges
- `BETA_TESTER`: Access to experimental features
- `PARTNER`: Business partner access levels

### Dynamic Permissions

- Time-based permissions
- Location-based access
- Feature-specific permissions
- Conditional role elevation

### Integration Points

- Third-party authentication providers
- Enterprise SSO systems
- API authentication systems
- Webhook role synchronization

## Success Metrics

### Technical Metrics

- Zero email-based role checks remaining
- 100% Firebase rule coverage for roles
- Sub-100ms role validation performance
- Zero privilege escalation vulnerabilities

### Business Metrics

- Streamlined admin user management
- Reduced support tickets for access issues
- Improved security audit compliance
- Foundation for subscription tier features

## Conclusion

This role system implementation provides a robust, secure, and scalable foundation for user access control. By replacing email-based ownership with a proper RBAC system, we achieve better security, easier management, and the flexibility needed for future growth including subscription tiers and additional user roles.

The phased approach ensures minimal disruption to existing functionality while providing a clear migration path and comprehensive testing strategy.

---

## ✅ Implementation Status

### Completed Infrastructure (Phase 1)

#### 1. Enhanced UserRoleService (`src/services/UserRoleService.js`)

- ✅ **Role hierarchy system** with USER → MODERATOR → ADMIN → OWNER
- ✅ **Permission mapping** for each role with inheritance
- ✅ **Role checking methods**: `hasRole()`, `hasPermission()`, `canManageUser()`
- ✅ **Firebase integration** with real-time role updates via `subscribeToUserRole()`
- ✅ **Role validation** and assignment with permission checks
- ✅ **Role display utilities** for UI components

#### 2. RoleContext (`src/contexts/RoleContext.jsx`)

- ✅ **React Context** for global role state management
- ✅ **Real-time role updates** using Firebase listeners
- ✅ **Role guards** for conditional rendering (`useRoleGuard`, `RoleGuard`)
- ✅ **Higher-order components** for route protection (`withRoleProtection`)
- ✅ **Comprehensive hooks** for role checking throughout the app

#### 3. Migration Script (`src/scripts/migrateToRoleSystem.js`)

- ✅ **Safe migration** from email-based to role-based system
- ✅ **Dry-run capability** to preview changes before execution
- ✅ **Automatic owner detection** by email
- ✅ **Batch role assignments** with validation
- ✅ **Audit logging** and rollback capabilities
- ✅ **CLI interface** for easy execution

### Key Features Implemented

#### 🔐 **Security-First Design**

- Server-side role validation in Firebase rules
- Role hierarchy prevents privilege escalation
- Permission-based access control
- Audit trail for all role changes

#### 🚀 **Developer-Friendly**

- Simple hooks: `useRole()`, `useRoleGuard()`
- Component guards: `<RoleGuard requiredRole="admin">...</RoleGuard>`
- HOC protection: `withRoleProtection(Component, 'moderator')`
- TypeScript-ready with clear interfaces

#### 🔄 **Real-Time Updates**

- Firebase listeners for instant role changes
- No need to refresh or re-login
- Automatic permission recalculation
- Context state management

#### 📈 **Scalable Architecture**

- Easy to add new roles: just update `ROLES` enum
- Permission system supports any number of permissions
- Subscription tier integration ready
- Future-proof design patterns

### Next Steps

#### Immediate (Phase 2):

1. **Update Firebase Security Rules** - Replace email-based checks with role functions
2. **Migrate AuthStore** - Remove `VITE_OWNER_EMAIL` dependencies
3. **Update useAuth Hook** - Replace `useOwner()` with role-based alternatives
4. **Run Migration Script** - Execute the role system migration

#### Example Usage After Implementation:

```jsx
// Before (email-based)
const isOwner = useOwner();
if (isOwner) {
  // admin UI
}

// After (role-based)
const { hasRole, hasPermission } = useRole();
if (hasRole("admin")) {
  // admin UI
}

// Component protection
<RoleGuard requiredRole="moderator">
  <ModerationPanel />
</RoleGuard>;

// Permission checking
if (hasPermission("manage_users")) {
  // user management UI
}
```

### Migration Command

When ready to migrate, run:

```bash
# Dry run first
node src/scripts/migrateToRoleSystem.js your-owner@email.com --dry-run

# Execute migration
node src/scripts/migrateToRoleSystem.js your-owner@email.com
```

This implementation provides a **robust, secure, and scalable** foundation for role-based access control that will support your current needs and future growth including subscription tiers and additional user roles.

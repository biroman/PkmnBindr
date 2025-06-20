import { useEffect } from "react";
import { useAuthStore } from "../stores/authStore";

// Initialize auth once when the module loads
let initialized = false;
const initializeAuth = () => {
  if (!initialized) {
    initialized = true;
    useAuthStore.getState().initialize();
  }
};

export const useAuth = () => {
  // Initialize auth once
  useEffect(() => {
    initializeAuth();
  }, []);

  // Simple subscriptions to individual state pieces
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  // Get actions directly from store (these are stable references)
  const store = useAuthStore.getState();

  return {
    // State
    user,
    loading,
    error,

    // Computed
    isAuthenticated: Boolean(user),

    // Actions (stable references from store)
    signUp: store.signUp,
    signIn: store.signIn,
    signInWithGoogle: store.signInWithGoogle,
    signInWithTwitter: store.signInWithTwitter,
    logout: store.logout,
    resetPassword: store.resetPassword,
    resendEmailVerification: store.resendEmailVerification,
    changePassword: store.changePassword,
    updateDisplayName: store.updateDisplayName,
    deleteAccount: store.deleteAccount,
    reportSuspiciousActivity: store.reportSuspiciousActivity,
    getRemainingCooldown: store.getRemainingCooldown,
    canAttemptAuth: store.canAttemptAuth,
    clearError: store.clearError,
    getAuthProvider: store.getAuthProvider,
  };
};

// Deprecated: Use useRole hook from RoleContext instead
export const useOwner = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === "owner";
};

// New role-based hooks (recommended)
export const useRole = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role || "user";
};

export const useIsOwner = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === "owner";
};

export const useIsAdmin = () => {
  const user = useAuthStore((state) => state.user);
  return ["admin", "owner"].includes(user?.role);
};

export const useIsModerator = () => {
  const user = useAuthStore((state) => state.user);
  return ["moderator", "admin", "owner"].includes(user?.role);
};

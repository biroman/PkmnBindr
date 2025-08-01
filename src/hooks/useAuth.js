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

export const useOwner = () => {
  const user = useAuthStore((state) => state.user);
  // Use role-based checking instead of email
  return user?.role === "owner";
};

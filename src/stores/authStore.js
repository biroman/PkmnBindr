import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// Rate limiting storage (in production, move to Firebase or Redis)
const rateLimitStore = {
  loginAttempts: new Map(),
  signupAttempts: new Map(),

  canAttempt(type, identifier) {
    const attempts = this[`${type}Attempts`].get(identifier) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(
      (time) => now - time < 15 * 60 * 1000
    ); // 15 minutes
    return recentAttempts.length < 5; // Max 5 attempts per 15 minutes
  },

  recordAttempt(type, identifier) {
    const attempts = this[`${type}Attempts`].get(identifier) || [];
    attempts.push(Date.now());
    this[`${type}Attempts`].set(identifier, attempts);
  },

  getRemainingCooldown(type, identifier) {
    const attempts = this[`${type}Attempts`].get(identifier) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(
      (time) => now - time < 15 * 60 * 1000
    );

    if (recentAttempts.length >= 5) {
      const oldestAttempt = Math.min(...recentAttempts);
      const cooldownEnd = oldestAttempt + 15 * 60 * 1000;
      return Math.max(0, cooldownEnd - now);
    }
    return 0;
  },
};

export const useAuthStore = create()(
  devtools(
    persist(
      (set, get) => ({
        // State
        user: null,
        loading: true,
        error: null,
        initialized: false,

        // Computed values
        isAuthenticated: () => Boolean(get().user),
        isOwner: () => {
          const { user } = get();
          const ownerEmail = import.meta.env.VITE_OWNER_EMAIL;
          return user?.email === ownerEmail;
        },

        // Actions
        setUser: (user) => set({ user }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // Initialize auth listener
        initialize: () => {
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
              if (firebaseUser) {
                // Get additional user data from Firestore
                const userDoc = await getDoc(
                  doc(db, "users", firebaseUser.uid)
                );
                const userData = userDoc.exists() ? userDoc.data() : {};

                const user = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  photoURL: firebaseUser.photoURL,
                  emailVerified: firebaseUser.emailVerified,
                  ...userData,
                };

                set({ user, loading: false, initialized: true });

                // Update last login time
                if (userDoc.exists()) {
                  await updateDoc(doc(db, "users", firebaseUser.uid), {
                    lastLoginAt: serverTimestamp(),
                    loginCount: (userData.loginCount || 0) + 1,
                  });
                }
              } else {
                set({ user: null, loading: false, initialized: true });
              }
            } catch (error) {
              console.error("Error in auth state change:", error);
              set({
                user: firebaseUser
                  ? {
                      uid: firebaseUser.uid,
                      email: firebaseUser.email,
                      displayName: firebaseUser.displayName,
                      photoURL: firebaseUser.photoURL,
                      emailVerified: firebaseUser.emailVerified,
                    }
                  : null,
                loading: false,
                initialized: true,
                error: error.message,
              });
            }
          });

          // Return cleanup function
          return unsubscribe;
        },

        // Auth methods
        signUp: async (email, password, displayName, agreeToTerms) => {
          try {
            set({ error: null, loading: true });

            // Rate limiting check
            if (!rateLimitStore.canAttempt("signup", email)) {
              const cooldown = rateLimitStore.getRemainingCooldown(
                "signup",
                email
              );
              const minutes = Math.ceil(cooldown / (1000 * 60));
              throw new Error(
                `Too many signup attempts. Please try again in ${minutes} minutes.`
              );
            }

            // Validate terms agreement
            if (!agreeToTerms) {
              throw new Error("You must agree to the terms and conditions.");
            }

            // Record attempt
            rateLimitStore.recordAttempt("signup", email);

            const { user } = await createUserWithEmailAndPassword(
              auth,
              email,
              password
            );

            // Update user profile
            await updateProfile(user, { displayName });

            // Create user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
              displayName,
              email,
              emailVerified: false,
              role: "user", // Add default role
              agreeToTerms: true,
              agreeToTermsAt: new Date().toISOString(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              loginCount: 0,
              accountStatus: "active",
              securityFlags: {
                suspiciousActivity: false,
                lastPasswordChange: new Date().toISOString(),
              },
            });

            // Send email verification
            await sendEmailVerification(user, {
              url: `${window.location.origin}/dashboard`,
              handleCodeInApp: true,
            });

            return user;
          } catch (error) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        signIn: async (email, password) => {
          try {
            set({ error: null, loading: true });

            // Rate limiting check
            if (!rateLimitStore.canAttempt("login", email)) {
              const cooldown = rateLimitStore.getRemainingCooldown(
                "login",
                email
              );
              const minutes = Math.ceil(cooldown / (1000 * 60));
              throw new Error(
                `Too many login attempts. Please try again in ${minutes} minutes.`
              );
            }

            // Record attempt
            rateLimitStore.recordAttempt("login", email);

            const { user } = await signInWithEmailAndPassword(
              auth,
              email,
              password
            );

            // Security check - warn about unverified email
            if (!user.emailVerified) {
              console.warn("Email not verified. Some features may be limited.");
            }

            return user;
          } catch (error) {
            console.warn(`Failed login attempt for ${email}:`, error.code);
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        logout: async () => {
          try {
            set({ error: null });

            // Update last logout time
            const { user } = get();
            if (user?.uid) {
              await updateDoc(doc(db, "users", user.uid), {
                lastLogoutAt: serverTimestamp(),
              });
            }

            await signOut(auth);
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },

        resetPassword: async (email) => {
          try {
            set({ error: null });

            // Rate limiting for password reset
            if (!rateLimitStore.canAttempt("signup", email)) {
              throw new Error(
                "Too many password reset attempts. Please try again later."
              );
            }

            rateLimitStore.recordAttempt("signup", email);

            await sendPasswordResetEmail(auth, email, {
              url: `${window.location.origin}/login`,
              handleCodeInApp: true,
            });
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },

        resendEmailVerification: async () => {
          try {
            if (auth.currentUser && !auth.currentUser.emailVerified) {
              await sendEmailVerification(auth.currentUser, {
                url: `${window.location.origin}/dashboard`,
                handleCodeInApp: true,
              });
              return true;
            }
            return false;
          } catch (error) {
            console.error("Error sending verification email:", error);
            throw error;
          }
        },

        // Refresh user state (useful after email verification)
        refreshUser: async () => {
          try {
            if (auth.currentUser) {
              // Reload the Firebase user to get latest data
              await auth.currentUser.reload();

              // Get updated user data from Firestore
              const userDoc = await getDoc(
                doc(db, "users", auth.currentUser.uid)
              );
              const userData = userDoc.exists() ? userDoc.data() : {};

              const updatedUser = {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: auth.currentUser.displayName,
                photoURL: auth.currentUser.photoURL,
                emailVerified: auth.currentUser.emailVerified,
                ...userData,
              };

              set({ user: updatedUser });
              return updatedUser;
            }
            return null;
          } catch (error) {
            console.error("Error refreshing user:", error);
            throw error;
          }
        },

        changePassword: async (currentPassword, newPassword) => {
          try {
            if (!auth.currentUser) {
              throw new Error("No user logged in");
            }

            // Re-authenticate user
            const credential = EmailAuthProvider.credential(
              auth.currentUser.email,
              currentPassword
            );
            await reauthenticateWithCredential(auth.currentUser, credential);

            // Update password
            await updatePassword(auth.currentUser, newPassword);

            // Update security info in Firestore
            const { user } = get();
            if (user?.uid) {
              await updateDoc(doc(db, "users", user.uid), {
                "securityFlags.lastPasswordChange": new Date().toISOString(),
                updatedAt: serverTimestamp(),
              });
            }

            return true;
          } catch (error) {
            console.error("Error changing password:", error);
            throw error;
          }
        },

        // Security monitoring
        reportSuspiciousActivity: async (activityType, details) => {
          try {
            const { user } = get();
            if (user?.uid) {
              await updateDoc(doc(db, "users", user.uid), {
                "securityFlags.suspiciousActivity": true,
                "securityFlags.lastSuspiciousActivity": {
                  type: activityType,
                  details,
                  timestamp: new Date().toISOString(),
                  userAgent: navigator.userAgent,
                  ip: "client-side", // In production, get from server
                },
                updatedAt: serverTimestamp(),
              });
            }
          } catch (error) {
            console.error("Error reporting suspicious activity:", error);
          }
        },

        // Security helpers
        getRemainingCooldown: (type, identifier) =>
          rateLimitStore.getRemainingCooldown(type, identifier),
        canAttemptAuth: (type, identifier) =>
          rateLimitStore.canAttempt(type, identifier),
      }),
      {
        name: "auth-storage", // localStorage key
        partialize: (state) => ({
          user: state.user,
          // Don't persist loading, error, or initialized
        }),
      }
    ),
    {
      name: "auth-store", // devtools name
    }
  )
);

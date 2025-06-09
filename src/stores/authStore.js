import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  TwitterAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  updatePassword,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
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
                  providerData: firebaseUser.providerData,
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
                      providerData: firebaseUser.providerData,
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

        // Google OAuth sign in/up
        signInWithGoogle: async () => {
          try {
            set({ error: null, loading: true });

            const provider = new GoogleAuthProvider();
            provider.addScope("email");
            provider.addScope("profile");

            const { user } = await signInWithPopup(auth, provider);

            // Check if user document exists, create if not
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (!userDoc.exists()) {
              // New user - create document
              await setDoc(doc(db, "users", user.uid), {
                displayName: user.displayName || user.email?.split("@")[0],
                email: user.email,
                emailVerified: user.emailVerified,
                photoURL: user.photoURL,
                role: "user",
                agreeToTerms: true, // OAuth users implicitly agree
                agreeToTermsAt: new Date().toISOString(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                loginCount: 1,
                accountStatus: "active",
                authProvider: "google",
                securityFlags: {
                  suspiciousActivity: false,
                  lastPasswordChange: null, // OAuth users don't have passwords
                },
              });
            } else {
              // Existing user - update last login
              await updateDoc(doc(db, "users", user.uid), {
                lastLoginAt: serverTimestamp(),
                loginCount: (userDoc.data().loginCount || 0) + 1,
                emailVerified: user.emailVerified, // Update verification status
                photoURL: user.photoURL, // Update photo in case it changed
              });
            }

            return user;
          } catch (error) {
            console.error("Google sign in failed:", error);
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Twitter OAuth sign in/up
        signInWithTwitter: async () => {
          try {
            set({ error: null, loading: true });

            const provider = new TwitterAuthProvider();

            const { user } = await signInWithPopup(auth, provider);

            // Check if user document exists, create if not
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (!userDoc.exists()) {
              // New user - create document
              await setDoc(doc(db, "users", user.uid), {
                displayName:
                  user.displayName ||
                  user.email?.split("@")[0] ||
                  "Twitter User",
                email: user.email,
                emailVerified: user.emailVerified,
                photoURL: user.photoURL,
                role: "user",
                agreeToTerms: true, // OAuth users implicitly agree
                agreeToTermsAt: new Date().toISOString(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                loginCount: 1,
                accountStatus: "active",
                authProvider: "twitter",
                securityFlags: {
                  suspiciousActivity: false,
                  lastPasswordChange: null, // OAuth users don't have passwords
                },
              });
            } else {
              // Existing user - update last login
              await updateDoc(doc(db, "users", user.uid), {
                lastLoginAt: serverTimestamp(),
                loginCount: (userDoc.data().loginCount || 0) + 1,
                emailVerified: user.emailVerified, // Update verification status
                photoURL: user.photoURL, // Update photo in case it changed
              });
            }

            return user;
          } catch (error) {
            console.error("Twitter sign in failed:", error);
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
                providerData: auth.currentUser.providerData,
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

        // Helper function to detect OAuth provider
        getAuthProvider: (user) => {
          if (!user?.providerData || user.providerData.length === 0) {
            return "email";
          }

          // Check Firebase Auth provider data
          for (const provider of user.providerData) {
            if (provider.providerId === "google.com") {
              return "google";
            } else if (provider.providerId === "twitter.com") {
              return "twitter";
            }
          }

          return "email";
        },

        // Delete account permanently
        deleteAccount: async (password) => {
          try {
            set({ error: null, loading: true });

            if (!auth.currentUser) {
              throw new Error("No user is currently signed in");
            }

            const { user } = get();
            const currentUser = auth.currentUser;
            const authProvider = get().getAuthProvider(user);

            // Re-authenticate user based on their auth provider
            if (authProvider === "google") {
              const provider = new GoogleAuthProvider();
              await reauthenticateWithPopup(currentUser, provider);
            } else if (authProvider === "twitter") {
              const provider = new TwitterAuthProvider();
              await reauthenticateWithPopup(currentUser, provider);
            } else if (password) {
              const credential = EmailAuthProvider.credential(
                currentUser.email,
                password
              );
              await reauthenticateWithCredential(currentUser, credential);
            } else {
              throw new Error(
                "Password is required for email account deletion"
              );
            }

            const userId = currentUser.uid;
            let deletionCount = 0;
            let failedDeletions = [];

            // Delete all user binders from user_binders collection
            try {
              const bindersQuery = query(
                collection(db, "user_binders"),
                where("ownerId", "==", userId)
              );
              const bindersSnapshot = await getDocs(bindersQuery);

              for (const doc of bindersSnapshot.docs) {
                try {
                  await deleteDoc(doc.ref);
                  deletionCount++;
                } catch (error) {
                  failedDeletions.push(
                    `user_binder ${doc.id}: ${error.message}`
                  );
                }
              }
            } catch (error) {
              failedDeletions.push(`user_binders query: ${error.message}`);
            }

            // Delete user activity logs
            try {
              const activityQuery = query(
                collection(db, "users", userId, "activity")
              );
              const activitySnapshot = await getDocs(activityQuery);

              for (const doc of activitySnapshot.docs) {
                try {
                  await deleteDoc(doc.ref);
                  deletionCount++;
                } catch (error) {
                  failedDeletions.push(`activity ${doc.id}: ${error.message}`);
                }
              }
            } catch (error) {
              failedDeletions.push(`activity query: ${error.message}`);
            }

            // Delete user collections
            try {
              const collectionsQuery = query(
                collection(db, "users", userId, "collections")
              );
              const collectionsSnapshot = await getDocs(collectionsQuery);

              for (const doc of collectionsSnapshot.docs) {
                try {
                  await deleteDoc(doc.ref);
                  deletionCount++;
                } catch (error) {
                  failedDeletions.push(
                    `collection ${doc.id}: ${error.message}`
                  );
                }
              }
            } catch (error) {
              failedDeletions.push(`collections query: ${error.message}`);
            }

            // Delete user preferences/settings if they exist
            try {
              const preferencesQuery = query(
                collection(db, "users", userId, "preferences")
              );
              const preferencesSnapshot = await getDocs(preferencesQuery);

              for (const doc of preferencesSnapshot.docs) {
                try {
                  await deleteDoc(doc.ref);
                  deletionCount++;
                } catch (error) {
                  failedDeletions.push(
                    `preference ${doc.id}: ${error.message}`
                  );
                }
              }
            } catch (error) {
              failedDeletions.push(`preferences query: ${error.message}`);
            }

            // Delete all user binders from users subcollection
            try {
              const userBindersQuery = query(
                collection(db, "users", userId, "binders")
              );
              const userBindersSnapshot = await getDocs(userBindersQuery);

              for (const binderDoc of userBindersSnapshot.docs) {
                try {
                  // First delete all cards in this binder
                  const cardsQuery = query(
                    collection(
                      db,
                      "users",
                      userId,
                      "binders",
                      binderDoc.id,
                      "cards"
                    )
                  );
                  const cardsSnapshot = await getDocs(cardsQuery);

                  for (const cardDoc of cardsSnapshot.docs) {
                    try {
                      await deleteDoc(cardDoc.ref);
                      deletionCount++;
                    } catch (error) {
                      failedDeletions.push(
                        `card ${cardDoc.id}: ${error.message}`
                      );
                    }
                  }

                  // Then delete the binder itself
                  await deleteDoc(binderDoc.ref);
                  deletionCount++;
                } catch (error) {
                  failedDeletions.push(
                    `binder ${binderDoc.id}: ${error.message}`
                  );
                }
              }
            } catch (error) {
              failedDeletions.push(`user binders query: ${error.message}`);
            }

            // Finally, delete the user document itself
            try {
              const userDocRef = doc(db, "users", userId);
              await deleteDoc(userDocRef);
              deletionCount++;
            } catch (error) {
              failedDeletions.push(`user document: ${error.message}`);
            }

            // Finally, delete the Firebase Auth user
            await deleteUser(currentUser);

            // Clear local state
            set({ user: null, loading: false, initialized: true });

            return { success: true, message: "Account deleted successfully" };
          } catch (error) {
            let errorMessage = "Failed to delete account. Please try again.";

            switch (error.code) {
              case "auth/requires-recent-login":
                errorMessage =
                  "For security reasons, please log out and log back in before deleting your account.";
                break;
              case "auth/wrong-password":
                errorMessage =
                  "Incorrect password. Please check your password and try again.";
                break;
              case "auth/invalid-credential":
                errorMessage =
                  "Invalid password. Please enter your current password.";
                break;
              case "auth/popup-closed-by-user":
                errorMessage =
                  "Re-authentication cancelled. Account deletion requires re-authentication for security.";
                break;
              case "auth/popup-blocked":
                errorMessage =
                  "Pop-up blocked. Please allow pop-ups and try again to complete re-authentication.";
                break;
              case "auth/too-many-requests":
                errorMessage =
                  "Too many failed attempts. Please wait a moment and try again.";
                break;
              case "auth/network-request-failed":
                errorMessage =
                  "Network error. Please check your connection and try again.";
                break;
              case "auth/user-token-expired":
                errorMessage =
                  "Your session has expired. Please log out and log back in before deleting your account.";
                break;
              default:
                // Check if it's a password-related error by message content
                if (
                  error.message &&
                  (error.message.toLowerCase().includes("password") ||
                    error.message.toLowerCase().includes("credential"))
                ) {
                  errorMessage =
                    "Password verification failed. Please enter your correct current password.";
                } else {
                  errorMessage =
                    error.message ||
                    "Failed to delete account. Please try again.";
                }
            }

            set({ error: errorMessage, loading: false });
            throw new Error(errorMessage);
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

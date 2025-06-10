import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// User collection reference
export const USERS_COLLECTION = "users";

/**
 * Create or update user profile in Firestore
 * Call this when a user signs up or signs in for the first time
 */
export const createOrUpdateUserProfile = async (user) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0] || "User",
      photoURL: user.photoURL || null,
      lastSignIn: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!userSnap.exists()) {
      // New user - set initial data
      await setDoc(userRef, {
        ...userData,
        role: "user", // Default role
        status: "active",
        createdAt: serverTimestamp(),
        binderCount: 0,
        cardCount: 0,
      });
      console.log("New user profile created:", user.uid);
    } else {
      // Existing user - update last sign in and profile info
      await updateDoc(userRef, userData);
      console.log("User profile updated:", user.uid);
    }

    return true;
  } catch (error) {
    console.error("Error creating/updating user profile:", error);
    return false;
  }
};

/**
 * Fetch all users from Firestore (admin only)
 */
export const fetchAllUsers = async () => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        // Ensure all required fields have default values
        uid: userData.uid || doc.id,
        email: userData.email || "Unknown",
        displayName:
          userData.displayName || userData.email?.split("@")[0] || "User",
        photoURL: userData.photoURL || null,
        role: userData.role || "user",
        status: userData.status || "active", // Default to active if missing
        binderCount: userData.binderCount || 0,
        cardCount: userData.cardCount || 0,
        // Convert Firestore timestamps to JavaScript dates
        createdAt: userData.createdAt?.toDate() || new Date(),
        lastSignIn: userData.lastSignIn?.toDate() || new Date(),
        lastSeen:
          userData.lastSeen?.toDate() ||
          userData.lastSignIn?.toDate() ||
          new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
      });
    });

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (userId, newRole) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating user role:", error);
    return false;
  }
};

/**
 * Update user status (admin only)
 */
export const updateUserStatus = async (userId, newStatus) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating user status:", error);
    return false;
  }
};

/**
 * Update user binder and card counts
 */
export const updateUserStats = async (userId, binderCount, cardCount) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      binderCount: binderCount || 0,
      cardCount: cardCount || 0,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating user stats:", error);
    return false;
  }
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        // Ensure all required fields have default values
        uid: userData.uid || userId,
        email: userData.email || "Unknown",
        displayName:
          userData.displayName || userData.email?.split("@")[0] || "User",
        photoURL: userData.photoURL || null,
        role: userData.role || "user",
        status: userData.status || "active",
        binderCount: userData.binderCount || 0,
        cardCount: userData.cardCount || 0,
        createdAt: userData.createdAt?.toDate() || new Date(),
        lastSignIn: userData.lastSignIn?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

/**
 * Migrate existing users to ensure they have all required fields
 */
export const migrateUserData = async () => {
  try {
    console.log("Starting user data migration...");
    const users = await fetchAllUsers();

    const updates = [];
    for (const user of users) {
      const userRef = doc(db, USERS_COLLECTION, user.uid);

      // Check if user needs migration (missing status or other fields)
      if (
        !user.status ||
        user.binderCount === undefined ||
        user.cardCount === undefined
      ) {
        const updateData = {
          status: user.status || "active",
          binderCount: user.binderCount || 0,
          cardCount: user.cardCount || 0,
          role: user.role || "user",
          updatedAt: serverTimestamp(),
        };

        updates.push(updateDoc(userRef, updateData));
        console.log(`Migrating user: ${user.email}`);
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ Migration completed for ${updates.length} users`);
      return { success: true, migratedCount: updates.length };
    } else {
      console.log("✅ No users need migration");
      return { success: true, migratedCount: 0 };
    }
  } catch (error) {
    console.error("Error during user migration:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate actual binder and card counts for a specific user from Firebase collections
 * Optimized to use proper indexes and minimize reads
 */
export const calculateUserStats = async (userId) => {
  try {
    let binderCount = 0;
    let cardCount = 0;
    const countedBinderIds = new Set();

    // 1. Check user_binders collection first (primary location for synced binders)
    // Uses existing index: ownerId + metadata.isArchived + metadata.createdAt
    try {
      const userBindersQuery = query(
        collection(db, "user_binders"),
        where("ownerId", "==", userId),
        where("metadata.isArchived", "==", false)
      );
      const userBindersSnapshot = await getDocs(userBindersQuery);

      userBindersSnapshot.forEach((doc) => {
        const binderData = doc.data();
        const binderId = binderData.id || doc.id;

        if (!countedBinderIds.has(binderId)) {
          binderCount++;
          countedBinderIds.add(binderId);

          // Count cards in this binder
          if (binderData.cards && typeof binderData.cards === "object") {
            cardCount += Object.keys(binderData.cards).length;
          }
        }
      });
    } catch (error) {
      console.warn("Error querying user_binders collection:", error);
      // Try without the metadata.isArchived filter if index doesn't exist
      try {
        const fallbackQuery = query(
          collection(db, "user_binders"),
          where("ownerId", "==", userId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);

        fallbackSnapshot.forEach((doc) => {
          const binderData = doc.data();
          const binderId = binderData.id || doc.id;

          // Manual filter for archived binders
          if (binderData.metadata?.isArchived === true) return;

          if (!countedBinderIds.has(binderId)) {
            binderCount++;
            countedBinderIds.add(binderId);

            if (binderData.cards && typeof binderData.cards === "object") {
              cardCount += Object.keys(binderData.cards).length;
            }
          }
        });
      } catch (fallbackError) {
        console.warn("Fallback query also failed:", fallbackError);
      }
    }

    // 2. Check binders collection (alternative location)
    // Only if we didn't find any binders in user_binders
    if (binderCount === 0) {
      try {
        const bindersQuery = query(
          collection(db, "binders"),
          where("ownerId", "==", userId)
        );
        const bindersSnapshot = await getDocs(bindersQuery);

        bindersSnapshot.forEach((doc) => {
          const binderData = doc.data();
          const binderId = binderData.id || doc.id;

          // Skip archived binders
          if (binderData.metadata?.isArchived === true) return;

          if (!countedBinderIds.has(binderId)) {
            binderCount++;
            countedBinderIds.add(binderId);

            if (binderData.cards && typeof binderData.cards === "object") {
              cardCount += Object.keys(binderData.cards).length;
            }
          }
        });
      } catch (error) {
        console.warn("Error querying binders collection:", error);
      }
    }

    // 3. Check legacy users/{userId}/binders subcollection only if no modern binders found
    if (binderCount === 0) {
      try {
        const legacyBindersQuery = query(
          collection(db, "users", userId, "binders")
        );
        const legacyBindersSnapshot = await getDocs(legacyBindersQuery);

        // Count legacy binders and their cards in parallel
        const legacyBinderPromises = legacyBindersSnapshot.docs.map(
          async (binderDoc) => {
            const binderId = binderDoc.id;
            if (countedBinderIds.has(binderId)) return { binders: 0, cards: 0 };

            countedBinderIds.add(binderId);

            // Count cards in this legacy binder
            try {
              const cardsQuery = query(
                collection(db, "users", userId, "binders", binderId, "cards")
              );
              const cardsSnapshot = await getDocs(cardsQuery);
              return { binders: 1, cards: cardsSnapshot.size };
            } catch (cardError) {
              console.warn(
                `Error counting cards in legacy binder ${binderId}:`,
                cardError
              );
              return { binders: 1, cards: 0 };
            }
          }
        );

        const legacyResults = await Promise.all(legacyBinderPromises);
        legacyResults.forEach((result) => {
          binderCount += result.binders;
          cardCount += result.cards;
        });
      } catch (error) {
        console.warn("Error querying legacy binders subcollection:", error);
      }
    }

    return { binderCount, cardCount };
  } catch (error) {
    console.error("Error calculating user stats:", error);
    return { binderCount: 0, cardCount: 0 };
  }
};

/**
 * Calculate and update stats for all users (admin only)
 */
export const recalculateAllUserStats = async () => {
  try {
    console.log("Starting user stats recalculation...");
    const users = await fetchAllUsers();

    const updates = [];
    const results = [];

    for (const user of users) {
      try {
        const { binderCount, cardCount } = await calculateUserStats(user.uid);

        // Only update if values have changed
        if (user.binderCount !== binderCount || user.cardCount !== cardCount) {
          const userRef = doc(db, USERS_COLLECTION, user.uid);
          updates.push(
            updateDoc(userRef, {
              binderCount,
              cardCount,
              updatedAt: serverTimestamp(),
            })
          );

          results.push({
            uid: user.uid,
            email: user.email,
            oldStats: {
              binderCount: user.binderCount,
              cardCount: user.cardCount,
            },
            newStats: { binderCount, cardCount },
            updated: true,
          });
        } else {
          results.push({
            uid: user.uid,
            email: user.email,
            stats: { binderCount, cardCount },
            updated: false,
          });
        }
      } catch (error) {
        console.error(`Error calculating stats for user ${user.email}:`, error);
        results.push({
          uid: user.uid,
          email: user.email,
          error: error.message,
          updated: false,
        });
      }
    }

    // Batch update all changes
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ Updated stats for ${updates.length} users`);
    }

    return {
      success: true,
      totalUsers: users.length,
      updatedUsers: updates.length,
      results,
    };
  } catch (error) {
    console.error("Error during user stats recalculation:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get enhanced user data with real-time calculated stats
 */
export const fetchAllUsersWithStats = async () => {
  try {
    const users = await fetchAllUsers();

    // Calculate real stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        try {
          const { binderCount, cardCount } = await calculateUserStats(user.uid);
          return {
            ...user,
            // Use calculated stats instead of stored stats
            binderCount,
            cardCount,
            // Keep stored stats for comparison
            storedBinderCount: user.binderCount,
            storedCardCount: user.cardCount,
          };
        } catch (error) {
          console.error(
            `Error calculating stats for user ${user.email}:`,
            error
          );
          return {
            ...user,
            // Fallback to stored stats if calculation fails
            calculationError: error.message,
          };
        }
      })
    );

    return usersWithStats;
  } catch (error) {
    console.error("Error fetching users with stats:", error);
    return [];
  }
};

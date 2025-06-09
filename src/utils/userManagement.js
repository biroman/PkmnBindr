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

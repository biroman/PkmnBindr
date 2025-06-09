import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { USERS_COLLECTION } from "../utils/userManagement";

/**
 * Setup the first owner user with proper role and permissions
 * This should be run once during initial setup
 */
export const setupFirstOwner = async (user) => {
  try {
    if (!user?.uid) {
      throw new Error("No user provided");
    }

    console.log("Setting up first owner user:", user.uid);

    // 1. Create/update user profile with owner role
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0] || "Owner",
      photoURL: user.photoURL || null,
      role: "owner", // Set as owner
      status: "active",
      lastSignIn: serverTimestamp(),
      updatedAt: serverTimestamp(),
      binderCount: 0,
      cardCount: 0,
    };

    if (!userSnap.exists()) {
      // New user - set initial data
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
      });
      console.log("✅ Owner user profile created");
    } else {
      // Existing user - update to owner role
      await updateDoc(userRef, userData);
      console.log("✅ User profile updated to owner");
    }

    // 2. Set up owner role in rules system
    const ownerRoleRef = doc(db, "rules", user.uid);
    const ownerRoleSnap = await getDoc(ownerRoleRef);

    if (!ownerRoleSnap.exists()) {
      await setDoc(ownerRoleRef, {
        uid: user.uid,
        role: "owner",
        permissions: {
          canManageRules: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canManageSystem: true,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("✅ Owner permissions created in rules system");
    } else {
      await updateDoc(ownerRoleRef, {
        role: "owner",
        permissions: {
          canManageRules: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canManageSystem: true,
        },
        updatedAt: serverTimestamp(),
      });
      console.log("✅ Owner permissions updated in rules system");
    }

    return {
      success: true,
      message: "First owner setup completed successfully!",
      userProfile: userData,
    };
  } catch (error) {
    console.error("Error setting up first owner:", error);
    return {
      success: false,
      message: `Failed to setup first owner: ${error.message}`,
      error: error.message,
    };
  }
};

export default setupFirstOwner;

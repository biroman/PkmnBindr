import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";

/**
 * One-time script to set up owner role in Firestore
 * This ensures the owner user has the correct role for Firestore security rules
 */
export const setupOwnerRole = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Update user document with owner role if not already set
      if (userData.role !== "owner") {
        await setDoc(
          userRef,
          {
            ...userData,
            role: "owner",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        console.log("✅ Owner role set successfully");
        return true;
      } else {
        console.log("✅ User already has owner role");
        return true;
      }
    } else {
      // Create new user document with owner role
      await setDoc(userRef, {
        role: "owner",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log("✅ New owner user document created");
      return true;
    }
  } catch (error) {
    console.error("❌ Error setting up owner role:", error);
    return false;
  }
};

// Export a function to run this from browser console
window.setupOwnerRole = setupOwnerRole;

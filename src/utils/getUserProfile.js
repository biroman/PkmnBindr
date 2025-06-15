import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Cache for user profiles to avoid repeated Firebase calls
 */
const userProfileCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get user profile data including photoURL
 * @param {string} userId - The user ID to fetch
 * @returns {Promise<Object>} - User profile object with photoURL
 */
export const getUserProfile = async (userId) => {
  if (!userId || userId === "admin") {
    // Return admin placeholder data
    return {
      uid: "admin",
      displayName: "Owner",
      photoURL: null,
      role: "owner",
    };
  }

  // Check cache first
  const cacheKey = userId;
  const cached = userProfileCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    let userData;
    if (userSnap.exists()) {
      const data = userSnap.data();
      userData = {
        uid: userId,
        displayName: data.displayName || data.email?.split("@")[0] || "User",
        photoURL: data.photoURL || null,
        role: data.role || "user",
      };
    } else {
      // User not found, return minimal data
      userData = {
        uid: userId,
        displayName: "User",
        photoURL: null,
        role: "user",
      };
    }

    // Cache the result
    userProfileCache.set(cacheKey, {
      data: userData,
      timestamp: Date.now(),
    });

    return userData;
  } catch (error) {
    console.error("Error fetching user profile:", error);

    // Return minimal data on error
    return {
      uid: userId,
      displayName: "User",
      photoURL: null,
      role: "user",
    };
  }
};

/**
 * Get multiple user profiles at once
 * @param {string[]} userIds - Array of user IDs to fetch
 * @returns {Promise<Object>} - Object with userId as key and profile as value
 */
export const getUserProfiles = async (userIds) => {
  const profiles = {};

  // Remove duplicates
  const uniqueIds = [...new Set(userIds.filter((id) => id && id !== "admin"))];

  // Fetch all profiles in parallel
  const promises = uniqueIds.map(async (userId) => {
    const profile = await getUserProfile(userId);
    profiles[userId] = profile;
  });

  await Promise.all(promises);

  // Add admin profile if needed
  if (userIds.includes("admin")) {
    profiles.admin = await getUserProfile("admin");
  }

  return profiles;
};

/**
 * Clear cache for a specific user (useful after profile updates)
 * @param {string} userId - User ID to clear from cache
 */
export const clearUserProfileCache = (userId) => {
  userProfileCache.delete(userId);
};

/**
 * Clear entire cache
 */
export const clearAllUserProfileCache = () => {
  userProfileCache.clear();
};

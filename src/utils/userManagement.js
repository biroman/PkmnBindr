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
 * Optimized to use proper indexes and minimize reads (regular user version)
 */
export const calculateUserStats = async (userId) => {
  try {
    let binderCount = 0;
    let cardCount = 0;
    const countedBinderIds = new Set();

    // 1. Check user_binders collection first (primary location for synced binders)
    try {
      const userBindersQuery = query(
        collection(db, "user_binders"),
        where("ownerId", "==", userId)
      );
      const userBindersSnapshot = await getDocs(userBindersQuery);

      userBindersSnapshot.forEach((doc) => {
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
      console.warn("Error querying user_binders collection:", error);
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
        // Silently handle permission errors to prevent console spam
        if (error.code === "permission-denied") {
          // For permission errors, fall back to stored stats
          return null; // Will be handled by caller
        }
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
    // Return null for permission errors to signal that stored stats should be used
    if (error.code === "permission-denied") {
      return null;
    }
    console.error("Error calculating user stats:", error);
    return { binderCount: 0, cardCount: 0 };
  }
};

/**
 * Calculate user stats with admin privileges (owner only)
 * This version has full access to all user data
 */
export const calculateUserStatsAsAdmin = async (userId) => {
  try {
    let binderCount = 0;
    let cardCount = 0;
    const countedBinderIds = new Set();

    console.log(`[Admin] Calculating stats for user: ${userId}`);

    // 1. Check user_binders collection first (modern approach)
    try {
      const userBindersQuery = query(
        collection(db, "user_binders"),
        where("ownerId", "==", userId)
      );
      const userBindersSnapshot = await getDocs(userBindersQuery);

      userBindersSnapshot.forEach((doc) => {
        const binderData = doc.data();
        const binderId = binderData.id;

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

      console.log(
        `[Admin] Found ${binderCount} binders in user_binders collection`
      );
    } catch (error) {
      console.warn("[Admin] Error querying user_binders collection:", error);
    }

    // 2. Check global binders collection (with admin privileges)
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

        console.log(
          `[Admin] Found additional ${binderCount} binders in global binders collection`
        );
      } catch (error) {
        console.warn(
          "[Admin] Error querying global binders collection:",
          error
        );
      }
    }

    // 3. Check legacy users/{userId}/binders subcollection
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
                `[Admin] Error counting cards in legacy binder ${binderId}:`,
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

        console.log(
          `[Admin] Found additional ${binderCount} binders in legacy collection`
        );
      } catch (error) {
        console.warn(
          "[Admin] Error querying legacy binders subcollection:",
          error
        );
      }
    }

    console.log(
      `[Admin] Final stats for ${userId}: ${binderCount} binders, ${cardCount} cards`
    );
    return { binderCount, cardCount };
  } catch (error) {
    console.error("[Admin] Error calculating user stats:", error);
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
        const { binderCount, cardCount } = await calculateUserStatsAsAdmin(
          user.uid
        );

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
 * Get enhanced user data with real-time calculated stats (admin version)
 */
export const fetchAllUsersWithStatsAsAdmin = async () => {
  try {
    const users = await fetchAllUsers();

    // Calculate real stats for each user using admin privileges
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        try {
          const { binderCount, cardCount } = await calculateUserStatsAsAdmin(
            user.uid
          );

          return {
            ...user,
            // Use calculated stats
            binderCount,
            cardCount,
            // Keep stored stats for comparison
            storedBinderCount: user.binderCount,
            storedCardCount: user.cardCount,
            usingStoredStats: false,
            calculatedWithAdminAccess: true,
          };
        } catch (error) {
          console.error(
            `[Admin] Error calculating stats for user ${user.email}:`,
            error
          );
          return {
            ...user,
            // Fallback to stored stats if calculation fails
            binderCount: user.binderCount || 0,
            cardCount: user.cardCount || 0,
            calculationError: error.message,
            usingStoredStats: true,
            calculatedWithAdminAccess: false,
          };
        }
      })
    );

    return usersWithStats;
  } catch (error) {
    console.error("[Admin] Error fetching users with stats:", error);
    return [];
  }
};

/**
 * Get enhanced user data with real-time calculated stats (regular version)
 */
export const fetchAllUsersWithStats = async () => {
  try {
    const users = await fetchAllUsers();

    // Calculate real stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        try {
          const calculatedStats = await calculateUserStats(user.uid);

          // If calculation returned null (permission denied), use stored stats
          if (calculatedStats === null) {
            return {
              ...user,
              // Use stored stats when calculation is not permitted
              binderCount: user.binderCount || 0,
              cardCount: user.cardCount || 0,
              // Mark as using stored stats
              usingStoredStats: true,
            };
          }

          const { binderCount, cardCount } = calculatedStats;
          return {
            ...user,
            // Use calculated stats instead of stored stats
            binderCount,
            cardCount,
            // Keep stored stats for comparison
            storedBinderCount: user.binderCount,
            storedCardCount: user.cardCount,
            usingStoredStats: false,
          };
        } catch (error) {
          // For permission errors, silently use stored stats
          if (error.code === "permission-denied") {
            return {
              ...user,
              binderCount: user.binderCount || 0,
              cardCount: user.cardCount || 0,
              usingStoredStats: true,
            };
          }

          console.error(
            `Error calculating stats for user ${user.email}:`,
            error
          );
          return {
            ...user,
            // Fallback to stored stats if calculation fails
            binderCount: user.binderCount || 0,
            cardCount: user.cardCount || 0,
            calculationError: error.message,
            usingStoredStats: true,
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

/**
 * Fetch all binders for a specific user (admin privileges)
 */
export const fetchUserBindersAsAdmin = async (userId) => {
  try {
    console.log(`[Admin] Fetching binders for user: ${userId}`);
    const userBinders = [];
    const countedBinderIds = new Set();

    // 1. Check user_binders collection (modern approach)
    try {
      const userBindersQuery = query(
        collection(db, "user_binders"),
        where("ownerId", "==", userId)
      );
      const userBindersSnapshot = await getDocs(userBindersQuery);

      userBindersSnapshot.forEach((doc) => {
        const binderData = doc.data();
        const binderId = binderData.id;

        if (!countedBinderIds.has(binderId)) {
          countedBinderIds.add(binderId);

          const cardCount = binderData.cards
            ? Object.keys(binderData.cards).length
            : 0;

          userBinders.push({
            id: binderId,
            docId: doc.id, // For accessing the full document
            name: binderData.metadata?.name || "Unnamed Binder",
            description: binderData.metadata?.description || "",
            cardCount,
            createdAt: binderData.metadata?.createdAt,
            lastModified: binderData.metadata?.lastModified,
            isArchived: binderData.metadata?.isArchived || false,
            gridSize: binderData.settings?.gridSize || "3x3",
            pageCount: binderData.settings?.pageCount || 1,
            source: "user_binders",
            rawData: binderData, // Include full data
          });
        }
      });

      console.log(
        `[Admin] Found ${userBinders.length} binders in user_binders collection for user ${userId}`
      );
    } catch (error) {
      console.warn("[Admin] Error querying user_binders collection:", error);
    }

    // 2. Check global binders collection (with admin privileges)
    try {
      const bindersQuery = query(
        collection(db, "binders"),
        where("ownerId", "==", userId)
      );
      const bindersSnapshot = await getDocs(bindersQuery);

      bindersSnapshot.forEach((doc) => {
        const binderData = doc.data();
        const binderId = binderData.id || doc.id;

        if (!countedBinderIds.has(binderId)) {
          countedBinderIds.add(binderId);

          const cardCount = binderData.cards
            ? Object.keys(binderData.cards).length
            : 0;

          userBinders.push({
            id: binderId,
            docId: doc.id,
            name: binderData.metadata?.name || "Unnamed Binder",
            description: binderData.metadata?.description || "",
            cardCount,
            createdAt: binderData.metadata?.createdAt,
            lastModified: binderData.metadata?.lastModified,
            isArchived: binderData.metadata?.isArchived || false,
            gridSize: binderData.settings?.gridSize || "3x3",
            pageCount: binderData.settings?.pageCount || 1,
            source: "binders",
            rawData: binderData,
          });
        }
      });

      console.log(
        `[Admin] Found additional ${bindersSnapshot.size} binders in global binders collection for user ${userId}`
      );
    } catch (error) {
      console.warn("[Admin] Error querying global binders collection:", error);
    }

    // 3. Check legacy users/{userId}/binders subcollection
    try {
      const legacyBindersQuery = query(
        collection(db, "users", userId, "binders")
      );
      const legacyBindersSnapshot = await getDocs(legacyBindersQuery);

      const legacyBinderPromises = legacyBindersSnapshot.docs.map(
        async (binderDoc) => {
          const binderId = binderDoc.id;
          if (countedBinderIds.has(binderId)) return null;

          countedBinderIds.add(binderId);
          const binderData = binderDoc.data();

          // Count cards in this legacy binder
          let cardCount = 0;
          try {
            const cardsQuery = query(
              collection(db, "users", userId, "binders", binderId, "cards")
            );
            const cardsSnapshot = await getDocs(cardsQuery);
            cardCount = cardsSnapshot.size;
          } catch (cardError) {
            console.warn(
              `[Admin] Error counting cards in legacy binder ${binderId}:`,
              cardError
            );
          }

          return {
            id: binderId,
            docId: binderDoc.id,
            name: binderData.binderName || binderData.name || "Unnamed Binder",
            description: binderData.description || "",
            cardCount,
            createdAt: binderData.createdAt,
            lastModified: binderData.lastModified,
            isArchived: binderData.isArchived || false,
            gridSize: binderData.gridSize || "3x3",
            pageCount: binderData.pageCount || 1,
            source: "legacy",
            rawData: binderData,
          };
        }
      );

      const legacyResults = await Promise.all(legacyBinderPromises);
      legacyResults.forEach((result) => {
        if (result) userBinders.push(result);
      });

      console.log(
        `[Admin] Found additional ${legacyBindersSnapshot.size} legacy binders for user ${userId}`
      );
    } catch (error) {
      console.warn(
        "[Admin] Error querying legacy binders subcollection:",
        error
      );
    }

    console.log(
      `[Admin] Total binders found for ${userId}: ${userBinders.length}`
    );

    // Sort by last modified (most recent first)
    userBinders.sort((a, b) => {
      const aDate = new Date(a.lastModified || a.createdAt || 0);
      const bDate = new Date(b.lastModified || b.createdAt || 0);
      return bDate - aDate;
    });

    return userBinders;
  } catch (error) {
    console.error("[Admin] Error fetching user binders:", error);
    return [];
  }
};

/**
 * Fetch complete binder data for admin viewing (read-only)
 */
export const fetchBinderForAdminView = async (
  binderId,
  userId,
  source = "user_binders"
) => {
  try {
    console.log(
      `[Admin] Fetching binder ${binderId} from ${source} for user ${userId}`
    );

    let binderData = null;

    // Fetch binder based on source
    if (source === "user_binders") {
      const userBindersQuery = query(
        collection(db, "user_binders"),
        where("id", "==", binderId),
        where("ownerId", "==", userId)
      );
      const snapshot = await getDocs(userBindersQuery);

      if (!snapshot.empty) {
        binderData = snapshot.docs[0].data();
      }
    } else if (source === "binders") {
      const binderDoc = await getDoc(doc(db, "binders", binderId));
      if (binderDoc.exists() && binderDoc.data().ownerId === userId) {
        binderData = binderDoc.data();
      }
    } else if (source === "legacy") {
      const binderDoc = await getDoc(
        doc(db, "users", userId, "binders", binderId)
      );
      if (binderDoc.exists()) {
        binderData = binderDoc.data();

        // For legacy binders, we need to fetch cards separately
        const cardsQuery = query(
          collection(db, "users", userId, "binders", binderId, "cards")
        );
        const cardsSnapshot = await getDocs(cardsQuery);

        const cards = {};
        cardsSnapshot.forEach((cardDoc) => {
          const cardData = cardDoc.data();
          // Convert legacy card format to modern format if needed
          const position =
            cardData.pageNumber && cardData.slotInPage
              ? (cardData.pageNumber - 1) * 9 + cardData.slotInPage // Assuming legacy used 3x3 grid
              : Object.keys(cards).length;

          cards[position] = {
            id: cardDoc.id,
            cardApiId: cardData.cardApiId,
            name: cardData.name,
            image: cardData.image,
            rarity: cardData.rarity,
            set: cardData.set,
            value: cardData.value,
            addedAt: cardData.addedAt,
            pageNumber: cardData.pageNumber,
            slotInPage: cardData.slotInPage,
          };
        });

        binderData.cards = cards;
      }
    }

    if (!binderData) {
      throw new Error(`Binder ${binderId} not found or access denied`);
    }

    // Normalize the card data structure
    const normalizedCards = {};
    if (binderData.cards && typeof binderData.cards === "object") {
      Object.entries(binderData.cards).forEach(([position, cardData]) => {
        if (cardData) {
          // Check if this is modern card format (with nested cardData)
          if (cardData.cardData && typeof cardData.cardData === "object") {
            // Flatten the structure for modern cards
            normalizedCards[position] = {
              ...cardData.cardData, // Spread the actual card data
              // Keep some metadata from the wrapper
              binderMetadata: {
                instanceId: cardData.instanceId,
                addedAt: cardData.addedAt,
                addedBy: cardData.addedBy,
                condition: cardData.condition,
                notes: cardData.notes,
                quantity: cardData.quantity,
                isProtected: cardData.isProtected,
              },
            };
          } else {
            // Legacy format - already flat
            normalizedCards[position] = cardData;
          }
        }
      });
    }

    // Normalize the data structure
    const normalizedBinder = {
      id: binderData.id || binderId,
      ownerId: binderData.ownerId || userId,
      metadata: {
        name:
          binderData.metadata?.name ||
          binderData.binderName ||
          binderData.name ||
          "Unnamed Binder",
        description:
          binderData.metadata?.description || binderData.description || "",
        createdAt: binderData.metadata?.createdAt || binderData.createdAt,
        lastModified:
          binderData.metadata?.lastModified || binderData.lastModified,
        isArchived:
          binderData.metadata?.isArchived || binderData.isArchived || false,
      },
      settings: {
        gridSize: binderData.settings?.gridSize || binderData.gridSize || "3x3",
        pageCount: binderData.settings?.pageCount || binderData.pageCount || 1,
        maxPages: binderData.settings?.maxPages || binderData.maxPages || 10,
        pageOrder: binderData.settings?.pageOrder || null,
      },
      cards: normalizedCards,
      source,
      isAdminView: true, // Flag to indicate this is an admin view
    };

    console.log(
      `[Admin] Successfully fetched binder with ${
        Object.keys(normalizedBinder.cards).length
      } cards`
    );
    return normalizedBinder;
  } catch (error) {
    console.error("[Admin] Error fetching binder for admin view:", error);
    throw error;
  }
};

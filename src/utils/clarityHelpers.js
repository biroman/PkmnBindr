import Clarity from "@microsoft/clarity";

/**
 * Identify a user with Microsoft Clarity for analytics tracking
 * @param {Object} user - User object with uid, displayName, email, etc.
 * @param {Object} additionalData - Additional custom data to track (optional)
 */
export const identifyUserWithClarity = (user, additionalData = {}) => {
  // Debug: Always log that this function was called
  console.log("🔍 Clarity Debug: identifyUserWithClarity called", {
    userId: user?.uid,
    mode: import.meta.env.MODE,
    hasWindow: typeof window !== "undefined",
    clarityExists: !!Clarity,
    clarityHasStarted: Clarity?.hasStarted,
  });

  // Only identify users in production and when Clarity is initialized
  if (
    typeof window !== "undefined" &&
    import.meta.env.MODE === "production" &&
    Clarity?.hasStarted
  ) {
    try {
      const userData = {
        userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
        userEmail: user.email || "",
        userRole: user.role || "user",
        emailVerified: user.emailVerified || false,
        accountStatus: user.accountStatus || "active",
        authProvider: user.authProvider || "unknown",
        ...additionalData, // Allow additional custom data
      };

      Clarity.identify(user.uid, userData);
      console.log("✅ Clarity: User identified successfully", user.uid);
    } catch (error) {
      console.error("❌ Clarity: Failed to identify user", error);
    }
  } else if (import.meta.env.MODE === "development") {
    console.log("🚧 Clarity: User identification skipped in development mode", {
      userId: user.uid,
      userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
    });
  } else {
    console.log("⚠️ Clarity: Conditions not met for user identification", {
      hasWindow: typeof window !== "undefined",
      mode: import.meta.env.MODE,
      clarityExists: !!Clarity,
      clarityHasStarted: Clarity?.hasStarted,
    });
  }
};

/**
 * Clear the current user session from Microsoft Clarity
 */
export const clearUserFromClarity = () => {
  // Clear user session when logging out
  if (
    typeof window !== "undefined" &&
    import.meta.env.MODE === "production" &&
    Clarity?.hasStarted
  ) {
    try {
      // Clarity doesn't have a direct "clear" method, but we can identify with empty values
      // This starts a new anonymous session
      Clarity.identify("", {});
      console.log("Clarity: User session cleared");
    } catch (error) {
      console.error("Clarity: Failed to clear user session", error);
    }
  } else if (import.meta.env.MODE === "development") {
    console.log("Clarity: User session clear skipped in development mode");
  }
};

/**
 * Update user information in Clarity (useful for profile updates)
 * @param {Object} user - Updated user object
 */
export const updateClarityUser = (user) => {
  identifyUserWithClarity(user);
};

/**
 * Check if Microsoft Clarity is available and started
 * @returns {boolean} - True if Clarity is available and started
 */
export const isClarityAvailable = () => {
  return (
    typeof window !== "undefined" &&
    import.meta.env.MODE === "production" &&
    Clarity?.hasStarted
  );
};

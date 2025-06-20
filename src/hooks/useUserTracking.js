import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { createOrUpdateUserProfile } from "../utils/userManagement";

/**
 * Hook to automatically track user sign-ins and maintain user profiles
 * This should be used at the app level to ensure all user activity is tracked
 * OPTIMIZED: Prevents excessive calls during auth state changes
 */
export const useUserTracking = () => {
  const { user } = useAuth();
  const lastTrackedUser = useRef(null);

  useEffect(() => {
    const trackUser = async () => {
      if (user && user.uid) {
        // 🔒 SECURITY: Only track if this is a new user session
        // Prevent excessive calls during auth token refreshes
        if (lastTrackedUser.current !== user.uid) {
          try {
            console.log("🔍 Tracking user sign-in:", user.uid);
            await createOrUpdateUserProfile(user);
            lastTrackedUser.current = user.uid;
          } catch (error) {
            console.error("Error tracking user:", error);
          }
        }
      } else if (!user) {
        // Reset tracking when user logs out
        lastTrackedUser.current = null;
      }
    };

    trackUser();
  }, [user?.uid]); // Only depend on uid, not the entire user object

  return null; // This hook doesn't return anything, it just tracks
};

export default useUserTracking;

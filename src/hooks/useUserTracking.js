import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { createOrUpdateUserProfile } from "../utils/userManagement";

/**
 * Hook to automatically track user sign-ins and maintain user profiles
 * This should be used at the app level to ensure all user activity is tracked
 */
export const useUserTracking = () => {
  const { user } = useAuth();

  useEffect(() => {
    const trackUser = async () => {
      if (user) {
        try {
          await createOrUpdateUserProfile(user);
        } catch (error) {
          console.error("Error tracking user:", error);
        }
      }
    };

    trackUser();
  }, [user]);

  return null; // This hook doesn't return anything, it just tracks
};

export default useUserTracking;

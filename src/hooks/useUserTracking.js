import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { RobustRoleService } from "../services/RobustRoleService";

/**
 * Hook to safely track user sign-ins without affecting roles
 * This uses the RobustRoleService to prevent role downgrades
 */
export const useUserTracking = () => {
  const { user } = useAuth();

  useEffect(() => {
    const trackUser = async () => {
      if (user) {
        try {
          // Use the safe method that preserves existing roles
          await RobustRoleService.safeCreateOrUpdateUserProfile(user);
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

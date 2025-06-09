import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBinderContext } from "../../contexts/BinderContext";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

const LogoutButton = ({ className = "", showText = true }) => {
  const { logout } = useAuth();
  const { warnBeforeLogout, checkUnsavedChanges } = useBinderContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Check for unsaved changes and warn user
      const canProceed = warnBeforeLogout();
      if (!canProceed) {
        setIsLoggingOut(false);
        return; // User cancelled logout
      }

      // Get unsaved changes info for logging
      const unsavedInfo = checkUnsavedChanges();
      if (unsavedInfo.hasUnsaved) {
        console.log(
          `User logged out with ${unsavedInfo.count} unsaved binder(s):`,
          unsavedInfo.binders.map((b) => b.metadata?.name).join(", ")
        );
      }

      // Proceed with logout
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 
        hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <ArrowRightOnRectangleIcon className="w-4 h-4" />
      {showText && <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>}
    </button>
  );
};

export default LogoutButton;

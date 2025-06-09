import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBinderContext } from "../../contexts/BinderContext";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import LogoutConfirmationModal from "./LogoutConfirmationModal";

const LogoutButton = ({ className = "", showText = true }) => {
  const { logout } = useAuth();
  const { checkUnsavedChanges } = useBinderContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unsavedBinders, setUnsavedBinders] = useState([]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Check for unsaved changes
      const unsavedInfo = checkUnsavedChanges();
      if (unsavedInfo.hasUnsaved) {
        // Show professional modal instead of alert
        setUnsavedBinders(unsavedInfo.binders);
        setShowConfirmModal(true);
        setIsLoggingOut(false);
        return;
      }

      // No unsaved changes, proceed with logout
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Log unsaved binders for debugging
      console.log(
        `User logged out with ${unsavedBinders.length} unsaved binder(s):`,
        unsavedBinders.map((b) => b.metadata?.name).join(", ")
      );

      // Proceed with logout
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
      setShowConfirmModal(false);
    }
  };

  const handleCancelLogout = () => {
    setShowConfirmModal(false);
    setUnsavedBinders([]);
    setIsLoggingOut(false);
  };

  return (
    <>
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

      <LogoutConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
        unsavedBinders={unsavedBinders}
        isLoggingOut={isLoggingOut}
      />
    </>
  );
};

export default LogoutButton;

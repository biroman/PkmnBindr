import React from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

/**
 * Admin page header component
 *
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {Function} props.onNavigateBack - Function to navigate back to dashboard
 * @param {string} props.currentTab - Currently active tab
 * @returns {JSX.Element} Admin header component
 */
const AdminHeader = ({ user, onNavigateBack, currentTab }) => {
  const getTabDisplayName = (tab) => {
    const tabNames = {
      dashboard: "Dashboard Overview",
      "binder-limits": "Binder Limits",
      "contact-limits": "Contact Limits",
      users: "User Management",
      system: "System Settings",
      contact: "Contact Management",
      announcements: "Announcements",
      "static-binders": "SEO Binders",
      rules: "Rules Management",
    };
    return tabNames[tab] || "Admin Panel";
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">
                Back to Dashboard
              </span>
            </button>

            <div className="hidden sm:block w-px h-6 bg-gray-300" />

            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Admin Panel
              </h1>
              {currentTab && currentTab !== "dashboard" && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm sm:text-base text-gray-600">
                    {getTabDisplayName(currentTab)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Section - User Info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.displayName || "Admin User"}
              </div>
              <div className="text-xs text-gray-500">System Owner</div>
            </div>

            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.displayName?.charAt(0)?.toUpperCase() || "A"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;

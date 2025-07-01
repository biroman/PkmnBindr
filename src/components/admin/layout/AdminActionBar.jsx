import React from "react";
import {
  ArrowPathIcon,
  ClockIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../../ui/Button";

/**
 * AdminActionBar - Global action bar for admin operations
 *
 * Features:
 * - Refresh button with loading state
 * - Last refresh timestamp
 * - Settings/configuration access
 * - Context-aware actions based on active tab
 */
export const AdminActionBar = ({
  isRefreshing,
  onRefresh,
  lastRefresh,
  activeTab,
}) => {
  const formatLastRefresh = (date) => {
    if (!date) return "Never";

    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      {/* Page Title and Context */}
      <div className="flex items-center space-x-3">
        <h1 className="text-2xl font-bold text-text-primary capitalize">
          {activeTab === "dashboard"
            ? "Admin Dashboard"
            : activeTab === "users"
            ? "User Management"
            : activeTab === "contact"
            ? "Contact Management"
            : activeTab === "rules"
            ? "Rules Management"
            : activeTab === "system"
            ? "System Management"
            : "Admin Panel"}
        </h1>

        {/* Active Status Indicator */}
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm text-gray-500">Active</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {/* Last Refresh Info */}
        {lastRefresh && (
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <ClockIcon className="w-4 h-4" />
            <span>Last updated: {formatLastRefresh(lastRefresh)}</span>
          </div>
        )}

        {/* Refresh Button */}
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="secondary"
          size="sm"
          className="flex items-center space-x-2"
        >
          <ArrowPathIcon
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </Button>

        {/* Settings Button */}
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center space-x-2"
          title="Admin Settings"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>
    </div>
  );
};

export default AdminActionBar;

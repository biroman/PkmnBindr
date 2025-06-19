import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  FolderIcon,
  PhotoIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { Clock, User, Crown } from "lucide-react";
import UserAvatar from "../../ui/UserAvatar";
import UserBindersList from "../UserBindersList";
import { LoadingSpinner, EmptyState } from "../";

/**
 * Comprehensive user management table component with responsive design
 *
 * @param {Object} props - Component props
 * @param {Array} props.users - Array of user objects
 * @param {boolean} props.loading - Whether data is loading
 * @param {Object} props.userStats - User statistics object
 * @param {Object} props.pagination - Pagination state and controls
 * @param {Object} props.filters - Search and filter state
 * @param {Function} props.onUserAction - Handler for user actions
 * @param {Function} props.onRefreshStats - Handler for refreshing all user stats
 * @param {Object} props.currentUser - Current logged-in user
 * @returns {JSX.Element} User management table component
 */
const UserManagementTable = ({
  users,
  loading,
  userStats,
  pagination,
  filters,
  onUserAction,
  onRefreshStats,
  currentUser,
}) => {
  const navigate = useNavigate();

  // Local state for UI interactions
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [recalculatingStats, setRecalculatingStats] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        activeDropdown &&
        !event.target.closest("[data-dropdown-container]")
      ) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  // Helper functions
  const getRoleColor = (role) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "admin":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "user":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status) => {
    return status === "active"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  const formatDate = (date) => {
    if (!date) return "Never";

    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return "Invalid Date";

      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return "Never";

    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return "Never";

      const now = new Date();
      const diff = now - dateObj;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 0) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    } catch (error) {
      console.error("Error calculating time ago:", error);
      return "Never";
    }
  };

  const handleViewUserDetails = async (userId) => {
    const userData = users.find((u) => u.uid === userId);
    if (userData) {
      // Mock additional user details that would be fetched
      const detailedUser = {
        ...userData,
        loginHistory: [
          { date: new Date(), ip: "192.168.1.1", location: "Oslo, Norway" },
          {
            date: new Date(Date.now() - 86400000),
            ip: "10.0.0.1",
            location: "Bergen, Norway",
          },
        ],
        recentActivity: [
          {
            action: "Created binder",
            timestamp: new Date(),
            details: '"My Pokemon Collection"',
          },
          {
            action: "Added cards",
            timestamp: new Date(Date.now() - 3600000),
            details: '15 cards to "Rare Collection"',
          },
        ],
        deviceInfo: {
          lastDevice: "Windows 11 - Chrome 120",
          platforms: ["Web", "Mobile"],
        },
      };
      setSelectedUserDetails(detailedUser);
      setShowUserModal(true);
    }
  };

  const handleUserActionWithLoading = async (
    userId,
    action,
    additionalData = null
  ) => {
    setActionLoading(`${userId}-${action}`);
    try {
      await onUserAction(userId, action, additionalData);
      setActiveDropdown(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecalculateStats = async () => {
    setRecalculatingStats(true);
    try {
      await onRefreshStats();
    } finally {
      setRecalculatingStats(false);
    }
  };

  // User Action Dropdown Component
  const UserActionDropdown = ({ userId, userData }) => {
    const isActive = activeDropdown === userId;
    const isLoading = actionLoading?.startsWith(userId);

    if (!isActive) return null;

    const actions = [
      {
        id: "viewDetails",
        label: "👁️ View Details",
        onClick: () => handleViewUserDetails(userId),
        variant: "default",
      },
      { type: "divider" },
      {
        id: "ban",
        label: userData.status === "banned" ? "✅ Unban User" : "🚫 Ban User",
        onClick: () =>
          handleUserActionWithLoading(
            userId,
            userData.status === "banned" ? "unban" : "ban"
          ),
        variant: userData.status === "banned" ? "success" : "danger",
      },
      {
        id: "suspend",
        label:
          userData.status === "suspended"
            ? "🔓 Remove Suspension"
            : "⏸️ Suspend User",
        onClick: () =>
          handleUserActionWithLoading(
            userId,
            userData.status === "suspended" ? "unsuspend" : "suspend"
          ),
        variant: userData.status === "suspended" ? "success" : "warning",
      },
      { type: "divider" },
      {
        id: "makeAdmin",
        label: userData.role === "admin" ? "👤 Remove Admin" : "🛡️ Make Admin",
        onClick: () =>
          handleUserActionWithLoading(
            userId,
            userData.role === "admin" ? "removeAdmin" : "makeAdmin"
          ),
        variant: "default",
        disabled:
          userData.role === "owner" || userData.uid === currentUser?.uid,
      },
      { type: "divider" },
      {
        id: "resetPassword",
        label: "🔑 Reset Password",
        onClick: () => handleUserActionWithLoading(userId, "resetPassword"),
        variant: "default",
      },
      {
        id: "sendNotification",
        label: "📢 Send Notification",
        onClick: () => handleUserActionWithLoading(userId, "sendNotification"),
        variant: "default",
      },
      {
        id: "sendMessage",
        label: "💬 Send Message",
        onClick: () => {
          setActiveDropdown(null);
          navigate("/messages", {
            state: {
              selectedUser: {
                uid: userData.uid,
                displayName: userData.displayName,
                email: userData.email,
                photoURL: userData.photoURL,
              },
            },
          });
        },
        variant: "default",
      },
      {
        id: "refreshStats",
        label: "🔄 Refresh User Stats",
        onClick: () => handleUserActionWithLoading(userId, "refreshStats"),
        variant: "default",
      },
      {
        id: "impersonate",
        label: "👤 Impersonate User",
        onClick: () => handleUserActionWithLoading(userId, "impersonate"),
        variant: "warning",
      },
      { type: "divider" },
      {
        id: "exportData",
        label: "📤 Export User Data",
        onClick: () => handleUserActionWithLoading(userId, "exportData"),
        variant: "default",
      },
      {
        id: "deleteAccount",
        label: "🗑️ Delete Account",
        onClick: () => handleUserActionWithLoading(userId, "deleteAccount"),
        variant: "danger",
        disabled: userData.uid === currentUser?.uid,
      },
    ];

    const getVariantClasses = (variant) => {
      switch (variant) {
        case "danger":
          return "text-red-600 hover:bg-red-50";
        case "warning":
          return "text-orange-600 hover:bg-orange-50";
        case "success":
          return "text-green-600 hover:bg-green-50";
        default:
          return "text-gray-700 hover:bg-gray-50";
      }
    };

    return (
      <div
        className="absolute right-2 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-[60] py-2"
        style={{
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="font-medium text-gray-900 text-sm">
            {userData.displayName}
          </div>
          <div className="text-xs text-gray-500">{userData.email}</div>
        </div>

        {actions.map((action, index) => {
          if (action.type === "divider") {
            return <div key={index} className="h-px bg-gray-100 my-1" />;
          }

          const isActionLoading =
            isLoading && actionLoading === `${userId}-${action.id}`;

          return (
            <button
              key={action.id}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              disabled={action.disabled || isActionLoading}
              className={`
                w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2
                ${
                  action.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }
                ${isActionLoading ? "opacity-50 cursor-wait" : ""}
                ${getVariantClasses(action.variant)}
              `}
            >
              {isActionLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>{action.label}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Mobile User Card Component
  const MobileUserCard = ({ user: u }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
      {/* User Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <UserAvatar user={u} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {u.displayName}
              </div>
              {u.uid === currentUser?.uid && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  You
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">{u.email}</div>
            {u.customStatus && (
              <div className="text-xs text-gray-400 italic truncate mt-1">
                {u.customStatus}
              </div>
            )}
          </div>
        </div>

        {/* Dropdown Toggle - Positioned Relative */}
        <div className="relative" data-dropdown-container>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg touch-manipulation"
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown(activeDropdown === u.uid ? null : u.uid);
            }}
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                activeDropdown === u.uid ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown positioned relative to this button */}
          <UserActionDropdown userId={u.uid} userData={u} />
        </div>
      </div>

      {/* Stats and Status */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                u.status === "active"
                  ? "bg-green-100 text-green-800"
                  : u.status === "banned"
                  ? "bg-red-100 text-red-800"
                  : u.status === "suspended"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mr-1 ${
                  u.status === "active"
                    ? "bg-green-500"
                    : u.status === "banned"
                    ? "bg-red-500"
                    : u.status === "suspended"
                    ? "bg-yellow-500"
                    : "bg-gray-500"
                }`}
              />
              {u.status === "active"
                ? "Active"
                : u.status === "banned"
                ? "Banned"
                : u.status === "suspended"
                ? "Suspended"
                : "Inactive"}
            </span>
          </div>
          <div
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(
              u.role
            )}`}
          >
            {u.role === "owner" && "👑 "}
            {u.role === "admin" && "🛡️ "}
            {u.role === "user" && "👤 "}
            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <FolderIcon className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-semibold">{u.binderCount}</span>
            <span className="text-xs text-gray-500">binders</span>
          </div>
          <div className="flex items-center gap-1">
            <PhotoIcon className="w-3 h-3 text-purple-500" />
            <span className="text-xs font-semibold">{u.cardCount}</span>
            <span className="text-xs text-gray-500">cards</span>
          </div>
        </div>
      </div>

      {/* Activity Info */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>Joined {formatDate(u.createdAt)}</span>
        <span>Active {getTimeAgo(u.lastSeen)}</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <LoadingSpinner
        size="lg"
        message="Loading user management..."
        className="py-24"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Stats Dashboard */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">
              User Management
            </h1>
            <p className="text-indigo-100 text-sm sm:text-base">
              Scalable user management with advanced moderation tools
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalculateStats}
              disabled={recalculatingStats || loading}
              className={`
                flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all border w-full sm:w-auto
                ${
                  recalculatingStats || loading
                    ? "bg-white/10 text-white/50 cursor-not-allowed border-white/20"
                    : "bg-white/20 text-white hover:bg-white/30 border-white/30"
                }
              `}
            >
              {recalculatingStats ? (
                <>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Recalculating...</span>
                </>
              ) : (
                <>
                  <ArrowTrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Recalculate Stats</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
          <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm">
            <div className="text-lg sm:text-2xl font-bold">
              {userStats.total}
            </div>
            <div className="text-xs sm:text-sm opacity-90">Total Users</div>
          </div>
          <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm">
            <div className="text-lg sm:text-2xl font-bold text-green-300">
              {userStats.active}
            </div>
            <div className="text-xs sm:text-sm opacity-90">Active</div>
          </div>
          <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm">
            <div className="text-lg sm:text-2xl font-bold text-red-300">
              {userStats.inactive}
            </div>
            <div className="text-xs sm:text-sm opacity-90">Inactive</div>
          </div>
          <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm col-span-1 sm:col-span-1">
            <div className="text-lg sm:text-2xl font-bold text-purple-300">
              {userStats.admins}
            </div>
            <div className="text-xs sm:text-sm opacity-90">Admins</div>
          </div>
          <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm col-span-2 sm:col-span-1">
            <div className="text-lg sm:text-2xl font-bold text-yellow-300">
              {userStats.lastWeekSignups}
            </div>
            <div className="text-xs sm:text-sm opacity-90">New (7d)</div>
          </div>
        </div>
      </div>

      {/* Main Management Panel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Controls Bar */}
        <div className="border-b border-gray-200 p-4 sm:p-6 bg-gray-50">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                className="pl-10 pr-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full text-sm sm:text-base"
                value={filters.searchTerm}
                onChange={(e) => filters.setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <select
                className="px-2 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                value={filters.filterRole}
                onChange={(e) => filters.setFilterRole(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>

              <select
                className="px-2 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                value={filters.filterStatus}
                onChange={(e) => filters.setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                className="px-2 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm col-span-2 sm:col-span-2"
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  filters.setSortBy(field);
                  filters.setSortOrder(order);
                }}
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="lastSeen-desc">Recently Active</option>
                <option value="displayName-asc">Name A-Z</option>
                <option value="binderCount-desc">Most Binders</option>
              </select>
            </div>

            {/* Mobile Instructions */}
            <div className="md:hidden bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Tap any user card to access management options</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Content */}
        {users.length > 0 ? (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {users.map((u) => (
                <MobileUserCard key={u.uid} user={u} />
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status & Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Collection Stats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Management
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr
                      key={u.uid}
                      className={`hover:bg-gray-50 transition-colors ${
                        activeDropdown === u.uid ? "bg-indigo-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserAvatar user={u} size="lg" />
                          <div className="ml-4">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-gray-900">
                                {u.displayName}
                              </div>
                              {u.uid === currentUser?.uid && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {u.email}
                            </div>
                            {u.customStatus && (
                              <div className="text-xs text-gray-400 italic truncate">
                                {u.customStatus}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 font-mono">
                              ID: {u.uid.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                u.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : u.status === "banned"
                                  ? "bg-red-100 text-red-800"
                                  : u.status === "suspended"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  u.status === "active"
                                    ? "bg-green-500"
                                    : u.status === "banned"
                                    ? "bg-red-500"
                                    : u.status === "suspended"
                                    ? "bg-yellow-500"
                                    : "bg-gray-500"
                                }`}
                              />
                              {u.status === "active"
                                ? "Active"
                                : u.status === "banned"
                                ? "Banned"
                                : u.status === "suspended"
                                ? "Suspended"
                                : "Inactive"}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getRoleColor(
                              u.role
                            )}`}
                          >
                            {u.role === "owner" && "👑 "}
                            {u.role === "admin" && "🛡️ "}
                            {u.role === "user" && "👤 "}
                            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-1 mb-1">
                            <FolderIcon className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold">
                              {u.binderCount}
                            </span>
                            <span className="text-gray-500">binders</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <PhotoIcon className="w-4 h-4 text-purple-500" />
                            <span className="font-semibold">{u.cardCount}</span>
                            <span className="text-gray-500">cards</span>
                          </div>
                          {u.usingStoredStats ? (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Cached Stats
                              </span>
                            </div>
                          ) : (
                            (u.storedBinderCount !== u.binderCount ||
                              u.storedCardCount !== u.cardCount) && (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                  Stats Updated
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">
                              Joined {formatDate(u.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="text-xs">
                              Active {getTimeAgo(u.lastSeen)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-end">
                          {/* Dropdown Toggle - Positioned Relative */}
                          <div className="relative" data-dropdown-container>
                            <button
                              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(
                                  activeDropdown === u.uid ? null : u.uid
                                );
                              }}
                            >
                              <span className="text-xs">Actions</span>
                              <svg
                                className={`w-4 h-4 transition-transform ${
                                  activeDropdown === u.uid ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>

                            {/* Dropdown positioned relative to this button */}
                            <UserActionDropdown userId={u.uid} userData={u} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                    Showing{" "}
                    {(pagination.currentPage - 1) * pagination.usersPerPage + 1}{" "}
                    to{" "}
                    {Math.min(
                      pagination.currentPage * pagination.usersPerPage,
                      pagination.totalUsers
                    )}{" "}
                    of {pagination.totalUsers} users
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() =>
                        pagination.setCurrentPage((prev) =>
                          Math.max(1, prev - 1)
                        )
                      }
                      disabled={pagination.currentPage === 1}
                      className="px-3 py-1.5 sm:py-1 text-xs sm:text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 min-w-[60px] sm:min-w-[auto]"
                    >
                      Previous
                    </button>

                    <div className="flex gap-1">
                      {Array.from(
                        { length: Math.min(5, pagination.totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (
                            pagination.currentPage >=
                            pagination.totalPages - 2
                          ) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => pagination.setCurrentPage(pageNum)}
                              className={`px-2.5 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm border rounded-md min-w-[32px] sm:min-w-[auto] ${
                                pagination.currentPage === pageNum
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "border-gray-300 hover:bg-gray-100"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <button
                      onClick={() =>
                        pagination.setCurrentPage((prev) =>
                          Math.min(pagination.totalPages, prev + 1)
                        )
                      }
                      disabled={
                        pagination.currentPage === pagination.totalPages
                      }
                      className="px-3 py-1.5 sm:py-1 text-xs sm:text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 min-w-[60px] sm:min-w-[auto]"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={UserGroupIcon}
            title="No users found"
            description={
              filters.searchTerm ||
              filters.filterRole !== "all" ||
              filters.filterStatus !== "all"
                ? "Try adjusting your search or filter criteria"
                : "No users have registered yet"
            }
          />
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUserDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  User Details
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 -m-2 touch-manipulation"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* User Profile */}
              <div className="flex items-center gap-4">
                <UserAvatar user={selectedUserDetails} size="xl" />
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedUserDetails.displayName}
                  </h3>
                  <p className="text-gray-600">{selectedUserDetails.email}</p>
                  <p className="text-sm text-gray-400">
                    ID: {selectedUserDetails.uid}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedUserDetails.binderCount}
                  </div>
                  <div className="text-sm text-blue-700">Total Binders</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedUserDetails.cardCount}
                  </div>
                  <div className="text-sm text-purple-700">Total Cards</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {formatDate(selectedUserDetails.createdAt)}
                  </div>
                  <div className="text-sm text-green-700">Member Since</div>
                </div>
              </div>

              {/* User Binders */}
              <UserBindersList
                user={selectedUserDetails}
                onViewBinder={(binder) => {
                  console.log(
                    "Viewing binder:",
                    binder.name,
                    "for user:",
                    selectedUserDetails.email
                  );
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementTable;

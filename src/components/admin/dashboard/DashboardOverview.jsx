import React from "react";
import {
  UserGroupIcon,
  FolderIcon,
  PhotoIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentIcon,
  ServerIcon,
  ClockIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

/**
 * Dashboard overview component showing system statistics and quick actions
 *
 * @param {Object} props - Component props
 * @param {Object} props.systemStats - System statistics object
 * @param {boolean} props.isRefreshing - Whether data is currently being refreshed
 * @param {Function} props.onRefresh - Function to refresh all data
 * @param {Date} props.lastRefresh - Last refresh timestamp
 * @param {Function} props.onTabChange - Function to change active tab
 * @param {Function} props.onSetupBinderLimits - Function to setup binder limits
 * @param {Function} props.onSetupContactLimits - Function to setup contact limits
 * @returns {JSX.Element} Dashboard overview component
 */
const DashboardOverview = ({
  systemStats,
  isRefreshing,
  onRefresh,
  lastRefresh,
  onTabChange,
  onSetupBinderLimits,
  onSetupContactLimits,
}) => {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 lg:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
              Welcome to Admin Panel
            </h1>
            <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
              Manage your Pokemon Binder application with powerful
              administrative tools
            </p>
            {lastRefresh && (
              <p className="text-blue-200 text-xs sm:text-sm mt-2">
                Last refreshed: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:items-end gap-3 sm:gap-4">
            <div className="text-center sm:text-right">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-blue-200 text-sm">System Status: Online</div>
            </div>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="text-sm font-medium">
                {isRefreshing ? "Refreshing..." : "Refresh Data"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-card-background rounded-xl border border-border p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-text-secondary truncate">
                Total Users
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">
                {systemStats.totalUsers}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
            <ArrowTrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-green-600">Active</span>
          </div>
        </div>

        <div className="bg-card-background rounded-xl border border-border p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-text-secondary truncate">
                Total Binders
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">
                {systemStats.totalBinders}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
              <FolderIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
            <ArrowTrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-green-600">Growing</span>
          </div>
        </div>

        <div className="bg-card-background rounded-xl border border-border p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-text-secondary truncate">
                Total Cards
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">
                {systemStats.totalCards}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
              <PhotoIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
            <ArrowTrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-green-600">Collecting</span>
          </div>
        </div>

        <div className="bg-card-background rounded-xl border border-border p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-text-secondary truncate">
                Active Rules
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">
                {systemStats.activeRules}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
              <ShieldCheckIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
            <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-green-600">Protected</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card-background rounded-xl border border-border p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => onTabChange("binder-limits")}
            className="text-left p-3 sm:p-4 border border-border rounded-lg hover:border-blue-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto]"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <DocumentIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-blue-600 leading-tight">
                Manage Binder Limits
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Configure user binder and card limits
            </p>
          </button>

          <button
            onClick={onSetupBinderLimits}
            className="text-left p-3 sm:p-4 border border-border rounded-lg hover:border-green-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto]"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Cog6ToothIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-green-600 leading-tight">
                Setup Default Limits
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Initialize default binder limits (5 binders, 500 cards)
            </p>
          </button>

          <button
            onClick={onSetupContactLimits}
            className="text-left p-3 sm:p-4 border border-border rounded-lg hover:border-orange-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto]"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-orange-600 leading-tight">
                Setup Contact Limits
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Initialize default contact rate limits
            </p>
          </button>

          <button
            onClick={() => onTabChange("system")}
            className="text-left p-3 sm:p-4 border border-border rounded-lg hover:border-purple-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto]"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <ServerIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-purple-600 leading-tight">
                System Settings
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Configure system settings and maintenance
            </p>
          </button>

          <button
            onClick={() => onTabChange("static-binders")}
            className="text-left p-3 sm:p-4 border border-border rounded-lg hover:border-green-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto] sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <GlobeAltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-green-600 leading-tight">
                Generate SEO Binders
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Create static binder pages for search engine optimization
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;

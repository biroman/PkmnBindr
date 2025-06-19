import React from "react";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";

/**
 * AdminBreadcrumbs - Navigation breadcrumb component
 *
 * Features:
 * - Home icon for admin root
 * - Chevron separators
 * - Active/inactive states
 * - Clickable navigation
 */
export const AdminBreadcrumbs = ({ breadcrumbs }) => {
  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {/* Home/Admin Root */}
        <li className="inline-flex items-center">
          <HomeIcon className="w-4 h-4 text-gray-400" />
          <span className="ml-1 text-sm font-medium text-gray-500">Admin</span>
        </li>

        {/* Breadcrumb Items */}
        {breadcrumbs.map((crumb, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-1" />
              {crumb.href ? (
                <button
                  onClick={() => crumb.onClick && crumb.onClick()}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-sm font-medium text-gray-900">
                  {crumb.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default AdminBreadcrumbs;

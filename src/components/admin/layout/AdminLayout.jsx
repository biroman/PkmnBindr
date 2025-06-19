import React from "react";
import { AdminNavigation } from "./AdminNavigation";
import { AdminBreadcrumbs } from "./AdminBreadcrumbs";
import { AdminActionBar } from "./AdminActionBar";

/**
 * AdminLayout - Main layout wrapper for admin pages
 *
 * Features:
 * - Responsive navigation (desktop tabs, mobile menu)
 * - Breadcrumb navigation
 * - Global action bar (refresh, settings)
 * - Consistent spacing and layout
 * - Mobile-first responsive design
 */
export const AdminLayout = ({
  children,
  activeTab,
  onTabChange,
  isMobile,
  mobileMenuOpen,
  onMobileMenuToggle,
  isRefreshing,
  onRefresh,
  lastRefresh,
  breadcrumbs = [],
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Admin Navigation */}
      <AdminNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      {/* Admin Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <AdminBreadcrumbs breadcrumbs={breadcrumbs} />
        )}

        {/* Action Bar */}
        <AdminActionBar
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          lastRefresh={lastRefresh}
          activeTab={activeTab}
        />

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

import React from "react";
import {
  ChartBarIcon,
  UserGroupIcon,
  DocumentIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ServerIcon,
  BellIcon,
  ClockIcon,
  MegaphoneIcon,
  GlobeAltIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

/**
 * Admin navigation component with responsive mobile menu
 *
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab
 * @param {Function} props.onTabChange - Function to change active tab
 * @param {boolean} props.isMobile - Whether current device is mobile
 * @param {boolean} props.mobileMenuOpen - Whether mobile menu is open
 * @param {Function} props.onToggleMobileMenu - Function to toggle mobile menu
 * @returns {JSX.Element} Admin navigation component
 */
const AdminNavigation = ({
  activeTab,
  onTabChange,
  isMobile,
  mobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const tabs = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: ChartBarIcon,
      description: "System overview and metrics",
    },
    {
      id: "binder-limits",
      name: "Binder Limits",
      icon: DocumentIcon,
      description: "Manage user binder and card limits",
    },
    {
      id: "users",
      name: "Users",
      icon: UserGroupIcon,
      description: "User management and permissions",
    },
    {
      id: "system",
      name: "System",
      icon: ServerIcon,
      description: "System settings and maintenance",
    },
    {
      id: "contact",
      name: "Contact Management",
      icon: BellIcon,
      description: "Manage user messages, feature requests, and bug reports",
    },
    {
      id: "contact-limits",
      name: "Contact Limits",
      icon: ClockIcon,
      description: "Configure rate limits for contact features",
    },
    {
      id: "announcements",
      name: "Announcements",
      icon: MegaphoneIcon,
      description: "Manage changelog and user announcements",
    },
    {
      id: "static-binders",
      name: "SEO Binders",
      icon: GlobeAltIcon,
      description: "Generate static binder pages for SEO",
    },
    {
      id: "rules",
      name: "Rules",
      icon: DocumentTextIcon,
      description: "Manage global rules and application limits",
    },
    {
      id: "changelog-cleanup",
      name: "Changelog Cleanup",
      icon: ShieldCheckIcon,
      description: "Clean up bloated changelogs causing storage issues",
    },
  ];

  const handleTabClick = (tabId) => {
    onTabChange(tabId);
    if (isMobile && mobileMenuOpen) {
      onToggleMobileMenu();
    }
  };

  return (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <div className="md:hidden mb-4">
          <div className="flex items-center justify-between bg-card-background rounded-xl p-4 border border-border">
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
            <button
              onClick={onToggleMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              ) : (
                <Bars3Icon className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-4 sm:mb-8">
        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-1 bg-card-background rounded-xl p-1 border border-border overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  flex items-center gap-2 px-3 lg:px-4 py-3 rounded-lg font-medium text-xs lg:text-sm transition-all whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                `}
              >
                <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden lg:inline">{tab.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile Navigation Menu */}
        {isMobile && mobileMenuOpen && (
          <div className="md:hidden bg-card-background rounded-xl border border-border mt-2 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-4 text-left transition-colors
                      ${
                        activeTab === tab.id
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <div>
                      <div className="font-medium">{tab.name}</div>
                      <div className="text-xs text-gray-500">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminNavigation;

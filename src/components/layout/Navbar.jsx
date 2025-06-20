import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth, useOwner } from "../../hooks/useAuth";
import { useRules } from "../../contexts/RulesContext";
import { useBinderContext } from "../../contexts/BinderContext";
import { useNavigation } from "../../hooks/useNavigation";
import { useMessages } from "../../hooks/useMessages";
import { Button } from "../ui/Button";
import UserAvatar from "../ui/UserAvatar";
import StatusEditor from "../ui/StatusEditor";
import useUserProfile from "../../hooks/useUserProfile";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  FolderIcon,
  BookOpenIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  AdjustmentsHorizontalIcon,
  InboxIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  FolderIcon as FolderSolid,
  BookOpenIcon as BookOpenSolid,
  UserCircleIcon as UserCircleSolid,
  Cog6ToothIcon as CogSolid,
  DocumentTextIcon as DocumentSolid,
  InboxIcon as InboxSolid,
  ChartBarIcon as ChartBarSolid,
  ShieldCheckIcon as ShieldCheckSolid,
  QuestionMarkCircleIcon as QuestionMarkCircleSolid,
} from "@heroicons/react/24/solid";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { userProfile, updateUserProfile } = useUserProfile(user);
  const isOwner = useOwner();
  const { isOwner: isRulesOwner } = useRules();
  const { currentBinder } = useBinderContext();
  const location = useLocation();
  const { isMobileMenuOpen, isScrolled, toggleMobileMenu, closeMobileMenu } =
    useNavigation();
  const { unreadCount } = useMessages();

  // User dropdown state
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setIsUserDropdownOpen(false);
    await logout();
  };

  const handleStatusUpdate = (newStatus) => {
    // Update the local user profile state
    if (userProfile) {
      updateUserProfile({ customStatus: newStatus });
    }
  };

  const isActive = (path) => location.pathname === path;
  const isPathActive = (path) => location.pathname.startsWith(path);

  // Navigation items configuration - logical order for better UX
  const userNavItems = user
    ? [
        {
          name: "Home",
          href: "/home",
          icon: HomeIcon,
          solidIcon: HomeSolid,
          active: isActive("/home"),
        },
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: ChartBarIcon,
          solidIcon: ChartBarSolid,
          active: isActive("/dashboard"),
        },
        {
          name: "Binders",
          href: "/binders",
          icon: FolderIcon,
          solidIcon: FolderSolid,
          active: isPathActive("/binders") && !isPathActive("/binder/"),
        },
      ]
    : [];

  const publicNavItems = !user
    ? [
        {
          name: "Binders",
          href: "/binders",
          icon: FolderIcon,
          solidIcon: FolderSolid,
          active: isPathActive("/binders") && !isPathActive("/binder/"),
        },
        {
          name: "Blog",
          href: "/blog",
          icon: BookOpenIcon,
          solidIcon: BookOpenSolid,
          active: isActive("/blog"),
        },
        {
          name: "FAQ",
          href: "/faq",
          icon: QuestionMarkCircleIcon,
          solidIcon: QuestionMarkCircleSolid,
          active: isActive("/faq"),
        },
      ]
    : [];

  const adminNavItems = [];
  if (isOwner) {
    adminNavItems.push({
      name: "Admin",
      href: "/admin",
      icon: ShieldCheckIcon,
      solidIcon: ShieldCheckSolid,
      active: isActive("/admin") || isActive("/rules"), // Also active when on rules page
      isAdmin: true,
    });
  }

  const allNavItems = [...userNavItems, ...publicNavItems, ...adminNavItems];

  const NavItem = ({ item, mobile = false }) => {
    const IconComponent = item.active ? item.solidIcon : item.icon;

    if (mobile) {
      // Mobile styling - more touch-friendly
      let mobileClasses;
      if (item.isAdmin) {
        mobileClasses = item.active
          ? "flex items-center px-4 py-3 text-base font-medium rounded-xl bg-amber-50 text-amber-800 border-l-4 border-amber-500"
          : "flex items-center px-4 py-3 text-base font-medium rounded-xl text-amber-700 hover:bg-amber-50 hover:text-amber-800";
      } else {
        mobileClasses = item.active
          ? "flex items-center px-4 py-3 text-base font-medium rounded-xl bg-blue-50 text-blue-700 border-l-4 border-blue-600"
          : "flex items-center px-4 py-3 text-base font-medium rounded-xl text-gray-700 hover:bg-gray-50 hover:text-gray-900";
      }

      return (
        <Link
          to={item.href}
          className={`${mobileClasses} transition-all duration-200 relative`}
          onClick={closeMobileMenu}
        >
          <div className="relative">
            <IconComponent className="w-6 h-6 mr-4" />
          </div>
          <span className="truncate">{item.name}</span>
          {item.isAdmin && (
            <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
              Admin
            </span>
          )}
        </Link>
      );
    }

    // Desktop styling - clean and modern
    let desktopClasses;
    if (item.isAdmin) {
      desktopClasses = item.active
        ? "flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white shadow-sm"
        : "flex items-center px-4 py-2 text-sm font-medium rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50";
    } else {
      desktopClasses = item.active
        ? "flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white shadow-sm"
        : "flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50";
    }

    return (
      <Link
        to={item.href}
        className={`${desktopClasses} transition-all duration-200 relative group`}
      >
        <div className="relative">
          <IconComponent className="w-5 h-5 mr-2" />
        </div>
        <span className="truncate">{item.name}</span>
        {item.isAdmin && !item.active && (
          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            Admin
          </span>
        )}
      </Link>
    );
  };

  const UserSection = ({ mobile = false }) => {
    if (!user) {
      return (
        <div
          className={`flex ${
            mobile ? "flex-col space-y-3" : "items-center space-x-3"
          }`}
        >
          <Link to="/auth/login">
            <Button
              variant="ghost"
              size={mobile ? "default" : "sm"}
              className={mobile ? "w-full justify-center" : ""}
            >
              Sign In
            </Button>
          </Link>
          <Link to="/auth/register">
            <Button
              size={mobile ? "default" : "sm"}
              className={`bg-blue-600 hover:bg-blue-700 ${
                mobile ? "w-full justify-center" : ""
              }`}
            >
              Sign Up
            </Button>
          </Link>
        </div>
      );
    }

    if (mobile) {
      // Mobile version - simple layout without dropdown
      return (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center px-4 py-3 bg-gray-50 rounded-lg">
            <UserAvatar
              user={userProfile || user}
              size="sm"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0 ml-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile?.displayName || user?.displayName || user?.email}
              </p>
              {isOwner && (
                <p className="text-xs text-yellow-600 font-medium">Owner</p>
              )}
            </div>
          </div>

          {/* Mobile menu items */}
          <div className="space-y-2">
            <Link
              to="/profile"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <UserIcon className="w-4 h-4 mr-3" />
              View Profile
            </Link>
            <Link
              to="/settings"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-3" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    // Desktop version with dropdown
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UserAvatar
            user={userProfile || user}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-900 truncate max-w-32">
              {userProfile?.displayName || user?.displayName || user?.email}
            </p>
            {isOwner && (
              <p className="text-xs text-yellow-600 font-medium">Owner</p>
            )}
          </div>
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isUserDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isUserDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile?.displayName || user?.displayName || user?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              {userProfile?.customStatus && (
                <p className="text-xs text-gray-600 mt-1 italic truncate">
                  {userProfile.customStatus}
                </p>
              )}
              {isOwner && (
                <p className="text-xs text-yellow-600 font-medium mt-1">
                  Owner
                </p>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1 border-t border-gray-100">
              <Link
                to="/profile"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsUserDropdownOpen(false)}
              >
                <UserIcon className="w-4 h-4 mr-3" />
                View Profile
              </Link>

              <Link
                to="/settings"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsUserDropdownOpen(false)}
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4 mr-3" />
                Settings
              </Link>

              <div className="border-t border-gray-100 my-1"></div>

              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <nav
        data-navbar
        className={`bg-white border-b sticky top-0 z-50 transition-all duration-200 ${
          isScrolled ? "shadow-md border-gray-300" : "shadow-sm border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link
                to={user ? "/home" : "/"}
                className="flex items-center space-x-2 text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <img src="/logo.png" alt="PkmnBindr" className="w-20 h-15" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {allNavItems.map((item, index) => (
                <NavItem key={`${item.name}-${index}`} item={item} />
              ))}
            </div>

            {/* Desktop User Section */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Messages Icon - Always visible for logged in users */}
              {user && (
                <Link
                  to="/messages"
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
                  title="Messages"
                >
                  <InboxIcon className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium text-[10px]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              <UserSection />
              {/* Buy me a coffee button */}
              <a
                href="https://buymeacoffee.com/biroman"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute left-0 flex items-center px-3 py-2 text-sm font-medium text-black hover:bg-yellow-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: "#FFDD00",
                  color: "#000000",
                  fontWeight: "600",
                  boxShadow: "0 4px 6px -2px rgba(0, 0, 0, 0.1)",
                }}
              >
                <span className="mr-2">☕</span>
                <span>Buy me a coffee?</span>
              </a>
            </div>

            {/* Mobile menu button and messages */}
            <div className="md:hidden flex items-center space-x-2">
              {/* Messages Icon for Mobile */}
              {user && (
                <Link
                  to="/messages"
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
                  title="Messages"
                >
                  <InboxIcon className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium text-[10px]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={`md:hidden bg-white border-t border-gray-200 shadow-lg transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 py-6">
            {/* Navigation Items */}
            <div className="space-y-2 mb-6">
              {allNavItems.map((item, index) => (
                <div
                  key={`mobile-${item.name}-${index}`}
                  className={`transform transition-all duration-300 ease-out ${
                    isMobileMenuOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <NavItem item={item} mobile />
                </div>
              ))}
            </div>

            {/* User Section */}
            <div
              className={`pt-6 border-t border-gray-200 transform transition-all duration-300 ease-out ${
                isMobileMenuOpen
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0"
              }`}
              style={{ transitionDelay: `${allNavItems.length * 50}ms` }}
            >
              <UserSection mobile />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;

import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth, useOwner } from "../../hooks/useAuth";
import { useRules } from "../../contexts/RulesContext";
import { useBinderContext } from "../../contexts/BinderContext";
import { useNavigation } from "../../hooks/useNavigation";
import { useMessages } from "../../hooks/useMessages";
import ThemeToggle from "../ui/ThemeToggle";
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
import MobileSyncButtons from "../sync/SyncButtons";
import RevertConfirmationModal from "../binder/RevertConfirmationModal";
import { toast } from "react-hot-toast";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { userProfile, updateUserProfile } = useUserProfile(user);
  const isOwner = useOwner();
  const { isOwner: isRulesOwner } = useRules();
  const { currentBinder, downloadBinderFromCloud } = useBinderContext();
  const location = useLocation();
  const { isMobileMenuOpen, isScrolled, toggleMobileMenu, closeMobileMenu } =
    useNavigation();
  const { unreadCount } = useMessages();

  // User dropdown state
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Revert modal state
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

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

  // Check if we're on a binder page (mobile)
  const isOnBinderPage =
    location.pathname.startsWith("/binder/") &&
    location.pathname !== "/binders";

  // Use a responsive check that's updated on screen size change
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const shouldShowMobileSyncButtons =
    isOnBinderPage && currentBinder && isMobile;

  // Handle revert confirmation
  const handleConfirmRevert = async () => {
    if (!currentBinder?.id) {
      toast.error("No binder ID found");
      return;
    }

    if (isReverting) {
      return;
    }

    setIsReverting(true);
    setShowRevertModal(false);

    try {
      const result = await downloadBinderFromCloud(currentBinder.id);

      if (result?.success) {
        toast.success("Successfully reverted to last saved version");
      } else {
        toast.success("Reverted to last saved version");
      }
    } catch (error) {
      console.error("Revert failed:", error);

      if (error.message?.includes("not found")) {
        toast.error("Cloud save not found. The binder may have been deleted.");
      } else if (error.message?.includes("permission")) {
        toast.error(
          "Permission denied. You may not have access to this binder."
        );
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("offline")
      ) {
        toast.error(
          "Network error. Please check your connection and try again."
        );
      } else {
        toast.error("Failed to revert: " + (error.message || "Unknown error"));
      }
    } finally {
      setIsReverting(false);
    }
  };

  // Navigation items configuration - logical order for better UX
  const userNavItems = user
    ? [
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
          ? "flex items-center px-4 py-3 text-base font-medium rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-l-4 border-amber-500 dark:border-amber-400"
          : "flex items-center px-4 py-3 text-base font-medium rounded-xl text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-800 dark:hover:text-amber-200";
      } else {
        mobileClasses = item.active
          ? "flex items-center px-4 py-3 text-base font-medium rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 dark:border-blue-400"
          : "flex items-center px-4 py-3 text-base font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white";
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
        : "flex items-center px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent";
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
          <div className="flex items-center px-4 py-3 bg-secondary rounded-lg">
            <UserAvatar
              user={userProfile || user}
              size="sm"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0 ml-3">
              <p className="text-sm font-medium text-text-primary truncate">
                {userProfile?.displayName || user?.displayName || user?.email}
              </p>
              {isOwner && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                  Owner
                </p>
              )}
            </div>
          </div>

          {/* Mobile menu items */}
          <div className="space-y-2">
            <Link
              to="/profile"
              className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-accent rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <UserIcon className="w-4 h-4 mr-3" />
              View Profile
            </Link>
            <Link
              to="/settings"
              className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-accent rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-3" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors text-left"
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
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UserAvatar
            user={userProfile || user}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-text-primary truncate max-w-32">
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
          <div className="absolute right-0 mt-2 w-56 bg-card-background rounded-lg shadow-lg border border-border py-1 z-50">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-text-primary truncate">
                {userProfile?.displayName || user?.displayName || user?.email}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {user?.email}
              </p>
              {userProfile?.customStatus && (
                <p className="text-xs text-text-secondary mt-1 italic truncate">
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
            <div className="py-1 border-t border-border">
              <Link
                to="/profile"
                className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-accent transition-colors"
                onClick={() => setIsUserDropdownOpen(false)}
              >
                <UserIcon className="w-4 h-4 mr-3" />
                View Profile
              </Link>

              <Link
                to="/settings"
                className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-accent transition-colors"
                onClick={() => setIsUserDropdownOpen(false)}
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4 mr-3" />
                Settings
              </Link>

              <div className="border-t border-border my-1"></div>

              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-left"
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
        className={`bg-card-background border-b sticky top-0 z-50 transition-all duration-200 ${
          isScrolled ? "shadow-md border-border" : "shadow-sm border-border"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link
                to={user ? "/dashboard" : "/"}
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
                  className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-accent rounded-lg transition-all duration-200"
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
              {/* Language toggle moved to AddCardModal header */}
              <ThemeToggle />
            </div>

            {/* Mobile menu button, sync buttons, and messages */}
            <div className="md:hidden flex items-center space-x-2">
              {/* Mobile Sync Buttons - Only show when on binder page with unsaved changes */}
              {shouldShowMobileSyncButtons && (
                <MobileSyncButtons
                  binder={currentBinder}
                  onShowRevertModal={() => setShowRevertModal(true)}
                  isReverting={isReverting}
                />
              )}

              {/* Messages Icon for Mobile */}
              {user && (
                <Link
                  to="/messages"
                  className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-accent rounded-lg transition-all duration-200"
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
                onTouchEnd={(e) => {
                  e.preventDefault();
                  toggleMobileMenu(e);
                }}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-accent transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation select-none"
                aria-label="Toggle navigation menu"
                data-mobile-menu-toggle
                type="button"
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
          className={`md:hidden bg-card-background border-t border-border shadow-lg transition-all duration-300 ease-in-out overflow-hidden ${
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
              className={`pt-6 border-t border-border transform transition-all duration-300 ease-out ${
                isMobileMenuOpen
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0"
              }`}
              style={{ transitionDelay: `${allNavItems.length * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-text-primary">
                  Theme
                </span>
                <ThemeToggle />
              </div>
              <UserSection mobile />
            </div>
          </div>
        </div>
      </nav>

      {/* Revert Confirmation Modal */}
      {shouldShowMobileSyncButtons && (
        <RevertConfirmationModal
          isOpen={showRevertModal}
          onClose={() => setShowRevertModal(false)}
          onConfirm={handleConfirmRevert}
          binderName={currentBinder?.metadata?.name || "Unnamed Binder"}
          isLoading={isReverting}
        />
      )}
    </>
  );
};

export default Navbar;

import { Link, useLocation } from "react-router-dom";
import { useAuth, useOwner } from "../../hooks/useAuth";
import { useRules } from "../../contexts/RulesContext";
import { useBinderContext } from "../../contexts/BinderContext";
import { useNavigation } from "../../hooks/useNavigation";
import { Button } from "../ui/Button";
import LogoutButton from "../auth/LogoutButton";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  FolderIcon,
  BookOpenIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  FolderIcon as FolderSolid,
  BookOpenIcon as BookOpenSolid,
  UserCircleIcon as UserCircleSolid,
  Cog6ToothIcon as CogSolid,
  DocumentTextIcon as DocumentSolid,
} from "@heroicons/react/24/solid";

const Navbar = () => {
  const { user } = useAuth();
  const isOwner = useOwner();
  const { isOwner: isRulesOwner } = useRules();
  const { currentBinder } = useBinderContext();
  const location = useLocation();
  const { isMobileMenuOpen, isScrolled, toggleMobileMenu, closeMobileMenu } =
    useNavigation();

  const isActive = (path) => location.pathname === path;
  const isPathActive = (path) => location.pathname.startsWith(path);

  // Navigation items configuration
  const publicNavItems = [
    {
      name: "Binders",
      href: "/binders",
      icon: FolderIcon,
      solidIcon: FolderSolid,
      active: isPathActive("/binders") && !isPathActive("/binder/"),
      prominent: true, // Make this button stand out
    },
  ];

  const userNavItems = user
    ? [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: HomeIcon,
          solidIcon: HomeSolid,
          active: isActive("/dashboard"),
        },
        {
          name: "Profile",
          href: "/profile",
          icon: UserCircleIcon,
          solidIcon: UserCircleSolid,
          active: isActive("/profile"),
        },
      ]
    : [];

  const adminNavItems = [];
  if (isOwner) {
    adminNavItems.push({
      name: "Admin",
      href: "/admin",
      icon: Cog6ToothIcon,
      solidIcon: CogSolid,
      active: isActive("/admin"),
      badge: "⚡",
    });
  }
  if (isRulesOwner) {
    adminNavItems.push({
      name: "Rules",
      href: "/rules",
      icon: DocumentTextIcon,
      solidIcon: DocumentSolid,
      active: isActive("/rules"),
    });
  }

  const allNavItems = [...publicNavItems, ...userNavItems, ...adminNavItems];

  const NavItem = ({ item, mobile = false }) => {
    const IconComponent = item.active ? item.solidIcon : item.icon;
    const baseClasses = mobile
      ? "flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200"
      : "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200";

    // Special styling for prominent items (like Binders)
    if (item.prominent) {
      const prominentClasses = item.active
        ? "bg-blue-600 text-white shadow-md border border-blue-700"
        : "bg-blue-600 text-white hover:bg-blue-700 shadow-md";

      return (
        <Link
          to={item.href}
          className={`${baseClasses} ${prominentClasses}`}
          onClick={() => mobile && closeMobileMenu()}
        >
          <IconComponent className={mobile ? "w-6 h-6 mr-3" : "w-5 h-5 mr-2"} />
          <span className="truncate">{item.name}</span>
          {item.badge && <span className="ml-2 text-xs">{item.badge}</span>}
        </Link>
      );
    }

    const activeClasses = item.active
      ? "bg-blue-50 text-blue-700 border border-blue-200"
      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50";

    return (
      <Link
        to={item.href}
        className={`${baseClasses} ${activeClasses}`}
        onClick={() => mobile && closeMobileMenu()}
      >
        <IconComponent className={mobile ? "w-6 h-6 mr-3" : "w-5 h-5 mr-2"} />
        <span className="truncate">{item.name}</span>
        {item.badge && <span className="ml-2 text-xs">{item.badge}</span>}
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

    return (
      <div
        className={`flex ${
          mobile ? "flex-col space-y-4" : "items-center space-x-4"
        }`}
      >
        <div
          className={`flex items-center ${
            mobile ? "px-4 py-3 bg-gray-50 rounded-lg" : "space-x-3"
          }`}
        >
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : user.email.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className={mobile ? "flex-1 min-w-0" : "hidden md:block"}>
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.displayName || user.email}
            </p>
            {isOwner && (
              <p className="text-xs text-yellow-600 font-medium">Owner</p>
            )}
          </div>
        </div>
        <LogoutButton
          className={`text-sm ${mobile ? "w-full justify-center" : ""}`}
          variant={mobile ? "outline" : "ghost"}
        />
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
                to="/binders"
                className="flex items-center space-x-2 text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <img src="/logo.png" alt="PokemonBindr" className="w-20 h-15" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {allNavItems.map((item, index) => (
                <NavItem key={`${item.name}-${index}`} item={item} />
              ))}
            </div>

            {/* Desktop User Section */}
            <div className="hidden md:flex items-center">
              <UserSection />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
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
          <div className="px-4 py-6 space-y-1">
            {/* Navigation Items */}
            <div className="space-y-1 mb-6">
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

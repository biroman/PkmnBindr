import { Link, useLocation } from "react-router-dom";
import { useAuth, useOwner } from "../../hooks/useAuth";
import { useRules } from "../../contexts/RulesContext";
import { useBinderContext } from "../../contexts/BinderContext";
import { Button } from "../ui/Button";

const Navbar = () => {
  const { user, logout } = useAuth();
  const isOwner = useOwner();
  const { isOwner: isRulesOwner } = useRules();
  const { currentBinder } = useBinderContext();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              PokemonBindr
            </Link>

            {/* Public Links */}
            <div className="hidden md:flex space-x-4">
              <Link
                to="/binders"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive("/binders")
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                📁 Binders
              </Link>
              <Link
                to={currentBinder ? `/binder/${currentBinder.id}` : "/binders"}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith("/binder")
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🎴 {currentBinder ? currentBinder.metadata.name : "Binder"}
              </Link>
            </div>

            {user && (
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/dashboard")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/profile")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Profile
                </Link>
                {isOwner && (
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive("/admin")
                        ? "bg-yellow-100 text-yellow-700"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Admin
                  </Link>
                )}
                {isRulesOwner && (
                  <Link
                    to="/rules"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive("/rules")
                        ? "bg-green-100 text-green-700"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Rules
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-700">
                    Welcome, {user.displayName || user.email}
                  </span>
                  {isOwner && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Owner
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="text-sm"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth/login">
                  <Button variant="ghost" className="text-sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button className="text-sm bg-blue-600 hover:bg-blue-700">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to PokemonAPI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Your ultimate destination for Pokemon data management and
            exploration. Build, explore, and manage your Pokemon collection with
            our powerful tools.
          </p>

          {user ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                Welcome back,{" "}
                <span className="font-semibold">
                  {user.displayName || user.email}
                </span>
                !
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/dashboard">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="outline" size="lg">
                    View Profile
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Get Started
                </Button>
              </Link>
              <Link to="/auth/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-blue-600 text-3xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Secure Authentication
            </h3>
            <p className="text-gray-600">
              Advanced Firebase authentication with email/password, password
              reset, and secure user management.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-blue-600 text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Fast & Modern
            </h3>
            <p className="text-gray-600">
              Built with React, Vite, and Tailwind CSS for lightning-fast
              performance and beautiful UI.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-blue-600 text-3xl mb-4">🛡️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Protected Routes
            </h3>
            <p className="text-gray-600">
              Role-based access control with protected routes and admin
              privileges for enhanced security.
            </p>
          </div>
        </div>

        {!user && (
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to start?
            </h2>
            <p className="text-gray-600 mb-6">
              Join thousands of trainers managing their Pokemon collections with
              our platform.
            </p>
            <Link to="/auth/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Create Your Account
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;

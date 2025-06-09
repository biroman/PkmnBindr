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
            Welcome to PokemonBindr
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

        {/* Feature Highlight - Binder */}
        <div className="mt-16">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-xl p-8 text-center text-white">
            <div className="text-6xl mb-4">🎴</div>
            <h2 className="text-3xl font-bold mb-4">Pokemon Card Binder</h2>
            <p className="text-xl mb-6 opacity-90">
              Organize your Pokemon card collection in beautiful digital
              binders. Works offline and syncs with your account when signed in!
            </p>
            <Link to="/binders">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                🔍 Explore Binders
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-green-600 text-3xl mb-4">🎴</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Pokemon Card Binder
            </h3>
            <p className="text-gray-600">
              Create and organize digital binders for your Pokemon card
              collection. Works locally and syncs when you're signed in.
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
              Secure & Reliable
            </h3>
            <p className="text-gray-600">
              Your data is safe with Firebase security and works offline. Sign
              in to sync across all your devices.
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

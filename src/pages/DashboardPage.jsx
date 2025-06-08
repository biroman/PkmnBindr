import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useOwner } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";

const DashboardPage = () => {
  const { user } = useAuth();
  const isOwner = useOwner();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.displayName || user?.email}!
          </p>
        </div>

        {isOwner && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <div className="text-yellow-600 text-2xl mr-3">👑</div>
              <div>
                <h2 className="text-lg font-semibold text-yellow-800">
                  Owner Access
                </h2>
                <p className="text-yellow-700">
                  You have administrative privileges for this application.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/admin">
                <Button
                  variant="outline"
                  className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
                >
                  Go to Admin Panel
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-blue-600 text-2xl mr-3">📱</div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Pokemon Collection
                </h3>
                <p className="text-gray-600 text-sm">Manage your Pokemon</p>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                View Collection
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-green-600 text-2xl mr-3">⚡</div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  API Explorer
                </h3>
                <p className="text-gray-600 text-sm">Explore Pokemon data</p>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                Explore API
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-purple-600 text-2xl mr-3">👤</div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                <p className="text-gray-600 text-sm">Manage your account</p>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/profile">
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-gray-600">Pokemon Caught</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-gray-600">API Calls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-gray-600">Collections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">0</div>
              <div className="text-gray-600">Favorites</div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            🚀 Ready to Build Your Pokemon Features?
          </h2>
          <p className="text-blue-700 mb-4">
            Your authentication system is complete! Now you can start building
            your Pokemon API features with secure user management.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-blue-800">✅ What's Ready:</h3>
              <ul className="text-blue-700 mt-1 space-y-1">
                <li>• User Authentication (Login/Register)</li>
                <li>• Protected Routes</li>
                <li>• Password Reset</li>
                <li>• Owner Role System</li>
                <li>• React Hook Form Integration</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800">🔧 Next Steps:</h3>
              <ul className="text-blue-700 mt-1 space-y-1">
                <li>• Add Pokemon API integration</li>
                <li>• Build collection features</li>
                <li>• Implement search functionality</li>
                <li>• Add data visualization</li>
                <li>• Create admin dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

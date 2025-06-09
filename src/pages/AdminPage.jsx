import { Navigate } from "react-router-dom";
import { useAuth, useOwner } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import RulesExample from "../components/examples/RulesExample";
import BinderLimitsManager from "../components/admin/BinderLimitsManager";
import { setupOwnerRole } from "../scripts/setupOwner";
import { setupDefaultBinderLimits } from "../scripts/setupDefaultBinderLimits";

const AdminPage = () => {
  const { user } = useAuth();
  const isOwner = useOwner();

  const handleSetupOwnerRole = async () => {
    if (user?.uid) {
      const success = await setupOwnerRole(user.uid);
      if (success) {
        alert(
          "✅ Owner role setup complete! You can now access the rules system."
        );
        window.location.reload(); // Refresh to update permissions
      } else {
        alert("❌ Failed to setup owner role. Check console for details.");
      }
    }
  };

  const handleSetupBinderLimits = async () => {
    if (user?.uid) {
      const result = await setupDefaultBinderLimits(user.uid);
      if (result.success) {
        alert(
          `✅ ${result.message}\n\n` +
            `Max Binders: ${result.limits?.maxBinders || 5}\n` +
            `Max Cards per Binder: ${
              result.limits?.maxCardsPerBinder || 500
            }\n` +
            `Max Pages per Binder: ${result.limits?.maxPagesPerBinder || 50}`
        );
      } else {
        alert(`❌ ${result.message}\n\nCheck console for details.`);
      }
    }
  };

  const copyUserId = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      alert("User ID copied to clipboard!");
    }
  };

  if (!isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">
            Administrative tools and system management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              📁 Binder Limits
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Configure user binder and card limits
            </p>
            <p className="text-green-600 text-sm font-medium">
              ✅ Active Management
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              👥 User Management
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Manage users and permissions
            </p>
            <Button variant="outline" className="w-full">
              Manage Users (Coming Soon)
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              📊 System Stats
            </h3>
            <p className="text-gray-600 text-sm mb-4">View system analytics</p>
            <Button variant="outline" className="w-full">
              View Stats (Coming Soon)
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              🔧 API Management
            </h3>
            <p className="text-gray-600 text-sm mb-4">Configure API settings</p>
            <Button variant="outline" className="w-full">
              API Settings (Coming Soon)
            </Button>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            👑 Owner Access Confirmed
          </h2>
          <p className="text-yellow-700 mb-4">
            You have full administrative access to this application. Admin
            features will be built as needed for your Pokemon API project.
          </p>

          {/* User ID and Setup Tools */}
          <div className="bg-white rounded-lg p-4 border border-yellow-300">
            <h3 className="font-medium text-gray-900 mb-3">🔧 Setup Tools</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Your User ID:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                  {user?.uid || "Not available"}
                </code>
                <Button size="sm" variant="outline" onClick={copyUserId}>
                  Copy ID
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSetupOwnerRole}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  🚀 Setup Owner Role
                </Button>

                <Button
                  onClick={handleSetupBinderLimits}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  📁 Setup Binder Limits
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                ⚡ If you're getting permission errors with the rules system,
                click "Setup Owner Role" once to fix it.
              </p>
              <p className="text-xs text-gray-500">
                📁 Click "Setup Binder Limits" to initialize default limits (5
                binders, 500 cards per binder).
              </p>
            </div>
          </div>
        </div>

        {/* Binder Limits Management */}
        <div className="mt-8">
          <BinderLimitsManager />
        </div>

        {/* Rules System Demo */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <RulesExample />
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {user?.displayName || "Not set"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 text-sm text-gray-900">{user?.email}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Verified
              </label>
              <div className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    user?.emailVerified
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {user?.emailVerified ? "Verified" : "Not Verified"}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t">
              <Button variant="outline">Edit Profile (Coming Soon)</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

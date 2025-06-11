import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Button } from "../ui/Button";
import { fetchUserBindersAsAdmin } from "../../utils/userManagement";
import {
  DocumentTextIcon,
  EyeIcon,
  CalendarIcon,
  Squares2X2Icon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

const UserBindersList = ({ user, onViewBinder }) => {
  const [binders, setBinders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user's binders
  useEffect(() => {
    const loadBinders = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);
        setError(null);

        console.log(`Loading binders for user: ${user.email}`);
        const userBinders = await fetchUserBindersAsAdmin(user.uid);

        setBinders(userBinders);

        if (userBinders.length === 0) {
          console.log(`No binders found for user: ${user.email}`);
        } else {
          console.log(
            `Loaded ${userBinders.length} binders for user: ${user.email}`
          );
        }
      } catch (err) {
        console.error("Error loading user binders:", err);
        setError(err.message);
        toast.error(`Failed to load binders: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadBinders();
  }, [user?.uid, user?.email]);

  const handleViewBinder = (binder) => {
    // Open binder in new tab
    const url = `/admin/binder/${user.uid}/${binder.id}/${binder.source}`;
    window.open(url, "_blank");

    // Also call the callback if provided
    if (onViewBinder) {
      onViewBinder(binder);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid Date";
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case "user_binders":
        return "🌟"; // Modern
      case "binders":
        return "📂"; // Global
      case "legacy":
        return "📜"; // Legacy
      default:
        return "📄";
    }
  };

  const getSourceLabel = (source) => {
    switch (source) {
      case "user_binders":
        return "Synced";
      case "binders":
        return "Global";
      case "legacy":
        return "Legacy";
      default:
        return "Unknown";
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <DocumentTextIcon className="w-6 h-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">User Binders</h3>
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <DocumentTextIcon className="w-6 h-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">User Binders</h3>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">Error loading binders</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">User Binders</h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {binders.length} total
          </span>
        </div>
      </div>

      {binders.length === 0 ? (
        <div className="text-center py-8">
          <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-gray-900 font-medium mb-2">No Binders Found</h4>
          <p className="text-gray-500 text-sm">
            This user hasn't created any binders yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {binders.map((binder) => (
            <div
              key={`${binder.source}-${binder.id}`}
              className={`bg-white rounded-lg border transition-all hover:shadow-md ${
                binder.isArchived
                  ? "border-gray-300 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getSourceIcon(binder.source)}
                        </span>
                        <h4
                          className={`font-semibold truncate ${
                            binder.isArchived
                              ? "text-gray-500"
                              : "text-gray-900"
                          }`}
                        >
                          {binder.name}
                        </h4>
                        {binder.isArchived && (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                            <ArchiveBoxIcon className="w-3 h-3" />
                            Archived
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <DocumentTextIcon className="w-4 h-4" />
                        <span>{binder.cardCount} cards</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Squares2X2Icon className="w-4 h-4" />
                        <span>{binder.gridSize}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {formatDate(binder.lastModified || binder.createdAt)}
                        </span>
                      </div>

                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                        {getSourceLabel(binder.source)}
                      </span>
                    </div>

                    {binder.description && (
                      <p className="text-sm text-gray-600 mt-2 truncate">
                        {binder.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => handleViewBinder(binder)}
                      size="sm"
                      variant="outline"
                      className="whitespace-nowrap"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      View Binder
                      <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {binders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>Total: {binders.length} binders</span>
              <span>
                Cards: {binders.reduce((sum, b) => sum + b.cardCount, 0)}
              </span>
              <span>
                Archived: {binders.filter((b) => b.isArchived).length}
              </span>
            </div>
            <div className="text-xs">🌟 Synced • 📂 Global • 📜 Legacy</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBindersList;

import { Link } from "react-router-dom";
import { useAuth, useOwner } from "../hooks/useAuth";
import { useBinderContext } from "../contexts/BinderContext";
import { Button } from "../components/ui/Button";
import { useMemo } from "react";
import {
  PlusIcon,
  FolderIcon,
  PhotoIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  ComputerDesktopIcon,
  EyeIcon,
  ChartBarIcon,
  ShareIcon,
  TrophyIcon,
  SparklesIcon,
  ClockIcon,
  CogIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import AnnouncementWidget from "../components/AnnouncementWidget";
import RequestCenter from "../components/RequestCenter";

const DashboardPage = () => {
  const { user } = useAuth();
  const isOwner = useOwner();
  const {
    binders,
    currentBinder,
    createBinder,
    isLocalOnlyBinder,
    isOwnedByCurrentUser,
  } = useBinderContext();

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    if (!binders || binders.length === 0) {
      return {
        total: 0,
        synced: 0,
        localOnly: 0,
        guest: 0,
        totalCards: 0,
        recentlyModified: 0,
        largestBinder: { name: "None", cardCount: 0 },
        oldestBinder: null,
        newestBinder: null,
      };
    }

    const total = binders.length;
    const synced = binders.filter(
      (b) => !isLocalOnlyBinder(b) && isOwnedByCurrentUser(b)
    ).length;
    const localOnly = binders.filter(
      (b) => isLocalOnlyBinder(b) && b.ownerId !== "local_user"
    ).length;
    const guest = binders.filter((b) => b.ownerId === "local_user").length;
    const totalCards = binders.reduce(
      (sum, b) => sum + Object.keys(b.cards || {}).length,
      0
    );

    // Recently modified (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentlyModified = binders.filter(
      (b) => new Date(b.lastModified || 0) > weekAgo
    ).length;

    // Find largest binder
    const bindersByCards = binders
      .map((b) => ({
        name: b.metadata?.name || "Unnamed",
        cardCount: Object.keys(b.cards || {}).length,
      }))
      .sort((a, b) => b.cardCount - a.cardCount);
    const largestBinder = bindersByCards[0] || { name: "None", cardCount: 0 };

    // Find oldest and newest binders
    const sortedByDate = [...binders].sort(
      (a, b) =>
        new Date(a.metadata?.createdAt || 0) -
        new Date(b.metadata?.createdAt || 0)
    );
    const oldestBinder = sortedByDate[0];
    const newestBinder = sortedByDate[sortedByDate.length - 1];

    return {
      total,
      synced,
      localOnly,
      guest,
      totalCards,
      recentlyModified,
      largestBinder,
      oldestBinder,
      newestBinder,
    };
  }, [binders, isLocalOnlyBinder, isOwnedByCurrentUser]);

  // Get recent binders (last 5 modified)
  const recentBinders = useMemo(() => {
    return [...binders]
      .sort(
        (a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0)
      )
      .slice(0, 5);
  }, [binders]);

  const handleQuickCreateBinder = async () => {
    try {
      const name = `Binder ${stats.total + 1}`;
      await createBinder(name, "");
    } catch (error) {
      // Error handled by context
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back,{" "}
                {user?.displayName?.split(" ")[0] || user?.email?.split("@")[0]}
                ! Here's what's happening with your collection.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/binders">
                <Button variant="outline">
                  <FolderIcon className="w-4 h-4 mr-2" />
                  All Binders
                </Button>
              </Link>
              <Button
                onClick={handleQuickCreateBinder}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Quick Create
              </Button>
            </div>
          </div>
        </div>

        {/* Owner Access Banner */}
        {isOwner && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                  <CogIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-yellow-900">
                    Administrator Access
                  </h2>
                  <p className="text-yellow-700 text-sm">
                    You have full administrative privileges for this application
                  </p>
                </div>
              </div>
              <Link to="/admin">
                <Button
                  variant="outline"
                  className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
                >
                  Admin Panel
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FolderIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Binders
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
            </div>
            {stats.recentlyModified > 0 && (
              <div className="mt-3 flex items-center text-sm">
                <ClockIcon className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">
                  {stats.recentlyModified} active this week
                </span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <PhotoIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cards</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalCards}
                </p>
              </div>
            </div>
            {stats.largestBinder.cardCount > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                Largest: {stats.largestBinder.name} (
                {stats.largestBinder.cardCount} cards)
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CloudIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Cloud Synced
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.synced}
                </p>
              </div>
            </div>
            {stats.localOnly > 0 && (
              <div className="mt-3 flex items-center text-sm">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 mr-1" />
                <span className="text-amber-600">
                  {stats.localOnly} local only
                </span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Collection Score
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(stats.totalCards * 1.2 + stats.total * 10)}
                </p>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Based on activity & organization
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-8">
            {/* My Requests Section */}
            <RequestCenter />

            {/* Recent Binders Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent Binders
                  </h2>
                  <Link
                    to="/binders"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View All
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {recentBinders.length > 0 ? (
                  <div className="space-y-4">
                    {recentBinders.map((binder) => {
                      const cardCount = Object.keys(binder.cards || {}).length;
                      const isLocalOnly = isLocalOnlyBinder(binder);
                      const isGuest = binder.ownerId === "local_user";

                      return (
                        <div
                          key={binder.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center flex-1">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                                isGuest
                                  ? "bg-blue-100"
                                  : isLocalOnly
                                  ? "bg-amber-100"
                                  : "bg-green-100"
                              }`}
                            >
                              <FolderIcon
                                className={`w-5 h-5 ${
                                  isGuest
                                    ? "text-blue-600"
                                    : isLocalOnly
                                    ? "text-amber-600"
                                    : "text-green-600"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {binder.metadata?.name || "Unnamed Binder"}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{cardCount} cards</span>
                                <span>
                                  {isGuest
                                    ? "Guest"
                                    : isLocalOnly
                                    ? "Local Only"
                                    : "Cloud Synced"}
                                </span>
                                <span>
                                  {new Date(
                                    binder.lastModified ||
                                      binder.metadata?.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Link to={`/binder/${binder.id}`}>
                            <Button size="sm" variant="outline">
                              <EyeIcon className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No binders yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Create your first binder to start organizing your Pokemon
                      cards
                    </p>
                    <Button
                      onClick={handleQuickCreateBinder}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create First Binder
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Coming Soon */}
          <div className="space-y-6">
            {/* Announcements Widget */}
            <AnnouncementWidget />

            {/* Coming Soon Features */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Coming Soon
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Exciting features in development
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <ShareIcon className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium text-blue-900 text-sm">
                        Share Binders
                      </p>
                      <p className="text-blue-700 text-xs">
                        Share with friends via link
                      </p>
                    </div>
                  </div>
                  <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    Soon
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <UserGroupIcon className="w-5 h-5 text-purple-600 mr-3" />
                    <div>
                      <p className="font-medium text-purple-900 text-sm">
                        Community Hub
                      </p>
                      <p className="text-purple-700 text-xs">
                        Browse public binders
                      </p>
                    </div>
                  </div>
                  <span className="bg-purple-200 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                    Soon
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center">
                    <TrophyIcon className="w-5 h-5 text-orange-600 mr-3" />
                    <div>
                      <p className="font-medium text-orange-900 text-sm">
                        Leaderboards
                      </p>
                      <p className="text-orange-700 text-xs">
                        Top collectors & lists
                      </p>
                    </div>
                  </div>
                  <span className="bg-orange-200 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                    Soon
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <ChartBarIcon className="w-5 h-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-green-900 text-sm">
                        Analytics
                      </p>
                      <p className="text-green-700 text-xs">
                        Collection insights
                      </p>
                    </div>
                  </div>
                  <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                    Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        {stats.total === 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">
              Ready to Start Collecting?
            </h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Create your first binder and start organizing your Pokemon card
              collection today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleQuickCreateBinder}
                className="bg-white text-blue-700 hover:bg-gray-100 font-semibold"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create My First Binder
              </Button>
              <Link to="/binders">
                <Button
                  variant="outline"
                  className="border-white bg-transparent text-white hover:bg-white/10"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

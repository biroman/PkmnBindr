import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Folder, Clock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useBinderContext } from "../contexts/BinderContext";
import { getUserProfile } from "../utils/userManagement";
import { usePublicNavigation } from "../hooks/usePublicNavigation";
import UserProfileCard from "../components/ui/UserProfileCard";
import BinderCard from "../components/binder/BinderCard";
import PublicBreadcrumb from "../components/ui/PublicBreadcrumb";
import { toast } from "react-hot-toast";

const PublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchUserPublicBinders } = useBinderContext();
  const { goToBinder } = usePublicNavigation();

  const [profileUser, setProfileUser] = useState(null);
  const [publicBinders, setPublicBinders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("binders");

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);

        // If no userId provided, redirect to current user's profile
        if (!userId) {
          if (user) {
            navigate(`/profile/${user.uid}`, { replace: true });
          } else {
            navigate("/login", { replace: true });
          }
          return;
        }

        // Fetch user profile data
        const userData = await getUserProfile(userId);
        if (!userData) {
          toast.error("User not found");
          navigate("/", { replace: true });
          return;
        }

        setProfileUser(userData);

        // Fetch public binders for this user
        try {
          const binders = await fetchUserPublicBinders(userId);
          setPublicBinders(binders);
        } catch (binderError) {
          console.error("Error loading public binders:", binderError);
          // Don't fail the whole page if binders can't be loaded
          setPublicBinders([]);
          if (binderError.code !== "permission-denied") {
            toast.error("Some content may not be available");
          }
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
        toast.error("Failed to load profile");
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [userId, user, navigate, fetchUserPublicBinders]);

  const handleBinderClick = (binder) => {
    // Navigate to public binder view using the navigation hook
    goToBinder(binder, profileUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Profile Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The user profile you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.uid === userId;

  // Calculate stats from real data
  const stats = {
    totalBinders: publicBinders.length,
    totalCards: publicBinders.reduce((sum, binder) => {
      return sum + (binder.cards ? Object.keys(binder.cards).length : 0);
    }, 0),
    publicBinders: publicBinders.length,
    // Add more stats as needed
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation - only show when viewing someone else's profile */}
        {!isOwnProfile && (
          <PublicBreadcrumb
            ownerName={profileUser.displayName}
            ownerPhotoURL={profileUser.photoURL}
            ownerId={profileUser.uid}
            contentType="profile"
          />
        )}

        {/* Profile Header */}
        <div className="mb-8">
          <UserProfileCard
            user={profileUser}
            stats={stats}
            isOwnProfile={isOwnProfile}
            showStats={true}
            size="large"
            editable={false}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("binders")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "binders"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Public Binders ({publicBinders.length})
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "activity"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Recent Activity
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "binders" && (
              <div>
                {publicBinders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {publicBinders.map((binder) => (
                      <BinderCard
                        key={binder.id}
                        binder={binder}
                        showSyncStatus={false}
                        showActions={true}
                        showDeleteButton={false}
                        showPublicToggle={false}
                        showClaimButton={false}
                        showDropdownMenu={false}
                        onSelect={handleBinderClick}
                        user={user}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Folder className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {isOwnProfile
                        ? "No Public Binders Yet"
                        : "No Public Binders"}
                    </h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      {isOwnProfile
                        ? "Make some of your binders public to share them with the community!"
                        : `${profileUser.displayName} hasn't shared any public binders yet.`}
                    </p>
                    {isOwnProfile && (
                      <button
                        onClick={() => navigate("/binders")}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Manage Binders
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Activity Coming Soon
                </h3>
                <p className="text-gray-500">
                  Recent activity and achievements will be displayed here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;

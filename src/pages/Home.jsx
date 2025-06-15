import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  FireIcon,
  ClockIcon,
  HeartIcon,
  EyeIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  HeartIcon as HeartSolid,
  BookmarkIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../hooks/useAuth";
import BinderCard from "../components/binder/BinderCard";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";
import { getUserProfile } from "../utils/userManagement";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [publicBinders, setPublicBinders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("recent");
  const [ownerDataCache, setOwnerDataCache] = useState({}); // Cache for owner data

  // Load public binders
  useEffect(() => {
    const loadPublicBinders = async () => {
      try {
        setLoading(true);

        // Simple query to get all public binders without ordering
        // We'll sort them in memory to avoid needing composite indexes
        const q = query(
          collection(db, "user_binders"),
          where("permissions.public", "==", true),
          limit(50) // Get more to have better sorting options
        );

        const querySnapshot = await getDocs(q);
        const binders = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          binders.push({
            id: data.id,
            ...data,
          });
        });

        // Sort in memory based on active filter
        let sortedBinders = [...binders];
        switch (activeFilter) {
          case "popular":
            sortedBinders.sort(
              (a, b) => (b.likeCount || 0) - (a.likeCount || 0)
            );
            break;
          case "recent":
          default:
            sortedBinders.sort((a, b) => {
              const aDate =
                a.updatedAt?.toDate?.() || new Date(a.updatedAt || 0);
              const bDate =
                b.updatedAt?.toDate?.() || new Date(b.updatedAt || 0);
              return bDate - aDate;
            });
            break;
        }

        // Limit to 20 after sorting
        const finalBinders = sortedBinders.slice(0, 20);
        setPublicBinders(finalBinders);

        // Fetch owner data for all binders
        const ownerIds = [
          ...new Set(finalBinders.map((binder) => binder.ownerId)),
        ];
        const ownerDataPromises = ownerIds.map(async (ownerId) => {
          if (ownerDataCache[ownerId]) {
            return { ownerId, data: ownerDataCache[ownerId] };
          }

          try {
            const ownerData = await getUserProfile(ownerId);
            return { ownerId, data: ownerData };
          } catch (error) {
            console.error(`Error fetching owner data for ${ownerId}:`, error);
            return {
              ownerId,
              data: {
                uid: ownerId,
                displayName: "Unknown User",
                photoURL: null,
              },
            };
          }
        });

        const ownerResults = await Promise.all(ownerDataPromises);
        const newOwnerData = {};
        ownerResults.forEach(({ ownerId, data }) => {
          newOwnerData[ownerId] = data;
        });

        setOwnerDataCache((prev) => ({ ...prev, ...newOwnerData }));
      } catch (error) {
        console.error("Error loading public binders:", error);
        toast.error("Failed to load public binders");
      } finally {
        setLoading(false);
      }
    };

    loadPublicBinders();
  }, [activeFilter]);

  // Filter binders based on search query
  const filteredBinders = publicBinders.filter(
    (binder) =>
      binder.metadata?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      binder.metadata?.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const handleBinderClick = (binder) => {
    navigate(`/user/${binder.ownerId}/binder/${binder.id}`);
  };

  const mockStats = {
    totalPublicBinders: 1247,
    activeCollectors: 892,
    cardsShared: 45623,
    weeklyGrowth: 12.5,
  };

  const mockFeaturedCollectors = [
    {
      id: "1",
      name: "CardMaster2024",
      avatar: null,
      binderCount: 15,
      totalCards: 2341,
      specialization: "Vintage Cards",
    },
    {
      id: "2",
      name: "PokemonPro",
      avatar: null,
      binderCount: 8,
      totalCards: 1876,
      specialization: "Shiny Collection",
    },
    {
      id: "3",
      name: "TradeKing",
      avatar: null,
      binderCount: 22,
      totalCards: 3456,
      specialization: "Tournament Cards",
    },
  ];

  const mockTrendingCards = [
    { name: "Charizard VMAX", set: "Champion's Path", trend: "+15%" },
    { name: "Pikachu VMAX", set: "Vivid Voltage", trend: "+8%" },
    { name: "Umbreon VMAX", set: "Evolving Skies", trend: "+12%" },
    { name: "Rayquaza VMAX", set: "Evolving Skies", trend: "+6%" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Filter Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Public Collections
                </h2>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveFilter("recent")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeFilter === "recent"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <ClockIcon className="w-4 h-4 inline mr-2" />
                    Recent
                  </button>
                  <button
                    onClick={() => setActiveFilter("popular")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeFilter === "popular"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <FireIcon className="w-4 h-4 inline mr-2" />
                    Popular
                  </button>
                </div>
              </div>

              {/* Binders Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-xl h-48"></div>
                    </div>
                  ))}
                </div>
              ) : filteredBinders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBinders.map((binder) => (
                    <BinderCard
                      key={binder.id}
                      binder={binder}
                      onSelect={handleBinderClick}
                      showSyncStatus={false}
                      showActions={false}
                      showDeleteButton={false}
                      showPublicToggle={false}
                      showClaimButton={false}
                      showDropdownMenu={false}
                      showInteractionStats={true}
                      showCreatedBy={true}
                      ownerData={ownerDataCache[binder.ownerId]}
                      user={user}
                      isOwnedByCurrentUser={() => false}
                      getBinderStatus={() => "synced"}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery
                      ? "No collections found"
                      : "No public collections yet"}
                  </h3>

                  <p className="text-gray-600">
                    {searchQuery
                      ? "Try adjusting your search terms"
                      : "Be the first to share your collection with the community!"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Featured Collectors */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 opacity-60">
              <h3 className="text-lg font-bold text-gray-500 mb-4 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-gray-400" />
                Featured Collectors
              </h3>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrophyIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  Coming Soon
                </h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  We're working on a system to highlight top collectors in the
                  community. Stay tuned!
                </p>
              </div>
            </div>

            {/* Trending Cards */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 opacity-60">
              <h3 className="text-lg font-bold text-gray-500 mb-4 flex items-center gap-2">
                <FireIcon className="w-5 h-5 text-gray-400" />
                Trending Cards
              </h3>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FireIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  Coming Soon
                </h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Card price tracking and trending analysis will be available
                  soon!
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/binders")}
                  className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <SparklesIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        My Binders
                      </p>
                      <p className="text-xs text-gray-600">
                        Manage your collections
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/profile")}
                  className="w-full text-left p-3 rounded-lg hover:bg-green-50 transition-colors border border-green-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <EyeIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        My Profile
                      </p>
                      <p className="text-xs text-gray-600">
                        View public profile
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

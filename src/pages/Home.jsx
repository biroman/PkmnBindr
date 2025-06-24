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
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  HeartIcon as HeartSolid,
  BookmarkIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../hooks/useAuth";
import BinderCard from "../components/binder/BinderCard";
import { toast } from "react-hot-toast";
import { PublicCollectionsCacheService } from "../services/PublicCollectionsCacheService";

// Cached version of BinderCard that uses pre-loaded data
const CachedBinderCard = ({ binder, collectionsData, onSelect, user }) => {
  const ownerData = collectionsData?.ownerData[binder.ownerId];
  const interactionStats = collectionsData?.interactionStats[binder.id];
  const customization = collectionsData?.customizations[binder.id];

  return (
    <BinderCard
      binder={binder}
      onSelect={onSelect}
      showSyncStatus={false}
      showActions={false}
      showDeleteButton={false}
      showPublicToggle={false}
      showClaimButton={false}
      showDropdownMenu={false}
      showInteractionStats={true}
      showCreatedBy={true}
      ownerData={ownerData}
      user={user}
      isOwnedByCurrentUser={() => false}
      getBinderStatus={() => "synced"}
      // Pass cached data to prevent additional Firebase requests
      cachedInteractionStats={interactionStats}
      cachedCustomization={customization}
    />
  );
};

// Pagination Controls Component
const PaginationControls = ({
  pageInfo,
  currentPage,
  onPageChange,
  loading,
}) => {
  const { totalPages, hasPreviousPage, hasNextPage } = pageInfo;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage || loading}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || loading}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPreviousPage || loading}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={loading}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  pageNum === currentPage
                    ? "z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage || loading}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collectionsData, setCollectionsData] = useState(null);
  const [pageInfo, setPageInfo] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);

  // Load public collections for current page
  const loadPublicCollections = async (
    page = 1,
    filter = activeFilter,
    search = searchQuery,
    forceRefresh = false
  ) => {
    try {
      setLoading(true);
      const result =
        await PublicCollectionsCacheService.fetchPaginatedCollections(
          page,
          filter,
          search,
          forceRefresh
        );
      setCollectionsData(result.data);
      setPageInfo(result.pageInfo);
      setCurrentPage(result.pageInfo.currentPage);
    } catch (error) {
      console.error("Error loading public collections:", error);
      toast.error("Failed to load public collections");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadPublicCollections(1, activeFilter, searchQuery);
  }, []);

  // Handle filter changes
  useEffect(() => {
    setCurrentPage(1);
    loadPublicCollections(1, activeFilter, searchQuery);
  }, [activeFilter]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      loadPublicCollections(1, activeFilter, searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle page changes
  const handlePageChange = (newPage) => {
    if (
      newPage !== currentPage &&
      newPage >= 1 &&
      newPage <= pageInfo.totalPages
    ) {
      loadPublicCollections(newPage, activeFilter, searchQuery);
    }
  };

  const handleBinderClick = (binder) => {
    navigate(`/user/${binder.ownerId}/binder/${binder.id}`);
  };

  const filteredBinders = collectionsData?.binders || [];

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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Public Collections
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  {/* Search Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search collections..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-64"
                    />
                  </div>

                  {/* Filter Buttons */}
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
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {filteredBinders.map((binder) => (
                      <CachedBinderCard
                        key={binder.id}
                        binder={binder}
                        collectionsData={collectionsData}
                        onSelect={handleBinderClick}
                        user={user}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  <PaginationControls
                    pageInfo={pageInfo}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    loading={loading}
                  />
                </>
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

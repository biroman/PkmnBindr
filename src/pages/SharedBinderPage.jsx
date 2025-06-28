import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import shareService from "../services/ShareService";
import { toast } from "react-hot-toast";
import BinderContainer from "../components/binder/BinderContainer";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { X } from "lucide-react";

/**
 * SharedBinderPage - Displays shared binders via share tokens
 *
 * PERFORMANCE OPTIMIZED for non-registered users:
 * - Uses auth.currentUser instead of useAuth() to avoid real-time listeners
 * - Passes minimal context to prevent BinderContext background operations
 * - Only makes the initial Firebase call to fetch shared binder data
 * - No ongoing Firebase connections after initial load
 *
 * Works for both authenticated and unauthenticated users
 */
const SharedBinderPage = () => {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  // Get current user synchronously without setting up listeners
  // This avoids the ongoing Firebase Auth state monitoring for non-registered users
  const user = auth.currentUser;

  const [binder, setBinder] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [binderOwner, setBinderOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Cache configuration
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  const getCacheKey = (token) => `shared_binder_${token}`;

  // Check if cached data is still valid
  const isCacheValid = (cacheData) => {
    if (!cacheData || !cacheData.timestamp) return false;
    return Date.now() - cacheData.timestamp < CACHE_DURATION;
  };

  // Get cached binder data
  const getCachedBinder = (token) => {
    try {
      const cacheKey = getCacheKey(token);
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (isCacheValid(parsedCache)) {
          console.log(`Loading shared binder from cache (${token})`);
          return parsedCache.data;
        } else {
          // Cache expired, remove it
          sessionStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn("Failed to load cache:", error);
    }
    return null;
  };

  // Cache binder data
  const cacheBinder = (token, data) => {
    try {
      const cacheKey = getCacheKey(token);
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`Cached shared binder data for 5 minutes (${token})`);
    } catch (error) {
      console.warn("Failed to cache data:", error);
    }
  };

  useEffect(() => {
    const loadSharedBinder = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!shareToken) {
          throw new Error("Share token is required");
        }

        // Try to load from cache first
        const cachedData = getCachedBinder(shareToken);
        if (cachedData) {
          setBinder(cachedData.binder);
          setShareData(cachedData.shareData);
          setBinderOwner(cachedData.owner);
          setLoading(false);
          return;
        }

        // Cache miss - fetch from Firebase
        console.log(`Fetching shared binder from Firebase (${shareToken})`);
        const {
          binder: binderData,
          shareData: shareInfo,
          owner,
        } = await shareService.getBinderByShareToken(shareToken);

        setBinder(binderData);
        setShareData(shareInfo);
        setBinderOwner(owner);

        // Cache the data for future requests
        cacheBinder(shareToken, {
          binder: binderData,
          shareData: shareInfo,
          owner,
        });
      } catch (error) {
        console.error("Error loading shared binder:", error);
        setError(error.message);

        // Show user-friendly error messages
        if (
          error.message.includes("not found") ||
          error.message.includes("revoked")
        ) {
          toast.error("This share link is not valid or has been revoked");
        } else if (error.message.includes("expired")) {
          toast.error("This share link has expired");
        } else if (error.message.includes("no longer public")) {
          toast.error("This binder is no longer publicly shared");
        } else {
          toast.error("Failed to load shared binder");
        }
      } finally {
        setLoading(false);
      }
    };

    loadSharedBinder();
  }, [shareToken]);

  const handleCardClick = (card) => {
    // If the same card is clicked again, close the modal
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared binder...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !binder || !shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Share Link Not Available
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "The shared binder you're looking for is not accessible."}
          </p>
          <div className="space-y-3">
            <button
              onClick={handleGoHome}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </button>
            {!user && (
              <button
                onClick={() => navigate("/login")}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Clean binder display - no navbar, no header, full focus on binder */}
      <BinderContainer
        binder={binder}
        mode="readonly"
        hasNavbar={false}
        features={{
          toolbar: false,
          sidebar: false,
          dragDrop: false,
          modals: false, // We handle card modal separately
          keyboard: true,
          edgeNavigation: true, // Allow page navigation
          export: false,
          addCards: false,
          deleteCards: false,
          clearBinder: false,
          pageManagement: false,
          sorting: false,
          autoSort: false,
        }}
        // Pass minimal context to prevent background Firebase operations
        // This prevents BinderContext from setting up real-time listeners,
        // background sync intervals, and other Firebase operations
        binderContext={{
          // Minimal read-only context with no real-time operations
          binders: [],
          currentBinder: null,
          isLoading: false,
          syncStatus: {},
          // Stub functions to prevent errors
          createBinder: () => {},
          updateBinder: () => {},
          deleteBinder: () => {},
          selectBinder: () => {},
          addCardToBinder: () => {},
          batchAddCards: () => {},
          removeCardFromBinder: () => {},
          clearBinderCards: () => {},
          moveCard: () => {},
          moveCardOptimistic: () => {},
          batchMoveCards: () => {},
          updateBinderSettings: () => {},
          updateBinderMetadata: () => {},
          sortBinder: () => {},
          updateAutoSort: () => {},
          saveBinderToCloud: () => {},
          syncBinderToCloud: () => {},
          downloadBinderFromCloud: () => {},
          getAllCloudBinders: () => {},
          deleteBinderFromCloud: () => {},
          autoSyncCloudBinders: () => {},
          refreshCache: () => {},
          forceClearAndSync: () => {},
          migrateBinderCardData: () => {},
          markAsModified: () => {},
          addPage: () => {},
          batchAddPages: () => {},
          removePage: () => {},
          getPageCount: () => {},
          reorderPages: () => {},
          reorderCardPages: () => {},
          getLogicalPageIndex: () => {},
          getPhysicalPageIndex: () => {},
          clearAllData: () => {},
          cleanupAllBinderChangelogs: () => {},
          exportBinderData: () => {},
          importBinderData: () => {},
          canAccessBinder: () => false,
          getVisibleBinders: () => [],
          checkUnsavedChanges: () => ({ hasUnsaved: false, binders: [] }),
          warnBeforeLogout: () => {},
          isLocalOnlyBinder: () => false,
          isOwnedByCurrentUser: () => false,
          getLocalOnlyBinders: () => [],
          claimLocalBinder: () => {},
          clearLocalOnlyBinders: () => {},
          checkBinderExistsInCloud: () => {},
          verifyLocalOnlyStatus: () => {},
          validatePosition: () => true,
          validateCardMove: () => true,
          fetchUserPublicBinders: () => [],
          getPublicBinder: () => {},
          updateBinderPrivacy: () => {},
          createShareLink: () => {},
          getShareLinks: () => [],
          revokeShareLink: () => {},
          getShareAnalytics: () => {},
        }}
        onCardClick={handleCardClick}
        isPublicView={true}
        binderOwner={binderOwner}
        showNoBinderMessage={false}
        shareUrl={shareData?.shareUrl}
        showQRCode={showQRCode}
        onToggleQRCode={() => setShowQRCode(!showQRCode)}
      />

      {/* Card Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal when clicking outside
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          {/* Card Image - No background */}
          <div className="mb-4">
            {(selectedCard.image || selectedCard.imageSmall) && (
              <img
                src={selectedCard.image || selectedCard.imageSmall}
                alt={selectedCard.name}
                className="cursor-pointer shadow-2xl rounded-lg"
                onClick={handleCloseModal}
                style={{ maxHeight: "60vh" }}
              />
            )}
          </div>

          {/* White Info Panel Below */}
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl transform transition-all duration-300 ease-out cursor-pointer"
            onClick={handleCloseModal}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 truncate">
                {selectedCard.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseModal();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Card Details */}
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Set</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedCard.set?.name || "Unknown"}
                  </span>
                </div>
                {selectedCard.number && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Number
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedCard.number}
                    </span>
                  </div>
                )}
                {selectedCard.rarity && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Rarity
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedCard.rarity}
                    </span>
                  </div>
                )}
                {selectedCard.types && selectedCard.types.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Type
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedCard.types.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SharedBinderPage;

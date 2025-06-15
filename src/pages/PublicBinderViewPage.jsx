import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBinderContext } from "../contexts/BinderContext";
import { getUserProfile } from "../utils/userManagement";
import {
  createFallbackOwnerData,
  generateSharingData,
  handleShare,
} from "../utils/publicUtils";

import { toast } from "react-hot-toast";
import CoverPage from "../components/binder/CoverPage";
import CardPage from "../components/binder/CardPage";
import useBinderDimensions, {
  getGridConfig,
} from "../hooks/useBinderDimensions";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

const PublicBinderViewPage = () => {
  const { binderId, userId: urlUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getPublicBinder } = useBinderContext();

  const [binder, setBinder] = useState(null);
  const [binderOwner, setBinderOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Get state from navigation (if available)
  const {
    ownerId,
    isPublic,
    binderName,
    ownerDisplayName,
    ownerPhotoURL,
    fallbackOwnerData,
  } = location.state || {};

  // Custom hook for binder dimensions
  const binderDimensions = useBinderDimensions(
    binder?.settings?.gridSize || "3x3"
  );

  // Calculate total pages and page configuration
  const { totalPages, getCurrentPageConfig } = useMemo(() => {
    if (!binder?.cards || typeof binder.cards !== "object") {
      return {
        totalPages: Math.max(
          binder?.settings?.minPages || 1,
          binder?.settings?.pageCount || 1
        ),
        getCurrentPageConfig: {
          leftPage: { type: "cover" },
          rightPage: { type: "card", pageNumber: 1, cardPageIndex: 0 },
        },
      };
    }

    const gridConfig = getGridConfig(binder.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;
    const positions = Object.keys(binder.cards).map((pos) => parseInt(pos));
    const maxPosition = positions.length > 0 ? Math.max(...positions) : 0;
    const requiredCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);
    const storedPageCount = binder?.settings?.pageCount || 1;

    let calculatedPages;
    if (requiredCardPages <= 1) {
      calculatedPages = 1;
    } else {
      const pairsNeeded = Math.ceil((requiredCardPages - 1) / 2);
      calculatedPages = 1 + pairsNeeded;
    }

    const finalTotalPages = Math.max(
      calculatedPages,
      storedPageCount,
      binder?.settings?.minPages || 1
    );

    // Page configuration logic
    const getPageConfig = () => {
      if (currentPageIndex === 0) {
        return {
          leftPage: { type: "cover" },
          rightPage: { type: "card", pageNumber: 1, cardPageIndex: 0 },
        };
      }

      const leftCardPageIndex = (currentPageIndex - 1) * 2 + 1;
      const rightCardPageIndex = leftCardPageIndex + 1;

      return {
        leftPage: {
          type: "card",
          pageNumber: leftCardPageIndex + 1,
          cardPageIndex: leftCardPageIndex,
        },
        rightPage: {
          type: "card",
          pageNumber: rightCardPageIndex + 1,
          cardPageIndex: rightCardPageIndex,
        },
      };
    };

    return {
      totalPages: finalTotalPages,
      getCurrentPageConfig: getPageConfig(),
    };
  }, [binder, currentPageIndex]);

  useEffect(() => {
    const loadPublicBinder = async () => {
      try {
        setLoading(true);

        if (!user) {
          toast.error("Please log in to view public binders");
          navigate("/login");
          return;
        }

        if (!binderId) {
          toast.error("Binder ID is required");
          navigate("/");
          return;
        }

        // Try to get owner ID from multiple sources
        let ownerIdToUse = ownerId || urlUserId;

        // If no owner ID from navigation state or URL, try to extract from binder data
        if (!ownerIdToUse) {
          console.warn(
            "No owner ID in navigation state, attempting to fetch binder to determine owner"
          );

          // Try to fetch all public binders to find this one (fallback method)
          try {
            const { fetchUserPublicBinders } = await import(
              "../contexts/BinderContext"
            );
            // This is a fallback - in a real app you'd want a more efficient method
            console.warn(
              "Owner ID missing - this should be handled by better URL structure"
            );
          } catch (fallbackError) {
            console.error("Fallback method failed:", fallbackError);
          }

          // If we still don't have owner ID, show error
          if (!ownerIdToUse) {
            toast.error(
              "Unable to determine binder owner. Please access this binder from the owner's profile."
            );
            navigate("/");
            return;
          }
        }

        // Fetch the public binder
        const binderData = await getPublicBinder(binderId, ownerIdToUse);
        setBinder(binderData);

        // Try to get owner data - prioritize real profile data
        let ownerData = null;

        // First, try to fetch the real user profile from Firebase
        try {
          ownerData = await getUserProfile(ownerIdToUse);
        } catch (profileError) {
          console.error("Error fetching owner profile:", profileError);

          // If that fails, try using fallback data from navigation state
          if (fallbackOwnerData) {
            ownerData = fallbackOwnerData;
          } else {
            // Last resort: create minimal owner data from available information
            ownerData = createFallbackOwnerData(
              ownerIdToUse,
              ownerDisplayName || binderData.lastModifiedBy,
              ownerPhotoURL
            );
          }
        }

        setBinderOwner(ownerData);
      } catch (error) {
        console.error("Error loading public binder:", error);

        if (error.message === "Binder is private") {
          toast.error("This binder is private and cannot be viewed");
        } else if (error.message === "Binder not found") {
          toast.error("Binder not found");
        } else {
          toast.error("Failed to load binder");
        }

        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadPublicBinder();
  }, [
    binderId,
    ownerId,
    ownerDisplayName,
    ownerPhotoURL,
    fallbackOwnerData,
    user,
    navigate,
    getPublicBinder,
  ]);

  // Helper function to get cards for a specific page
  const getCardsForPage = (cardPageIndex) => {
    if (!binder?.cards) return [];

    const gridConfig = getGridConfig(binder.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;
    const startPosition = cardPageIndex * cardsPerPage;

    const pageCards = [];
    for (let i = 0; i < cardsPerPage; i++) {
      const globalPosition = startPosition + i;
      const cardEntry = binder.cards[globalPosition.toString()];

      if (cardEntry && cardEntry.cardData) {
        // Extract the card data and merge with binder metadata
        const processedCard = {
          ...cardEntry.cardData,
          // Add binder-specific metadata
          binderMetadata: {
            instanceId: cardEntry.instanceId,
            addedAt: cardEntry.addedAt,
            addedBy: cardEntry.addedBy,
            notes: cardEntry.notes,
            condition: cardEntry.condition,
            quantity: cardEntry.quantity,
            isProtected: cardEntry.isProtected,
          },
        };
        pageCards.push(processedCard);
      } else {
        pageCards.push(null);
      }
    }

    return pageCards;
  };

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  // Navigation functions
  const goToPrevPage = () => {
    setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
  };

  const goToNextPage = () => {
    setCurrentPageIndex(Math.min(totalPages - 1, currentPageIndex + 1));
  };

  const canGoPrev = currentPageIndex > 0;
  const canGoNext = currentPageIndex < totalPages - 1;

  const handleShareBinder = async () => {
    const shareData = generateSharingData({
      type: "binder",
      ownerName: binderOwner?.displayName || "Unknown User",
      title: binder?.metadata?.name || "Untitled Binder",
      url: window.location.pathname,
    });

    const success = await handleShare(shareData);
    if (success) {
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("Failed to share link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading binder...</p>
        </div>
      </div>
    );
  }

  if (!binder || !binderOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <DocumentTextIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Binder Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The binder you're looking for doesn't exist or is private.
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

  const totalCards = binder.cards ? Object.keys(binder.cards).length : 0;
  const gridConfig = getGridConfig(binder.settings?.gridSize || "3x3");
  const pageConfig = getCurrentPageConfig;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main Content Layout */}
      <div className="h-[calc(100vh-65px)] flex mt-10 justify-center relative">
        {/* Binder Container - Dynamic sizing based on grid */}
        <div
          className="relative flex gap-4 binder-container"
          style={{
            width: `${binderDimensions.width}px`,
            height: `${binderDimensions.height}px`,
          }}
        >
          {/* Left Page */}
          {pageConfig.leftPage.type === "cover" ? (
            <CoverPage
              binder={binder}
              owner={binderOwner}
              isReadOnly={true}
              isPublicView={true}
              backgroundColor={binder.settings?.binderColor || "#ffffff"}
            />
          ) : (
            <CardPage
              pageNumber={pageConfig.leftPage.pageNumber}
              cards={getCardsForPage(pageConfig.leftPage.cardPageIndex)}
              gridSize={binder.settings?.gridSize || "3x3"}
              cardPageIndex={pageConfig.leftPage.cardPageIndex}
              isReadOnly={true}
              onCardClick={handleCardClick}
              backgroundColor={binder.settings?.binderColor || "#ffffff"}
            />
          )}

          {/* Center Spine */}
          <div className="w-2 bg-gray-400 rounded-full shadow-lg"></div>

          {/* Right Page */}
          <CardPage
            pageNumber={pageConfig.rightPage.pageNumber}
            cards={getCardsForPage(pageConfig.rightPage.cardPageIndex)}
            gridSize={binder.settings?.gridSize || "3x3"}
            cardPageIndex={pageConfig.rightPage.cardPageIndex}
            isReadOnly={true}
            onCardClick={handleCardClick}
            backgroundColor={binder.settings?.binderColor || "#ffffff"}
          />
        </div>

        {/* Left Navigation - positioned next to binder */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300"
          style={{
            left: `calc(50% - ${binderDimensions.width / 2 + 64}px)`,
          }}
        >
          <button
            onClick={goToPrevPage}
            disabled={!canGoPrev}
            className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Previous Page"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Right Navigation - positioned next to binder */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300"
          style={{
            right: `calc(50% - ${binderDimensions.width / 2 + 64}px)`,
          }}
        >
          <button
            onClick={goToNextPage}
            disabled={!canGoNext}
            className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Next Page"
          >
            <ArrowRightIcon className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCard.name}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {(selectedCard.image || selectedCard.imageSmall) && (
                <img
                  src={selectedCard.image || selectedCard.imageSmall}
                  alt={selectedCard.name}
                  className="w-full h-auto rounded-lg mb-4"
                />
              )}
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Set:</strong> {selectedCard.set?.name || "Unknown"}
                </div>
                <div>
                  <strong>Number:</strong> {selectedCard.number || "N/A"}
                </div>
                <div>
                  <strong>Rarity:</strong> {selectedCard.rarity || "Unknown"}
                </div>
                {selectedCard.artist && (
                  <div>
                    <strong>Artist:</strong> {selectedCard.artist}
                  </div>
                )}
                {selectedCard.types && selectedCard.types.length > 0 && (
                  <div>
                    <strong>Types:</strong> {selectedCard.types.join(", ")}
                  </div>
                )}
                {selectedCard.binderMetadata && (
                  <div className="pt-2 border-t border-gray-200">
                    <div>
                      <strong>Added:</strong>{" "}
                      {new Date(
                        selectedCard.binderMetadata.addedAt
                      ).toLocaleDateString()}
                    </div>
                    {selectedCard.binderMetadata.condition && (
                      <div>
                        <strong>Condition:</strong>{" "}
                        {selectedCard.binderMetadata.condition}
                      </div>
                    )}
                    {selectedCard.binderMetadata.notes && (
                      <div>
                        <strong>Notes:</strong>{" "}
                        {selectedCard.binderMetadata.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicBinderViewPage;

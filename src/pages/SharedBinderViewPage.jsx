import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ShareIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

import CoverPage from "../components/binder/CoverPage";
import CardPage from "../components/binder/CardPage";
import useBinderDimensions, {
  getGridConfig,
} from "../hooks/useBinderDimensions";
import { copyShareLink, generateSocialUrls } from "../utils/shareUtils";

const SharedBinderViewPage = () => {
  const { shareId, slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [binder, setBinder] = useState(null);
  const [binderOwner, setBinderOwner] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Touch/swipe handling for mobile
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Custom hook for binder dimensions
  const binderDimensions = useBinderDimensions(
    binder?.settings?.gridSize || "3x3"
  );

  useEffect(() => {
    loadSharedBinder();
  }, [shareId, slug]);

  const loadSharedBinder = async () => {
    try {
      setLoading(true);
      setError(null);

      // Import the AnonymousBinderService
      const { anonymousBinderService } = await import(
        "../services/AnonymousBinderService"
      );

      let result;
      if (slug) {
        // Access via custom slug
        result = await anonymousBinderService.getSharedBinderBySlug(slug);
      } else if (shareId) {
        // Access via share ID
        result = await anonymousBinderService.getSharedBinder(shareId);
      } else {
        throw new Error("No share identifier provided");
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to load shared binder");
      }

      setBinder(result.binder);
      setBinderOwner(result.owner);
      setShareData(result.shareData);

      // Update page title with binder name
      if (result.binder?.metadata?.name) {
        document.title = `${result.binder.metadata.name} - Shared Pokemon Collection`;
      }
    } catch (error) {
      console.error("Failed to load shared binder:", error);
      setError(error.message);

      // Show appropriate error message
      if (error.message.includes("expired")) {
        toast.error("This share link has expired");
      } else if (error.message.includes("not found")) {
        toast.error("Share link not found");
      } else if (error.message.includes("inactive")) {
        toast.error("This share link is no longer active");
      } else {
        toast.error("Failed to load shared binder");
      }
    } finally {
      setLoading(false);
    }
  };

  // Process binder data for display
  const processedBinder = useMemo(() => {
    if (!binder) return null;

    // Ensure all required fields are present
    return {
      ...binder,
      metadata: {
        name: "Untitled Collection",
        description: "",
        ...binder.metadata,
      },
      settings: {
        gridSize: "3x3",
        backgroundColor: "#ffffff",
        ...binder.settings,
      },
      permissions: {
        public: true,
        ...binder.permissions,
      },
    };
  }, [binder]);

  // Calculate total pages and page configuration
  const { totalPages, getCurrentPageConfig } = useMemo(() => {
    if (!processedBinder?.cards || typeof processedBinder.cards !== "object") {
      return {
        totalPages: Math.max(
          processedBinder?.settings?.minPages || 1,
          processedBinder?.settings?.pageCount || 1
        ),
        getCurrentPageConfig: {
          leftPage: { type: "cover" },
          rightPage: { type: "card", pageNumber: 1, cardPageIndex: 0 },
        },
      };
    }

    const gridConfig = getGridConfig(
      processedBinder.settings?.gridSize || "3x3"
    );
    const cardsPerPage = gridConfig.total;
    const positions = Object.keys(processedBinder.cards).map((pos) =>
      parseInt(pos)
    );
    const maxPosition = positions.length > 0 ? Math.max(...positions) : 0;
    const requiredCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);
    const storedPageCount = processedBinder?.settings?.pageCount || 1;

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
      processedBinder?.settings?.minPages || 1
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
  }, [processedBinder, currentPageIndex]);

  // Helper function to get cards for a specific page
  const getCardsForPage = (cardPageIndex) => {
    if (!processedBinder?.cards) return [];

    const gridConfig = getGridConfig(
      processedBinder.settings?.gridSize || "3x3"
    );
    const cardsPerPage = gridConfig.total;
    const startPosition = cardPageIndex * cardsPerPage;

    const pageCards = [];
    for (let i = 0; i < cardsPerPage; i++) {
      const globalPosition = startPosition + i;
      const cardEntry = processedBinder.cards[globalPosition.toString()];

      if (cardEntry && cardEntry.cardData) {
        const processedCard = {
          ...cardEntry.cardData,
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

  const handleShare = async () => {
    const currentUrl = window.location.href;
    const success = await copyShareLink(currentUrl);

    if (success) {
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("Failed to copy link");
    }
  };

  const handleSocialShare = (platform) => {
    const currentUrl = window.location.href;
    const binderTitle = processedBinder?.metadata?.name || "Pokemon Collection";
    const socialUrls = generateSocialUrls(currentUrl, binderTitle);

    if (socialUrls[platform]) {
      window.open(socialUrls[platform], "_blank", "noopener,noreferrer");
    }
  };

  const handleOwnerProfileClick = () => {
    if (binderOwner?.uid) {
      navigate(`/profile/${binderOwner.uid}`);
    }
  };

  // Touch handlers for mobile swipe gestures
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartX.current - currentX;
    const diffY = touchStartY.current - currentY;

    // Only consider horizontal swipes (ignore vertical scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      setIsSwiping(true);
      e.preventDefault(); // Prevent scrolling during horizontal swipe
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current || !isSwiping) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX.current - touchEndX;

    // Minimum swipe distance
    const minSwipeDistance = 50;

    if (Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0 && canGoNext) {
        // Swipe left - go to next page
        goToNextPage();
      } else if (diffX < 0 && canGoPrev) {
        // Swipe right - go to previous page
        goToPrevPage();
      }
    }

    // Reset
    touchStartX.current = 0;
    touchStartY.current = 0;
    setIsSwiping(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Share Link Error
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>

          {error.includes("expired") && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <ClockIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <h3 className="font-medium text-yellow-800 mb-1">
                    Link Expired
                  </h3>
                  <p className="text-sm text-yellow-700">
                    This share link has expired and is no longer accessible.
                    Contact the collection owner for a new link.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error.includes("inactive") && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <LockClosedIcon className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <h3 className="font-medium text-gray-800 mb-1">
                    Link Deactivated
                  </h3>
                  <p className="text-sm text-gray-700">
                    This share link has been deactivated by the collection
                    owner.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate("/binders")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Public Collections
          </button>
        </div>
      </div>
    );
  }

  if (!processedBinder) {
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

  const totalCards = processedBinder.cards
    ? Object.keys(processedBinder.cards).length
    : 0;
  const gridConfig = getGridConfig(processedBinder.settings?.gridSize || "3x3");
  const pageConfig = getCurrentPageConfig;

  return (
    <div className="bg-gradient-to-br from-slate-700 to-slate-900">
      {/* Main Content Layout */}
      <div className="min-h-screen flex items-center justify-center relative">
        {/* Mobile Layout - Single Page */}
        <div className="block lg:hidden w-full px-4">
          <div className="flex flex-col items-center justify-center gap-6">
            {/* Mobile Binder Container */}
            <div
              className="relative binder-container rounded-lg bg-white overflow-hidden touch-pan-y select-none w-full max-w-sm mx-auto"
              style={{
                maxHeight: "70vh",
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Single Page for Mobile */}
              {currentPageIndex === 0 ? (
                <CoverPage
                  binder={processedBinder}
                  owner={binderOwner}
                  isReadOnly={true}
                  isPublicView={true}
                  backgroundColor={
                    processedBinder.settings?.binderColor || "#ffffff"
                  }
                />
              ) : (
                <CardPage
                  pageNumber={currentPageIndex}
                  cards={getCardsForPage(currentPageIndex - 1)}
                  gridSize={processedBinder.settings?.gridSize || "3x3"}
                  cardPageIndex={currentPageIndex - 1}
                  isReadOnly={true}
                  onCardClick={handleCardClick}
                  backgroundColor={
                    processedBinder.settings?.binderColor || "#ffffff"
                  }
                />
              )}
            </div>

            {/* Mobile Navigation - Bottom Center */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={goToPrevPage}
                disabled={!canGoPrev}
                className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-95"
                title="Previous Page"
              >
                <ArrowLeftIcon className="w-7 h-7 text-gray-700" />
              </button>

              {/* Page Indicator */}
              <div className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg">
                <span className="text-sm font-medium text-gray-700">
                  {currentPageIndex + 1} / {totalPages}
                </span>
              </div>

              <button
                onClick={goToNextPage}
                disabled={!canGoNext}
                className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-95"
                title="Next Page"
              >
                <ArrowRightIcon className="w-7 h-7 text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Dual Page */}
        <div className="hidden lg:block">
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
                binder={processedBinder}
                owner={binderOwner}
                isReadOnly={true}
                isPublicView={true}
                backgroundColor={
                  processedBinder.settings?.binderColor || "#ffffff"
                }
              />
            ) : (
              <CardPage
                pageNumber={pageConfig.leftPage.pageNumber}
                cards={getCardsForPage(pageConfig.leftPage.cardPageIndex)}
                gridSize={processedBinder.settings?.gridSize || "3x3"}
                cardPageIndex={pageConfig.leftPage.cardPageIndex}
                isReadOnly={true}
                onCardClick={handleCardClick}
                backgroundColor={
                  processedBinder.settings?.binderColor || "#ffffff"
                }
              />
            )}

            {/* Center Spine */}
            <div className="w-2 bg-gray-400 rounded-full shadow-lg"></div>

            {/* Right Page */}
            <CardPage
              pageNumber={pageConfig.rightPage.pageNumber}
              cards={getCardsForPage(pageConfig.rightPage.cardPageIndex)}
              gridSize={processedBinder.settings?.gridSize || "3x3"}
              cardPageIndex={pageConfig.rightPage.cardPageIndex}
              isReadOnly={true}
              onCardClick={handleCardClick}
              backgroundColor={
                processedBinder.settings?.binderColor || "#ffffff"
              }
            />
          </div>

          {/* Desktop Navigation - Side Arrows */}
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
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
                {selectedCard.name}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Close modal"
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

export default SharedBinderViewPage;

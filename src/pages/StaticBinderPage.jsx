import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocumentHead } from "../hooks/useDocumentHead";
import { toast } from "react-hot-toast";

// Reuse existing binder components
import CoverPage from "../components/binder/CoverPage";
import CardPage from "../components/binder/CardPage";
import useBinderDimensions, {
  getGridConfig,
} from "../hooks/useBinderDimensions";

// Icons
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  CalendarIcon,
  PhotoIcon,
  TagIcon,
  FolderIcon,
  ShareIcon,
  UserIcon,
  Squares2X2Icon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const StaticBinderPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [binderData, setBinderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Custom hook for binder dimensions (reuse existing logic)
  const binderDimensions = useBinderDimensions(
    binderData?.settings?.gridSize || "3x3"
  );

  // Load static binder data
  useEffect(() => {
    const loadStaticBinder = async () => {
      if (!slug) {
        setError("Invalid binder slug");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load from public static files (no Firebase!)
        const response = await fetch(`/static-binders/${slug}.json`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Binder not found");
          }
          throw new Error(`Failed to load binder: ${response.status}`);
        }

        const data = await response.json();
        setBinderData(data);

        // Track view (optional analytics without Firebase)
        console.log(`Viewed static binder: ${data.metadata.name}`);
      } catch (err) {
        console.error("Error loading static binder:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadStaticBinder();
  }, [slug]);

  // Calculate total pages (reuse existing logic)
  const totalPages = useMemo(() => {
    if (!binderData?.cards || typeof binderData.cards !== "object") {
      return Math.max(
        binderData?.settings?.minPages || 1,
        binderData?.settings?.pageCount || 1
      );
    }

    const storedPageCount = binderData?.settings?.pageCount || 1;
    const positions = Object.keys(binderData.cards).map((pos) => parseInt(pos));
    const gridConfig = getGridConfig(binderData.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;

    if (positions.length === 0) {
      return Math.max(binderData?.settings?.minPages || 1, storedPageCount);
    }

    const maxPosition = Math.max(...positions);
    const requiredCardPages = Math.ceil((maxPosition + 1) / cardsPerPage);

    let requiredBinderPages;
    if (requiredCardPages <= 1) {
      requiredBinderPages = 1;
    } else {
      const pairsNeeded = Math.ceil((requiredCardPages - 1) / 2);
      requiredBinderPages = 1 + pairsNeeded;
    }

    const finalPageCount = Math.max(
      storedPageCount,
      requiredBinderPages,
      binderData?.settings?.minPages || 1
    );

    const maxPages = binderData?.settings?.maxPages || 100;
    return Math.min(finalPageCount, maxPages);
  }, [
    binderData?.cards,
    binderData?.settings?.gridSize,
    binderData?.settings?.minPages,
    binderData?.settings?.maxPages,
    binderData?.settings?.pageCount,
  ]);

  // Get page configuration (reuse existing logic)
  const pageConfig = useMemo(() => {
    const physicalPageIndex = currentPageIndex;

    if (physicalPageIndex === 0) {
      return {
        type: "cover-and-first",
        leftPage: { type: "cover", pageNumber: null },
        rightPage: {
          type: "cards",
          pageNumber: 1,
          cardPageIndex: 0,
        },
      };
    } else {
      const leftCardPageIndex = (physicalPageIndex - 1) * 2 + 1;
      const rightCardPageIndex = leftCardPageIndex + 1;

      return {
        type: "cards-pair",
        leftPage: {
          type: "cards",
          pageNumber: leftCardPageIndex + 1,
          cardPageIndex: leftCardPageIndex,
        },
        rightPage: {
          type: "cards",
          pageNumber: rightCardPageIndex + 1,
          cardPageIndex: rightCardPageIndex,
        },
      };
    }
  }, [currentPageIndex]);

  // Navigation state
  const canGoNext = currentPageIndex < totalPages - 1;
  const canGoPrev = currentPageIndex > 0;

  // Navigation handlers
  const goToNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  const goToPage = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < totalPages) {
      setCurrentPageIndex(pageIndex);
    }
  };

  // Get cards for a specific card page index
  const getCardsForPage = (cardPageIndex) => {
    if (!binderData?.cards || typeof binderData.cards !== "object") return [];

    const gridConfig = getGridConfig(binderData.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;
    const startPosition = cardPageIndex * cardsPerPage;

    const pageCards = [];
    for (let i = 0; i < cardsPerPage; i++) {
      const globalPosition = startPosition + i;
      const cardEntry = binderData.cards[globalPosition.toString()];

      if (cardEntry) {
        // Transform the card data structure to match what PokemonCard expects
        // Static JSON has: cardEntry.cardData.image, cardEntry.cardData.name, etc.
        // PokemonCard expects: card.image, card.name, etc.
        const transformedCard = {
          ...cardEntry.cardData, // Spread the nested cardData to root level
          binderMetadata: {
            instanceId: cardEntry.instanceId,
            addedAt: cardEntry.addedAt,
            condition: cardEntry.condition,
            notes: cardEntry.notes,
            quantity: cardEntry.quantity,
            isProtected: cardEntry.isProtected,
          },
        };
        pageCards[i] = transformedCard;
      } else {
        pageCards[i] = null; // Empty slot
      }
    }

    return pageCards;
  };

  // Share functionality
  const handleShare = async () => {
    // Use production domain for sharing, not localhost
    const productionUrl = `https://www.pkmnbindr.com/binders/${slug}`;

    const shareData = {
      title: binderData.seo.title,
      text: binderData.seo.description,
      url: productionUrl,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== "AbortError") {
          fallbackShare(productionUrl);
        }
      }
    } else {
      fallbackShare(productionUrl);
    }
  };

  const fallbackShare = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  // SEO metadata using custom hook
  useDocumentHead({
    title: binderData?.seo?.title,
    description: binderData?.seo?.description,
    keywords: binderData?.seo?.keywords,
    ogTitle: binderData?.seo?.title,
    ogDescription: binderData?.seo?.description,
    ogImage: binderData?.seo?.ogImage,
    ogUrl: `https://www.pkmnbindr.com/binders/${slug}`,
    canonicalUrl: binderData?.seo?.canonicalUrl,
    structuredData: binderData
      ? {
          "@context": "https://schema.org",
          "@type": "Collection",
          name: binderData.metadata.name,
          description: binderData.metadata.description,
          url: `https://www.pkmnbindr.com/binders/${slug}`,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: binderData.metadata.statistics.cardCount,
            itemListElement: Object.values(binderData.cards || {}).map(
              (card, index) => ({
                "@type": "Thing",
                position: index + 1,
                name: card?.name || "Pokemon Card",
                description: card?.set?.name || "Trading Card",
              })
            ),
          },
          creator: {
            "@type": "Organization",
            name: "Pokemon Card Collection",
          },
        }
      : null,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft" && canGoPrev) {
        goToPrevPage();
      } else if (event.key === "ArrowRight" && canGoNext) {
        goToNextPage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoNext, canGoPrev]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="animate-pulse">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-blue-200 rounded-full"></div>
            </div>
            <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto mb-6"></div>
            <div className="space-y-3">
              <div className="h-3 bg-slate-200 rounded"></div>
              <div className="h-3 bg-slate-200 rounded w-5/6"></div>
              <div className="h-3 bg-slate-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Binder Not Found
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/binders")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Collections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main Content Layout */}
      <div className="flex h-[calc(100vh-65px)]">
        {/* Left Sidebar - Binder Info & Controls */}
        <div
          className={`${
            isSidebarVisible ? "w-80" : "w-0"
          } bg-white border-r border-slate-200 flex flex-col transition-all duration-300 overflow-hidden`}
        >
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-200">
            <button
              onClick={() => navigate("/binders")}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Collections
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <EyeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {binderData.metadata.name}
                </h1>
                <p className="text-sm text-gray-500">Public Collection</p>
              </div>
            </div>

            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ShareIcon className="w-4 h-4" />
              Share Collection
            </button>
          </div>

          {/* Binder Information */}
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Collection Information
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Total Cards:</span>
                <span className="font-medium text-gray-900">
                  {binderData.metadata.statistics.cardCount}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Squares2X2Icon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Grid Size:</span>
                <span className="font-medium text-gray-900">
                  {binderData.settings?.gridSize || "3x3"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <FolderIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Unique Sets:</span>
                <span className="font-medium text-gray-900">
                  {binderData.metadata.statistics.uniqueSets}
                </span>
              </div>

              {binderData.metadata.category && (
                <div className="flex items-center gap-3 text-sm">
                  <TagIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {binderData.metadata.category}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Updated:</span>
                <span className="font-medium text-gray-900">
                  {new Date(
                    binderData.metadata.statistics.lastUpdated
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>

            {binderData.metadata.description && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Description
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {binderData.metadata.description}
                </p>
              </div>
            )}

            {binderData.metadata.tags &&
              binderData.metadata.tags.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {binderData.metadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Main Binder Area */}
        <div className="flex-1 flex mt-10 justify-center relative">
          {/* Sidebar Toggle Button */}
          <div className="absolute top-4 left-4 z-50">
            <button
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              className="p-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              title={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                {isSidebarVisible ? "Hide Info" : "Show Info"}
              </span>
            </button>
          </div>

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
                binder={binderData}
                isReadOnly={true}
                isPublicView={true}
              />
            ) : (
              <CardPage
                pageNumber={pageConfig.leftPage.pageNumber}
                cards={getCardsForPage(pageConfig.leftPage.cardPageIndex)}
                gridSize={binderData.settings.gridSize}
                cardPageIndex={pageConfig.leftPage.cardPageIndex}
                isReadOnly={true}
              />
            )}

            {/* Center Spine */}
            <div className="w-2 bg-gray-400 rounded-full shadow-lg"></div>

            {/* Right Page */}
            <CardPage
              pageNumber={pageConfig.rightPage.pageNumber}
              cards={getCardsForPage(pageConfig.rightPage.cardPageIndex)}
              gridSize={binderData.settings.gridSize}
              cardPageIndex={pageConfig.rightPage.cardPageIndex}
              isReadOnly={true}
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
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
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
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaticBinderPage;

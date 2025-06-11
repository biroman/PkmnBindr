import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Button } from "../ui/Button";
import CoverPage from "../binder/CoverPage";
import CardPage from "../binder/CardPage";
import { fetchBinderForAdminView } from "../../utils/userManagement";
import useBinderDimensions, {
  getGridConfig,
} from "../../hooks/useBinderDimensions";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  ShieldCheckIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

const BinderViewer = () => {
  const navigate = useNavigate();
  const { userId, binderId, source } = useParams();
  const [currentBinder, setCurrentBinder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Custom hook for binder dimensions (same as BinderPage)
  const binderDimensions = useBinderDimensions(
    currentBinder?.settings?.gridSize || "3x3"
  );

  // Calculate total pages (same logic as useBinderPages)
  const totalPages = useMemo(() => {
    if (!currentBinder?.cards || typeof currentBinder.cards !== "object") {
      return Math.max(
        currentBinder?.settings?.minPages || 1,
        currentBinder?.settings?.pageCount || 1
      );
    }

    const storedPageCount = currentBinder?.settings?.pageCount || 1;
    const positions = Object.keys(currentBinder.cards).map((pos) =>
      parseInt(pos)
    );
    const gridConfig = getGridConfig(currentBinder.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;

    if (positions.length === 0) {
      return Math.max(currentBinder?.settings?.minPages || 1, storedPageCount);
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
      currentBinder?.settings?.minPages || 1
    );

    const maxPages = currentBinder?.settings?.maxPages || 100;
    return Math.min(finalPageCount, maxPages);
  }, [
    currentBinder?.cards,
    currentBinder?.settings?.gridSize,
    currentBinder?.settings?.minPages,
    currentBinder?.settings?.maxPages,
    currentBinder?.settings?.pageCount,
  ]);

  // Get page configuration (same logic as useBinderPages)
  const pageConfig = useMemo(() => {
    const physicalPageIndex = currentPageIndex; // No custom page order in admin view

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

  // Load binder data
  useEffect(() => {
    const loadBinder = async () => {
      if (!userId || !binderId) {
        setError("Invalid binder parameters");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log(
          `Loading binder ${binderId} for user ${userId} from ${source}`
        );
        const binderData = await fetchBinderForAdminView(
          binderId,
          userId,
          source
        );

        setCurrentBinder(binderData);
        toast.success(
          `Loaded ${binderData.metadata.name} (${
            Object.keys(binderData.cards || {}).length
          } cards)`
        );
      } catch (err) {
        console.error("Error loading binder:", err);
        setError(err.message);
        toast.error(`Failed to load binder: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadBinder();
  }, [userId, binderId, source]);

  // Navigation handlers (same as BinderPage)
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

  // Get cards for a specific card page index (same as useBinderPages)
  const getCardsForPage = (cardPageIndex) => {
    if (!currentBinder?.cards || typeof currentBinder.cards !== "object")
      return [];

    const gridConfig = getGridConfig(currentBinder.settings?.gridSize || "3x3");
    const cardsPerPage = gridConfig.total;
    const startPosition = cardPageIndex * cardsPerPage;

    const pageCards = [];
    for (let i = 0; i < cardsPerPage; i++) {
      const globalPosition = startPosition + i;
      const cardEntry = currentBinder.cards[globalPosition.toString()];

      if (cardEntry) {
        pageCards[i] = cardEntry; // Already normalized by fetchBinderForAdminView
      } else {
        pageCards[i] = null; // Empty slot
      }
    }

    return pageCards;
  };

  // Handle loading state
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

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheckIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate("/admin")} variant="outline">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Admin Panel
          </Button>
        </div>
      </div>
    );
  }

  // Handle no binder loaded
  if (!currentBinder) {
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
            The requested binder could not be loaded.
          </p>
          <Button onClick={() => navigate("/admin")} variant="outline">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Admin Panel
          </Button>
        </div>
      </div>
    );
  }

  const gridConfig = getGridConfig(currentBinder?.settings?.gridSize || "3x3");

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main Content Layout */}
      <div className="flex h-[calc(100vh-65px)]">
        {/* Left Sidebar - Admin Info & Controls */}
        <div
          className={`${
            isSidebarVisible ? "w-80" : "w-0"
          } bg-white border-r border-slate-200 flex flex-col transition-all duration-300 overflow-hidden`}
        >
          {/* Admin Header */}
          <div className="p-6 border-b border-slate-200">
            <Button
              onClick={() => navigate("/admin")}
              variant="outline"
              size="sm"
              className="mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Admin Panel
            </Button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <EyeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {currentBinder.metadata.name}
                </h1>
                <p className="text-sm text-gray-500">Admin View • Read Only</p>
              </div>
            </div>
          </div>

          {/* Binder Information */}
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Binder Information
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Owner:</span>
                <span className="font-mono text-gray-900 text-xs">
                  {currentBinder.ownerId}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Squares2X2Icon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Grid Size:</span>
                <span className="font-medium text-gray-900">
                  {currentBinder.settings?.gridSize || "3x3"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Total Cards:</span>
                <span className="font-medium text-gray-900">
                  {Object.keys(currentBinder.cards || {}).length}
                </span>
              </div>

              {currentBinder.metadata.createdAt && (
                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(
                      currentBinder.metadata.createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
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
              <CoverPage binder={currentBinder} isReadOnly={true} />
            ) : (
              <CardPage
                pageNumber={pageConfig.leftPage.pageNumber}
                cards={getCardsForPage(pageConfig.leftPage.cardPageIndex)}
                gridSize={currentBinder.settings.gridSize}
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
              gridSize={currentBinder.settings.gridSize}
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

export default BinderViewer;

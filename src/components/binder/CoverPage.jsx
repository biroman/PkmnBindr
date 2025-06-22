import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GlobeAltIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useBinderContext } from "../../contexts/BinderContext";
import { toast } from "react-hot-toast";
import ContactModal from "./ContactModal";
import UserProfileCard from "../ui/UserProfileCard";
import BinderInteractionButtons from "../ui/BinderInteractionButtons";

const CoverPage = ({
  binder,
  owner = null,
  isReadOnly = false,
  isPublicView = false,
  backgroundColor = "#ffffff",
  isMobile = false,
  dimensions = null,
}) => {
  const navigate = useNavigate();
  const { updateBinderPrivacy } = useBinderContext();
  const [contactModal, setContactModal] = useState({
    isOpen: false,
    type: "message",
  });
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [showContent, setShowContent] = useState(true);

  const handleProfileClick = () => {
    if (owner?.uid) {
      navigate(`/profile/${owner.uid}`);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!binder || isUpdatingPrivacy) return;

    const isPublic = binder?.permissions?.public || false;
    setIsUpdatingPrivacy(true);

    try {
      await updateBinderPrivacy(binder.id, !isPublic);
      toast.success(
        !isPublic
          ? "Binder is now public! Others can view and interact with it."
          : "Binder is now private. Only you can access it."
      );
    } catch (error) {
      console.error("Error updating binder privacy:", error);
      toast.error("Failed to update binder privacy. Please try again.");
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  // If in read-only mode, show different content based on context
  if (isReadOnly) {
    return (
      <div
        className={`flex-1 shadow-2xl relative overflow-hidden transition-colors duration-300 ${
          isMobile ? "w-full h-full rounded-none" : "rounded-lg"
        }`}
        style={{
          background: backgroundColor?.startsWith("linear-gradient")
            ? backgroundColor
            : undefined,
          backgroundColor: !backgroundColor?.startsWith("linear-gradient")
            ? backgroundColor
            : undefined,
        }}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="grid grid-cols-6 grid-rows-8 h-full gap-1 p-2 rotate-12 scale-110">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="bg-blue-600 rounded-sm"></div>
            ))}
          </div>
        </div>

        {/* Cover content */}
        <div
          className={`relative h-full ${
            isMobile ? "p-2" : "p-3 sm:p-4 md:p-6"
          } flex flex-col items-center justify-center overflow-y-auto`}
        >
          {isPublicView && owner ? (
            <div
              className={`w-full ${
                isMobile ? "max-w-full" : "max-w-lg"
              } mx-auto space-y-${isMobile ? "2" : "4"}`}
            >
              {/* Binder Title */}
              <div className={`text-center ${isMobile ? "mb-3" : "mb-6"}`}>
                <h1
                  className={`${
                    isMobile ? "text-sm" : "text-lg sm:text-xl md:text-2xl"
                  } font-bold mb-2 text-gray-800`}
                >
                  {binder?.metadata?.name || "Pokemon Card Collection"}
                </h1>
              </div>

              {/* Owner Profile Card */}
              <div className="flex justify-center">
                <div
                  onClick={handleProfileClick}
                  className="w-full cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  title={`Visit ${owner?.displayName || "User"}'s profile`}
                >
                  <UserProfileCard
                    user={owner}
                    size={isMobile ? "small" : "large"}
                    editable={false}
                    showBanner={true}
                    showStatus={true}
                    showBadges={true}
                    isOwnProfile={false}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Collection Stats */}
              <div
                className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg ${
                  isMobile ? "p-2" : "p-3 sm:p-4"
                } border border-blue-100`}
              >
                <div
                  className={`space-y-${isMobile ? "1" : "2"} text-xs ${
                    isMobile ? "" : "sm:text-sm"
                  } text-gray-700 text-center`}
                >
                  <p className="flex items-center justify-center gap-2">
                    <span>📊</span>
                    <strong>
                      {Object.keys(binder?.cards || {}).length}
                    </strong>{" "}
                    Cards in Collection
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <span>📅</span>
                    Created{" "}
                    {binder?.metadata?.createdAt
                      ? new Date(binder.metadata.createdAt).toLocaleDateString()
                      : "Recently"}
                  </p>
                  {binder?.metadata?.description && (
                    <p
                      className={`text-center ${
                        isMobile ? "mt-2" : "mt-3"
                      } text-gray-600 italic`}
                    >
                      "{binder.metadata.description}"
                    </p>
                  )}
                </div>
              </div>

              {/* Interaction Buttons */}
              <div className="flex justify-center">
                <BinderInteractionButtons
                  binderId={binder?.id}
                  ownerId={owner?.uid}
                  binderMetadata={{
                    name: binder?.metadata?.name,
                    ownerName: owner?.displayName,
                    ownerId: owner?.uid,
                    cardCount: Object.keys(binder?.cards || {}).length,
                  }}
                  size={isMobile ? "small" : "default"}
                  showLabels={true}
                  showCounts={true}
                  layout="horizontal"
                  className={`w-full ${isMobile ? "max-w-full" : "max-w-xs"}`}
                />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h1
                className={`${
                  isMobile ? "text-sm" : "text-lg sm:text-xl md:text-2xl"
                } font-bold mb-2 text-gray-800`}
              >
                {binder?.metadata?.name || "Pokemon Card Collection"}
              </h1>
              <p className="text-xs opacity-60 text-slate-400">
                {isPublicView ? "Public Collection" : "Admin View"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const appTips = [
    {
      icon: "⌨️",
      title: "Arrow Key Navigation",
      description:
        "Use left and right arrow keys to quickly navigate between pages",
    },
    {
      icon: "🖱️",
      title: "Drag to Navigate",
      description:
        "Drag cards to the left/right edges to quickly switch pages while dragging",
    },
    {
      icon: "📋",
      title: "Page Overview",
      description:
        "Click the grid icon in toolbar to see all pages and drag them to reorder",
    },
    {
      icon: "➕",
      title: "Quick Add Cards",
      description:
        "Click any empty slot to instantly add cards to that specific position",
    },
    {
      icon: "⚙️",
      title: "Settings Panel",
      description:
        "Use the settings button (top-right) to change grid size, edit name, and manage pages",
    },
    {
      icon: "👁️",
      title: "Mark Missing Cards",
      description:
        "Hover over any card and click the orange button to mark it as missing/collected",
    },
    {
      icon: "🔄",
      title: "Drag & Drop",
      description:
        "Simply drag cards between slots to reorganize your collection",
    },
  ];

  const keyboardShortcuts = [
    { key: "← →", action: "Navigate between pages" },
    { key: "Ctrl + Click", action: "Multi-select pages" },
    { key: "Drag Edge", action: "Auto page navigation" },
    { key: "Empty Slot Click", action: "Add card to position" },
  ];

  const gridFeatures = [
    { size: "2×2", cards: "4 cards per page" },
    { size: "3×3", cards: "9 cards per page" },
    { size: "4×3", cards: "12 cards per page" },
    { size: "4×4", cards: "16 cards per page" },
  ];

  return (
    <div
      className={`flex-1 shadow-2xl relative overflow-hidden transition-colors duration-300 ${
        isMobile ? "w-full h-full rounded-none" : "rounded-lg"
      }`}
      style={{
        background: backgroundColor?.startsWith("linear-gradient")
          ? backgroundColor
          : undefined,
        backgroundColor: !backgroundColor?.startsWith("linear-gradient")
          ? backgroundColor
          : undefined,
      }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="grid grid-cols-6 grid-rows-8 h-full gap-1 p-2 rotate-12 scale-110">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="bg-blue-600 rounded-sm"></div>
          ))}
        </div>
      </div>

      {/* Content Toggle Button - Top Right */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => setShowContent(!showContent)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border transition-all duration-200 ${
            isMobile ? "text-xs" : "text-sm"
          } ${
            showContent
              ? "bg-white/90 hover:bg-white border-gray-200 text-gray-700 hover:text-gray-900"
              : "bg-gray-800/90 hover:bg-gray-800 border-gray-600 text-white"
          } backdrop-blur-sm`}
          title={showContent ? "Hide cover content" : "Show cover content"}
        >
          {showContent ? (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M18.364 18.364L16.95 16.95M12 6.732a3 3 0 11-1.732 1.732M19.071 4.929a10.05 10.05 0 01-1.563 3.029"
                />
              </svg>
              {!isMobile && "Hide"}
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {!isMobile && "Show"}
            </>
          )}
        </button>
      </div>

      {/* Main content - scales with container */}
      <div
        className={`relative h-full ${
          isMobile ? "p-2 text-xs" : "p-3 sm:p-4 md:p-6"
        } overflow-y-auto`}
      >
        {showContent ? (
          <>
            {/* Header - responsive text sizes */}
            <div
              className={`text-center ${
                isMobile ? "mb-2" : "mb-3 sm:mb-4 md:mb-6"
              }`}
            >
              <div
                className={`inline-flex items-center ${
                  isMobile ? "gap-1 mb-1" : "gap-2 sm:gap-3 mb-2 sm:mb-3"
                }`}
              >
                <h1
                  className={`${
                    isMobile ? "text-xs" : "text-base sm:text-xl md:text-2xl"
                  } font-bold text-gray-800 leading-tight`}
                >
                  Binder Quick Guide
                </h1>
              </div>
              <p
                className={`${
                  isMobile ? "text-xs" : "text-xs sm:text-sm"
                } text-gray-600 font-medium`}
              >
                Tips & Shortcuts for{" "}
                {binder?.metadata?.name || "Your Collection"}
              </p>

              {/* Public/Private Toggle - Only show when not in read-only mode */}
              {!isReadOnly && (
                <div className="mt-3 sm:mt-4 flex justify-center">
                  <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200 shadow-sm">
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                      {binder?.permissions?.public ? (
                        <GlobeAltIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <LockClosedIcon className="w-4 h-4 text-gray-600" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          binder?.permissions?.public
                            ? "text-green-800"
                            : "text-gray-800"
                        }`}
                      >
                        {binder?.permissions?.public ? "Public" : "Private"}
                      </span>
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={handleTogglePrivacy}
                      disabled={isUpdatingPrivacy}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        isUpdatingPrivacy
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : binder?.permissions?.public
                          ? "bg-gray-600 hover:bg-gray-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      {isUpdatingPrivacy ? (
                        <>
                          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          {binder?.permissions?.public ? (
                            <>
                              <LockClosedIcon className="w-3.5 h-3.5" />
                              Make Private
                            </>
                          ) : (
                            <>
                              <GlobeAltIcon className="w-3.5 h-3.5" />
                              Make Public
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main tips - responsive grid */}
            <div
              className={`grid ${
                isMobile
                  ? "grid-cols-1 gap-1 mb-2"
                  : "grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6"
              }`}
            >
              {appTips.map((tip, index) => (
                <div
                  key={index}
                  className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md ${
                    isMobile ? "p-1.5" : "sm:rounded-lg p-2 sm:p-3"
                  } border border-blue-100 ${
                    isMobile ? "" : "hover:shadow-sm sm:hover:shadow-md"
                  } transition-shadow duration-200`}
                >
                  <div
                    className={`flex items-start ${
                      isMobile ? "gap-1" : "gap-2"
                    }`}
                  >
                    <div
                      className={`${
                        isMobile ? "text-xs" : "text-sm sm:text-base md:text-lg"
                      } flex-shrink-0 mt-0.5`}
                    >
                      {tip.icon}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`font-semibold text-gray-800 ${
                          isMobile
                            ? "text-xs mb-0.5"
                            : "text-xs sm:text-sm mb-1"
                        }`}
                      >
                        {tip.title}
                      </h3>
                      <p
                        className={`text-gray-600 ${
                          isMobile
                            ? "text-xs leading-tight"
                            : "text-xs leading-relaxed"
                        }`}
                      >
                        {tip.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Section - Encourage feedback (hidden in read-only mode) */}
            {!isReadOnly && (
              <div className="mt-3 sm:mt-4 md:mt-6 pt-2 sm:pt-3 md:pt-4 border-t border-gray-200">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-md sm:rounded-lg p-3 sm:p-4 border border-amber-200">
                  <div className="text-center mb-2 sm:mb-3">
                    <h3 className="text-sm sm:text-base font-semibold text-amber-900 mb-1">
                      Help us improve! 💡
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-700 leading-relaxed">
                      Experience bugs? Missing features? Ideas for improvement?
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() =>
                        setContactModal({ isOpen: true, type: "bug" })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors duration-200"
                    >
                      <span>🐛</span>
                      Report Bug
                    </button>
                    <button
                      onClick={() =>
                        setContactModal({ isOpen: true, type: "feature" })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors duration-200"
                    >
                      <span>✨</span>
                      Request Feature
                    </button>
                    <button
                      onClick={() =>
                        setContactModal({ isOpen: true, type: "message" })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors duration-200"
                    >
                      <span>💭</span>
                      Share Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Admin View Notice (shown only in read-only mode) */}
            {isReadOnly && (
              <div className="mt-3 sm:mt-4 md:mt-6 pt-2 sm:pt-3 md:pt-4 border-t border-gray-200">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md sm:rounded-lg p-3 sm:p-4 border border-blue-200">
                  <div className="text-center">
                    <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-1">
                      👁️ Admin View Mode
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                      You are viewing this binder as an administrator. This is a
                      read-only view.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer - scales with container */}
            <div className="text-center mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Created{" "}
                {binder?.metadata?.createdAt
                  ? new Date(binder.metadata.createdAt).toLocaleDateString()
                  : "Today"}{" "}
                • Start collecting!
              </p>
            </div>
          </>
        ) : (
          /* Clean cover view when content is hidden */
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1
                className={`${
                  isMobile ? "text-lg" : "text-2xl sm:text-3xl md:text-4xl"
                } font-bold text-gray-800 mb-2`}
              >
                {binder?.metadata?.name || "Pokemon Card Collection"}
              </h1>
              <p
                className={`${
                  isMobile ? "text-sm" : "text-base sm:text-lg"
                } text-gray-600`}
              >
                {Object.keys(binder?.cards || {}).length} Cards • Created{" "}
                {binder?.metadata?.createdAt
                  ? new Date(binder.metadata.createdAt).toLocaleDateString()
                  : "Recently"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Modal (only in non-read-only mode) */}
      {!isReadOnly && (
        <ContactModal
          isOpen={contactModal.isOpen}
          type={contactModal.type}
          onClose={() => setContactModal({ isOpen: false, type: "message" })}
        />
      )}
    </div>
  );
};

export default CoverPage;

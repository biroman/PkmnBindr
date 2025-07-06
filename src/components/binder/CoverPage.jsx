import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GlobeAltIcon,
  LockClosedIcon,
  ArrowPathIcon,
  QrCodeIcon,
  CursorArrowRaysIcon,
} from "@heroicons/react/24/outline";
import { Eye, EyeOff } from "lucide-react";
import { useBinderContext } from "../../contexts/BinderContext";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import ContactModal from "./ContactModal";
import UserProfileCard from "../ui/UserProfileCard";
import SupportUsCTA from "../ui/SupportUsCTA";
// import BinderInteractionButtons from "../ui/BinderInteractionButtons";  // Disabled

const CoverPage = ({
  binder,
  owner = null,
  isReadOnly = false,
  isPublicView = false,
  backgroundColor = "#ffffff",
  isMobile = false,
  dimensions = null,
  shareUrl = null,
  showQRCode = false,
  onToggleQRCode = null,
}) => {
  const navigate = useNavigate();
  const { updateBinderPrivacy } = useBinderContext();
  const { user } = useAuth();
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
        {/* Action Buttons - Top Right (for readonly mode) */}
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          {/* QR Code Button - Only for shared binders */}
          {shareUrl && onToggleQRCode && (
            <button
              onClick={onToggleQRCode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg border transition-all duration-200 ${
                isMobile ? "text-sm" : "text-sm"
              } font-medium ${
                showQRCode
                  ? "bg-blue-600 hover:bg-blue-700 border-blue-500 text-white"
                  : "bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              } backdrop-blur-sm`}
              title={showQRCode ? "Hide QR Code" : "Show QR Code for sharing"}
            >
              <QrCodeIcon className="w-4 h-4" />
              <span>{showQRCode ? "Hide QR Code" : "Share"}</span>
            </button>
          )}
        </div>

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
          {showQRCode && shareUrl ? (
            /* QR Code View for readonly mode */
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center mb-6">
                <h2
                  className={`${
                    isMobile ? "text-lg" : "text-2xl md:text-3xl"
                  } font-bold text-gray-900 dark:text-gray-100 mb-2`}
                >
                  Scan to Share
                </h2>
                <p
                  className={`${
                    isMobile ? "text-sm" : "text-base"
                  } text-gray-600 dark:text-gray-400`}
                >
                  Scan this QR code to share "
                  {binder?.metadata?.name || "this binder"}" with others
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-600">
                <QRCodeSVG
                  value={shareUrl}
                  size={isMobile ? 200 : 280}
                  level="M"
                  includeMargin={true}
                  className="block"
                />
              </div>

              <div className="mt-6 text-center max-w-md">
                <p
                  className={`${
                    isMobile ? "text-xs" : "text-sm"
                  } text-gray-500 dark:text-gray-400 break-all font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-600`}
                >
                  {shareUrl}
                </p>
              </div>
            </div>
          ) : isPublicView && owner ? (
            <div className="w-full h-full flex flex-col">
              {/* Website Logo at Top */}
              <div
                className={`flex justify-center ${
                  isMobile ? "pt-4 pb-6" : "pt-8 pb-8"
                }`}
              >
                <div className="text-center">
                  <div
                    className={`${
                      isMobile ? "text-3xl" : "text-6xl"
                    } font-bold text-gray-800 dark:text-gray-200 mb-1`}
                  >
                    pkmnbindr
                  </div>
                  <div
                    className={`${
                      isMobile ? "text-xs" : "text-lg"
                    } text-gray-600 dark:text-gray-400`}
                  >
                    Pokemon Card Collection Platform
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex items-center justify-center">
                <div
                  className={`w-full ${
                    isMobile ? "max-w-full px-4" : "max-w-2xl"
                  } mx-auto text-center space-y-${isMobile ? "6" : "8"}`}
                >
                  {/* Binder Title */}
                  <div>
                    <h1
                      className={`${
                        isMobile ? "text-xl" : "text-4xl md:text-5xl"
                      } font-bold mb-4 text-gray-900 dark:text-gray-100`}
                    >
                      {binder?.metadata?.name || "Pokemon Card Collection"}
                    </h1>
                    {binder?.metadata?.description && (
                      <p
                        className={`${
                          isMobile ? "text-sm" : "text-lg"
                        } text-gray-600 italic leading-relaxed ${
                          isMobile ? "max-w-full" : "max-w-lg"
                        } mx-auto`}
                      >
                        "{binder.metadata.description}"
                      </p>
                    )}
                  </div>

                  {/* Collection Stats */}
                  <div
                    className={`bg-white/80 backdrop-blur-sm rounded-2xl ${
                      isMobile ? "p-4" : "p-6"
                    } border border-white/20 shadow-lg`}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div
                          className={`${
                            isMobile ? "text-2xl" : "text-3xl"
                          } font-bold text-blue-600 mb-1`}
                        >
                          {Object.keys(binder?.cards || {}).length}
                        </div>
                        <div
                          className={`${
                            isMobile ? "text-xs" : "text-sm"
                          } text-gray-600`}
                        >
                          Cards
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`${
                            isMobile ? "text-sm" : "text-lg"
                          } font-semibold text-gray-900 mb-1`}
                        >
                          {binder?.metadata?.createdAt
                            ? new Date(
                                binder.metadata.createdAt
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              })
                            : "Recent"}
                        </div>
                        <div
                          className={`${
                            isMobile ? "text-xs" : "text-sm"
                          } text-gray-600`}
                        >
                          Created
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Call to Action for Non-Users */}
                  {!user && (
                    <div
                      className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl ${
                        isMobile ? "p-4" : "p-6"
                      } border border-blue-100`}
                    >
                      <h3
                        className={`${
                          isMobile ? "text-lg" : "text-xl"
                        } font-semibold text-gray-900 mb-3`}
                      >
                        Create Your Own Collection
                      </h3>
                      <p
                        className={`${
                          isMobile ? "text-sm" : "text-base"
                        } text-gray-600 ${isMobile ? "mb-4" : "mb-6"}`}
                      >
                        Join thousands of collectors organizing their Pokemon
                        cards with pkmnbindr
                      </p>
                      <div
                        className={`flex ${
                          isMobile ? "flex-col" : "flex-col sm:flex-row"
                        } gap-3 justify-center`}
                      >
                        <button
                          onClick={() => navigate("/auth/register")}
                          className={`${
                            isMobile ? "px-4 py-2 text-sm" : "px-6 py-3"
                          } bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md`}
                        >
                          Start Collecting
                        </button>
                        <button
                          onClick={() => navigate("/auth/login")}
                          className={`${
                            isMobile ? "px-4 py-2 text-sm" : "px-6 py-3"
                          } border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium`}
                        >
                          Sign In
                        </button>
                      </div>
                    </div>
                  )}

                  {/* User Already Signed In */}
                  {user && (
                    <>
                      <div
                        className={`bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl ${
                          isMobile ? "p-4" : "p-6"
                        } border border-green-100`}
                      >
                        <h3
                          className={`${
                            isMobile ? "text-lg" : "text-xl"
                          } font-semibold text-gray-900 mb-3`}
                        >
                          Welcome back, {user.displayName || "Collector"}!
                        </h3>
                        <p
                          className={`${
                            isMobile ? "text-sm" : "text-base"
                          } text-gray-600 ${isMobile ? "mb-3" : "mb-4"}`}
                        >
                          Ready to organize your own collection?
                        </p>
                        <button
                          onClick={() => navigate("/binders")}
                          className={`${
                            isMobile ? "px-4 py-2 text-sm" : "px-6 py-3"
                          } bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md`}
                        >
                          View My Binders
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h1
                className={`${
                  isMobile ? "text-sm" : "text-lg sm:text-xl md:text-2xl"
                } font-bold mb-2 text-gray-800 dark:text-gray-200`}
              >
                {binder?.metadata?.name || "Pokemon Card Collection"}
              </h1>
              <p className="text-xs opacity-60 text-slate-400 dark:text-slate-500">
                {isPublicView ? "Public Collection" : "Admin View"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const allTips = [
    {
      icon: "⌨️",
      title: "Arrow Key Navigation",
      description:
        "Use left and right arrow keys to quickly navigate between pages",
      device: "desktop",
    },
    {
      icon: "🖱️",
      title: "Drag to Navigate",
      description:
        "Drag cards to the left/right edges to quickly switch pages while dragging",
      device: "desktop",
    },
    {
      icon: "📋",
      title: "Page Overview",
      description:
        "Tap the grid icon in the toolbar to see all pages and drag them to reorder",
      // available on both devices
    },
    {
      icon: "➕",
      title: "Quick Add Cards (Mobile)",
      description:
        "Tap any empty slot to instantly add cards to that specific position",
      device: "mobile",
    },
    {
      icon: "➕",
      title: "Quick Add Cards (Desktop)",
      description:
        "Click any empty slot to instantly add cards to that specific position",
      device: "desktop",
    },
    {
      icon: "⚙️",
      title: "Settings Panel",
      description:
        "Use the settings button to change grid size, edit name, and manage pages",
      // neutral tip
    },
    {
      icon: "👁️",
      title: "Mark Missing Cards (Desktop)",
      description:
        "Hover a card and click the orange button to mark it missing/collected",
      device: "desktop",
    },
    {
      icon: "👆",
      title: "Mark Missing Cards (Mobile)",
      description: "Double-tap a card to toggle missing/collected status",
      device: "mobile",
    },
    {
      icon: "🔄",
      title: "Drag & Drop",
      description:
        "Simply drag cards between slots to reorganize your collection",
      // applies to both
    },
    {
      icon: <CursorArrowRaysIcon className="w-4 h-4 text-green-600" />,
      title: "Select Multiple Cards",
      description:
        "Use the selection button in the toolbar to select and move multiple cards at the same time",
      // applies to both
    },
    {
      icon: "⋮",
      title: "More Menu (Mobile)",
      description:
        "Tap the ⋮ button to access actions like Select, Share, and Clear Binder",
      device: "mobile",
    },
    {
      icon: "👆",
      title: "Swipe Page Switch",
      description:
        "While dragging a card, move it to the left or right side of the bottom toolbar to flip pages automatically",
      device: "mobile",
    },
  ];

  const appTips = allTips.filter((tip) => {
    if (!tip.device) return true;
    return tip.device === (isMobile ? "mobile" : "desktop");
  });

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

      {/* Action Buttons - Top Right */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        {/* QR Code Button - Only for shared binders */}
        {shareUrl && onToggleQRCode && (
          <button
            onClick={onToggleQRCode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg border transition-all duration-200 ${
              isMobile ? "text-sm" : "text-sm"
            } font-medium ${
              showQRCode
                ? "bg-blue-600 hover:bg-blue-700 border-blue-500 text-white"
                : "bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            } backdrop-blur-sm`}
            title={showQRCode ? "Hide QR Code" : "Show QR Code for sharing"}
          >
            <QrCodeIcon className="w-4 h-4" />
            <span>{showQRCode ? "Hide QR Code" : "Share"}</span>
          </button>
        )}

        {/* Content Toggle Button */}
        <button
          onClick={() => setShowContent(!showContent)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border transition-all duration-200 ${
            isMobile ? "text-xs" : "text-sm"
          } ${
            showContent
              ? "bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              : "bg-gray-800/90 dark:bg-gray-200/90 hover:bg-gray-800 dark:hover:bg-gray-200 border-gray-600 dark:border-gray-300 text-white dark:text-gray-800"
          } backdrop-blur-sm`}
          title={showContent ? "Hide cover content" : "Show cover content"}
        >
          {showContent ? (
            <>
              <EyeOff className="w-4 h-4" />
              {!isMobile && "Hide"}
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
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
        {showQRCode && shareUrl ? (
          /* QR Code View */
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-center mb-6">
              <h2
                className={`${
                  isMobile ? "text-lg" : "text-2xl md:text-3xl"
                } font-bold text-gray-900 dark:text-gray-100 mb-2`}
              >
                Scan to Share
              </h2>
              <p
                className={`${
                  isMobile ? "text-sm" : "text-base"
                } text-gray-600 dark:text-gray-400`}
              >
                Scan this QR code to share "
                {binder?.metadata?.name || "this binder"}" with others
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
              <QRCodeSVG
                value={shareUrl}
                size={isMobile ? 200 : 280}
                level="M"
                includeMargin={true}
                className="block"
              />
            </div>

            <div className="mt-6 text-center max-w-md">
              <p
                className={`${
                  isMobile ? "text-xs" : "text-sm"
                } text-gray-500 break-all font-mono bg-gray-50 p-2 rounded-lg border`}
              >
                {shareUrl}
              </p>
            </div>
          </div>
        ) : showContent ? (
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

              {/* Public/Private Toggle - HIDDEN FOR NOW - Only show when not in read-only mode */}
              {false && !isReadOnly && (
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
                  className={`bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-md ${
                    isMobile ? "p-1.5" : "sm:rounded-lg p-2 sm:p-3"
                  } border border-blue-100 dark:border-blue-800 ${
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
                        className={`font-semibold text-gray-800 dark:text-gray-200 ${
                          isMobile
                            ? "text-xs mb-0.5"
                            : "text-xs sm:text-sm mb-1"
                        }`}
                      >
                        {tip.title}
                      </h3>
                      <p
                        className={`text-gray-600 dark:text-gray-400 ${
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

            {/* Support CTA - prominently displayed for logged-in users */}
            {user && !isReadOnly && (
              <div className="mb-4 flex flex-col items-center text-center">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2 max-w-xs sm:max-w-md">
                  PkmnBindr is a passion project I run solo in my spare time and
                  keep completely free. If it helps you, consider supporting me,
                  your support helps me pay for the monthly costs to run this
                  website.
                </p>
                <SupportUsCTA />
              </div>
            )}

            {/* Discord Community Section (hidden in read-only mode) */}
            {!isReadOnly && (
              <div className="mt-3 sm:mt-4 md:mt-6 pt-2 sm:pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-md sm:rounded-lg p-3 sm:p-4 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-center mb-3 sm:mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-indigo-900 dark:text-indigo-200 mb-1">
                      Join Our New Growing Community!
                    </h3>
                    <p className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed mb-3">
                      Connect with fellow collectors, request features, discuss,
                      share binders, ask questions, report bugs, and more!
                    </p>
                  </div>

                  <div className="text-center mt-3">
                    <a
                      href="https://discord.gg/HYB88JAZhU"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors duration-200 shadow-sm"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z" />
                      </svg>
                      Open Discord
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Section - Encourage feedback (hidden in read-only mode) */}
            {!isReadOnly && (
              <div className="mt-3 sm:mt-4 md:mt-6 pt-2 sm:pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-md sm:rounded-lg p-3 sm:p-4 border border-amber-200 dark:border-amber-800">
                  <div className="text-center mb-2 sm:mb-3">
                    <h3 className="text-sm sm:text-base font-semibold text-amber-900 dark:text-amber-200 mb-1">
                      Help us improve! 💡
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                      Experience bugs? Missing features? Ideas for improvement?
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() =>
                        setContactModal({ isOpen: true, type: "bug" })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 border border-amber-300 dark:border-amber-700 rounded-md transition-colors duration-200"
                    >
                      <span>🐛</span>
                      Report Bug
                    </button>
                    <button
                      onClick={() =>
                        setContactModal({ isOpen: true, type: "feature" })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 border border-amber-300 dark:border-amber-700 rounded-md transition-colors duration-200"
                    >
                      <span>✨</span>
                      Request Feature
                    </button>
                    <button
                      onClick={() =>
                        setContactModal({ isOpen: true, type: "message" })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 border border-amber-300 dark:border-amber-700 rounded-md transition-colors duration-200"
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
              <div className="mt-3 sm:mt-4 md:mt-6 pt-2 sm:pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-md sm:rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-center">
                    <h3 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-200 mb-1">
                      👁️ Admin View Mode
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                      You are viewing this binder as an administrator. This is a
                      read-only view.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer - scales with container */}
            <div className="text-center mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
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
                } font-bold text-gray-800 dark:text-gray-200 mb-2`}
              >
                {binder?.metadata?.name || "Pokemon Card Collection"}
              </h1>
              <p
                className={`${
                  isMobile ? "text-sm" : "text-base sm:text-lg"
                } text-gray-600 dark:text-gray-400`}
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

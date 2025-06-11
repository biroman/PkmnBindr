import { useState } from "react";
import ContactModal from "./ContactModal";

const CoverPage = ({ binder, isReadOnly = false, isPublicView = false }) => {
  const [contactModal, setContactModal] = useState({
    isOpen: false,
    type: "message",
  });

  // If in read-only mode, show different content based on context
  if (isReadOnly) {
    return (
      <div className="flex-1 bg-white rounded-lg shadow-2xl relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="grid grid-cols-6 grid-rows-8 h-full gap-1 p-2 rotate-12 scale-110">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="bg-blue-600 rounded-sm"></div>
            ))}
          </div>
        </div>

        {/* Cover content */}
        <div className="relative h-full p-3 sm:p-4 md:p-6 flex flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-gray-800">
              {binder?.metadata?.name || "Pokemon Card Collection"}
            </h1>

            {isPublicView ? (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-sm sm:text-base text-gray-600 font-medium">
                  🎯 Complete Pokemon Card Collection Showcase
                </p>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 border border-blue-100">
                  <div className="space-y-2 text-xs sm:text-sm text-gray-700">
                    <p className="flex items-center justify-center gap-2">
                      <span>📊</span>
                      <strong>
                        {binder?.metadata?.statistics?.cardCount || 0}
                      </strong>{" "}
                      Premium Trading Cards
                    </p>
                    <p className="flex items-center justify-center gap-2">
                      <span>⭐</span>
                      Rare Holos, First Editions & Special Cards
                    </p>
                    <p className="flex items-center justify-center gap-2">
                      <span>🔍</span>
                      Professionally Organized & Catalogued
                    </p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>
                    🎮 Browse this collection to discover rare Pokemon cards
                  </p>
                  <p>
                    💎 Perfect for collectors, traders, and Pokemon enthusiasts
                  </p>
                  <p>📱 Use arrow buttons to navigate through pages</p>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-2 sm:p-3 border border-yellow-200">
                  <p className="text-xs sm:text-sm text-yellow-800 font-medium">
                    ✨ Start your own Pokemon card collection today!
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-60 text-slate-400">Admin View</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const appTips = [
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
    <div className="flex-1 bg-white rounded-lg shadow-2xl relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="grid grid-cols-6 grid-rows-8 h-full gap-1 p-2 rotate-12 scale-110">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="bg-blue-600 rounded-sm"></div>
          ))}
        </div>
      </div>

      {/* Main content - scales with container */}
      <div className="relative h-full p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Header - responsive text sizes */}
        <div className="text-center mb-3 sm:mb-4 md:mb-6">
          <div className="inline-flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 leading-tight">
              Binder Quick Guide
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            Tips & Shortcuts for {binder?.metadata?.name || "Your Collection"}
          </p>
        </div>

        {/* Main tips - responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
          {appTips.map((tip, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md sm:rounded-lg p-2 sm:p-3 border border-blue-100 hover:shadow-sm sm:hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start gap-2">
                <div className="text-sm sm:text-base md:text-lg flex-shrink-0 mt-0.5">
                  {tip.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 text-xs sm:text-sm mb-1">
                    {tip.title}
                  </h3>
                  <p className="text-gray-600 text-xs leading-relaxed">
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
                  onClick={() => setContactModal({ isOpen: true, type: "bug" })}
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

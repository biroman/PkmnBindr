import { useState } from "react";
import { ShareIcon } from "@heroicons/react/24/outline";
import ShareLinkManager from "./ShareLinkManager";

const ShareButton = ({
  currentBinder,
  className = "",
  variant = "toolbar", // "toolbar", "inline", "card"
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Don't show share button if no binder or binder is not public
  if (!currentBinder || !currentBinder.permissions?.public) {
    return null;
  }

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsShareModalOpen(false);
  };

  // Toolbar variant for the main binder toolbar
  if (variant === "toolbar") {
    return (
      <>
        <button
          onClick={handleShareClick}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
            hover:bg-white/10 hover:scale-110 active:scale-95 text-white/70 hover:text-white
            ${className}
          `}
          title="Share Binder"
        >
          <ShareIcon className="w-5 h-5" />
        </button>

        {isShareModalOpen && (
          <ShareLinkManager
            binder={currentBinder}
            isOpen={isShareModalOpen}
            onClose={handleCloseModal}
          />
        )}
      </>
    );
  }

  // Inline variant for use in other components
  if (variant === "inline") {
    return (
      <>
        <button
          onClick={handleShareClick}
          className={`
            flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
            hover:bg-blue-700 transition-colors font-medium
            ${className}
          `}
        >
          <ShareIcon className="w-4 h-4" />
          Share
        </button>

        {isShareModalOpen && (
          <ShareLinkManager
            binder={currentBinder}
            isOpen={isShareModalOpen}
            onClose={handleCloseModal}
          />
        )}
      </>
    );
  }

  // Card variant for binder cards
  if (variant === "card") {
    return (
      <>
        <button
          onClick={handleShareClick}
          className={`
            p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 
            rounded-lg transition-colors
            ${className}
          `}
          title="Share Binder"
        >
          <ShareIcon className="w-4 h-4" />
        </button>

        {isShareModalOpen && (
          <ShareLinkManager
            binder={currentBinder}
            isOpen={isShareModalOpen}
            onClose={handleCloseModal}
          />
        )}
      </>
    );
  }

  return null;
};

export default ShareButton;

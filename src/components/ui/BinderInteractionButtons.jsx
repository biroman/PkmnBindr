import React, { useState, useEffect } from "react";
import { HeartIcon, BookmarkIcon } from "@heroicons/react/24/outline";
import {
  HeartIcon as HeartSolidIcon,
  BookmarkIcon as BookmarkSolidIcon,
} from "@heroicons/react/24/solid";
import { BinderInteractionService } from "../../services/BinderInteractionService";
import { useAuth } from "../../hooks/useAuth";

const BinderInteractionButtons = ({
  binderId,
  ownerId,
  binderMetadata = {},
  className = "",
  size = "default", // "small", "default", "large"
  showLabels = true,
  showCounts = true,
  layout = "horizontal", // "horizontal", "vertical"
}) => {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState({
    isLiked: false,
    isFavorited: false,
    likeCount: 0,
    favoriteCount: 0,
    totalLikes: 0,
    totalFavorites: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({
    like: false,
    favorite: false,
  });

  // Size configurations
  const sizeConfig = {
    small: {
      button: "p-2",
      icon: "w-4 h-4",
      text: "text-xs",
      gap: "gap-1",
    },
    default: {
      button: "p-3",
      icon: "w-5 h-5",
      text: "text-sm",
      gap: "gap-2",
    },
    large: {
      button: "p-4",
      icon: "w-6 h-6",
      text: "text-base",
      gap: "gap-3",
    },
  };

  const config = sizeConfig[size];

  // Load initial interaction data
  useEffect(() => {
    const loadInteractions = async () => {
      if (!user?.uid || !binderId || !ownerId) {
        setLoading(false);
        return;
      }

      try {
        const data = await BinderInteractionService.getBinderInteractions(
          binderId,
          user.uid,
          ownerId
        );
        setInteractions(data);
      } catch (error) {
        console.error("Error loading interactions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInteractions();
  }, [binderId, ownerId, user?.uid]);

  const handleLike = async () => {
    if (!user?.uid || actionLoading.like) return;

    setActionLoading((prev) => ({ ...prev, like: true }));

    try {
      const newLikeState = await BinderInteractionService.toggleLike(
        binderId,
        user.uid,
        interactions.isLiked,
        ownerId
      );

      // Update local state
      setInteractions((prev) => ({
        ...prev,
        isLiked: newLikeState,
        likeCount: newLikeState
          ? prev.likeCount + 1
          : Math.max(0, prev.likeCount - 1),
        totalLikes: newLikeState
          ? prev.totalLikes + 1
          : Math.max(0, prev.totalLikes - 1),
      }));
    } catch (error) {
      console.error("Error handling like:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, like: false }));
    }
  };

  const handleFavorite = async () => {
    if (!user?.uid || actionLoading.favorite) return;

    setActionLoading((prev) => ({ ...prev, favorite: true }));

    try {
      const metadata = {
        name: binderMetadata.name || "Untitled Binder",
        ownerName: binderMetadata.ownerName || "Unknown User",
        ownerId: binderMetadata.ownerId || null,
        cardCount: binderMetadata.cardCount || 0,
      };

      const newFavoriteState = await BinderInteractionService.toggleFavorite(
        binderId,
        user.uid,
        interactions.isFavorited,
        metadata
      );

      // Update local state
      setInteractions((prev) => ({
        ...prev,
        isFavorited: newFavoriteState,
        favoriteCount: newFavoriteState
          ? prev.favoriteCount + 1
          : Math.max(0, prev.favoriteCount - 1),
        totalFavorites: newFavoriteState
          ? prev.totalFavorites + 1
          : Math.max(0, prev.totalFavorites - 1),
      }));
    } catch (error) {
      console.error("Error handling favorite:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, favorite: false }));
    }
  };

  if (!user?.uid) {
    return null; // Don't show buttons for non-authenticated users
  }

  // Don't show like or favorite buttons for own binders
  const isOwnBinder = user?.uid === ownerId;

  // Don't show anything for own binders
  if (isOwnBinder) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={`${layout === "vertical" ? "flex flex-col" : "flex"} ${
          config.gap
        } ${className}`}
      >
        <div
          className={`${config.button} bg-gray-100 rounded-lg animate-pulse`}
        >
          <div className={`${config.icon} bg-gray-300 rounded`}></div>
        </div>
        <div
          className={`${config.button} bg-gray-100 rounded-lg animate-pulse`}
        >
          <div className={`${config.icon} bg-gray-300 rounded`}></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${layout === "vertical" ? "flex flex-col" : "flex"} ${
        config.gap
      } ${className}`}
    >
      {/* Like Button */}
      <button
        onClick={handleLike}
        disabled={actionLoading.like}
        className={`
          ${config.button} 
          ${
            interactions.isLiked
              ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
          }
          border rounded-lg transition-all duration-200 
          ${
            actionLoading.like
              ? "opacity-50 cursor-not-allowed"
              : "hover:shadow-md active:scale-95"
          }
          flex items-center ${config.gap}
        `}
        title={interactions.isLiked ? "Unlike this binder" : "Like this binder"}
      >
        {actionLoading.like ? (
          <div
            className={`${config.icon} animate-spin border-2 border-current border-t-transparent rounded-full`}
          ></div>
        ) : interactions.isLiked ? (
          <HeartSolidIcon className={`${config.icon} text-red-500`} />
        ) : (
          <HeartIcon className={config.icon} />
        )}

        {showLabels && (
          <span className={`${config.text} font-medium`}>
            {interactions.isLiked ? "Liked" : "Like"}
          </span>
        )}

        {showCounts && interactions.likeCount > 0 && (
          <span className={`${config.text} font-semibold`}>
            {interactions.likeCount}
          </span>
        )}
      </button>

      {/* Favorite Button */}
      <button
        onClick={handleFavorite}
        disabled={actionLoading.favorite}
        className={`
          ${config.button}
          ${
            interactions.isFavorited
              ? "bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100"
              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
          }
          border rounded-lg transition-all duration-200 
          ${
            actionLoading.favorite
              ? "opacity-50 cursor-not-allowed"
              : "hover:shadow-md active:scale-95"
          }
          flex items-center ${config.gap}
        `}
        title={
          interactions.isFavorited
            ? "Remove from favorites"
            : "Add to favorites"
        }
      >
        {actionLoading.favorite ? (
          <div
            className={`${config.icon} animate-spin border-2 border-current border-t-transparent rounded-full`}
          ></div>
        ) : interactions.isFavorited ? (
          <BookmarkSolidIcon className={`${config.icon} text-yellow-500`} />
        ) : (
          <BookmarkIcon className={config.icon} />
        )}

        {showLabels && (
          <span className={`${config.text} font-medium`}>
            {interactions.isFavorited ? "Favorited" : "Favorite"}
          </span>
        )}

        {showCounts && interactions.favoriteCount > 0 && (
          <span className={`${config.text} font-semibold`}>
            {interactions.favoriteCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default BinderInteractionButtons;

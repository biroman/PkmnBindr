import React, { useState, useEffect } from "react";
import UserAvatar from "../ui/UserAvatar";
import { Crown } from "lucide-react";
import { getUserProfile } from "../../utils/getUserProfile";

// Helper function for formatting timestamps
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";

  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  } catch (error) {
    return "";
  }
};

const ConversationItem = React.memo(
  ({
    conversation,
    isOwner,
    isSelected,
    userProfiles,
    setUserProfiles,
    onSelect,
  }) => {
    const [otherUserProfile, setOtherUserProfile] = useState(null);
    const unreadCount = isOwner
      ? conversation.unreadByAdmin || 0
      : conversation.unreadByUser || 0;

    const otherUserName = isOwner
      ? conversation.userName
      : conversation.adminName;
    const isOtherUserOwner = !isOwner && conversation.adminName;

    // Fetch the other user's profile data
    useEffect(() => {
      const fetchProfile = async () => {
        const otherUserId = isOwner
          ? conversation.userId
          : conversation.adminId;

        // Check if we already have this profile cached
        if (userProfiles[otherUserId]) {
          setOtherUserProfile(userProfiles[otherUserId]);
          return;
        }

        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Profile fetch timeout")), 5000)
          );

          const profile = await Promise.race([
            getUserProfile(otherUserId),
            timeoutPromise,
          ]);

          setOtherUserProfile(profile);
          setUserProfiles((prev) => ({ ...prev, [otherUserId]: profile }));
        } catch (error) {
          console.error("Error fetching profile:", error);
          // Set fallback profile data
          setOtherUserProfile({
            displayName: otherUserName,
            uid: otherUserId,
            photoURL: null,
          });
        }
      };

      if (conversation?.id) {
        fetchProfile();
      }
    }, [
      conversation?.id,
      isOwner,
      userProfiles,
      otherUserName,
      setUserProfiles,
    ]);

    return (
      <div
        className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
          isSelected
            ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500"
            : "border-l-4 border-transparent"
        }`}
        onClick={() => onSelect(conversation)}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <UserAvatar
              user={
                otherUserProfile || {
                  displayName: otherUserName,
                  uid: isOwner ? conversation.userId : conversation.adminId,
                }
              }
              size="md"
            />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3
                  className={`text-sm font-medium truncate ${
                    unreadCount > 0 ? "font-semibold" : ""
                  } ${
                    isOtherUserOwner
                      ? "text-transparent bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {otherUserName}
                </h3>
                {isOtherUserOwner && (
                  <Crown className="w-3 h-3 text-yellow-500 animate-pulse flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {formatTimestamp(conversation.lastMessageAt)}
              </span>
            </div>

            {conversation.lastMessage && (
              <p
                className={`text-sm text-gray-600 dark:text-gray-300 truncate mt-1 ${
                  unreadCount > 0 ? "font-medium" : ""
                }`}
              >
                {conversation.lastMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ConversationItem.displayName = "ConversationItem";

export default ConversationItem;

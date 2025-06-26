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

// Helper function to check if message contains only emojis
const isEmojiOnly = (text) => {
  if (!text || text.trim() === "") return false;

  // Remove all whitespace and check if remaining characters are all emojis
  const trimmedText = text.replace(/\s/g, "");

  // Regex to match emoji characters (including compound emojis, skin tones, etc.)
  const emojiRegex =
    /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2194}-\u{21AA}\u{23E9}-\u{23FA}\u{24C2}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}\u{200D}]+$/u;

  return emojiRegex.test(trimmedText) && trimmedText.length <= 6; // Max 6 emoji characters for large display
};

const MessageItem = React.memo(
  ({ message, user, isOwner, selectedConversation, userProfiles }) => {
    const [messageUserProfile, setMessageUserProfile] = useState(null);
    const isFromCurrentUser = message.senderId === user?.uid;
    const isFromOwner = message.isAdmin && isOwner && isFromCurrentUser;
    const isOwnerMessage = message.isAdmin && !isFromCurrentUser;

    // Fetch user profile for the message sender
    useEffect(() => {
      const fetchProfile = async () => {
        if (isFromCurrentUser) {
          setMessageUserProfile({
            displayName: user?.displayName,
            photoURL: user?.photoURL,
            uid: user?.uid,
          });
        } else {
          const otherUserId = isOwner
            ? selectedConversation?.userId
            : selectedConversation?.adminId;

          // Check cache first
          if (userProfiles[otherUserId]) {
            setMessageUserProfile(userProfiles[otherUserId]);
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

            setMessageUserProfile(profile);
          } catch (error) {
            setMessageUserProfile({
              displayName: isOwner
                ? selectedConversation?.userName
                : selectedConversation?.adminName,
              uid: otherUserId,
              photoURL: null,
            });
          }
        }
      };

      if (message?.id) {
        fetchProfile();
      }
    }, [
      message?.id,
      isFromCurrentUser,
      selectedConversation?.id,
      user?.uid,
      isOwner,
      selectedConversation?.userId,
      selectedConversation?.adminId,
      selectedConversation?.userName,
      selectedConversation?.adminName,
      userProfiles,
    ]);

    if (!messageUserProfile) {
      return (
        <div className="flex justify-center mb-4">
          <div className="animate-pulse bg-gray-200 w-8 h-8 rounded-full"></div>
        </div>
      );
    }

    const messageIsEmojiOnly = isEmojiOnly(message.message);

    // Special rendering for emoji-only messages
    if (messageIsEmojiOnly) {
      return (
        <div
          className={`flex ${
            isFromCurrentUser ? "justify-end" : "justify-start"
          } mb-4`}
        >
          <div
            className={`flex items-end gap-2 ${
              isFromCurrentUser ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div className="relative flex-shrink-0">
              <UserAvatar user={messageUserProfile} size="sm" />
            </div>

            <div
              className={`flex flex-col ${
                isFromCurrentUser ? "items-end" : "items-start"
              }`}
            >
              {/* Large emoji display */}
              <div className="text-4xl leading-none mb-1">
                {message.message}
              </div>

              {/* Timestamp */}
              <p className="text-xs text-gray-500">
                {formatTimestamp(message.timestamp)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Regular message rendering
    return (
      <div
        className={`flex ${
          isFromCurrentUser ? "justify-end" : "justify-start"
        } mb-4`}
      >
        <div
          className={`flex items-start gap-2 max-w-xs lg:max-w-md ${
            isFromCurrentUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <div className="relative flex-shrink-0 mt-1">
            <UserAvatar user={messageUserProfile} size="sm" />
          </div>

          <div
            className={`flex flex-col ${
              isFromCurrentUser ? "items-end" : "items-start"
            }`}
          >
            {!isFromCurrentUser && (
              <div className="flex items-center gap-1.5 mb-1 ml-2">
                <span
                  className={`text-xs font-semibold ${
                    isOwnerMessage
                      ? "text-transparent bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text"
                      : "text-gray-600"
                  }`}
                >
                  {messageUserProfile?.displayName || "User"}
                </span>
                {isOwnerMessage && (
                  <Crown className="w-3 h-3 text-yellow-500 animate-pulse" />
                )}
              </div>
            )}

            <div
              className={`px-4 py-2 rounded-xl ${
                isFromCurrentUser
                  ? isFromOwner
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border border-yellow-400 shadow-lg"
                    : "bg-blue-500 text-white"
                  : isOwnerMessage
                  ? "bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-900 border border-yellow-200 shadow-md"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {isFromOwner && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-yellow-200">
                    You
                  </span>
                </div>
              )}

              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
              <p
                className={`text-xs mt-1 ${
                  isFromCurrentUser
                    ? isFromOwner
                      ? "text-yellow-100"
                      : "text-blue-200"
                    : isOwnerMessage
                    ? "text-yellow-600"
                    : "text-gray-500"
                }`}
              >
                {formatTimestamp(message.timestamp)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MessageItem.displayName = "MessageItem";

export default MessageItem;

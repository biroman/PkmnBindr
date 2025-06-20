import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMessages, useConversationMessages } from "../hooks/useMessages";
import { useAuth } from "../hooks/useAuth";
import { useRole } from "../contexts/RoleContext";
import UserAvatar from "../components/ui/UserAvatar";
import { Button } from "../components/ui/Button";
import { getUserProfile } from "../utils/getUserProfile";
import { Crown } from "lucide-react";
import {
  InboxIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  InboxIcon as InboxSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
} from "@heroicons/react/24/solid";

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

// Memoized ConversationItem component
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
        className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
          isSelected ? "bg-blue-50 border-blue-200" : ""
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
                      : "text-gray-900"
                  }`}
                >
                  {otherUserName}
                </h3>
                {isOtherUserOwner && (
                  <Crown className="w-3 h-3 text-yellow-500 animate-pulse flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatTimestamp(conversation.lastMessageAt)}
              </span>
            </div>

            {conversation.lastMessage && (
              <p
                className={`text-sm text-gray-600 truncate mt-1 ${
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

// Memoized MessageItem component
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
              className={`px-4 py-2 rounded-lg ${
                isFromCurrentUser
                  ? isFromOwner
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border border-yellow-400 shadow-lg"
                    : "bg-blue-600 text-white"
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
                      : "text-blue-100"
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

const MessagesPage = () => {
  const { user } = useAuth();
  const { isOwner } = useRole();
  const location = useLocation();
  const {
    conversations,
    unreadCount,
    loading,
    error,
    sendMessage,
    markAsRead,
    deleteConversation,
    startConversation,
  } = useMessages();

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [showNewConversationModal, setShowNewConversationModal] =
    useState(false);
  const [preSelectedUser, setPreSelectedUser] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const messagesEndRef = useRef(null);

  const { messages, loading: messagesLoading } = useConversationMessages(
    selectedConversation?.id
  );

  // Handle pre-selected user from navigation state (from admin page)
  useEffect(() => {
    if (location.state?.selectedUser && isOwner) {
      const selectedUser = location.state.selectedUser;
      setPreSelectedUser(selectedUser);
      setShowNewConversationModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, isOwner]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-scroll to bottom when entering a conversation
  useEffect(() => {
    if (
      selectedConversation &&
      !messagesLoading &&
      messages.length > 0 &&
      messagesEndRef.current
    ) {
      // Use a small timeout to ensure DOM has rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
    }
  }, [selectedConversation?.id, messagesLoading, messages.length]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversation) {
      const unreadCount = isOwner
        ? selectedConversation.unreadByAdmin
        : selectedConversation.unreadByUser;

      if (unreadCount > 0) {
        markAsRead(selectedConversation.id);
      }
    }
  }, [selectedConversation, markAsRead, isOwner]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    try {
      const result = await sendMessage(selectedConversation.id, newMessage);
      if (result.success) {
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this conversation? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteConversation(conversationId);
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      setDropdownOpen(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleStartNewConversation = async (message) => {
    if (!preSelectedUser || !message.trim()) return;

    setSendingMessage(true);
    try {
      const result = await startConversation(
        preSelectedUser.uid,
        preSelectedUser.displayName || preSelectedUser.email,
        preSelectedUser.email,
        message
      );

      if (result.success) {
        setShowNewConversationModal(false);
        setPreSelectedUser(null);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNewConversationKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      const form = e.target.closest("form");
      if (form) {
        const formData = new FormData(form);
        const message = formData.get("message");
        if (message.trim()) {
          handleStartNewConversation(message);
        }
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            Please log in to access your messages.
          </p>
          <Link to="/auth/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading Messages
          </h1>
          <p className="text-gray-600 mb-6">
            {error.message || "Failed to load conversations"}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <InboxSolid className="w-8 h-8 text-blue-600" />
                Messages
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-sm font-medium px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                {isOwner
                  ? "Manage conversations with users"
                  : "Your conversation with administrators"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages Interface */}
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          style={{ height: "calc(100vh - 200px)" }}
        >
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ChatSolid className="w-5 h-5" />
                  Conversations
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <InboxIcon className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No conversations
                    </h3>
                    <p className="text-gray-500 text-center">
                      {isOwner
                        ? "Start a conversation with a user from the admin panel."
                        : "No messages yet. Administrators will be able to reach out to you here."}
                    </p>
                  </div>
                ) : (
                  conversations?.length > 0 &&
                  conversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isOwner={isOwner}
                      isSelected={selectedConversation?.id === conversation.id}
                      userProfiles={userProfiles}
                      setUserProfiles={setUserProfiles}
                      onSelect={setSelectedConversation}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Message View */}
            <div className="hidden md:flex md:w-2/3 flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <UserAvatar
                          user={
                            userProfiles[
                              isOwner
                                ? selectedConversation?.userId
                                : selectedConversation?.adminId
                            ] || {
                              displayName: isOwner
                                ? selectedConversation.userName
                                : selectedConversation.adminName,
                              photoURL: null,
                            }
                          }
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3
                              className={`text-lg font-semibold ${
                                !isOwner && selectedConversation.adminName
                                  ? "text-transparent bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text"
                                  : "text-gray-900"
                              }`}
                            >
                              {isOwner
                                ? selectedConversation.userName
                                : selectedConversation.adminName}
                            </h3>
                            {!isOwner && selectedConversation.adminName && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                                  Site Owner
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isOwner && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setDropdownOpen(
                                dropdownOpen === selectedConversation.id
                                  ? null
                                  : selectedConversation.id
                              )
                            }
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          >
                            <EllipsisVerticalIcon className="w-5 h-5" />
                          </button>

                          {dropdownOpen === selectedConversation.id && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button
                                onClick={() =>
                                  handleDeleteConversation(
                                    selectedConversation.id
                                  )
                                }
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <TrashIcon className="w-4 h-4 mr-3" />
                                Delete Conversation
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-gray-500">
                          No messages yet. Start the conversation!
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          user={user}
                          isOwner={isOwner}
                          selectedConversation={selectedConversation}
                          userProfiles={userProfiles}
                        />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <form
                      onSubmit={handleSendMessage}
                      className="flex space-x-3 items-end"
                    >
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[2.5rem] max-h-32 overflow-y-auto"
                        disabled={sendingMessage}
                        rows={1}
                        style={{
                          height: "auto",
                          minHeight: "2.5rem",
                        }}
                        onInput={(e) => {
                          // Auto-resize textarea
                          e.target.style.height = "auto";
                          e.target.style.height =
                            Math.min(e.target.scrollHeight, 128) + "px";
                        }}
                      />
                      <Button
                        type="submit"
                        disabled={!newMessage.trim() || sendingMessage}
                        className="px-4 py-2 flex-shrink-0"
                      >
                        {sendingMessage ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <PaperAirplaneIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2">
                      Press{" "}
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">
                        Shift + Enter
                      </kbd>{" "}
                      for new line,{" "}
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">
                        Enter
                      </kbd>{" "}
                      to send
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-gray-500">
                      Choose a conversation from the left to start messaging.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New Conversation Modal */}
        {showNewConversationModal && preSelectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Send Message
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowNewConversationModal(false);
                    setPreSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <UserAvatar user={preSelectedUser} size="md" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {preSelectedUser.displayName || "Unnamed User"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {preSelectedUser.email}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      ID: {preSelectedUser.uid.substring(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const message = formData.get("message");
                  handleStartNewConversation(message);
                }}
                className="p-6"
              >
                <div className="mb-4">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Type your message to the user..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    disabled={sendingMessage}
                    onKeyDown={handleNewConversationKeyDown}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will start a new conversation with the user. Press{" "}
                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">
                      Ctrl + Enter
                    </kbd>{" "}
                    to send quickly.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowNewConversationModal(false);
                      setPreSelectedUser(null);
                    }}
                    disabled={sendingMessage}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={sendingMessage}
                    className="flex items-center space-x-2"
                  >
                    {sendingMessage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;

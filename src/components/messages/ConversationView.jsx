import React, { useState, useEffect, useRef } from "react";
import MessageItem from "./MessageItem";
import UserAvatar from "../ui/UserAvatar";
import { Button } from "../ui/Button";
import Picker from "emoji-picker-react";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  FaceSmileIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

const ConversationView = ({
  user,
  isOwner,
  selectedConversation,
  userProfiles,
  messages,
  messagesLoading,
  onSendMessage,
  onDeleteConversation,
  onBack,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (
      selectedConversation &&
      !messagesLoading &&
      messages.length > 0 &&
      messagesEndRef.current
    ) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
    }
  }, [selectedConversation?.id, messagesLoading, messages.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;
    setSendingMessage(true);
    await onSendMessage(newMessage);
    setNewMessage("");
    setSendingMessage(false);
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (!selectedConversation) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 p-8 text-center">
        <ChatBubbleLeftRightIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-1">
          Select a Conversation
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-xs">
          Choose a conversation from the left to start messaging or view past
          discussions.
        </p>
      </div>
    );
  }

  const otherUserProfile = userProfiles[
    isOwner ? selectedConversation.userId : selectedConversation.adminId
  ] || {
    displayName: isOwner
      ? selectedConversation.userName
      : selectedConversation.adminName,
    photoURL: null,
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 md:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <UserAvatar user={otherUserProfile} size="sm" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {otherUserProfile.displayName}
              </h3>
            </div>
          </div>
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                  <button
                    onClick={() => {
                      onDeleteConversation(selectedConversation.id);
                      setDropdownOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
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
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-1">
              No messages yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Be the first to send a message!
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
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <form
          onSubmit={handleSendMessage}
          className="flex space-x-3 items-start"
        >
          <div className="relative flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 px-4 py-2 pr-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              disabled={sendingMessage}
              rows={1}
              style={{ minHeight: "2.5rem", maxHeight: "8rem" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 128) + "px";
              }}
            />
            <div className="absolute bottom-1 right-1">
              <button
                ref={emojiButtonRef}
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Add emoji"
              >
                <FaceSmileIcon className="h-5 w-5" />
              </button>
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full right-0 z-10 mb-2"
                >
                  <Picker onEmojiClick={handleEmojiClick} emojiStyle="native" />
                </div>
              )}
            </div>
          </div>
          <Button
            type="submit"
            disabled={!newMessage.trim() || sendingMessage}
            className="flex-shrink-0 px-4 py-2"
          >
            {sendingMessage ? (
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </Button>
        </form>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-center">
          Shift + Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ConversationView;

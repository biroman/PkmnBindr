import React, { useState } from "react";
import { Button } from "../ui/Button";
import UserAvatar from "../ui/UserAvatar";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const NewConversationModal = ({ user, onClose, onStartConversation }) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleStartConversation = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    await onStartConversation(message);
    setIsSending(false);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleStartConversation(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Send Message
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <UserAvatar user={user} size="md" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {user.displayName || "Unnamed User"}
              </h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 font-mono">
                ID: {user.uid.substring(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <form
          onSubmit={handleStartConversation}
          className="p-6 flex-grow flex flex-col"
        >
          <div className="flex-grow">
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Message
            </label>
            <textarea
              id="message"
              name="message"
              placeholder={`Type your message to ${
                user.displayName || "the user"
              }...`}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will start a new conversation. Press{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded-md text-xs">
                Ctrl + Enter
              </kbd>{" "}
              to send.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSending || !message.trim()}
              className="flex items-center space-x-2"
            >
              {isSending ? (
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
  );
};

export default NewConversationModal;

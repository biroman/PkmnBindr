import React, { useState } from "react";
import { useMessages } from "../../hooks/useMessages";
import { Button } from "../ui/Button";
import UserAvatar from "../ui/UserAvatar";
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

const MessageUser = ({ isOpen, onClose, user }) => {
  console.log("MessageUser render - isOpen:", isOpen, "user:", user);
  const { startConversation } = useMessages();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setSending(true);
    try {
      const result = await startConversation(
        user.uid,
        user.displayName || user.email,
        user.email,
        message
      );

      if (result.success) {
        toast.success(`Message sent to ${user.displayName || user.email}`);
        setMessage("");
        onClose();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
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
        <form onSubmit={handleSendMessage} className="p-6">
          <div className="mb-4">
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to the user..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={sending}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will start a new conversation with the user.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!message.trim() || sending}
              className="flex items-center space-x-2"
            >
              {sending ? (
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

export default MessageUser;

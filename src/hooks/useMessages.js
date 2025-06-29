import { useState, useEffect, useCallback } from "react";
import { messageService } from "../services/MessageService";
import { useAuth, useOwner } from "./useAuth";

export const useMessages = () => {
  const { user } = useAuth();
  const isOwner = useOwner();
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Subscribe to conversations and unread count
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Set a timeout to stop loading if no response after 10 seconds
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 10000);

      // Subscribe to conversations
      const unsubscribeConversations = messageService.subscribeToConversations(
        user.uid,
        isOwner,
        (updatedConversations) => {
          setConversations(updatedConversations);
          setLoading(false);
          setError(null);
          // Clear timeout when data is successfully loaded
          clearTimeout(timeoutId);
        }
      );

      // Subscribe to unread count
      const unsubscribeUnread = messageService.subscribeToUnreadCount(
        user.uid,
        isOwner,
        (count) => {
          setUnreadCount(count);
        }
      );

      return () => {
        clearTimeout(timeoutId);
        if (unsubscribeConversations) unsubscribeConversations();
        if (unsubscribeUnread) unsubscribeUnread();
      };
    } catch (error) {
      console.error("Error setting up message subscriptions:", error);
      setError(error.message);
      setLoading(false);
    }
  }, [user?.uid, isOwner]);

  // Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      messageService.cleanup();
    };
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (conversationId, message) => {
      try {
        if (!user?.uid || !message.trim()) return;

        await messageService.sendMessage(
          conversationId,
          user.uid,
          message,
          isOwner
        );
        return { success: true };
      } catch (error) {
        console.error("Error sending message:", error);
        setError(error.message);
        return { success: false, error: error.message };
      }
    },
    [user?.uid, isOwner]
  );

  // Start a new conversation (admin only)
  const startConversation = useCallback(
    async (targetUserId, targetUserName, targetUserEmail, initialMessage) => {
      if (!isOwner) {
        throw new Error("Only admins can start conversations");
      }

      try {
        const result = await messageService.startConversationAsAdmin(
          user.uid,
          targetUserId,
          user.displayName || "Admin",
          targetUserName,
          targetUserEmail,
          initialMessage
        );
        return result;
      } catch (error) {
        console.error("Error starting conversation:", error);
        setError(error.message);
        throw error;
      }
    },
    [user?.uid, user?.displayName, isOwner]
  );

  // Mark conversation as read
  const markAsRead = useCallback(
    async (conversationId) => {
      try {
        await messageService.markConversationAsRead(
          conversationId,
          user?.uid,
          isOwner
        );
        return { success: true };
      } catch (error) {
        console.error("Error marking as read:", error);
        setError(error.message);
        return { success: false, error: error.message };
      }
    },
    [user?.uid, isOwner]
  );

  // Delete conversation (admin only)
  const deleteConversation = useCallback(
    async (conversationId) => {
      if (!isOwner) {
        throw new Error("Only admins can delete conversations");
      }

      try {
        await messageService.deleteConversation(conversationId, user.uid);
        return { success: true };
      } catch (error) {
        console.error("Error deleting conversation:", error);
        setError(error.message);
        throw error;
      }
    },
    [user?.uid, isOwner]
  );

  return {
    conversations,
    unreadCount,
    loading,
    error,
    sendMessage,
    startConversation,
    markAsRead,
    deleteConversation,
    isAdmin: isOwner,
  };
};

export const useConversationMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    setLoading(true);

    // Subscribe to messages in this conversation
    const unsubscribe = messageService.subscribeToMessages(
      conversationId,
      (updatedMessages) => {
        setMessages(updatedMessages);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId]);

  return { messages, loading };
};

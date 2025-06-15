import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
  increment,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";

class MessageService {
  constructor() {
    this.unsubscribes = new Map();
    this.messageListeners = new Map();
  }

  // Collection names
  static CONVERSATIONS = "conversations";
  static MESSAGES = "messages";
  static DIRECT_MESSAGES = "directMessages"; // Fallback to existing collection

  /**
   * Create a new conversation between admin and user
   */
  async createConversation(adminId, userId, adminName, userName, userEmail) {
    try {
      const conversationId = `${adminId}_${userId}`;
      const conversationRef = doc(
        db,
        MessageService.CONVERSATIONS,
        conversationId
      );

      const conversationData = {
        id: conversationId,
        adminId,
        userId,
        adminName: adminName || "Admin",
        userName: userName || "User",
        userEmail: userEmail || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: null,
        lastMessageAt: null,
        unreadByAdmin: 0,
        unreadByUser: 0,
        status: "active",
        participants: [adminId, userId],
      };

      await setDoc(conversationRef, conversationData);
      return { success: true, conversationId };
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId, senderId, message, isAdmin = false) {
    try {
      if (!conversationId || !senderId || !message.trim()) {
        throw new Error("Conversation ID, sender ID, and message are required");
      }

      const conversationRef = doc(
        db,
        MessageService.CONVERSATIONS,
        conversationId
      );
      const messagesRef = collection(conversationRef, MessageService.MESSAGES);

      // Create the message
      const messageData = {
        senderId,
        message: message.trim(),
        timestamp: serverTimestamp(),
        isAdmin,
        read: false,
      };

      // Use transaction to add message and update conversation
      await runTransaction(db, async (transaction) => {
        // Get current conversation data
        const conversationDoc = await transaction.get(conversationRef);

        if (!conversationDoc.exists()) {
          throw new Error("Conversation not found");
        }

        const conversationData = conversationDoc.data();

        // Add the message
        const newMessageRef = doc(messagesRef);
        transaction.set(newMessageRef, messageData);

        // Update conversation metadata
        const updateData = {
          lastMessage:
            message.trim().substring(0, 100) +
            (message.length > 100 ? "..." : ""),
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Increment unread count for the recipient
        if (isAdmin) {
          updateData.unreadByUser = increment(1);
        } else {
          updateData.unreadByAdmin = increment(1);
        }

        transaction.update(conversationRef, updateData);
      });

      return { success: true };
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      throw error;
    }
  }

  /**
   * Get all conversations for a user (admin or regular user)
   */
  async getUserConversations(userId, isAdmin = false) {
    try {
      const conversationsRef = collection(db, MessageService.CONVERSATIONS);
      let q;

      if (isAdmin) {
        q = query(
          conversationsRef,
          where("adminId", "==", userId),
          orderBy("updatedAt", "desc")
        );
      } else {
        q = query(
          conversationsRef,
          where("userId", "==", userId),
          orderBy("updatedAt", "desc")
        );
      }

      const snapshot = await getDocs(q);
      const conversations = [];

      snapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return conversations;
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
  }

  /**
   * Get messages for a specific conversation
   */
  async getConversationMessages(conversationId, limitCount = 50) {
    try {
      const conversationRef = doc(
        db,
        MessageService.CONVERSATIONS,
        conversationId
      );
      const messagesRef = collection(conversationRef, MessageService.MESSAGES);

      const q = query(
        messagesRef,
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const messages = [];

      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Return messages in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markConversationAsRead(conversationId, userId, isAdmin = false) {
    try {
      const conversationRef = doc(
        db,
        MessageService.CONVERSATIONS,
        conversationId
      );

      const updateData = {};
      if (isAdmin) {
        updateData.unreadByAdmin = 0;
      } else {
        updateData.unreadByUser = 0;
      }

      await updateDoc(conversationRef, updateData);
      return { success: true };
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      throw error;
    }
  }

  /**
   * Get total unread count for a user
   */
  async getUnreadCount(userId, isAdmin = false) {
    try {
      const conversations = await this.getUserConversations(userId, isAdmin);

      let totalUnread = 0;
      conversations.forEach((conversation) => {
        if (isAdmin) {
          totalUnread += conversation.unreadByAdmin || 0;
        } else {
          totalUnread += conversation.unreadByUser || 0;
        }
      });

      return totalUnread;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time conversation updates
   */
  subscribeToConversations(userId, isAdmin, callback) {
    try {
      // First try the new conversations collection
      const conversationsRef = collection(db, MessageService.CONVERSATIONS);
      let q;

      if (isAdmin) {
        q = query(
          conversationsRef,
          where("adminId", "==", userId)
          // Temporarily remove orderBy to avoid index requirement
        );
      } else {
        q = query(
          conversationsRef,
          where("userId", "==", userId)
          // Temporarily remove orderBy to avoid index requirement
        );
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const conversations = [];
          snapshot.forEach((doc) => {
            conversations.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          // Sort on client side to avoid index requirement
          conversations.sort((a, b) => {
            const aTime = a.updatedAt?.toDate?.() || new Date(0);
            const bTime = b.updatedAt?.toDate?.() || new Date(0);
            return bTime - aTime; // Descending order
          });

          console.log(
            `Loaded ${conversations.length} conversations for user ${userId}`
          );
          callback(conversations);
        },
        (error) => {
          console.error(
            "Error in conversations subscription, trying fallback:",
            error
          );
          // Fallback to direct messages collection
          this.subscribeToDirectMessages(userId, isAdmin, callback);
        }
      );

      this.unsubscribes.set(`conversations_${userId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error(
        "Error subscribing to conversations, trying fallback:",
        error
      );
      // Fallback to direct messages collection
      return this.subscribeToDirectMessages(userId, isAdmin, callback);
    }
  }

  /**
   * Fallback method using existing directMessages collection
   */
  subscribeToDirectMessages(userId, isAdmin, callback) {
    try {
      if (isAdmin) {
        // For admin, get all direct message threads
        const directMessagesRef = collection(
          db,
          MessageService.DIRECT_MESSAGES
        );
        const unsubscribe = onSnapshot(
          directMessagesRef,
          (snapshot) => {
            const conversations = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              conversations.push({
                id: `admin_${doc.id}`, // Convert to new format
                adminId: userId,
                userId: doc.id,
                adminName: "Admin",
                userName: data.userName || "User",
                userEmail: data.userEmail || "",
                lastMessage: data.lastMessage || "",
                lastMessageAt: data.timestamp || null,
                unreadByAdmin: data.unread ? 1 : 0,
                unreadByUser: 0,
                updatedAt: data.timestamp || null,
              });
            });
            console.log(
              `Loaded ${conversations.length} direct message threads`
            );
            callback(conversations);
          },
          (error) => {
            console.error("Error in direct messages subscription:", error);
            callback([]);
          }
        );

        this.unsubscribes.set(`directMessages_${userId}`, unsubscribe);
        return unsubscribe;
      } else {
        // For users, get their own direct message thread
        const userThreadRef = doc(db, MessageService.DIRECT_MESSAGES, userId);
        const unsubscribe = onSnapshot(
          userThreadRef,
          (docSnapshot) => {
            const conversations = [];
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              conversations.push({
                id: `admin_${userId}`,
                adminId: "admin", // Will be replaced with actual admin ID
                userId: userId,
                adminName: "Admin",
                userName: data.userName || "User",
                userEmail: data.userEmail || "",
                lastMessage: data.lastMessage || "",
                lastMessageAt: data.timestamp || null,
                unreadByAdmin: 0,
                unreadByUser: data.unread ? 1 : 0,
                updatedAt: data.timestamp || null,
              });
            }
            console.log(`Loaded ${conversations.length} user conversations`);
            callback(conversations);
          },
          (error) => {
            console.error("Error in user thread subscription:", error);
            callback([]);
          }
        );

        this.unsubscribes.set(`userThread_${userId}`, unsubscribe);
        return unsubscribe;
      }
    } catch (error) {
      console.error("Error in direct messages fallback:", error);
      callback([]);
      return null;
    }
  }

  /**
   * Subscribe to real-time messages in a conversation
   */
  subscribeToMessages(conversationId, callback) {
    try {
      // Check if this is a fallback conversation ID (admin_userId format)
      if (conversationId.startsWith("admin_")) {
        const userId = conversationId.replace("admin_", "");
        return this.subscribeToDirectMessageThread(userId, callback);
      }

      const conversationRef = doc(
        db,
        MessageService.CONVERSATIONS,
        conversationId
      );
      const messagesRef = collection(conversationRef, MessageService.MESSAGES);

      const q = query(messagesRef, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const messages = [];
          snapshot.forEach((doc) => {
            messages.push({
              id: doc.id,
              ...doc.data(),
            });
          });
          console.log(
            `Loaded ${messages.length} messages for conversation ${conversationId}`
          );
          callback(messages);
        },
        (error) => {
          console.error(
            "Error in messages subscription, trying fallback:",
            error
          );
          // Try fallback if it looks like a user ID
          if (conversationId.includes("_")) {
            const userId = conversationId.split("_")[1];
            this.subscribeToDirectMessageThread(userId, callback);
          } else {
            callback([]);
          }
        }
      );

      this.messageListeners.set(conversationId, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error("Error subscribing to messages:", error);
      // Try fallback if it looks like a user ID
      if (conversationId.includes("_")) {
        const userId = conversationId.split("_")[1];
        return this.subscribeToDirectMessageThread(userId, callback);
      }
      callback([]);
      return null;
    }
  }

  /**
   * Subscribe to messages in the existing directMessages collection
   */
  subscribeToDirectMessageThread(userId, callback) {
    try {
      const threadRef = doc(db, MessageService.DIRECT_MESSAGES, userId);
      const messagesRef = collection(threadRef, "messages");

      const q = query(messagesRef, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const messages = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
              id: doc.id,
              senderId: data.senderId,
              message: data.text || data.message, // Handle both field names
              timestamp: data.timestamp,
              isAdmin: data.senderId === "admin",
            });
          });
          console.log(
            `Loaded ${messages.length} direct messages for user ${userId}`
          );
          callback(messages);
        },
        (error) => {
          console.error("Error in direct message thread subscription:", error);
          callback([]);
        }
      );

      this.messageListeners.set(`directThread_${userId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error("Error subscribing to direct message thread:", error);
      callback([]);
      return null;
    }
  }

  /**
   * Subscribe to unread count updates
   */
  subscribeToUnreadCount(userId, isAdmin, callback) {
    try {
      return this.subscribeToConversations(userId, isAdmin, (conversations) => {
        let totalUnread = 0;
        conversations.forEach((conversation) => {
          if (isAdmin) {
            totalUnread += conversation.unreadByAdmin || 0;
          } else {
            totalUnread += conversation.unreadByUser || 0;
          }
        });
        callback(totalUnread);
      });
    } catch (error) {
      console.error("Error subscribing to unread count:", error);
      return null;
    }
  }

  /**
   * Start a conversation from admin to user
   */
  async startConversationAsAdmin(
    adminId,
    userId,
    adminName,
    userName,
    userEmail,
    initialMessage
  ) {
    try {
      const conversationId = `${adminId}_${userId}`;

      // Create or get conversation
      await this.createConversation(
        adminId,
        userId,
        adminName,
        userName,
        userEmail
      );

      // Send initial message if provided
      if (initialMessage && initialMessage.trim()) {
        await this.sendMessage(conversationId, adminId, initialMessage, true);
      }

      return { success: true, conversationId };
    } catch (error) {
      console.error("Error starting conversation as admin:", error);
      throw error;
    }
  }

  /**
   * Delete a conversation (admin only)
   */
  async deleteConversation(conversationId, adminId) {
    try {
      const conversationRef = doc(
        db,
        MessageService.CONVERSATIONS,
        conversationId
      );
      const conversationDoc = await getDoc(conversationRef);

      if (!conversationDoc.exists()) {
        throw new Error("Conversation not found");
      }

      const conversationData = conversationDoc.data();
      if (conversationData.adminId !== adminId) {
        throw new Error("Unauthorized to delete this conversation");
      }

      // Delete all messages in the conversation
      const messagesRef = collection(conversationRef, MessageService.MESSAGES);
      const messagesSnapshot = await getDocs(messagesRef);

      const batch = writeBatch(db);
      messagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete the conversation
      batch.delete(conversationRef);

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      throw error;
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId, userId, isAdmin = false) {
    try {
      const conversationRef = doc(
        db,
        MessageService.CONVERSATIONS,
        conversationId
      );
      await updateDoc(conversationRef, {
        status: "archived",
        archivedBy: userId,
        archivedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error("Error archiving conversation:", error);
      throw error;
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    this.unsubscribes.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    });
    this.unsubscribes.clear();

    this.messageListeners.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    });
    this.messageListeners.clear();
  }
}

// Export singleton instance
export const messageService = new MessageService();
export default MessageService;

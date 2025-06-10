import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";

class ContactService {
  constructor() {
    this.unsubscribes = new Map();
  }

  // Collection names
  static DIRECT_MESSAGES = "directMessages";
  static FEATURE_REQUESTS = "featureRequests";
  static BUG_REPORTS = "bugReports";

  /**
   * Check rate limits for contact actions
   */
  async checkRateLimit(rulesContext, action) {
    if (!rulesContext) {
      return { allowed: true }; // If no rules context, allow
    }

    try {
      const result = await rulesContext.canPerformAction(action);
      return result;
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return { allowed: true }; // Default to allowing on error
    }
  }

  /**
   * Track usage for rate limiting
   */
  async trackUsage(rulesContext, action) {
    if (!rulesContext) return;

    try {
      const actionMappings = {
        send_direct_message: {
          type: "rate_limit",
          resource: "direct_messages",
        },
        submit_feature_request: {
          type: "rate_limit",
          resource: "feature_requests",
        },
        submit_bug_report: { type: "rate_limit", resource: "bug_reports" },
      };

      const mapping = actionMappings[action];
      if (mapping) {
        await rulesContext.trackUsage(mapping.type, mapping.resource);
      }
    } catch (error) {
      console.error("Error tracking usage:", error);
    }
  }

  /**
   * Send a direct message to the admin (with rate limiting)
   */
  async sendDirectMessage(
    userId,
    userName,
    userEmail,
    messageText,
    rulesContext = null
  ) {
    try {
      if (!userId || !messageText.trim()) {
        throw new Error("User ID and message text are required");
      }

      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(
        rulesContext,
        "send_direct_message"
      );
      if (!rateLimitCheck.allowed) {
        toast.error(
          rateLimitCheck.reason ||
            "Rate limit exceeded. Please wait before sending another message."
        );
        throw new Error(rateLimitCheck.reason || "Rate limit exceeded");
      }

      // Get or create the message thread
      const threadRef = doc(db, ContactService.DIRECT_MESSAGES, userId);
      const threadSnap = await getDoc(threadRef);

      // Create message data
      const messageData = {
        senderId: userId,
        text: messageText.trim(),
        timestamp: serverTimestamp(),
      };

      if (!threadSnap.exists()) {
        // Create new thread
        const threadData = {
          userName: userName || "Unknown User",
          userEmail: userEmail || "",
          lastMessage:
            messageText.trim().substring(0, 100) +
            (messageText.length > 100 ? "..." : ""),
          timestamp: serverTimestamp(),
          unread: true,
          messageCount: 1,
        };

        // Use a batch to create thread and first message
        const batch = writeBatch(db);
        batch.set(threadRef, threadData);

        const messagesRef = collection(threadRef, "messages");
        const newMessageRef = doc(messagesRef);
        batch.set(newMessageRef, messageData);

        await batch.commit();
      } else {
        // Update existing thread and add message
        await runTransaction(db, async (transaction) => {
          const currentThread = await transaction.get(threadRef);
          const currentData = currentThread.data();

          // Update thread metadata
          transaction.update(threadRef, {
            lastMessage:
              messageText.trim().substring(0, 100) +
              (messageText.length > 100 ? "..." : ""),
            timestamp: serverTimestamp(),
            unread: true,
            messageCount: (currentData.messageCount || 0) + 1,
          });

          // Add new message
          const messagesRef = collection(threadRef, "messages");
          const newMessageRef = doc(messagesRef);
          transaction.set(newMessageRef, messageData);
        });
      }

      // Track usage for rate limiting
      await this.trackUsage(rulesContext, "send_direct_message");

      toast.success("Message sent successfully!");
      return { success: true };
    } catch (error) {
      console.error("Error sending direct message:", error);
      if (!error.message.includes("Rate limit")) {
        toast.error("Failed to send message. Please try again.");
      }
      throw error;
    }
  }

  /**
   * Submit a feature request (with rate limiting)
   */
  async submitFeatureRequest(
    userId,
    userName,
    title,
    description,
    rulesContext = null
  ) {
    try {
      if (!userId || !title.trim() || !description.trim()) {
        throw new Error("User ID, title, and description are required");
      }

      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(
        rulesContext,
        "submit_feature_request"
      );
      if (!rateLimitCheck.allowed) {
        toast.error(
          rateLimitCheck.reason ||
            "Rate limit exceeded. Please wait before submitting another feature request."
        );
        throw new Error(rateLimitCheck.reason || "Rate limit exceeded");
      }

      const featureData = {
        userId,
        userName: userName || "Unknown User",
        title: title.trim(),
        description: description.trim(),
        status: "received",
        upvotes: 0,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, ContactService.FEATURE_REQUESTS),
        featureData
      );

      // Track usage for rate limiting
      await this.trackUsage(rulesContext, "submit_feature_request");

      toast.success("Feature request submitted successfully!");
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error submitting feature request:", error);
      if (!error.message.includes("Rate limit")) {
        toast.error("Failed to submit feature request. Please try again.");
      }
      throw error;
    }
  }

  /**
   * Submit a bug report (with rate limiting)
   */
  async submitBugReport(
    userId,
    userName,
    title,
    description,
    priority = "medium",
    rulesContext = null
  ) {
    try {
      if (!userId || !title.trim() || !description.trim()) {
        throw new Error("User ID, title, and description are required");
      }

      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(
        rulesContext,
        "submit_bug_report"
      );
      if (!rateLimitCheck.allowed) {
        toast.error(
          rateLimitCheck.reason ||
            "Rate limit exceeded. Please wait before submitting another bug report."
        );
        throw new Error(rateLimitCheck.reason || "Rate limit exceeded");
      }

      const bugData = {
        userId,
        userName: userName || "Unknown User",
        title: title.trim(),
        description: description.trim(),
        status: "new",
        priority: priority,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, ContactService.BUG_REPORTS),
        bugData
      );

      // Track usage for rate limiting
      await this.trackUsage(rulesContext, "submit_bug_report");

      toast.success("Bug report submitted successfully!");
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error submitting bug report:", error);
      if (!error.message.includes("Rate limit")) {
        toast.error("Failed to submit bug report. Please try again.");
      }
      throw error;
    }
  }

  /**
   * Get user's direct message thread
   */
  async getUserMessageThread(userId) {
    try {
      const threadRef = doc(db, ContactService.DIRECT_MESSAGES, userId);
      const threadSnap = await getDoc(threadRef);

      if (!threadSnap.exists()) {
        return null;
      }

      // Get messages in the thread
      const messagesRef = collection(threadRef, "messages");
      const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
      const messagesSnap = await getDocs(messagesQuery);

      const messages = messagesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        id: threadSnap.id,
        ...threadSnap.data(),
        messages,
      };
    } catch (error) {
      console.error("Error getting user message thread:", error);
      throw error;
    }
  }

  /**
   * Get user's feature requests
   */
  async getUserFeatureRequests(userId) {
    try {
      const requestsQuery = query(
        collection(db, ContactService.FEATURE_REQUESTS),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
      );

      const snapshot = await getDocs(requestsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting user feature requests:", error);

      // If index is building, return empty array with a flag
      if (
        error.code === "failed-precondition" &&
        error.message.includes("index")
      ) {
        console.log("Indexes are still building, returning empty array");
        return { indexBuilding: true, data: [] };
      }

      throw error;
    }
  }

  /**
   * Get user's bug reports
   */
  async getUserBugReports(userId) {
    try {
      const reportsQuery = query(
        collection(db, ContactService.BUG_REPORTS),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
      );

      const snapshot = await getDocs(reportsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting user bug reports:", error);

      // If index is building, return empty array with a flag
      if (
        error.code === "failed-precondition" &&
        error.message.includes("index")
      ) {
        console.log("Indexes are still building, returning empty array");
        return { indexBuilding: true, data: [] };
      }

      throw error;
    }
  }

  /**
   * ADMIN: Get all direct message threads
   */
  async getAllMessageThreads() {
    try {
      const threadsQuery = query(
        collection(db, ContactService.DIRECT_MESSAGES),
        orderBy("timestamp", "desc")
      );

      const snapshot = await getDocs(threadsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting all message threads:", error);
      throw error;
    }
  }

  /**
   * ADMIN: Get all feature requests
   */
  async getAllFeatureRequests(status = null) {
    try {
      let requestsQuery;

      if (status) {
        requestsQuery = query(
          collection(db, ContactService.FEATURE_REQUESTS),
          where("status", "==", status),
          orderBy("timestamp", "desc")
        );
      } else {
        requestsQuery = query(
          collection(db, ContactService.FEATURE_REQUESTS),
          orderBy("timestamp", "desc")
        );
      }

      const snapshot = await getDocs(requestsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting all feature requests:", error);
      throw error;
    }
  }

  /**
   * ADMIN: Get all bug reports
   */
  async getAllBugReports(status = null) {
    try {
      let reportsQuery;

      if (status) {
        reportsQuery = query(
          collection(db, ContactService.BUG_REPORTS),
          where("status", "==", status),
          orderBy("timestamp", "desc")
        );
      } else {
        reportsQuery = query(
          collection(db, ContactService.BUG_REPORTS),
          orderBy("timestamp", "desc")
        );
      }

      const snapshot = await getDocs(reportsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting all bug reports:", error);
      throw error;
    }
  }

  /**
   * ADMIN: Reply to a direct message
   */
  async replyToMessage(threadId, messageText) {
    try {
      if (!threadId || !messageText.trim()) {
        throw new Error("Thread ID and message text are required");
      }

      const threadRef = doc(db, ContactService.DIRECT_MESSAGES, threadId);

      // Create admin reply message
      const messageData = {
        senderId: "admin",
        text: messageText.trim(),
        timestamp: serverTimestamp(),
      };

      await runTransaction(db, async (transaction) => {
        // Update thread metadata
        transaction.update(threadRef, {
          lastMessage: `Admin: ${messageText.trim().substring(0, 100)}${
            messageText.length > 100 ? "..." : ""
          }`,
          timestamp: serverTimestamp(),
          unread: false, // Mark as read since admin is replying
        });

        // Add admin reply
        const messagesRef = collection(threadRef, "messages");
        const newMessageRef = doc(messagesRef);
        transaction.set(newMessageRef, messageData);
      });

      toast.success("Reply sent successfully!");
      return { success: true };
    } catch (error) {
      console.error("Error replying to message:", error);
      toast.error("Failed to send reply. Please try again.");
      throw error;
    }
  }

  /**
   * ADMIN: Update feature request status
   */
  async updateFeatureRequestStatus(requestId, status) {
    try {
      const requestRef = doc(db, ContactService.FEATURE_REQUESTS, requestId);
      await updateDoc(requestRef, {
        status,
        updatedAt: serverTimestamp(),
      });

      toast.success("Feature request status updated!");
      return { success: true };
    } catch (error) {
      console.error("Error updating feature request status:", error);
      toast.error("Failed to update status. Please try again.");
      throw error;
    }
  }

  /**
   * ADMIN: Update bug report status
   */
  async updateBugReportStatus(reportId, status) {
    try {
      const reportRef = doc(db, ContactService.BUG_REPORTS, reportId);
      await updateDoc(reportRef, {
        status,
        updatedAt: serverTimestamp(),
      });

      toast.success("Bug report status updated!");
      return { success: true };
    } catch (error) {
      console.error("Error updating bug report status:", error);
      toast.error("Failed to update status. Please try again.");
      throw error;
    }
  }

  /**
   * ADMIN: Mark message thread as read
   */
  async markThreadAsRead(threadId) {
    try {
      const threadRef = doc(db, ContactService.DIRECT_MESSAGES, threadId);
      await updateDoc(threadRef, {
        unread: false,
        readAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error marking thread as read:", error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for message threads (for admin)
   */
  subscribeToMessageThreads(callback) {
    const threadsQuery = query(
      collection(db, ContactService.DIRECT_MESSAGES),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(threadsQuery, (snapshot) => {
      const threads = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(threads);
    });

    this.unsubscribes.set("messageThreads", unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to real-time updates for a specific message thread
   */
  subscribeToMessageThread(threadId, callback) {
    const threadRef = doc(db, ContactService.DIRECT_MESSAGES, threadId);
    const messagesRef = collection(threadRef, "messages");
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(messages);
    });

    this.unsubscribes.set(`messageThread_${threadId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    this.unsubscribes.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.unsubscribes.clear();
  }
}

// Export singleton instance
export const contactService = new ContactService();
export default ContactService;

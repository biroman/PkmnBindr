import { useState, useEffect, useCallback, useMemo } from "react";
import { contactService } from "../../services/ContactService";

// Cache utilities (these should eventually be moved to useAdminCache)
const CACHE_KEYS = {
  CONTACT: "admin_contact_cache",
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error reading cache:", error);
    localStorage.removeItem(key);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error("Error setting cache:", error);
  }
};

/**
 * Custom hook for managing contact/messaging operations in admin panel
 *
 * This hook handles:
 * - Contact data loading (messages, feature requests, bug reports)
 * - Contact item filtering and sorting
 * - Message replies and status updates
 * - Contact item deletion
 * - Contact UI state management
 *
 * @returns {Object} Contact management state and operations
 */
export const useContactManagement = () => {
  // Contact data state
  const [contactData, setContactData] = useState({
    messageThreads: [],
    featureRequests: [],
    bugReports: [],
  });

  const [contactLoading, setContactLoading] = useState(true);
  const [contactError, setContactError] = useState(null);

  // Contact UI state
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [contactFilter, setContactFilter] = useState("all");
  const [contactSort, setContactSort] = useState("newest");
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [actionInProgress, setActionInProgress] = useState(null);

  /**
   * Load contact data with caching
   * @param {boolean} forceRefresh - Force refresh ignoring cache
   */
  const loadContactData = useCallback(async (forceRefresh = false) => {
    try {
      setContactLoading(true);
      setContactError(null);

      // Check cache first (unless force refresh)
      let cachedContactData = null;
      if (!forceRefresh) {
        cachedContactData = getCachedData(CACHE_KEYS.CONTACT);
      }

      if (cachedContactData) {
        setContactData(cachedContactData);
      } else {
        const [messageThreads, featureRequests, bugReports] = await Promise.all(
          [
            contactService.getAllMessageThreads(),
            contactService.getAllFeatureRequests(),
            contactService.getAllBugReports(),
          ]
        );

        const contactDataResult = {
          messageThreads,
          featureRequests,
          bugReports,
        };

        setContactData(contactDataResult);
        setCachedData(CACHE_KEYS.CONTACT, contactDataResult);
      }
    } catch (error) {
      console.error("Error loading contact data:", error);
      setContactError(error.message || "Failed to load contact data");
    } finally {
      setContactLoading(false);
    }
  }, []);

  /**
   * Handle replying to a message thread
   * @param {string} threadId - Message thread ID
   */
  const handleReplyToMessage = useCallback(
    async (threadId) => {
      if (!replyText.trim()) return;

      try {
        setActionInProgress(`${threadId}-reply`);
        await contactService.replyToMessage(threadId, replyText);
        setReplyText("");
        setSelectedThread(null);

        // Force refresh contact data
        await loadContactData(true);
      } catch (error) {
        console.error("Error replying to message:", error);
        setContactError(`Failed to reply to message: ${error.message}`);
      } finally {
        setActionInProgress(null);
      }
    },
    [replyText, loadContactData]
  );

  /**
   * Update feature request status
   * @param {string} requestId - Feature request ID
   * @param {string} status - New status
   */
  const handleUpdateFeatureStatus = useCallback(
    async (requestId, status) => {
      try {
        setActionInProgress(`${requestId}-updateStatus`);
        await contactService.updateFeatureRequestStatus(requestId, status);

        // Force refresh contact data
        await loadContactData(true);
      } catch (error) {
        console.error("Error updating feature request:", error);
        setContactError(`Failed to update feature request: ${error.message}`);
      } finally {
        setActionInProgress(null);
      }
    },
    [loadContactData]
  );

  /**
   * Update bug report status
   * @param {string} reportId - Bug report ID
   * @param {string} status - New status
   */
  const handleUpdateBugStatus = useCallback(
    async (reportId, status) => {
      try {
        setActionInProgress(`${reportId}-updateStatus`);
        await contactService.updateBugReportStatus(reportId, status);

        // Force refresh contact data
        await loadContactData(true);
      } catch (error) {
        console.error("Error updating bug report:", error);
        setContactError(`Failed to update bug report: ${error.message}`);
      } finally {
        setActionInProgress(null);
      }
    },
    [loadContactData]
  );

  /**
   * Delete message thread with confirmation
   * @param {string} threadId - Message thread ID
   */
  const handleDeleteMessageThread = useCallback(
    async (threadId) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this message thread? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        setActionInProgress(`${threadId}-delete`);
        await contactService.deleteMessageThread(threadId);

        // Force refresh contact data
        await loadContactData(true);
      } catch (error) {
        console.error("Error deleting message thread:", error);
        setContactError(`Failed to delete message thread: ${error.message}`);
      } finally {
        setActionInProgress(null);
      }
    },
    [loadContactData]
  );

  /**
   * Delete feature request with confirmation
   * @param {string} requestId - Feature request ID
   */
  const handleDeleteFeatureRequest = useCallback(
    async (requestId) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this feature request? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        setActionInProgress(`${requestId}-delete`);
        await contactService.deleteFeatureRequest(requestId);

        // Force refresh contact data
        await loadContactData(true);
      } catch (error) {
        console.error("Error deleting feature request:", error);
        setContactError(`Failed to delete feature request: ${error.message}`);
      } finally {
        setActionInProgress(null);
      }
    },
    [loadContactData]
  );

  /**
   * Delete bug report with confirmation
   * @param {string} reportId - Bug report ID
   */
  const handleDeleteBugReport = useCallback(
    async (reportId) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this bug report? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        setActionInProgress(`${reportId}-delete`);
        await contactService.deleteBugReport(reportId);

        // Force refresh contact data
        await loadContactData(true);
      } catch (error) {
        console.error("Error deleting bug report:", error);
        setContactError(`Failed to delete bug report: ${error.message}`);
      } finally {
        setActionInProgress(null);
      }
    },
    [loadContactData]
  );

  /**
   * Toggle expanded state for contact item
   * @param {string} itemId - Contact item ID
   */
  const toggleExpanded = useCallback(
    (itemId) => {
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      setExpandedItems(newExpanded);
    },
    [expandedItems]
  );

  /**
   * Handle generic contact item action
   * @param {Object} item - Contact item
   * @param {string} action - Action to perform
   * @param {*} value - Additional value for the action
   */
  const handleItemAction = useCallback(
    async (item, action, value = null) => {
      try {
        switch (item.type) {
          case "message":
            if (action === "reply") {
              setSelectedThread(item.data);
            } else if (action === "delete") {
              await handleDeleteMessageThread(item.id);
            }
            break;
          case "feature":
            if (action === "updateStatus") {
              await handleUpdateFeatureStatus(item.id, value);
            } else if (action === "delete") {
              await handleDeleteFeatureRequest(item.id);
            }
            break;
          case "bug":
            if (action === "updateStatus") {
              await handleUpdateBugStatus(item.id, value);
            } else if (action === "delete") {
              await handleDeleteBugReport(item.id);
            }
            break;
          default:
            console.warn("Unknown contact item type:", item.type);
        }
      } catch (error) {
        console.error("Contact item action error:", error);
        setContactError(`Action failed: ${error.message}`);
      }
    },
    [
      handleDeleteMessageThread,
      handleUpdateFeatureStatus,
      handleDeleteFeatureRequest,
      handleUpdateBugStatus,
    ]
  );

  /**
   * Get all contact items in unified format
   */
  const getAllContactItems = useCallback(() => {
    const items = [];

    // Add direct messages
    contactData.messageThreads.forEach((thread) => {
      items.push({
        id: thread.id,
        type: "message",
        title: thread.lastMessage || "Direct Message",
        user: thread.userName,
        userEmail: thread.userEmail,
        status: thread.unread ? "unread" : "read",
        timestamp: thread.timestamp,
        priority: "medium",
        data: thread,
        typeLabel: "Message",
      });
    });

    // Add feature requests
    contactData.featureRequests.forEach((request) => {
      items.push({
        id: request.id,
        type: "feature",
        title: request.title,
        user: request.userName,
        status: request.status,
        timestamp: request.timestamp,
        priority: "medium",
        data: request,
        typeLabel: "Feature",
      });
    });

    // Add bug reports
    contactData.bugReports.forEach((report) => {
      items.push({
        id: report.id,
        type: "bug",
        title: report.title,
        user: report.userName,
        status: report.status,
        timestamp: report.timestamp,
        priority: report.priority || "medium",
        data: report,
        typeLabel: "Bug",
      });
    });

    return items;
  }, [contactData]);

  /**
   * Filter and sort contact items
   * @param {Array} items - Contact items to filter and sort
   */
  const filterAndSortItems = useCallback(
    (items) => {
      let filtered = items;

      // Apply filters
      if (contactFilter !== "all") {
        filtered = filtered.filter((item) => {
          switch (contactFilter) {
            case "messages":
              return item.type === "message";
            case "features":
              return item.type === "feature";
            case "bugs":
              return item.type === "bug";
            case "unread":
              return item.type === "message" && item.status === "unread";
            default:
              return true;
          }
        });
      }

      // Apply sorting
      filtered.sort((a, b) => {
        switch (contactSort) {
          case "newest":
            return (
              new Date(b.timestamp?.toDate?.() || b.timestamp) -
              new Date(a.timestamp?.toDate?.() || a.timestamp)
            );
          case "oldest":
            return (
              new Date(a.timestamp?.toDate?.() || a.timestamp) -
              new Date(b.timestamp?.toDate?.() || b.timestamp)
            );
          case "priority":
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          case "status":
            return a.status.localeCompare(b.status);
          default:
            return 0;
        }
      });

      return filtered;
    },
    [contactFilter, contactSort]
  );

  /**
   * Get processed contact items (filtered and sorted)
   */
  const processedContactItems = useMemo(() => {
    const allItems = getAllContactItems();
    return filterAndSortItems(allItems);
  }, [getAllContactItems, filterAndSortItems]);

  /**
   * Get contact statistics
   */
  const contactStats = useMemo(() => {
    return {
      totalMessages: contactData.messageThreads.length,
      totalFeatures: contactData.featureRequests.length,
      totalBugs: contactData.bugReports.length,
      unreadMessages: contactData.messageThreads.filter((t) => t.unread).length,
      pendingFeatures: contactData.featureRequests.filter(
        (f) => f.status === "received"
      ).length,
      openBugs: contactData.bugReports.filter(
        (b) => b.status === "new" || b.status === "investigating"
      ).length,
    };
  }, [contactData]);

  /**
   * Clear contact error
   */
  const clearContactError = useCallback(() => {
    setContactError(null);
  }, []);

  /**
   * Close reply modal
   */
  const closeReplyModal = useCallback(() => {
    setSelectedThread(null);
    setReplyText("");
  }, []);

  /**
   * Load contact data on mount
   */
  useEffect(() => {
    loadContactData();
  }, [loadContactData]);

  return {
    // State
    contactData,
    contactLoading,
    contactError,
    selectedThread,
    replyText,
    contactFilter,
    contactSort,
    expandedItems,
    actionInProgress,

    // Processed data
    processedContactItems,
    contactStats,

    // Actions
    loadContactData,
    handleReplyToMessage,
    handleUpdateFeatureStatus,
    handleUpdateBugStatus,
    handleDeleteMessageThread,
    handleDeleteFeatureRequest,
    handleDeleteBugReport,
    handleItemAction,
    toggleExpanded,
    clearContactError,
    closeReplyModal,

    // Setters
    setReplyText,
    setContactFilter,
    setContactSort,
    setSelectedThread,

    // Computed values
    hasContactData: processedContactItems.length > 0,
    isActionInProgress: actionInProgress !== null,
  };
};

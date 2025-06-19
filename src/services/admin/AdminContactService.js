import { contactService } from "../ContactService";
import { AdminCacheService, CACHE_KEYS } from "./AdminCacheService";
import { AdminOptimizedService } from "../AdminOptimizedService";

/**
 * AdminContactService - Centralized contact management operations
 *
 * Features:
 * - Unified contact data loading (messages, feature requests, bug reports)
 * - Advanced filtering and sorting for all contact types
 * - Batch operations for contact management
 * - Response and status management
 * - Contact analytics and insights
 */

export class AdminContactService {
  /**
   * Load all contact data with caching and filtering
   */
  static async loadContactData(options = {}) {
    const {
      forceRefresh = false,
      messageLimit = 50,
      featureLimit = 100,
      bugLimit = 100,
      filters = {},
      sortBy = "timestamp",
      sortOrder = "desc",
    } = options;

    try {
      // Check cache first (unless force refresh)
      let contactData = null;
      if (!forceRefresh) {
        contactData = AdminCacheService.getCachedData(CACHE_KEYS.CONTACT);
      }

      // If no cached data or force refresh, fetch from server
      if (!contactData) {
        try {
          contactData =
            await AdminOptimizedService.fetchAllContactDataOptimized({
              messageLimit,
              featureLimit,
              bugLimit,
            });
          AdminCacheService.setCachedData(CACHE_KEYS.CONTACT, contactData);
        } catch (fetchError) {
          console.warn(
            "Permission denied for contact data, using empty data:",
            fetchError.message
          );
          contactData = {
            messageThreads: [],
            featureRequests: [],
            bugReports: [],
          };
        }
      }

      // Apply filters and sorting
      const processedData = {
        messageThreads: this.processContactItems(
          contactData.messageThreads || [],
          filters.messages || {},
          sortBy,
          sortOrder
        ),
        featureRequests: this.processContactItems(
          contactData.featureRequests || [],
          filters.features || {},
          sortBy,
          sortOrder
        ),
        bugReports: this.processContactItems(
          contactData.bugReports || [],
          filters.bugs || {},
          sortBy,
          sortOrder
        ),
      };

      // Calculate statistics
      const stats = this.calculateContactStats(processedData);

      return {
        ...processedData,
        stats,
      };
    } catch (error) {
      console.error("Error loading contact data:", error);
      // Return empty data structure instead of throwing
      return {
        messageThreads: [],
        featureRequests: [],
        bugReports: [],
        stats: {
          total: 0,
          messages: { total: 0, unread: 0, replied: 0, closed: 0 },
          features: {
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
            rejected: 0,
          },
          bugs: { total: 0, open: 0, investigating: 0, fixed: 0, closed: 0 },
          priorities: { high: 0, medium: 0, low: 0 },
        },
      };
    }
  }

  /**
   * Process contact items with filtering and sorting
   */
  static processContactItems(items, filters, sortBy, sortOrder) {
    let processedItems = [...items];

    // Apply filters
    if (filters.status) {
      processedItems = processedItems.filter(
        (item) => item.status === filters.status
      );
    }

    if (filters.priority) {
      processedItems = processedItems.filter(
        (item) => item.priority === filters.priority
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      processedItems = processedItems.filter(
        (item) =>
          item.subject?.toLowerCase().includes(searchTerm) ||
          item.description?.toLowerCase().includes(searchTerm) ||
          item.email?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      processedItems = processedItems.filter((item) => {
        const itemDate = new Date(item.timestamp?.toDate?.() || item.timestamp);
        return itemDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      processedItems = processedItems.filter((item) => {
        const itemDate = new Date(item.timestamp?.toDate?.() || item.timestamp);
        return itemDate <= toDate;
      });
    }

    // Apply sorting
    processedItems.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date fields
      if (sortBy === "timestamp" || sortBy === "createdAt") {
        aValue = new Date(aValue?.toDate?.() || aValue || 0);
        bValue = new Date(bValue?.toDate?.() || bValue || 0);
      }

      // Handle string fields
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = (bValue || "").toLowerCase();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return processedItems;
  }

  /**
   * Calculate comprehensive contact statistics
   */
  static calculateContactStats(contactData) {
    const { messageThreads, featureRequests, bugReports } = contactData;

    const stats = {
      total: messageThreads.length + featureRequests.length + bugReports.length,
      messages: {
        total: messageThreads.length,
        unread: messageThreads.filter((m) => m.status === "unread").length,
        replied: messageThreads.filter((m) => m.status === "replied").length,
        closed: messageThreads.filter((m) => m.status === "closed").length,
      },
      features: {
        total: featureRequests.length,
        pending: featureRequests.filter((f) => f.status === "pending").length,
        inProgress: featureRequests.filter((f) => f.status === "in-progress")
          .length,
        completed: featureRequests.filter((f) => f.status === "completed")
          .length,
        rejected: featureRequests.filter((f) => f.status === "rejected").length,
      },
      bugs: {
        total: bugReports.length,
        open: bugReports.filter((b) => b.status === "open").length,
        investigating: bugReports.filter((b) => b.status === "investigating")
          .length,
        fixed: bugReports.filter((b) => b.status === "fixed").length,
        closed: bugReports.filter((b) => b.status === "closed").length,
      },
      priorities: {
        high: [...featureRequests, ...bugReports].filter(
          (item) => item.priority === "high"
        ).length,
        medium: [...featureRequests, ...bugReports].filter(
          (item) => item.priority === "medium"
        ).length,
        low: [...featureRequests, ...bugReports].filter(
          (item) => item.priority === "low"
        ).length,
      },
    };

    return stats;
  }

  /**
   * Reply to a message thread
   */
  static async replyToMessage(threadId, replyText, adminUser) {
    try {
      const result = await contactService.replyToMessage(threadId, {
        text: replyText,
        author: adminUser.email,
        timestamp: new Date(),
      });

      // Update cache
      this.updateContactItemInCache("messageThreads", threadId, {
        status: "replied",
        lastReply: new Date(),
      });

      return result;
    } catch (error) {
      console.error("Error replying to message:", error);
      throw error;
    }
  }

  /**
   * Update feature request status
   */
  static async updateFeatureStatus(requestId, status, notes = "") {
    try {
      const result = await contactService.updateFeatureRequestStatus(
        requestId,
        status,
        notes
      );

      // Update cache
      this.updateContactItemInCache("featureRequests", requestId, {
        status,
        notes,
        updatedAt: new Date(),
      });

      return result;
    } catch (error) {
      console.error("Error updating feature status:", error);
      throw error;
    }
  }

  /**
   * Update bug report status
   */
  static async updateBugStatus(reportId, status, notes = "") {
    try {
      const result = await contactService.updateBugReportStatus(
        reportId,
        status,
        notes
      );

      // Update cache
      this.updateContactItemInCache("bugReports", reportId, {
        status,
        notes,
        updatedAt: new Date(),
      });

      return result;
    } catch (error) {
      console.error("Error updating bug status:", error);
      throw error;
    }
  }

  /**
   * Delete a message thread
   */
  static async deleteMessageThread(threadId) {
    try {
      const result = await contactService.deleteMessageThread(threadId);

      // Update cache
      this.removeContactItemFromCache("messageThreads", threadId);

      return result;
    } catch (error) {
      console.error("Error deleting message thread:", error);
      throw error;
    }
  }

  /**
   * Delete a feature request
   */
  static async deleteFeatureRequest(requestId) {
    try {
      const result = await contactService.deleteFeatureRequest(requestId);

      // Update cache
      this.removeContactItemFromCache("featureRequests", requestId);

      return result;
    } catch (error) {
      console.error("Error deleting feature request:", error);
      throw error;
    }
  }

  /**
   * Delete a bug report
   */
  static async deleteBugReport(reportId) {
    try {
      const result = await contactService.deleteBugReport(reportId);

      // Update cache
      this.removeContactItemFromCache("bugReports", reportId);

      return result;
    } catch (error) {
      console.error("Error deleting bug report:", error);
      throw error;
    }
  }

  /**
   * Batch update contact items
   */
  static async batchUpdateContactItems(items, action, additionalData = {}) {
    try {
      const results = [];
      const errors = [];

      for (const item of items) {
        try {
          let result = null;

          switch (action) {
            case "updateStatus":
              if (item.type === "message") {
                result = await contactService.updateMessageStatus(
                  item.id,
                  additionalData.status
                );
              } else if (item.type === "feature") {
                result = await this.updateFeatureStatus(
                  item.id,
                  additionalData.status,
                  additionalData.notes
                );
              } else if (item.type === "bug") {
                result = await this.updateBugStatus(
                  item.id,
                  additionalData.status,
                  additionalData.notes
                );
              }
              break;
            case "delete":
              if (item.type === "message") {
                result = await this.deleteMessageThread(item.id);
              } else if (item.type === "feature") {
                result = await this.deleteFeatureRequest(item.id);
              } else if (item.type === "bug") {
                result = await this.deleteBugReport(item.id);
              }
              break;
            default:
              throw new Error(`Unknown action: ${action}`);
          }

          results.push({ id: item.id, success: true, result });
        } catch (error) {
          errors.push({ id: item.id, success: false, error: error.message });
        }
      }

      return { results, errors };
    } catch (error) {
      console.error("Error in batch contact operation:", error);
      throw error;
    }
  }

  /**
   * Get contact insights and analytics
   */
  static async getContactInsights(timeframe = "month") {
    try {
      const contactData = await this.loadContactData({ forceRefresh: true });
      const { messageThreads, featureRequests, bugReports } = contactData;

      const now = new Date();
      let cutoffDate;

      switch (timeframe) {
        case "week":
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const filterByTimeframe = (items) =>
        items.filter((item) => {
          const itemDate = new Date(
            item.timestamp?.toDate?.() || item.timestamp
          );
          return itemDate >= cutoffDate;
        });

      const recentMessages = filterByTimeframe(messageThreads);
      const recentFeatures = filterByTimeframe(featureRequests);
      const recentBugs = filterByTimeframe(bugReports);

      const insights = {
        timeframe,
        volume: {
          messages: recentMessages.length,
          features: recentFeatures.length,
          bugs: recentBugs.length,
          total:
            recentMessages.length + recentFeatures.length + recentBugs.length,
        },
        responseRate: {
          messages: this.calculateResponseRate(recentMessages),
          features: this.calculateResolutionRate(recentFeatures),
          bugs: this.calculateResolutionRate(recentBugs),
        },
        topIssues: this.getTopIssues([...recentFeatures, ...recentBugs]),
        dailyBreakdown: this.getDailyBreakdown([
          ...recentMessages,
          ...recentFeatures,
          ...recentBugs,
        ]),
      };

      return insights;
    } catch (error) {
      console.error("Error getting contact insights:", error);
      throw error;
    }
  }

  /**
   * Calculate response rate for messages
   */
  static calculateResponseRate(messages) {
    if (messages.length === 0) return 0;
    const respondedCount = messages.filter(
      (m) => m.status === "replied" || m.status === "closed"
    ).length;
    return Math.round((respondedCount / messages.length) * 100);
  }

  /**
   * Calculate resolution rate for features/bugs
   */
  static calculateResolutionRate(items) {
    if (items.length === 0) return 0;
    const resolvedCount = items.filter(
      (item) =>
        item.status === "completed" ||
        item.status === "fixed" ||
        item.status === "closed"
    ).length;
    return Math.round((resolvedCount / items.length) * 100);
  }

  /**
   * Get top issues by frequency
   */
  static getTopIssues(items) {
    const issueMap = new Map();

    items.forEach((item) => {
      const key = item.subject || item.title || "Unknown";
      const existing = issueMap.get(key) || { count: 0, items: [] };
      issueMap.set(key, {
        count: existing.count + 1,
        items: [...existing.items, item],
      });
    });

    return Array.from(issueMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([issue, data]) => ({
        issue,
        count: data.count,
        latestDate: Math.max(
          ...data.items.map(
            (item) => new Date(item.timestamp?.toDate?.() || item.timestamp)
          )
        ),
      }));
  }

  /**
   * Get daily breakdown of contact items
   */
  static getDailyBreakdown(items) {
    const dailyMap = new Map();

    items.forEach((item) => {
      const date = new Date(item.timestamp?.toDate?.() || item.timestamp);
      const dateKey = date.toISOString().split("T")[0];

      const existing = dailyMap.get(dateKey) || 0;
      dailyMap.set(dateKey, existing + 1);
    });

    return Array.from(dailyMap.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, count }));
  }

  /**
   * Update contact item in cache
   */
  static updateContactItemInCache(type, itemId, updates) {
    AdminCacheService.updateCachedData(CACHE_KEYS.CONTACT, (cachedData) => {
      return {
        ...cachedData,
        [type]: cachedData[type].map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      };
    });
  }

  /**
   * Remove contact item from cache
   */
  static removeContactItemFromCache(type, itemId) {
    AdminCacheService.updateCachedData(CACHE_KEYS.CONTACT, (cachedData) => {
      return {
        ...cachedData,
        [type]: cachedData[type].filter((item) => item.id !== itemId),
      };
    });
  }
}

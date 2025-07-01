import React from "react";
import {
  MessageCircle,
  Lightbulb,
  Bug,
  BarChart3,
  Inbox,
  ChevronRight,
  ChevronDown,
  Crown,
} from "lucide-react";
import { LoadingSpinner } from "../";

const ContactManagementPanel = ({
  contactData,
  contactLoading,
  contactFilter,
  setContactFilter,
  contactSort,
  setContactSort,
  expandedItems,
  setExpandedItems,
  actionInProgress,
  setActionInProgress,
  selectedThread,
  setSelectedThread,
  replyText,
  setReplyText,
  onReplyToMessage,
  onUpdateFeatureStatus,
  onUpdateBugStatus,
  onDeleteMessageThread,
  onDeleteFeatureRequest,
  onDeleteBugReport,
  formatTimeAgo,
}) => {
  // Combine all contact items into one unified list
  const getAllContactItems = () => {
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
        icon: MessageCircle,
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
        icon: Lightbulb,
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
        icon: Bug,
        typeLabel: "Bug",
      });
    });

    return items;
  };

  const filterAndSortItems = (items) => {
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
  };

  const getStatusColor = (status, type) => {
    const statusColors = {
      message: {
        unread: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
        read: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
      },
      feature: {
        received:
          "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
        "in-progress":
          "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
        completed:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
        rejected:
          "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
      },
      bug: {
        new: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
        investigating:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
        resolved:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
        "wont-fix":
          "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
      },
    };
    return (
      statusColors[type]?.[status] ||
      "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
    );
  };

  const getPriorityIcon = (priority) => {
    const priorityConfig = {
      high: {
        label: "High",
        color:
          "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700",
      },
      medium: {
        label: "Medium",
        color:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700",
      },
      low: {
        label: "Low",
        color:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700",
      },
    };

    const config = priorityConfig[priority] || {
      label: "Normal",
      color:
        "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const getUserAvatar = (item) => {
    // Generate avatar based on email (Gravatar) or fallback to initials
    const email = item.userEmail;
    const name = item.user || "Unknown";
    const initials = name.charAt(0).toUpperCase() || "U";

    // If we have an email, we could use Gravatar, but for now we'll use initials with themed colors
    const avatarColors = {
      message: "bg-gradient-to-br from-blue-500 to-blue-600",
      feature: "bg-gradient-to-br from-green-500 to-green-600",
      bug: "bg-gradient-to-br from-red-500 to-red-600",
    };

    const avatarColor =
      avatarColors[item.type] || "bg-gradient-to-br from-gray-500 to-gray-600";

    return (
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColor}`}
        title={email ? `${name} (${email})` : name}
      >
        {initials}
      </div>
    );
  };

  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleItemAction = async (item, action, value = null) => {
    setActionInProgress(`${item.id}-${action}`);
    try {
      switch (item.type) {
        case "message":
          if (action === "reply") {
            await onReplyToMessage(item.id);
          } else if (action === "delete") {
            await onDeleteMessageThread(item.id);
          }
          break;
        case "feature":
          if (action === "updateStatus") {
            await onUpdateFeatureStatus(item.id, value);
          } else if (action === "delete") {
            await onDeleteFeatureRequest(item.id);
          }
          break;
        case "bug":
          if (action === "updateStatus") {
            await onUpdateBugStatus(item.id, value);
          } else if (action === "delete") {
            await onDeleteBugReport(item.id);
          }
          break;
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const allItems = getAllContactItems();
  const filteredItems = filterAndSortItems(allItems);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Contact Management</h1>
            <p className="text-blue-100">
              Unified view of all user communications and requests
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-gray-700 text-sm border-0 focus:ring-2 focus:ring-white/20"
            >
              <option value="all">All Items</option>
              <option value="messages">Messages</option>
              <option value="features">Features</option>
              <option value="bugs">Bugs</option>
              <option value="unread">Unread</option>
            </select>
            <select
              value={contactSort}
              onChange={(e) => setContactSort(e.target.value)}
              className="px-3 py-2 rounded-lg text-gray-700 text-sm border-0 focus:ring-2 focus:ring-white/20"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {contactLoading ? (
        <div className="text-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 font-medium">
            Loading contact data...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card-background rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-text-secondary">
                    Messages
                  </span>
                </div>
                <span className="text-lg font-bold text-text-primary">
                  {contactData.messageThreads.length}
                </span>
              </div>
            </div>
            <div className="bg-card-background rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-text-secondary">
                    Features
                  </span>
                </div>
                <span className="text-lg font-bold text-text-primary">
                  {contactData.featureRequests.length}
                </span>
              </div>
            </div>
            <div className="bg-card-background rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-text-secondary">
                    Bugs
                  </span>
                </div>
                <span className="text-lg font-bold text-text-primary">
                  {contactData.bugReports.length}
                </span>
              </div>
            </div>
            <div className="bg-card-background rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-text-secondary">
                    Total
                  </span>
                </div>
                <span className="text-lg font-bold text-text-primary">
                  {allItems.length}
                </span>
              </div>
            </div>
          </div>

          {/* Unified Contact Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">
                All Contact Items ({filteredItems.length})
              </h2>
            </div>

            {filteredItems.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="hover:bg-gray-50"
                  >
                    {/* Main Row - Confluence Style */}
                    <div
                      className="flex items-center justify-between px-6 py-3 cursor-pointer"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Expand/Collapse Icon */}
                        <button className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                          {expandedItems.has(item.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        {/* Type Icon */}
                        <div className="flex-shrink-0">
                          <item.icon
                            className={`w-5 h-5 ${
                              item.type === "message"
                                ? "text-blue-600"
                                : item.type === "feature"
                                ? "text-green-600"
                                : item.type === "bug"
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          />
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </h3>
                        </div>

                        {/* Priority (for bugs) */}
                        {item.type === "bug" && (
                          <span className="flex-shrink-0">
                            {getPriorityIcon(item.priority)}
                          </span>
                        )}

                        {/* Status */}
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(
                            item.status,
                            item.type
                          )}`}
                        >
                          {item.status.replace("-", " ").toUpperCase()}
                        </span>

                        {/* User */}
                        <div className="flex items-center gap-2 flex-shrink-0 min-w-0 max-w-32">
                          {/* User Avatar */}
                          {getUserAvatar(item)}
                          {/* User Name */}
                          <span className="text-sm text-gray-500 truncate">
                            {item.user}
                          </span>
                        </div>

                        {/* Time */}
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedItems.has(item.id) && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        {/* Message Details */}
                        {item.type === "message" && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Latest Message
                              </h4>
                              <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                                {item.data.lastMessage}
                              </p>
                              <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                                <span>
                                  From: {item.data.userEmail} • Messages:{" "}
                                  {item.data.messageCount}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Crown className="w-3 h-3 text-yellow-500" />
                                  <span className="text-yellow-600 font-medium">
                                    Your reply will show as Owner
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedThread(item.data)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                disabled={
                                  actionInProgress === `${item.id}-reply`
                                }
                              >
                                Reply
                              </button>
                              <button
                                onClick={() => handleItemAction(item, "delete")}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                disabled={
                                  actionInProgress === `${item.id}-delete`
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Feature Request Details */}
                        {item.type === "feature" && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Description
                              </h4>
                              <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                                {item.data.description}
                              </p>
                              <div className="mt-2 text-xs text-gray-500">
                                Upvotes: {item.data.upvotes || 0}
                              </div>
                            </div>
                            <div className="flex gap-2 items-center">
                              <select
                                value={item.data.status}
                                onChange={(e) =>
                                  handleItemAction(
                                    item,
                                    "updateStatus",
                                    e.target.value
                                  )
                                }
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                                disabled={
                                  actionInProgress === `${item.id}-updateStatus`
                                }
                              >
                                <option value="received">Received</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                              </select>
                              <button
                                onClick={() => handleItemAction(item, "delete")}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                disabled={
                                  actionInProgress === `${item.id}-delete`
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Bug Report Details */}
                        {item.type === "bug" && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Description
                              </h4>
                              <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                                {item.data.description}
                              </p>
                              <div className="mt-2 text-xs text-gray-500">
                                Priority: {item.data.priority}
                              </div>
                            </div>
                            <div className="flex gap-2 items-center">
                              <select
                                value={item.data.status}
                                onChange={(e) =>
                                  handleItemAction(
                                    item,
                                    "updateStatus",
                                    e.target.value
                                  )
                                }
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                                disabled={
                                  actionInProgress === `${item.id}-updateStatus`
                                }
                              >
                                <option value="new">New</option>
                                <option value="investigating">
                                  Investigating
                                </option>
                                <option value="resolved">Resolved</option>
                                <option value="wont-fix">Won't Fix</option>
                              </select>
                              <button
                                onClick={() => handleItemAction(item, "delete")}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                disabled={
                                  actionInProgress === `${item.id}-delete`
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  No contact items found
                </p>
                <p className="text-gray-400 text-sm">
                  Contact items will appear here when users submit them
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {selectedThread && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Reply to {selectedThread.userName}
            </h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="w-full h-32 p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setSelectedThread(null);
                  setReplyText("");
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => onReplyToMessage(selectedThread.id)}
                disabled={!replyText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactManagementPanel;

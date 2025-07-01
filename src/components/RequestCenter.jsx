import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { contactService } from "../services/ContactService";
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayCircleIcon,
  ChatBubbleLeftIcon,
  LightBulbIcon,
  BugAntIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const RequestCenter = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (user) {
      loadUserRequests();
    }
  }, [user]);

  const loadUserRequests = async () => {
    try {
      setLoading(true);
      const [messageThread, featureRequests, bugReports] = await Promise.all([
        contactService.getUserMessageThread(user.uid),
        contactService.getUserFeatureRequests(user.uid),
        contactService.getUserBugReports(user.uid),
      ]);

      const allRequests = [];

      // Convert message thread to requests
      if (messageThread && messageThread.messages?.length > 0) {
        messageThread.messages.forEach((message, index) => {
          allRequests.push({
            id: `message-${index}`,
            type: "message",
            title: "Feedback Message",
            description:
              message.text?.substring(0, 100) +
              (message.text?.length > 100 ? "..." : ""),
            status: messageThread.unread ? "pending" : "read",
            timestamp: message.timestamp,
            priority: "medium",
            icon: ChatBubbleLeftIcon,
            typeLabel: "Feedback",
            color: "blue",
          });
        });
      }

      // Convert feature requests to requests
      if (featureRequests && !featureRequests.indexBuilding) {
        featureRequests.forEach((request) => {
          allRequests.push({
            id: `feature-${request.id}`,
            type: "feature",
            title: request.title,
            description:
              request.description?.substring(0, 100) +
              (request.description?.length > 100 ? "..." : ""),
            status: request.status || "pending",
            timestamp: request.timestamp,
            priority: "medium",
            icon: LightBulbIcon,
            typeLabel: "Feature Idea",
            color: "green",
          });
        });
      }

      // Convert bug reports to requests
      if (bugReports && !bugReports.indexBuilding) {
        bugReports.forEach((report) => {
          allRequests.push({
            id: `bug-${report.id}`,
            type: "bug",
            title: report.title,
            description:
              report.description?.substring(0, 100) +
              (report.description?.length > 100 ? "..." : ""),
            status: report.status || "pending",
            timestamp: report.timestamp,
            priority: report.priority || "medium",
            icon: BugAntIcon,
            typeLabel: "Bug Report",
            color: "red",
          });
        });
      }

      // Sort by timestamp (newest first)
      allRequests.sort((a, b) => {
        const dateA = new Date(a.timestamp?.toDate?.() || a.timestamp);
        const dateB = new Date(b.timestamp?.toDate?.() || b.timestamp);
        return dateB - dateA;
      });

      setRequests(allRequests);
    } catch (error) {
      console.error("Error loading user requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
      case "resolved":
      case "read":
        return CheckCircleIcon;
      case "in-progress":
      case "in-review":
        return PlayCircleIcon;
      case "rejected":
      case "closed":
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
      case "resolved":
      case "read":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900";
      case "in-progress":
      case "in-review":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900";
      case "rejected":
      case "closed":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900 dark:border-red-700";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900 dark:border-yellow-700";
      case "low":
        return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900 dark:border-green-700";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600";
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (filter === "all") return true;
    if (filter === "pending")
      return ["pending", "open", "unread"].includes(request.status);
    if (filter === "in-progress")
      return ["in-progress", "in-review"].includes(request.status);
    if (filter === "completed")
      return ["completed", "resolved", "read"].includes(request.status);
    return request.type === filter;
  });

  const getRequestCounts = () => {
    const pending = requests.filter((r) =>
      ["pending", "open", "unread"].includes(r.status)
    ).length;
    const inProgress = requests.filter((r) =>
      ["in-progress", "in-review"].includes(r.status)
    ).length;
    const completed = requests.filter((r) =>
      ["completed", "resolved", "read"].includes(r.status)
    ).length;
    return { pending, inProgress, completed };
  };

  const counts = getRequestCounts();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              My Requests
            </h2>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {counts.pending}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Pending
            </div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
            <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
              {counts.inProgress}
            </div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
              In Progress
            </div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900 rounded-lg">
            <div className="text-lg font-bold text-green-800 dark:text-green-200">
              {counts.completed}
            </div>
            <div className="text-xs text-green-700 dark:text-green-300">
              Completed
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All", count: requests.length },
            { key: "pending", label: "Pending", count: counts.pending },
            {
              key: "in-progress",
              label: "In Progress",
              count: counts.inProgress,
            },
            { key: "completed", label: "Completed", count: counts.completed },
          ].map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                filter === filterOption.key
                  ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              } border`}
            >
              {filterOption.label} ({filterOption.count})
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {filteredRequests.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRequests.map((request) => {
              const StatusIcon = getStatusIcon(request.status);
              const IconComponent = request.icon;

              return (
                <div
                  key={request.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-${request.color}-100 dark:bg-${request.color}-900`}
                      >
                        <IconComponent
                          className={`w-4 h-4 text-${request.color}-600 dark:text-${request.color}-400`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {request.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(
                              request.priority
                            )}`}
                          >
                            {request.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {request.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                          <span className="font-medium">
                            {request.typeLabel}
                          </span>
                          <span>
                            {new Date(
                              request.timestamp?.toDate?.() || request.timestamp
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center ml-4">
                      <div
                        className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No requests found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {filter === "all"
                ? "You haven't submitted any feedback, feature ideas, or bug reports yet."
                : `No requests with status "${filter}" found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestCenter;

import { useState, useEffect } from "react";
import { announcementService } from "../services/AnnouncementService";
import {
  MegaphoneIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { Lightbulb, Bug } from "lucide-react";

const AnnouncementWidget = ({ className = "" }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Local storage helpers
  const VIEWED_ANNOUNCEMENTS_KEY = "pokemonapi_viewed_announcements";

  const getViewedAnnouncements = () => {
    try {
      const viewed = localStorage.getItem(VIEWED_ANNOUNCEMENTS_KEY);
      return viewed ? JSON.parse(viewed) : [];
    } catch (error) {
      console.error("Error reading viewed announcements:", error);
      return [];
    }
  };

  const markAnnouncementsAsViewed = (announcementIds) => {
    try {
      const currentViewed = getViewedAnnouncements();
      const updatedViewed = [
        ...new Set([...currentViewed, ...announcementIds]),
      ];
      localStorage.setItem(
        VIEWED_ANNOUNCEMENTS_KEY,
        JSON.stringify(updatedViewed)
      );
    } catch (error) {
      console.error("Error marking announcements as viewed:", error);
    }
  };

  const calculateUnreadCount = (allAnnouncements) => {
    const viewedAnnouncements = getViewedAnnouncements();
    const unread = allAnnouncements.filter(
      (announcement) => !viewedAnnouncements.includes(announcement.id)
    );
    return unread.length;
  };

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoading(true);
        const publishedAnnouncements =
          await announcementService.getPublishedAnnouncements(10); // Get more to have a good pool
        setAnnouncements(publishedAnnouncements);

        // Calculate unread count
        const unread = calculateUnreadCount(publishedAnnouncements);
        setUnreadCount(unread);
      } catch (error) {
        console.error("Error loading announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  const handleToggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    // When expanding, mark visible announcements as viewed
    if (newExpanded && announcements.length > 0) {
      const visibleAnnouncements = announcements.slice(0, 2); // Only first 2 are visible initially
      const announcementIds = visibleAnnouncements.map((a) => a.id);
      markAnnouncementsAsViewed(announcementIds);

      // Update unread count
      const newUnreadCount = calculateUnreadCount(announcements);
      setUnreadCount(newUnreadCount);
    }
  };

  const handleShowMore = (e) => {
    e.stopPropagation();
    const newShowAll = !showAll;
    setShowAll(newShowAll);

    // If showing all, mark all announcements as viewed
    if (newShowAll && announcements.length > 0) {
      const announcementIds = announcements.map((a) => a.id);
      markAnnouncementsAsViewed(announcementIds);
      setUnreadCount(0);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Unknown";

    const now = new Date();
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "feature":
        return <Lightbulb className="w-4 h-4 text-green-600" />;
      case "bugfix":
        return <Bug className="w-4 h-4 text-red-600" />;
      case "maintenance":
        return <Cog6ToothIcon className="w-4 h-4 text-orange-600" />;
      case "announcement":
        return <MegaphoneIcon className="w-4 h-4 text-blue-600" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "feature":
        return "New Feature";
      case "bugfix":
        return "Bug Fix";
      case "maintenance":
        return "Maintenance";
      case "announcement":
        return "Announcement";
      default:
        return "Update";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "feature":
        return "text-green-600 bg-green-50 border-green-200";
      case "bugfix":
        return "text-red-600 bg-red-50 border-red-200";
      case "maintenance":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "announcement":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === "high") {
      return "🔥";
    }
    return null;
  };

  // Show max 2 announcements initially, all when showAll is true
  const displayedAnnouncements = showAll
    ? announcements
    : announcements.slice(0, 2);

  if (loading) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return null; // Don't show widget if no announcements
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleToggleExpanded}
      >
        <div className="flex items-center gap-3">
          <MegaphoneIcon className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">What's New</h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          <div className="space-y-4">
            {displayedAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(announcement.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                      {announcement.title}
                      {getPriorityIcon(announcement.priority) && (
                        <span className="ml-1">
                          {getPriorityIcon(announcement.priority)}
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(
                          announcement.type
                        )}`}
                      >
                        {getTypeLabel(announcement.type)}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-2 line-clamp-4">
                    {announcement.content}
                  </p>

                  <div className="text-xs text-gray-500">
                    {formatTimeAgo(announcement.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show More/Less Button */}
          {announcements.length > 2 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={handleShowMore}
                className="w-full text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                {showAll
                  ? "Show Less"
                  : `Show ${announcements.length - 2} More`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnouncementWidget;

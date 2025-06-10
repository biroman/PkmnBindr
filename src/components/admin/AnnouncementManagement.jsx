import { useState } from "react";
import { announcementService } from "../../services/AnnouncementService";
import {
  MegaphoneIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Lightbulb, Bug } from "lucide-react";

const AnnouncementManagement = ({
  user,
  announcements,
  setAnnouncements,
  announcementsLoading,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "feature",
    priority: "normal",
    isPublished: false,
  });

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

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await announcementService.createAnnouncement(formData, user);
      setFormData({
        title: "",
        content: "",
        type: "feature",
        priority: "normal",
        isPublished: false,
      });
      setShowCreateForm(false);

      // Reload announcements
      const updatedAnnouncements =
        await announcementService.getAllAnnouncements();
      setAnnouncements(updatedAnnouncements);
    } catch (error) {
      console.error("Error creating announcement:", error);
    }
  };

  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await announcementService.updateAnnouncement(
        editingAnnouncement.id,
        formData,
        user
      );
      setEditingAnnouncement(null);
      setFormData({
        title: "",
        content: "",
        type: "feature",
        priority: "normal",
        isPublished: false,
      });

      // Reload announcements
      const updatedAnnouncements =
        await announcementService.getAllAnnouncements();
      setAnnouncements(updatedAnnouncements);
    } catch (error) {
      console.error("Error updating announcement:", error);
    }
  };

  const handleTogglePublish = async (announcement) => {
    try {
      await announcementService.togglePublishStatus(
        announcement.id,
        announcement.isPublished,
        user
      );

      // Reload announcements
      const updatedAnnouncements =
        await announcementService.getAllAnnouncements();
      setAnnouncements(updatedAnnouncements);
    } catch (error) {
      console.error("Error toggling publish status:", error);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) {
      return;
    }

    try {
      await announcementService.deleteAnnouncement(announcementId);

      // Reload announcements
      const updatedAnnouncements =
        await announcementService.getAllAnnouncements();
      setAnnouncements(updatedAnnouncements);
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  const startEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      isPublished: announcement.isPublished,
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingAnnouncement(null);
    setShowCreateForm(false);
    setFormData({
      title: "",
      content: "",
      type: "feature",
      priority: "normal",
      isPublished: false,
    });
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

  const getTypeColor = (type) => {
    switch (type) {
      case "feature":
        return "bg-green-100 text-green-800 border-green-200";
      case "bugfix":
        return "bg-red-100 text-red-800 border-red-200";
      case "maintenance":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "announcement":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "normal":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Announcement Management</h1>
            <p className="text-purple-100">
              Create and manage changelog entries and user announcements
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors"
          >
            {showCreateForm ? "Cancel" : "New Announcement"}
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingAnnouncement
              ? "Edit Announcement"
              : "Create New Announcement"}
          </h2>
          <form
            onSubmit={
              editingAnnouncement
                ? handleUpdateAnnouncement
                : handleCreateAnnouncement
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter announcement title..."
                  required
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="feature">Feature</option>
                    <option value="bugfix">Bug Fix</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter announcement content..."
                required
                maxLength={5000}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.content.length}/5000 characters
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublished: e.target.checked })
                  }
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Publish immediately (visible to users)
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                {editingAnnouncement
                  ? "Update Announcement"
                  : "Create Announcement"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Announcements ({announcements.length})
          </h2>
        </div>

        {announcementsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading announcements...</p>
          </div>
        ) : announcements.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(announcement.type)}
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {announcement.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(
                          announcement.type
                        )}`}
                      >
                        {announcement.type.charAt(0).toUpperCase() +
                          announcement.type.slice(1)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                          announcement.priority
                        )}`}
                      >
                        {announcement.priority.charAt(0).toUpperCase() +
                          announcement.priority.slice(1)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          announcement.isPublished
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {announcement.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                      {announcement.content}
                    </p>

                    <div className="text-sm text-gray-500">
                      Created {formatTimeAgo(announcement.createdAt)} by{" "}
                      {announcement.createdBy?.name}
                      {announcement.lastUpdatedBy && (
                        <span>
                          {" "}
                          • Last updated by {announcement.lastUpdatedBy.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEdit(announcement)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleTogglePublish(announcement)}
                      className={`text-sm font-medium ${
                        announcement.isPublished
                          ? "text-orange-600 hover:text-orange-800"
                          : "text-green-600 hover:text-green-800"
                      }`}
                    >
                      {announcement.isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MegaphoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No announcements yet</p>
            <p className="text-gray-400 text-sm">
              Create your first announcement to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementManagement;

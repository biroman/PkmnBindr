import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useOwner } from "../hooks/useAuth";
import { useRules } from "../contexts/RulesContext";
import { useBinderContext } from "../contexts/BinderContext";
import { Button } from "../components/ui/Button";
import RulesExample from "../components/examples/RulesExample";
import BinderLimitsManager from "../components/admin/BinderLimitsManager";
import ContactLimitsManager from "../components/admin/ContactLimitsManager";
import { contactService } from "../services/ContactService";
import { announcementService } from "../services/AnnouncementService";
import AnnouncementManagement from "../components/admin/AnnouncementManagement";
import { setupDefaultBinderLimits } from "../scripts/setupDefaultBinderLimits";
import { setupDefaultContactLimits } from "../scripts/setupContactLimits";
import {
  fetchAllUsers,
  fetchAllUsersWithStats,
  updateUserRole,
  updateUserStatus,
  updateUserStats,
  migrateUserData,
  recalculateAllUserStats,
} from "../utils/userManagement";
import {
  Cog6ToothIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentIcon,
  ShieldCheckIcon,
  ServerIcon,
  BellIcon,
  ClockIcon,
  FolderIcon,
  PhotoIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  CpuChipIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import {
  MessageCircle,
  Lightbulb,
  Bug,
  AlertCircle,
  BarChart3,
  Inbox,
  ChevronRight,
  ChevronDown,
  Clock,
  User,
} from "lucide-react";

const AdminPage = () => {
  const { user } = useAuth();
  const isOwner = useOwner();
  const { rules, loading: rulesLoading } = useRules();
  const { binders } = useBinderContext();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [systemStats, setSystemStats] = useState({
    totalUsers: 1, // For now, just the owner
    totalBinders: 0,
    totalCards: 0,
    activeRules: 0,
  });

  // User management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [recalculatingStats, setRecalculatingStats] = useState(false);

  // Contact system state
  const [contactData, setContactData] = useState({
    messageThreads: [],
    featureRequests: [],
    bugReports: [],
  });
  const [contactLoading, setContactLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Calculate system statistics
  useEffect(() => {
    const calculateStats = () => {
      // Calculate total binders and cards across all users
      const totalBinders = users.reduce(
        (sum, u) => sum + (u.binderCount || 0),
        0
      );
      const totalCards = users.reduce((sum, u) => sum + (u.cardCount || 0), 0);
      const activeRules = rules.filter((rule) => rule.enabled).length;

      setSystemStats({
        totalUsers: users.length || 1, // Use actual user count
        totalBinders,
        totalCards,
        activeRules,
      });
    };

    calculateStats();
  }, [users, rules]);

  // Fetch users effect
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true);

        // Fetch users with accurate stats calculated from Firebase collections
        const usersWithStats = await fetchAllUsersWithStats();

        // Run migration to ensure all users have required fields
        if (usersWithStats.length > 0) {
          const migrationResult = await migrateUserData();
          if (migrationResult.success && migrationResult.migratedCount > 0) {
            console.log(`Migrated ${migrationResult.migratedCount} users`);
            // Refetch users after migration
            const updatedUsers = await fetchAllUsersWithStats();
            setUsers(updatedUsers);
            setUsersLoading(false);
            return;
          }
        }

        setUsers(usersWithStats);

        // If no users found (first time setup), create initial user data
        if (usersWithStats.length === 0 && user?.uid) {
          console.log(
            "No users found in database. This appears to be initial setup."
          );
          // The user tracking hook will create the user profile automatically
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        // Fallback to empty array if there's an error
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    if (user?.uid) {
      loadUsers();
    }
  }, [user]);

  // Load contact data
  useEffect(() => {
    const loadContactData = async () => {
      try {
        setContactLoading(true);
        const [messageThreads, featureRequests, bugReports] = await Promise.all(
          [
            contactService.getAllMessageThreads(),
            contactService.getAllFeatureRequests(),
            contactService.getAllBugReports(),
          ]
        );

        setContactData({
          messageThreads,
          featureRequests,
          bugReports,
        });
      } catch (error) {
        console.error("Error loading contact data:", error);
      } finally {
        setContactLoading(false);
      }
    };

    if (isOwner) {
      loadContactData();
    }
  }, [isOwner]);

  // Load announcements
  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const allAnnouncements =
          await announcementService.getAllAnnouncements();
        setAnnouncements(allAnnouncements);
      } catch (error) {
        console.error("Error loading announcements:", error);
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    if (isOwner) {
      loadAnnouncements();
    }
  }, [isOwner]);

  // Contact management functions
  const handleReplyToMessage = async (threadId) => {
    if (!replyText.trim()) return;

    try {
      await contactService.replyToMessage(threadId, replyText);
      setReplyText("");
      setSelectedThread(null);

      // Reload contact data
      const updatedThreads = await contactService.getAllMessageThreads();
      setContactData((prev) => ({ ...prev, messageThreads: updatedThreads }));
    } catch (error) {
      console.error("Error replying to message:", error);
    }
  };

  const handleUpdateFeatureStatus = async (requestId, status) => {
    try {
      await contactService.updateFeatureRequestStatus(requestId, status);

      // Reload feature requests
      const updatedRequests = await contactService.getAllFeatureRequests();
      setContactData((prev) => ({ ...prev, featureRequests: updatedRequests }));
    } catch (error) {
      console.error("Error updating feature request:", error);
    }
  };

  const handleUpdateBugStatus = async (reportId, status) => {
    try {
      await contactService.updateBugReportStatus(reportId, status);

      // Reload bug reports
      const updatedReports = await contactService.getAllBugReports();
      setContactData((prev) => ({ ...prev, bugReports: updatedReports }));
    } catch (error) {
      console.error("Error updating bug report:", error);
    }
  };

  // Delete handlers
  const handleDeleteMessageThread = async (threadId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this message thread? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await contactService.deleteMessageThread(threadId);

      // Reload message threads
      const updatedThreads = await contactService.getAllMessageThreads();
      setContactData((prev) => ({ ...prev, messageThreads: updatedThreads }));
    } catch (error) {
      console.error("Error deleting message thread:", error);
    }
  };

  const handleDeleteFeatureRequest = async (requestId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this feature request? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await contactService.deleteFeatureRequest(requestId);

      // Reload feature requests
      const updatedRequests = await contactService.getAllFeatureRequests();
      setContactData((prev) => ({ ...prev, featureRequests: updatedRequests }));
    } catch (error) {
      console.error("Error deleting feature request:", error);
    }
  };

  const handleDeleteBugReport = async (reportId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this bug report? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await contactService.deleteBugReport(reportId);

      // Reload bug reports
      const updatedReports = await contactService.getAllBugReports();
      setContactData((prev) => ({ ...prev, bugReports: updatedReports }));
    } catch (error) {
      console.error("Error deleting bug report:", error);
    }
  };

  const handleSetupBinderLimits = async () => {
    if (user?.uid) {
      const result = await setupDefaultBinderLimits(user.uid);
      if (result.success) {
        alert(
          `✅ ${result.message}\n\n` +
            `Max Binders: ${result.limits?.maxBinders || 5}\n` +
            `Max Cards per Binder: ${
              result.limits?.maxCardsPerBinder || 500
            }\n` +
            `Max Pages per Binder: ${result.limits?.maxPagesPerBinder || 50}`
        );
      } else {
        alert(`❌ ${result.message}\n\nCheck console for details.`);
      }
    }
  };

  const handleSetupContactLimits = async () => {
    if (user?.uid) {
      const result = await setupDefaultContactLimits(user.uid);
      if (result.success) {
        alert(
          `✅ ${result.message}\n\n` +
            `Direct Messages: ${
              result.limits?.directMessages?.limit || 5
            } per ${result.limits?.directMessages?.window || "hour"}\n` +
            `Feature Requests: ${
              result.limits?.featureRequests?.limit || 3
            } per ${result.limits?.featureRequests?.window || "day"}\n` +
            `Bug Reports: ${result.limits?.bugReports?.limit || 10} per ${
              result.limits?.bugReports?.window || "day"
            }`
        );
      } else {
        alert(`❌ ${result.message}\n\nCheck console for details.`);
      }
    }
  };

  const copyUserId = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      alert("User ID copied to clipboard!");
    }
  };

  const handleMigrateUsers = async () => {
    try {
      setUsersLoading(true);
      const result = await migrateUserData();

      if (result.success) {
        if (result.migratedCount > 0) {
          alert(`✅ Successfully migrated ${result.migratedCount} users`);
          // Reload users after migration
          const updatedUsers = await fetchAllUsersWithStats();
          setUsers(updatedUsers);
        } else {
          alert("✅ All users are already up-to-date");
        }
      } else {
        alert(`❌ Migration failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Migration error:", error);
      alert(`❌ Migration failed: ${error.message}`);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRecalculateStats = async () => {
    try {
      setRecalculatingStats(true);
      const result = await recalculateAllUserStats();

      if (result.success) {
        if (result.updatedUsers > 0) {
          alert(
            `✅ Successfully recalculated stats for all users\n\n` +
              `Total Users: ${result.totalUsers}\n` +
              `Updated: ${result.updatedUsers}\n` +
              `Already Accurate: ${result.totalUsers - result.updatedUsers}`
          );
        } else {
          alert(
            `✅ All user stats are already accurate\n\n` +
              `Total Users: ${result.totalUsers}`
          );
        }

        // Reload users to show updated stats
        const updatedUsers = await fetchAllUsersWithStats();
        setUsers(updatedUsers);
      } else {
        alert(`❌ Stats recalculation failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Stats recalculation error:", error);
      alert(`❌ Stats recalculation failed: ${error.message}`);
    } finally {
      setRecalculatingStats(false);
    }
  };

  // User management functions
  const handleRoleChange = async (userId, newRole) => {
    try {
      // Update in Firestore
      const success = await updateUserRole(userId, newRole);

      if (success) {
        // Update local state
        setUsers((prev) =>
          prev.map((u) => (u.uid === userId ? { ...u, role: newRole } : u))
        );
        alert(`User role updated to ${newRole}`);
      } else {
        alert(`Failed to update user role`);
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      alert(`Error updating user role: ${error.message}`);
    }
  };

  const handleStatusToggle = async (userId) => {
    try {
      const user = users.find((u) => u.uid === userId);
      if (!user) {
        alert("User not found");
        return;
      }

      // Ensure user has a status, default to 'active' if missing
      const currentStatus = user.status || "active";
      const newStatus = currentStatus === "active" ? "inactive" : "active";

      // Update in Firestore
      const success = await updateUserStatus(userId, newStatus);

      if (success) {
        // Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === userId
              ? {
                  ...u,
                  status: newStatus,
                }
              : u
          )
        );
        alert(`User ${newStatus === "active" ? "activated" : "deactivated"}`);
      } else {
        alert(`Failed to update user status`);
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      alert(`Error updating user status: ${error.message}`);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "admin":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "user":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status) => {
    return status === "active"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  const tabs = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: ChartBarIcon,
      description: "System overview and metrics",
    },
    {
      id: "binder-limits",
      name: "Binder Limits",
      icon: DocumentIcon,
      description: "Manage user binder and card limits",
    },
    {
      id: "users",
      name: "Users",
      icon: UserGroupIcon,
      description: "User management and permissions",
    },
    {
      id: "system",
      name: "System",
      icon: ServerIcon,
      description: "System settings and maintenance",
    },
    {
      id: "rules",
      name: "Advanced Rules",
      icon: ShieldCheckIcon,
      description: "Advanced rule management",
    },
    {
      id: "contact",
      name: "Contact Management",
      icon: BellIcon,
      description: "Manage user messages, feature requests, and bug reports",
    },
    {
      id: "contact-limits",
      name: "Contact Limits",
      icon: ClockIcon,
      description: "Configure rate limits for contact features",
    },
    {
      id: "announcements",
      name: "Announcements",
      icon: MegaphoneIcon,
      description: "Manage changelog and user announcements",
    },
  ];

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Admin Panel</h1>
            <p className="text-blue-100 text-lg">
              Manage your Pokemon Binder application with powerful
              administrative tools
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {new Date().toLocaleDateString()}
            </div>
            <div className="text-blue-200">System Status: Online</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">
                {systemStats.totalUsers}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <UserGroupIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">Active</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Binders</p>
              <p className="text-3xl font-bold text-gray-900">
                {systemStats.totalBinders}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FolderIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">Growing</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cards</p>
              <p className="text-3xl font-bold text-gray-900">
                {systemStats.totalCards}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <PhotoIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">Collecting</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Rules</p>
              <p className="text-3xl font-bold text-gray-900">
                {systemStats.activeRules}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <ShieldCheckIcon className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">Protected</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab("binder-limits")}
            className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <DocumentIcon className="w-6 h-6 text-blue-600" />
              <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                Manage Binder Limits
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              Configure user binder and card limits
            </p>
          </button>

          <button
            onClick={handleSetupBinderLimits}
            className="text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Cog6ToothIcon className="w-6 h-6 text-green-600" />
              <h3 className="font-medium text-gray-900 group-hover:text-green-600">
                Setup Default Limits
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              Initialize default binder limits (5 binders, 500 cards)
            </p>
          </button>

          <button
            onClick={handleSetupContactLimits}
            className="text-left p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <ClockIcon className="w-6 h-6 text-orange-600" />
              <h3 className="font-medium text-gray-900 group-hover:text-orange-600">
                Setup Contact Limits
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              Initialize default contact rate limits (5 msgs/hr, 3 features/day,
              10 bugs/day)
            </p>
          </button>

          <button
            onClick={() => setActiveTab("system")}
            className="text-left p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <ServerIcon className="w-6 h-6 text-purple-600" />
              <h3 className="font-medium text-gray-900 group-hover:text-purple-600">
                System Settings
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              Configure system settings and maintenance
            </p>
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            System Health
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-900">Database</span>
              </div>
              <span className="text-sm text-green-600 font-medium">
                Operational
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-900">
                  Authentication
                </span>
              </div>
              <span className="text-sm text-green-600 font-medium">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CloudIcon className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-900">Cloud Storage</span>
              </div>
              <span className="text-sm text-blue-600 font-medium">Synced</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <ClockIcon className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  System initialized
                </p>
                <p className="text-xs text-gray-600">Admin panel accessed</p>
              </div>
              <span className="text-xs text-gray-500">Now</span>
            </div>

            {systemStats.totalBinders > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FolderIcon className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Binders created
                  </p>
                  <p className="text-xs text-gray-600">
                    {systemStats.totalBinders} binders in system
                  </p>
                </div>
                <span className="text-xs text-gray-500">Recent</span>
              </div>
            )}

            {systemStats.activeRules > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <ShieldCheckIcon className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Rules configured
                  </p>
                  <p className="text-xs text-gray-600">
                    {systemStats.activeRules} active rules
                  </p>
                </div>
                <span className="text-xs text-gray-500">Active</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => {
    const filteredUsers = users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || u.role === filterRole;
      return matchesSearch && matchesRole;
    });

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                User Management
              </h2>
              <p className="text-gray-600 mt-1">
                Manage registered users and their permissions. Stats are
                calculated in real-time from Firebase collections.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRecalculateStats}
                disabled={recalculatingStats || usersLoading}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${
                    recalculatingStats || usersLoading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }
                `}
              >
                {recalculatingStats ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Recalculating...</span>
                  </>
                ) : (
                  <>
                    <ArrowTrendingUpIcon className="w-4 h-4" />
                    <span>Recalculate Stats</span>
                  </>
                )}
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                <UserGroupIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {filteredUsers.length}{" "}
                  {filteredUsers.length === 1 ? "User" : "Users"}
                </span>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search users by name or email..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>

          {/* Firebase Optimization Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Firebase Index Optimization</p>
                <p>
                  User stats are calculated in real-time from multiple Firebase
                  collections using optimized queries. This ensures accuracy but
                  may take a moment to load. The system uses existing indexes
                  for optimal performance.
                </p>
              </div>
            </div>
          </div>

          {/* User Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {users.length}
              </div>
              <div className="text-sm text-blue-700">Total Users</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {users.filter((u) => u.status === "active").length}
              </div>
              <div className="text-sm text-green-700">Active Users</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {
                  users.filter((u) => u.role === "owner" || u.role === "admin")
                    .length
                }
              </div>
              <div className="text-sm text-purple-700">Admin Users</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {users.reduce((sum, u) => sum + (u.binderCount || 0), 0)}
              </div>
              <div className="text-sm text-orange-700">Total Binders</div>
            </div>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading users...</span>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role & Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Collection
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.uid}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {u.photoURL ? (
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={u.photoURL}
                                  alt=""
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                  <span className="text-white font-medium text-sm">
                                    {u.displayName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {u.displayName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(
                                u.role
                              )}`}
                            >
                              {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                            </span>
                            <br />
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                                u.status
                              )}`}
                            >
                              {u.status.charAt(0).toUpperCase() +
                                u.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div className="font-medium">
                              Joined {formatDate(u.createdAt)}
                            </div>
                            <div className="text-gray-400">
                              Last seen {getTimeAgo(u.lastSeen)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div className="flex items-center gap-1">
                              <FolderIcon className="w-4 h-4" />
                              <span className="font-medium">
                                {u.binderCount} binders
                              </span>
                              {u.storedBinderCount !== undefined &&
                                u.storedBinderCount !== u.binderCount && (
                                  <span
                                    className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 border border-orange-200"
                                    title={`Stored: ${u.storedBinderCount}, Calculated: ${u.binderCount}`}
                                  >
                                    Updated
                                  </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400">
                              <PhotoIcon className="w-4 h-4" />
                              <span>{u.cardCount} cards</span>
                              {u.storedCardCount !== undefined &&
                                u.storedCardCount !== u.cardCount && (
                                  <span
                                    className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 border border-orange-200"
                                    title={`Stored: ${u.storedCardCount}, Calculated: ${u.cardCount}`}
                                  >
                                    Updated
                                  </span>
                                )}
                            </div>
                            {u.calculationError && (
                              <div className="flex items-center gap-1 text-red-500 mt-1">
                                <ExclamationTriangleIcon className="w-3 h-3" />
                                <span className="text-xs">Calc Error</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {u.uid !== user?.uid && (
                              <>
                                <select
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                  value={u.role}
                                  onChange={(e) =>
                                    handleRoleChange(u.uid, e.target.value)
                                  }
                                  disabled={u.role === "owner"}
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                  {u.role === "owner" && (
                                    <option value="owner">Owner</option>
                                  )}
                                </select>

                                <button
                                  onClick={() => handleStatusToggle(u.uid)}
                                  className={`text-xs px-2 py-1 rounded transition-colors ${
                                    u.status === "active"
                                      ? "text-red-600 hover:bg-red-50"
                                      : "text-green-600 hover:bg-green-50"
                                  }`}
                                >
                                  {u.status === "active"
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>
                              </>
                            )}

                            {u.uid === user?.uid && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No users found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || filterRole !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "No users have registered yet"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSystem = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          System Configuration
        </h2>

        {/* Owner Setup Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-6 h-6" />
            Owner & Security Setup
          </h3>

          <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Your User ID:
              </span>
              <div className="flex items-center gap-2">
                <code className="bg-gray-100 px-3 py-1 rounded-md text-sm font-mono text-gray-800">
                  {user?.uid || "Not available"}
                </code>
                <Button size="sm" variant="outline" onClick={copyUserId}>
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSetupBinderLimits}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                📁 Setup Binder Limits
              </Button>

              <Button
                onClick={handleMigrateUsers}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
              >
                🔄 Migrate User Data
              </Button>
            </div>
          </div>

          <div className="text-sm text-green-700 space-y-1">
            <p>
              🛡️ If you're getting permission errors, click "Setup Owner Role"
              once
            </p>
            <p>
              📁 Click "Setup Binder Limits" to initialize default limits (5
              binders, 500 cards)
            </p>
          </div>
        </div>

        {/* System Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CpuChipIcon className="w-5 h-5" />
              System Information
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Environment:</span>
                <span className="font-medium">Production</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database:</span>
                <span className="font-medium">Firebase Firestore</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Authentication:</span>
                <span className="font-medium">Firebase Auth</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Storage:</span>
                <span className="font-medium">Firebase Storage</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ServerIcon className="w-5 h-5" />
              Performance Metrics
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cache Hit Rate:</span>
                <span className="font-medium text-green-600">95%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Response Time:</span>
                <span className="font-medium text-green-600">&lt;200ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-medium text-green-600">99.9%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Error Rate:</span>
                <span className="font-medium text-green-600">&lt;0.1%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedRules = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Advanced Rules Management
        </h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            <span className="font-medium text-amber-800">
              Advanced Configuration
            </span>
          </div>
          <p className="text-amber-700 text-sm">
            This section provides low-level rule management. For basic binder
            limits, use the "Binder Limits" tab.
          </p>
        </div>
        <RulesExample />
      </div>
    </div>
  );

  // Status color helpers for the new design
  const getContactStatusColor = (status, type) => {
    const colors = {
      bugs: {
        new: "bg-red-100 text-red-800 border-red-200",
        investigating: "bg-yellow-100 text-yellow-800 border-yellow-200",
        resolved: "bg-green-100 text-green-800 border-green-200",
        "wont-fix": "bg-gray-100 text-gray-600 border-gray-200",
      },
      features: {
        received: "bg-blue-100 text-blue-800 border-blue-200",
        "in-progress": "bg-orange-100 text-orange-800 border-orange-200",
        completed: "bg-green-100 text-green-800 border-green-200",
        rejected: "bg-gray-100 text-gray-600 border-gray-200",
      },
      messages: {
        unread: "bg-blue-50 border-blue-200",
        read: "bg-white border-gray-200",
      },
    };
    return (
      colors[type]?.[status] || "bg-gray-100 text-gray-600 border-gray-200"
    );
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-red-500 text-white",
      medium: "bg-yellow-500 text-white",
      low: "bg-green-500 text-white",
    };
    return colors[priority] || "bg-gray-500 text-white";
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const [contactFilter, setContactFilter] = useState("all");
  const [contactSort, setContactSort] = useState("newest");
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [actionInProgress, setActionInProgress] = useState(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  const renderContactManagement = () => {
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
          unread: "bg-blue-100 text-blue-800",
          read: "bg-gray-100 text-gray-600",
        },
        feature: {
          received: "bg-blue-100 text-blue-800",
          "in-progress": "bg-orange-100 text-orange-800",
          completed: "bg-green-100 text-green-800",
          rejected: "bg-gray-100 text-gray-600",
        },
        bug: {
          new: "bg-blue-100 text-blue-800",
          investigating: "bg-yellow-100 text-yellow-800",
          resolved: "bg-green-100 text-green-800",
          "wont-fix": "bg-gray-100 text-gray-600",
        },
      };
      return statusColors[type]?.[status] || "bg-gray-100 text-gray-600";
    };

    const getPriorityIcon = (priority) => {
      const priorityConfig = {
        high: {
          label: "High",
          color: "bg-red-100 text-red-800 border-red-200",
        },
        medium: {
          label: "Medium",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        },
        low: {
          label: "Low",
          color: "bg-green-100 text-green-800 border-green-200",
        },
      };

      const config = priorityConfig[priority] || {
        label: "Normal",
        color: "bg-gray-100 text-gray-600 border-gray-200",
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
        avatarColors[item.type] ||
        "bg-gradient-to-br from-gray-500 to-gray-600";

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
              await handleReplyToMessage(item.id);
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Loading contact data...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Messages
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {contactData.messageThreads.length}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Features
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {contactData.featureRequests.length}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bug className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Bugs
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {contactData.bugReports.length}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Total
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
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
                                <div className="mt-2 text-xs text-gray-500">
                                  From: {item.data.userEmail} • Messages:{" "}
                                  {item.data.messageCount}
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
                                  onClick={() =>
                                    handleItemAction(item, "delete")
                                  }
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
                                    actionInProgress ===
                                    `${item.id}-updateStatus`
                                  }
                                >
                                  <option value="received">Received</option>
                                  <option value="in-progress">
                                    In Progress
                                  </option>
                                  <option value="completed">Completed</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                                <button
                                  onClick={() =>
                                    handleItemAction(item, "delete")
                                  }
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
                                    actionInProgress ===
                                    `${item.id}-updateStatus`
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
                                  onClick={() =>
                                    handleItemAction(item, "delete")
                                  }
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
                  onClick={() => handleReplyToMessage(selectedThread.id)}
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Cog6ToothIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Admin Panel
                  </h1>
                  <p className="text-sm text-gray-600">
                    Pokemon Binder Management
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">
                  Owner Access
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {user?.email || user?.uid?.substring(0, 8)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-xl p-1 border border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all
                    ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "binder-limits" && <BinderLimitsManager />}
          {activeTab === "contact-limits" && <ContactLimitsManager />}
          {activeTab === "users" && renderUsers()}
          {activeTab === "system" && renderSystem()}
          {activeTab === "rules" && renderAdvancedRules()}
          {activeTab === "contact" && renderContactManagement()}
          {activeTab === "announcements" && (
            <AnnouncementManagement
              user={user}
              announcements={announcements}
              setAnnouncements={setAnnouncements}
              announcementsLoading={announcementsLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

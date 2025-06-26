import React, { useState, useEffect } from "react";
import { useAuth, useOwner } from "../hooks/useAuth";
import { useRules } from "../contexts/RulesContext";
import BinderLimitsManager from "../components/admin/BinderLimitsManager";
import ContactLimitsManager from "../components/admin/ContactLimitsManager";
import { announcementService } from "../services/AnnouncementService";
import AnnouncementManagement from "../components/admin/AnnouncementManagement";
import StaticBinderGenerator from "../components/admin/StaticBinderGenerator";
import ChangelogCleanupTool from "../components/admin/ChangelogCleanupTool";

// Import Phase 2 components
import {
  AdminNavigation,
  DashboardOverview,
  ErrorBoundary,
  ContactManagementPanel,
  SystemControlPanel,
  RulesManagementPanel,
} from "../components/admin";
import { UserManagementTable } from "../components/admin/users";

// Phase 3: Import admin services for business logic
import {
  AdminUserService,
  AdminContactService,
  AdminSystemService,
  AdminCacheService,
  AdminBatchService,
  initializeAdminServices,
  CACHE_KEYS as SERVICE_CACHE_KEYS,
} from "../services/admin";

const CACHE_KEYS = SERVICE_CACHE_KEYS;

const AdminPage = () => {
  const { user } = useAuth();
  const isOwner = useOwner();

  // Authorization is now handled at the route level by AdminProtectedRoute

  const {
    rules,
    loading: rulesLoading,
    isOwner: isRulesOwner,
    createRule,
    deleteRule,
    toggleRule,
    getRuleStats,
  } = useRules();

  // Restore original state management for now
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection and responsive handling
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Phase 3: Initialize admin services
  useEffect(() => {
    const initServices = async () => {
      try {
        const result = await initializeAdminServices();
        if (!result.success) {
          console.error("Failed to initialize admin services:", result.error);
        } else {
          console.log("Admin services initialized successfully");
        }
      } catch (error) {
        console.error("Error initializing admin services:", error);
      }
    };

    initServices();
  }, []);
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
  const [filterStatus, setFilterStatus] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    lastWeekSignups: 0,
  });

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // User action dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Contact system state
  const [contactData, setContactData] = useState({
    messageThreads: [],
    featureRequests: [],
    bugReports: [],
  });
  const [contactLoading, setContactLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Cache refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Rules management state
  const [selectedRule, setSelectedRule] = useState(null);
  const [showCreateRuleForm, setShowCreateRuleForm] = useState(false);
  const [ruleStats, setRuleStats] = useState({});
  const [ruleActionError, setRuleActionError] = useState("");
  const [ruleActionSuccess, setRuleActionSuccess] = useState("");

  // Calculate system statistics
  useEffect(() => {
    const calculateStats = () => {
      // Use userStats totals if available (these are calculated from ALL users, not just the filtered/paginated ones)
      const totalBinders =
        userStats.totalBinders ||
        users.reduce((sum, u) => sum + (u.binderCount || 0), 0);
      const totalCards =
        userStats.totalCards ||
        users.reduce((sum, u) => sum + (u.cardCount || 0), 0);
      const activeRules = rules.filter((rule) => rule.enabled).length;

      setSystemStats({
        totalUsers: userStats.total || users.length || 1,
        totalBinders,
        totalCards,
        activeRules,
      });
    };

    calculateStats();
  }, [users, rules, userStats]);

  // Phase 3: Use AdminUserService for user management
  const loadUsers = async (
    page = 1,
    resetStats = false,
    forceRefresh = false
  ) => {
    try {
      setUsersLoading(true);

      const result = await AdminUserService.loadUsers({
        page,
        limit: usersPerPage,
        searchTerm,
        filterRole,
        filterStatus,
        sortBy,
        sortOrder,
        forceRefresh,
        resetStats,
      });

      console.log("🔍 AdminPage loadUsers result:", {
        userCount: result.users.length,
        totalUsers: result.totalUsers,
        stats: result.stats,
        sampleUser: result.users[0]
          ? {
              uid: result.users[0].uid,
              email: result.users[0].email,
              createdAt: result.users[0].createdAt,
              lastSeen: result.users[0].lastSeen,
              binderCount: result.users[0].binderCount,
              cardCount: result.users[0].cardCount,
            }
          : null,
      });

      setUsers(result.users);
      setTotalUsers(result.totalUsers);
      setCurrentPage(page);
      if (result.stats) {
        console.log("📊 Setting userStats:", result.stats);
        setUserStats(result.stats);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch users effect
  useEffect(() => {
    if (user?.uid) {
      loadUsers(currentPage, true);
    }
  }, [
    user,
    currentPage,
    searchTerm,
    filterRole,
    filterStatus,
    sortBy,
    sortOrder,
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        activeDropdown &&
        !event.target.closest("[data-dropdown-container]")
      ) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  // Phase 3: Use AdminContactService for contact management
  const loadContactData = async (forceRefresh = false) => {
    try {
      setContactLoading(true);

      const result = await AdminContactService.loadContactData({
        forceRefresh,
      });

      setContactData(result);
    } catch (error) {
      console.error("Error loading contact data:", error);
    } finally {
      setContactLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadContactData();
    }
  }, [isOwner]);

  // Phase 3: Load announcements using AdminCacheService
  const loadAnnouncements = async (forceRefresh = false) => {
    try {
      setAnnouncementsLoading(true);

      // Use AdminCacheService for caching
      let cachedAnnouncements = null;
      if (!forceRefresh) {
        cachedAnnouncements = AdminCacheService.getCachedData(
          CACHE_KEYS.ANNOUNCEMENTS
        );
      }

      if (cachedAnnouncements) {
        setAnnouncements(cachedAnnouncements);
      } else {
        const allAnnouncements =
          await announcementService.getAllAnnouncements();
        setAnnouncements(allAnnouncements);
        AdminCacheService.setCachedData(
          CACHE_KEYS.ANNOUNCEMENTS,
          allAnnouncements
        );
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
      // Set empty array on error to prevent UI issues
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadAnnouncements();
    }
  }, [isOwner]);

  // Phase 3: Use AdminContactService for contact management
  const handleReplyToMessage = async (threadId) => {
    if (!replyText.trim()) return;

    try {
      await AdminContactService.replyToMessage(threadId, replyText, user);
      setReplyText("");
      setSelectedThread(null);

      // Force refresh contact data
      await loadContactData(true);
    } catch (error) {
      console.error("Error replying to message:", error);
    }
  };

  const handleUpdateFeatureStatus = async (requestId, status) => {
    try {
      await AdminContactService.updateFeatureStatus(requestId, status);

      // Force refresh contact data
      await loadContactData(true);
    } catch (error) {
      console.error("Error updating feature request:", error);
    }
  };

  const handleUpdateBugStatus = async (reportId, status) => {
    try {
      await AdminContactService.updateBugStatus(reportId, status);

      // Force refresh contact data
      await loadContactData(true);
    } catch (error) {
      console.error("Error updating bug report:", error);
    }
  };

  // Delete handlers using AdminContactService
  const handleDeleteMessageThread = async (threadId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this message thread? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await AdminContactService.deleteMessageThread(threadId);

      // Force refresh contact data
      await loadContactData(true);
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
      await AdminContactService.deleteFeatureRequest(requestId);

      // Force refresh contact data
      await loadContactData(true);
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
      await AdminContactService.deleteBugReport(reportId);

      // Force refresh contact data
      await loadContactData(true);
    } catch (error) {
      console.error("Error deleting bug report:", error);
    }
  };

  // Phase 3: Use AdminSystemService for system operations
  const handleSetupBinderLimits = async () => {
    if (user?.uid) {
      const result = await AdminSystemService.setupBinderLimits(user.uid);
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
      const result = await AdminSystemService.setupContactLimits(user.uid);
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

  // Phase 3: Use AdminSystemService for user migration
  const handleMigrateUsers = async () => {
    try {
      setUsersLoading(true);
      const result = await AdminSystemService.migrateUserData();

      if (result.success) {
        if (result.migratedCount > 0) {
          alert(`✅ Successfully migrated ${result.migratedCount} users`);
          // Reload users after migration
          await loadUsers(currentPage, true, true);
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

  // Phase 3: Use AdminUserService for stats recalculation
  const handleRecalculateStats = async () => {
    try {
      setRecalculatingStats(true);
      const result = await AdminUserService.recalculateAllUserStats();

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

        // Reload current page with force refresh
        await loadUsers(currentPage, true, true);
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

  // Phase 3: Use AdminBatchService for optimized refresh
  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true);

      // Use AdminBatchService for batched refresh
      const result = await AdminBatchService.performBatchRefresh({
        userFilters: {
          searchTerm,
          filterRole,
          filterStatus,
          sortBy,
          sortOrder,
          page: currentPage,
          limit: usersPerPage,
        },
        includeContact: isOwner,
        includeAnnouncements: isOwner,
        forceRefresh: true,
      });

      if (result.success) {
        console.log("🔄 Batch refresh result:", {
          users: result.data.users?.length || 0,
          totalUsers: result.data.totalUsers,
          userStats: result.data.userStats,
          sampleUser: result.data.users?.[0]
            ? {
                uid: result.data.users[0].uid,
                email: result.data.users[0].email,
                createdAt: result.data.users[0].createdAt,
                lastSeen: result.data.users[0].lastSeen,
                binderCount: result.data.users[0].binderCount,
              }
            : null,
        });

        setUsers(result.data.users || []);
        setTotalUsers(result.data.totalUsers || 0);

        if (result.data.userStats) {
          console.log(
            "📊 Batch refresh setting userStats:",
            result.data.userStats
          );
          setUserStats(result.data.userStats);
        }

        if (result.data.contactData) {
          setContactData(result.data.contactData);
        }

        if (result.data.announcements) {
          setAnnouncements(result.data.announcements);
        }

        setLastRefresh(new Date());

        console.log("✅ Optimized refresh completed via AdminBatchService", {
          performance: result.performance,
          optimization: "Batched Firebase requests",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      // Fallback to individual loading if batch fails
      console.warn("Falling back to individual data loading...");
      const refreshPromises = [];

      if (user?.uid) {
        refreshPromises.push(loadUsers(currentPage, true, true));
      }

      if (isOwner) {
        refreshPromises.push(loadContactData(true));
      }

      await Promise.all(refreshPromises);
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  // Phase 3: Use AdminUserService for user actions
  const handleUserAction = async (userId, action, additionalData = null) => {
    const userData = users.find((u) => u.uid === userId);
    if (!userData) return;

    try {
      setActionLoading(`${userId}-${action}`);

      const result = await AdminUserService.performUserAction(userId, action, {
        user: userData,
        currentUser: user,
        additionalData,
      });

      if (result.success) {
        alert(`✅ ${result.message}`);

        // Handle special cases
        if (action === "refreshStats") {
          // Update the specific user in the local state
          if (result.updatedUser) {
            setUsers((prevUsers) =>
              prevUsers.map((u) =>
                u.uid === userId ? { ...u, ...result.updatedUser } : u
              )
            );

            // Update the userStats to reflect the change in totals
            const oldUser = users.find((u) => u.uid === userId);
            if (oldUser) {
              const binderDiff =
                (result.updatedUser.binderCount || 0) -
                (oldUser.binderCount || 0);
              const cardDiff =
                (result.updatedUser.cardCount || 0) - (oldUser.cardCount || 0);

              setUserStats((prevStats) => ({
                ...prevStats,
                totalBinders: (prevStats.totalBinders || 0) + binderDiff,
                totalCards: (prevStats.totalCards || 0) + cardDiff,
              }));

              console.log("📊 Updated collection stats:", {
                binderDiff,
                cardDiff,
                newTotalBinders: (userStats.totalBinders || 0) + binderDiff,
                newTotalCards: (userStats.totalCards || 0) + cardDiff,
              });
            }
          }
          return; // Early return to avoid the reload
        }

        // Reload users to reflect changes
        await loadUsers(currentPage, true, true);
      } else {
        alert(`❌ ${result.error}`);
      }

      setActiveDropdown(null);
    } catch (error) {
      console.error("User action error:", error);
      alert(`❌ Action failed: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Never";

    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return "Invalid Date";

      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  // Rules management functions
  const loadRuleStats = async () => {
    if (!isRulesOwner || rules.length === 0) return;

    const stats = {};
    for (const rule of rules) {
      try {
        stats[rule.id] = await getRuleStats(rule.id);
      } catch (error) {
        console.error(`Failed to load stats for rule ${rule.id}:`, error);
      }
    }
    setRuleStats(stats);
  };

  const handleDeleteRule = async (ruleId) => {
    if (
      !confirm(
        "Are you sure you want to delete this rule? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setRuleActionError("");
      await deleteRule(ruleId);
      setSelectedRule(null);
      setRuleActionSuccess("Rule deleted successfully");
      await loadRuleStats();
    } catch (error) {
      setRuleActionError(error.message);
    }
  };

  const handleToggleRule = async (ruleId, enabled) => {
    try {
      setRuleActionError("");
      await toggleRule(ruleId, enabled);
      setRuleActionSuccess(
        `Rule ${enabled ? "enabled" : "disabled"} successfully`
      );
      await loadRuleStats();
    } catch (error) {
      setRuleActionError(error.message);
    }
  };

  // Load rule stats when rules change
  useEffect(() => {
    loadRuleStats();
  }, [rules, isRulesOwner]);

  const renderDashboard = () => (
    <DashboardOverview
      systemStats={systemStats}
      isRefreshing={isRefreshing}
      onRefresh={handleRefreshData}
      lastRefresh={lastRefresh}
      onTabChange={setActiveTab}
      onSetupBinderLimits={handleSetupBinderLimits}
      onSetupContactLimits={handleSetupContactLimits}
    />
  );

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Unknown";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return "Unknown";

      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 0) return "Just now";
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting time ago:", error);
      return "Unknown";
    }
  };

  const [contactFilter, setContactFilter] = useState("all");
  const [contactSort, setContactSort] = useState("newest");
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [actionInProgress, setActionInProgress] = useState(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Phase 2: AdminNavigation Component */}
          <AdminNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isMobile={isMobile}
            mobileMenuOpen={mobileMenuOpen}
            onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          />

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "binder-limits" && <BinderLimitsManager />}
            {activeTab === "contact-limits" && <ContactLimitsManager />}
            {activeTab === "users" && (
              <UserManagementTable
                users={users}
                loading={usersLoading}
                userStats={userStats}
                pagination={{
                  currentPage,
                  setCurrentPage,
                  totalPages: Math.ceil(totalUsers / usersPerPage),
                  usersPerPage,
                  totalUsers,
                }}
                filters={{
                  searchTerm,
                  setSearchTerm,
                  filterRole,
                  setFilterRole,
                  filterStatus,
                  setFilterStatus,
                  sortBy,
                  setSortBy,
                  sortOrder,
                  setSortOrder,
                }}
                onUserAction={handleUserAction}
                onRefreshStats={handleRecalculateStats}
                currentUser={user}
              />
            )}
            {activeTab === "system" && (
              <SystemControlPanel
                user={user}
                onCopyUserId={copyUserId}
                onSetupBinderLimits={handleSetupBinderLimits}
                onMigrateUsers={handleMigrateUsers}
              />
            )}
            {activeTab === "contact" && (
              <ContactManagementPanel
                contactData={contactData}
                contactLoading={contactLoading}
                contactFilter={contactFilter}
                setContactFilter={setContactFilter}
                contactSort={contactSort}
                setContactSort={setContactSort}
                expandedItems={expandedItems}
                setExpandedItems={setExpandedItems}
                actionInProgress={actionInProgress}
                setActionInProgress={setActionInProgress}
                selectedThread={selectedThread}
                setSelectedThread={setSelectedThread}
                replyText={replyText}
                setReplyText={setReplyText}
                onReplyToMessage={handleReplyToMessage}
                onUpdateFeatureStatus={handleUpdateFeatureStatus}
                onUpdateBugStatus={handleUpdateBugStatus}
                onDeleteMessageThread={handleDeleteMessageThread}
                onDeleteFeatureRequest={handleDeleteFeatureRequest}
                onDeleteBugReport={handleDeleteBugReport}
                formatTimeAgo={formatTimeAgo}
              />
            )}
            {activeTab === "announcements" && (
              <AnnouncementManagement
                user={user}
                announcements={announcements}
                setAnnouncements={setAnnouncements}
                announcementsLoading={announcementsLoading}
              />
            )}
            {activeTab === "static-binders" && <StaticBinderGenerator />}
            {activeTab === "rules" && (
              <RulesManagementPanel
                isRulesOwner={isRulesOwner}
                rules={rules}
                rulesLoading={rulesLoading}
                selectedRule={selectedRule}
                setSelectedRule={setSelectedRule}
                showCreateRuleForm={showCreateRuleForm}
                setShowCreateRuleForm={setShowCreateRuleForm}
                ruleStats={ruleStats}
                ruleActionSuccess={ruleActionSuccess}
                setRuleActionSuccess={setRuleActionSuccess}
                ruleActionError={ruleActionError}
                setRuleActionError={setRuleActionError}
                onToggleRule={handleToggleRule}
                onDeleteRule={handleDeleteRule}
                formatDate={formatDate}
              />
            )}
            {activeTab === "changelog-cleanup" && <ChangelogCleanupTool />}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AdminPage;

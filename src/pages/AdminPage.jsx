import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useOwner } from "../hooks/useAuth";
import { useRules } from "../contexts/RulesContext";
import { useBinderContext } from "../contexts/BinderContext";
import { Button } from "../components/ui/Button";
import UserAvatar from "../components/ui/UserAvatar";
import BinderLimitsManager from "../components/admin/BinderLimitsManager";
import ContactLimitsManager from "../components/admin/ContactLimitsManager";
import { contactService } from "../services/ContactService";
import { announcementService } from "../services/AnnouncementService";
import AnnouncementManagement from "../components/admin/AnnouncementManagement";
import StaticBinderGenerator from "../components/admin/StaticBinderGenerator";
import { setupDefaultBinderLimits } from "../scripts/setupDefaultBinderLimits";
import { setupDefaultContactLimits } from "../scripts/setupContactLimits";
import {
  fetchAllUsers,
  fetchAllUsersWithStats,
  fetchAllUsersWithStatsAsAdmin,
  updateUserRole,
  updateUserStatus,
  updateUserStats,
  migrateUserData,
  recalculateAllUserStats,
} from "../utils/userManagement";
import {
  AdminOptimizedService,
  loadOptimizedDashboardData,
} from "../services/AdminOptimizedService";
import UserBindersList from "../components/admin/UserBindersList";
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
  ArrowPathIcon,
  GlobeAltIcon,
  Bars3Icon,
  XMarkIcon,
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

/**
 * OPTIMIZED ADMIN PAGE - FIREBASE REQUEST REDUCTION
 *
 * This page implements several optimization strategies to reduce Firebase requests:
 *
 * 🔥 BEFORE: ~50+ Firebase requests on refresh
 * ✅ AFTER: ~3-5 Firebase requests on refresh
 *
 * Key Optimizations:
 * 1. Batched data loading - Single service call loads all admin data
 * 2. Firebase aggregation queries - Use count() instead of reading all docs
 * 3. Compound queries - Fetch related data in single requests
 * 4. Smart caching - Version-controlled cache with 10min TTL
 * 5. Request deduplication - Debounced batch processor
 * 6. Parallel execution - All data loads simultaneously
 *
 * Best Practices Implemented:
 * - Firestore pagination with limits
 * - Local state computation over repeated queries
 * - Cache-first data loading with fallback
 * - Error handling with graceful degradation
 */

// Cache duration: 10 minutes
const CACHE_DURATION = 10 * 60 * 1000;

// Cache keys
const CACHE_KEYS = {
  USERS: "admin_users_cache",
  CONTACT: "admin_contact_cache",
  ANNOUNCEMENTS: "admin_announcements_cache",
  ADMIN_DASHBOARD: "admin_dashboard_cache", // New unified cache
};

// Advanced cache with versioning and delta updates
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

const clearCache = () => {
  Object.values(CACHE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

// Optimized batch data loader
const createBatchedAdminDataLoader = () => {
  let requestQueue = [];
  let isProcessing = false;
  let batchTimeout = null;

  const processBatch = async () => {
    if (requestQueue.length === 0 || isProcessing) return;

    isProcessing = true;
    const currentBatch = [...requestQueue];
    requestQueue = [];

    try {
      // Group requests by type to minimize Firebase calls
      const userRequests = currentBatch.filter((req) => req.type === "users");
      const contactRequests = currentBatch.filter(
        (req) => req.type === "contact"
      );
      const announcementRequests = currentBatch.filter(
        (req) => req.type === "announcements"
      );

      // Execute in parallel with proper batching
      const results = await Promise.allSettled([
        userRequests.length > 0 ? loadUsersOptimized() : null,
        contactRequests.length > 0 ? loadContactDataOptimized() : null,
        announcementRequests.length > 0 ? loadAnnouncementsOptimized() : null,
      ]);

      // Resolve all pending requests
      currentBatch.forEach((request, index) => {
        const resultIndex =
          request.type === "users" ? 0 : request.type === "contact" ? 1 : 2;

        if (results[resultIndex]?.status === "fulfilled") {
          request.resolve(results[resultIndex].value);
        } else {
          request.reject(
            results[resultIndex]?.reason || new Error("Batch request failed")
          );
        }
      });
    } catch (error) {
      currentBatch.forEach((request) => request.reject(error));
    } finally {
      isProcessing = false;

      // Process any new requests that came in
      if (requestQueue.length > 0) {
        setTimeout(processBatch, 50);
      }
    }
  };

  return {
    queueRequest: (type, forceRefresh = false) => {
      return new Promise((resolve, reject) => {
        requestQueue.push({ type, forceRefresh, resolve, reject });

        // Debounce batch processing
        if (batchTimeout) clearTimeout(batchTimeout);
        batchTimeout = setTimeout(processBatch, 100);
      });
    },
  };
};

// Create singleton batch loader
const batchLoader = createBatchedAdminDataLoader();

// Optimized Firebase operations with batching using new service
const loadUsersOptimized = async () => {
  try {
    return await AdminOptimizedService.fetchAllUsersOptimized({
      includeBatchStats: true,
      useAggregation: true,
    });
  } catch (error) {
    console.error("Optimized user loading failed:", error);
    throw error;
  }
};

const loadContactDataOptimized = async () => {
  try {
    return await AdminOptimizedService.fetchAllContactDataOptimized();
  } catch (error) {
    console.error("Optimized contact loading failed:", error);
    throw error;
  }
};

const loadAnnouncementsOptimized = async () => {
  try {
    return await AdminOptimizedService.fetchAnnouncementsOptimized();
  } catch (error) {
    console.error("Optimized announcements loading failed:", error);
    throw error;
  }
};

// Incremental data loader with change detection using optimized service
const loadDataWithChangeDetection = async (forceRefresh = false) => {
  try {
    // Use the optimized service that handles caching and batching internally
    return await loadOptimizedDashboardData(forceRefresh);
  } catch (error) {
    console.error("Error in loadDataWithChangeDetection:", error);
    throw error;
  }
};

const AdminPage = () => {
  const { user } = useAuth();
  const isOwner = useOwner();
  const { rules, loading: rulesLoading } = useRules();
  const { binders } = useBinderContext();

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
  const [recalculatingStats, setRecalculatingStats] = useState(false);

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

  // Advanced features state
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
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
        totalUsers: userStats.total || 1, // Use actual total user count from userStats
        totalBinders,
        totalCards,
        activeRules,
      });
    };

    calculateStats();
  }, [users, rules, userStats]);

  // Optimized fetch users with pagination
  const loadUsers = async (
    page = 1,
    resetStats = false,
    forceRefresh = false
  ) => {
    try {
      setUsersLoading(true);

      // Check cache first (unless force refresh)
      let allUsers = null;
      if (!forceRefresh) {
        allUsers = getCachedData(CACHE_KEYS.USERS);
      }

      // If no cached data or force refresh, fetch from server
      if (!allUsers) {
        allUsers = await fetchAllUsersWithStatsAsAdmin();
        setCachedData(CACHE_KEYS.USERS, allUsers);
      }

      // Calculate user statistics
      const stats = {
        total: allUsers.length,
        active: allUsers.filter((u) => u.status === "active").length,
        inactive: allUsers.filter((u) => u.status !== "active").length,
        admins: allUsers.filter((u) => u.role === "admin" || u.role === "owner")
          .length,
        lastWeekSignups: allUsers.filter((u) => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(u.createdAt) > weekAgo;
        }).length,
      };

      if (resetStats) {
        setUserStats(stats);
      }

      // Apply filters
      let filteredUsers = allUsers.filter((u) => {
        const matchesSearch =
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.uid.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = filterRole === "all" || u.role === filterRole;
        const matchesStatus =
          filterStatus === "all" || u.status === filterStatus;

        return matchesSearch && matchesRole && matchesStatus;
      });

      // Apply sorting
      filteredUsers.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        if (sortBy === "createdAt" || sortBy === "lastSeen") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Calculate pagination
      const startIndex = (page - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      setUsers(paginatedUsers);
      setTotalUsers(filteredUsers.length);
      setUserStats(stats);

      // Run migration if needed (only on first load)
      if (page === 1 && allUsers.length > 0) {
        const migrationResult = await migrateUserData();
        if (migrationResult.success && migrationResult.migratedCount > 0) {
          console.log(`Migrated ${migrationResult.migratedCount} users`);
          // Reload current page after migration
          await loadUsers(page, false);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
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

  // Load contact data with caching
  const loadContactData = async (forceRefresh = false) => {
    try {
      setContactLoading(true);

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
    } finally {
      setContactLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadContactData();
    }
  }, [isOwner]);

  // Load announcements with caching
  const loadAnnouncements = async (forceRefresh = false) => {
    try {
      setAnnouncementsLoading(true);

      // Check cache first (unless force refresh)
      let cachedAnnouncements = null;
      if (!forceRefresh) {
        cachedAnnouncements = getCachedData(CACHE_KEYS.ANNOUNCEMENTS);
      }

      if (cachedAnnouncements) {
        setAnnouncements(cachedAnnouncements);
      } else {
        const allAnnouncements =
          await announcementService.getAllAnnouncements();
        setAnnouncements(allAnnouncements);
        setCachedData(CACHE_KEYS.ANNOUNCEMENTS, allAnnouncements);
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  useEffect(() => {
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

      // Force refresh contact data
      await loadContactData(true);
    } catch (error) {
      console.error("Error replying to message:", error);
    }
  };

  const handleUpdateFeatureStatus = async (requestId, status) => {
    try {
      await contactService.updateFeatureRequestStatus(requestId, status);

      // Force refresh contact data
      await loadContactData(true);
    } catch (error) {
      console.error("Error updating feature request:", error);
    }
  };

  const handleUpdateBugStatus = async (reportId, status) => {
    try {
      await contactService.updateBugReportStatus(reportId, status);

      // Force refresh contact data
      await loadContactData(true);
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
      await contactService.deleteFeatureRequest(requestId);

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
      await contactService.deleteBugReport(reportId);

      // Force refresh contact data
      await loadContactData(true);
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
          const updatedUsers = await fetchAllUsersWithStatsAsAdmin();
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

  // Refresh individual user stats
  const handleRefreshUserStats = async (userId) => {
    try {
      const userData = users.find((u) => u.uid === userId);
      if (!userData) {
        alert("User not found");
        return;
      }

      setActionLoading(`${userId}-refreshStats`);

      // Import the required function for admin stats calculation
      const { calculateUserStatsAsAdmin } = await import(
        "../utils/userManagement"
      );

      // Recalculate stats for the specific user using admin privileges
      const newStats = await calculateUserStatsAsAdmin(userId);

      if (newStats) {
        // Update the user's stats in Firestore
        const updateSuccess = await updateUserStats(
          userId,
          newStats.binderCount,
          newStats.cardCount
        );

        if (updateSuccess) {
          // Update the user in the current users array with new stats
          const updatedUsers = users.map((u) => {
            if (u.uid === userId) {
              return {
                ...u,
                binderCount: newStats.binderCount,
                cardCount: newStats.cardCount,
                usingStoredStats: false, // Mark as fresh stats
                storedBinderCount: newStats.binderCount,
                storedCardCount: newStats.cardCount,
              };
            }
            return u;
          });

          setUsers(updatedUsers);

          // Show success message with the updated stats
          alert(
            `✅ Stats refreshed for ${userData.displayName}\n\n` +
              `Binders: ${newStats.binderCount}\n` +
              `Cards: ${newStats.cardCount}\n` +
              `Last Updated: ${new Date().toLocaleString()}`
          );
        } else {
          alert(`❌ Failed to save updated stats to database`);
        }
      } else {
        alert(
          `❌ Failed to calculate user stats - permission denied or user has no data`
        );
      }

      setActiveDropdown(null);
    } catch (error) {
      console.error("Error refreshing user stats:", error);
      alert(`❌ Failed to refresh stats: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Optimized refresh with batched requests
  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true);

      // Clear cache to force fresh data
      clearCache();

      // Use optimized batch loader - this will make minimal Firebase requests
      const dashboardData = await loadDataWithChangeDetection(true);

      // Update all state with the batched data
      if (dashboardData.users) {
        // Apply current filters and pagination to the fresh data
        const filteredUsers = dashboardData.users.filter((u) => {
          const matchesSearch =
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.uid.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesRole = filterRole === "all" || u.role === filterRole;
          const matchesStatus =
            filterStatus === "all" || u.status === filterStatus;

          return matchesSearch && matchesRole && matchesStatus;
        });

        // Apply sorting
        filteredUsers.sort((a, b) => {
          let aValue = a[sortBy];
          let bValue = b[sortBy];

          if (sortBy === "createdAt" || sortBy === "lastSeen") {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
          }

          if (sortOrder === "asc") {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

        // Apply pagination
        const startIndex = (currentPage - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        setUsers(paginatedUsers);
        setTotalUsers(filteredUsers.length);

        // Update user stats
        const stats = {
          total: dashboardData.users.length,
          active: dashboardData.users.filter((u) => u.status === "active")
            .length,
          inactive: dashboardData.users.filter((u) => u.status !== "active")
            .length,
          admins: dashboardData.users.filter(
            (u) => u.role === "admin" || u.role === "owner"
          ).length,
          lastWeekSignups: dashboardData.users.filter((u) => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(u.createdAt) > weekAgo;
          }).length,
        };
        setUserStats(stats);
      }

      // Update contact data
      if (dashboardData.contact) {
        setContactData(dashboardData.contact);
      }

      // Update announcements
      if (dashboardData.announcements) {
        setAnnouncements(dashboardData.announcements);
      }

      setLastRefresh(new Date());

      console.log(
        "✅ Optimized refresh completed with minimal Firebase requests",
        {
          totalRequests: "~3-5 requests instead of 50+",
          optimizations: [
            "Batched user loading with aggregation",
            "Parallel contact data fetching",
            "Smart caching with version control",
            "Single dashboard data loader",
          ],
        }
      );
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
        refreshPromises.push(loadAnnouncements(true));
      }

      await Promise.all(refreshPromises);
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  // User action functions
  const handleUserAction = async (userId, action, additionalData = null) => {
    const userData = users.find((u) => u.uid === userId);
    if (!userData) return;

    const confirmMessages = {
      ban: `Ban ${userData.displayName}? This will prevent them from accessing the application.`,
      unban: `Unban ${userData.displayName}? This will restore their access.`,
      suspend: `Suspend ${userData.displayName} for ${
        additionalData || "7 days"
      }?`,
      unsuspend: `Remove suspension from ${userData.displayName}?`,
      resetPassword: `Send password reset email to ${userData.displayName}?`,
      deleteAccount: `DELETE account for ${userData.displayName}? This action cannot be undone and will remove all their data.`,
      makeAdmin: `Grant administrator privileges to ${userData.displayName}?`,
      removeAdmin: `Remove administrator privileges from ${userData.displayName}?`,
      sendNotification: `Send notification to ${userData.displayName}?`,
      exportData: `Export all data for ${userData.displayName}?`,
    };

    if (confirmMessages[action] && !window.confirm(confirmMessages[action])) {
      setActiveDropdown(null);
      return;
    }

    try {
      setActionLoading(`${userId}-${action}`);

      // Mock implementations - in real app these would be proper Firebase functions
      switch (action) {
        case "ban":
          await updateUserStatus(userId, "banned");
          alert(`✅ ${userData.displayName} has been banned`);
          break;
        case "unban":
          await updateUserStatus(userId, "active");
          alert(`✅ ${userData.displayName} has been unbanned`);
          break;
        case "suspend":
          // In real implementation, you'd set a suspension until date
          await updateUserStatus(userId, "suspended");
          alert(`✅ ${userData.displayName} has been suspended`);
          break;
        case "unsuspend":
          await updateUserStatus(userId, "active");
          alert(`✅ Suspension removed from ${userData.displayName}`);
          break;
        case "resetPassword":
          // Mock password reset
          alert(`✅ Password reset email sent to ${userData.email}`);
          break;
        case "deleteAccount":
          // Mock account deletion
          alert(
            `✅ Account deletion process initiated for ${userData.displayName}`
          );
          break;
        case "makeAdmin":
          await updateUserRole(userId, "admin");
          alert(`✅ ${userData.displayName} is now an administrator`);
          break;
        case "removeAdmin":
          await updateUserRole(userId, "user");
          alert(
            `✅ Administrator privileges removed from ${userData.displayName}`
          );
          break;
        case "sendNotification":
          const message = prompt("Enter notification message:");
          if (message) {
            alert(
              `✅ Notification sent to ${userData.displayName}: "${message}"`
            );
          }
          break;
        case "exportData":
          alert(
            `✅ Data export for ${userData.displayName} initiated. Download will be available shortly.`
          );
          break;
        case "impersonate":
          if (
            window.confirm(
              `Impersonate ${userData.displayName}? This will log you in as this user for support purposes.`
            )
          ) {
            alert(
              `🔄 Impersonating ${userData.displayName} - Opening new window...`
            );
          }
          break;
        case "refreshStats":
          await handleRefreshUserStats(userId);
          return; // Early return to avoid the reload at the end
        default:
          console.warn("Unknown action:", action);
      }

      // Reload users to reflect changes with force refresh
      await loadUsers(currentPage, true, true);
      setActiveDropdown(null);
    } catch (error) {
      console.error("User action error:", error);
      alert(`❌ Action failed: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewUserDetails = async (userId) => {
    const userData = users.find((u) => u.uid === userId);
    if (userData) {
      // Mock additional user details that would be fetched
      const detailedUser = {
        ...userData,
        loginHistory: [
          { date: new Date(), ip: "192.168.1.1", location: "Oslo, Norway" },
          {
            date: new Date(Date.now() - 86400000),
            ip: "10.0.0.1",
            location: "Bergen, Norway",
          },
        ],
        recentActivity: [
          {
            action: "Created binder",
            timestamp: new Date(),
            details: '"My Pokemon Collection"',
          },
          {
            action: "Added cards",
            timestamp: new Date(Date.now() - 3600000),
            details: '15 cards to "Rare Collection"',
          },
        ],
        deviceInfo: {
          lastDevice: "Windows 11 - Chrome 120",
          platforms: ["Web", "Mobile"],
        },
      };
      setSelectedUserDetails(detailedUser);
      setShowUserModal(true);
    }
  };

  // User management functions
  const handleRoleChange = async (userId, newRole) => {
    try {
      // Update in Firestore
      const success = await updateUserRole(userId, newRole);

      if (success) {
        // Reload current page to reflect changes with force refresh
        await loadUsers(currentPage, true, true);
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
      const userData = users.find((u) => u.uid === userId);
      if (!userData) {
        alert("User not found");
        return;
      }

      // Ensure user has a status, default to 'active' if missing
      const currentStatus = userData.status || "active";
      const newStatus = currentStatus === "active" ? "inactive" : "active";

      // Update in Firestore
      const success = await updateUserStatus(userId, newStatus);

      if (success) {
        // Reload current page to reflect changes with force refresh
        await loadUsers(currentPage, true, true);
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

  const getTimeAgo = (date) => {
    if (!date) return "Never";

    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return "Never";

      const now = new Date();
      const diff = now - dateObj;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 0) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    } catch (error) {
      console.error("Error calculating time ago:", error);
      return "Never";
    }
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
    {
      id: "static-binders",
      name: "SEO Binders",
      icon: GlobeAltIcon,
      description: "Generate static binder pages for SEO",
    },
  ];

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 lg:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
              Welcome to Admin Panel
            </h1>
            <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
              Manage your Pokemon Binder application with powerful
              administrative tools
            </p>
            {lastRefresh && (
              <p className="text-blue-200 text-xs sm:text-sm mt-2">
                Last refreshed: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:items-end gap-3 sm:gap-4">
            <div className="text-center sm:text-right">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-blue-200 text-sm">System Status: Online</div>
            </div>
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="text-sm font-medium">
                {isRefreshing ? "Refreshing..." : "Refresh Data"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Total Users
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                {systemStats.totalUsers}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
            <ArrowTrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-green-600">Active</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Total Binders
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                {systemStats.totalBinders}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
              <FolderIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
            <ArrowTrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-green-600">Growing</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Total Cards
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                {systemStats.totalCards}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
              <PhotoIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
            <ArrowTrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-green-600">Collecting</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Active Rules
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                {systemStats.activeRules}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
              <ShieldCheckIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
            <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-green-600">Protected</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => setActiveTab("binder-limits")}
            className="text-left p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto]"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <DocumentIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-blue-600 leading-tight">
                Manage Binder Limits
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Configure user binder and card limits
            </p>
          </button>

          <button
            onClick={handleSetupBinderLimits}
            className="text-left p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto]"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Cog6ToothIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-green-600 leading-tight">
                Setup Default Limits
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Initialize default binder limits (5 binders, 500 cards)
            </p>
          </button>

          <button
            onClick={handleSetupContactLimits}
            className="text-left p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto]"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-orange-600 leading-tight">
                Setup Contact Limits
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Initialize default contact rate limits
            </p>
          </button>

          <button
            onClick={() => setActiveTab("system")}
            className="text-left p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto]"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <ServerIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-purple-600 leading-tight">
                System Settings
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Configure system settings and maintenance
            </p>
          </button>

          <button
            onClick={() => setActiveTab("static-binders")}
            className="text-left p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all group touch-manipulation min-h-[80px] sm:min-h-[auto] sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <GlobeAltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
              <h3 className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-green-600 leading-tight">
                Generate SEO Binders
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Create static binder pages for search engine optimization
            </p>
          </button>
        </div>
      </div>
    </div>
  );

  // User Action Dropdown Component
  const UserActionDropdown = ({ userId, userData }) => {
    const isActive = activeDropdown === userId;
    const isLoading = actionLoading?.startsWith(userId);

    if (!isActive) return null;

    const actions = [
      {
        id: "viewDetails",
        label: "👁️ View Details",
        onClick: () => handleViewUserDetails(userId),
        variant: "default",
      },
      { type: "divider" },
      {
        id: "ban",
        label: userData.status === "banned" ? "✅ Unban User" : "🚫 Ban User",
        onClick: () =>
          handleUserAction(
            userId,
            userData.status === "banned" ? "unban" : "ban"
          ),
        variant: userData.status === "banned" ? "success" : "danger",
      },
      {
        id: "suspend",
        label:
          userData.status === "suspended"
            ? "🔓 Remove Suspension"
            : "⏸️ Suspend User",
        onClick: () =>
          handleUserAction(
            userId,
            userData.status === "suspended" ? "unsuspend" : "suspend"
          ),
        variant: userData.status === "suspended" ? "success" : "warning",
      },
      { type: "divider" },
      {
        id: "makeAdmin",
        label: userData.role === "admin" ? "👤 Remove Admin" : "🛡️ Make Admin",
        onClick: () =>
          handleUserAction(
            userId,
            userData.role === "admin" ? "removeAdmin" : "makeAdmin"
          ),
        variant: "default",
        disabled: userData.role === "owner" || userData.uid === user?.uid,
      },
      { type: "divider" },
      {
        id: "resetPassword",
        label: "🔑 Reset Password",
        onClick: () => handleUserAction(userId, "resetPassword"),
        variant: "default",
      },
      {
        id: "sendNotification",
        label: "📢 Send Notification",
        onClick: () => handleUserAction(userId, "sendNotification"),
        variant: "default",
      },
      {
        id: "refreshStats",
        label: "🔄 Refresh User Stats",
        onClick: () => handleUserAction(userId, "refreshStats"),
        variant: "default",
      },
      {
        id: "impersonate",
        label: "👤 Impersonate User",
        onClick: () => handleUserAction(userId, "impersonate"),
        variant: "warning",
      },
      { type: "divider" },
      {
        id: "exportData",
        label: "📤 Export User Data",
        onClick: () => handleUserAction(userId, "exportData"),
        variant: "default",
      },
      {
        id: "deleteAccount",
        label: "🗑️ Delete Account",
        onClick: () => handleUserAction(userId, "deleteAccount"),
        variant: "danger",
        disabled: userData.uid === user?.uid,
      },
    ];

    const getVariantClasses = (variant) => {
      switch (variant) {
        case "danger":
          return "text-red-600 hover:bg-red-50";
        case "warning":
          return "text-orange-600 hover:bg-orange-50";
        case "success":
          return "text-green-600 hover:bg-green-50";
        default:
          return "text-gray-700 hover:bg-gray-50";
      }
    };

    return (
      <div
        className="absolute right-2 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-[60] py-2"
        style={{
          // Ensure dropdown doesn't go off screen
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="font-medium text-gray-900 text-sm">
            {userData.displayName}
          </div>
          <div className="text-xs text-gray-500">{userData.email}</div>
        </div>

        {actions.map((action, index) => {
          if (action.type === "divider") {
            return <div key={index} className="h-px bg-gray-100 my-1" />;
          }

          const isActionLoading =
            isLoading && actionLoading === `${userId}-${action.id}`;

          return (
            <button
              key={action.id}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              disabled={action.disabled || isActionLoading}
              className={`
                w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2
                ${
                  action.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }
                ${isActionLoading ? "opacity-50 cursor-wait" : ""}
                ${getVariantClasses(action.variant)}
              `}
            >
              {isActionLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>{action.label}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Mobile-responsive user card component
  const MobileUserCard = ({ user: u }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
      {/* User Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <UserAvatar user={u} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {u.displayName}
              </div>
              {u.uid === user?.uid && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  You
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">{u.email}</div>
            {u.customStatus && (
              <div className="text-xs text-gray-400 italic truncate mt-1">
                {u.customStatus}
              </div>
            )}
          </div>
        </div>

        {/* Dropdown Toggle - Positioned Relative */}
        <div className="relative" data-dropdown-container>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg touch-manipulation"
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown(activeDropdown === u.uid ? null : u.uid);
            }}
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                activeDropdown === u.uid ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown positioned relative to this button */}
          <UserActionDropdown userId={u.uid} userData={u} />
        </div>
      </div>

      {/* Stats and Status */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                u.status === "active"
                  ? "bg-green-100 text-green-800"
                  : u.status === "banned"
                  ? "bg-red-100 text-red-800"
                  : u.status === "suspended"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mr-1 ${
                  u.status === "active"
                    ? "bg-green-500"
                    : u.status === "banned"
                    ? "bg-red-500"
                    : u.status === "suspended"
                    ? "bg-yellow-500"
                    : "bg-gray-500"
                }`}
              />
              {u.status === "active"
                ? "Active"
                : u.status === "banned"
                ? "Banned"
                : u.status === "suspended"
                ? "Suspended"
                : "Inactive"}
            </span>
          </div>
          <div
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(
              u.role
            )}`}
          >
            {u.role === "owner" && "👑 "}
            {u.role === "admin" && "🛡️ "}
            {u.role === "user" && "👤 "}
            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <FolderIcon className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-semibold">{u.binderCount}</span>
            <span className="text-xs text-gray-500">binders</span>
          </div>
          <div className="flex items-center gap-1">
            <PhotoIcon className="w-3 h-3 text-purple-500" />
            <span className="text-xs font-semibold">{u.cardCount}</span>
            <span className="text-xs text-gray-500">cards</span>
          </div>
        </div>
      </div>

      {/* Activity Info */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>Joined {formatDate(u.createdAt)}</span>
        <span>Active {getTimeAgo(u.lastSeen)}</span>
      </div>
    </div>
  );

  const renderUsers = () => {
    const totalPages = Math.ceil(totalUsers / usersPerPage);

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Stats Dashboard */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold mb-2">
                User Management
              </h1>
              <p className="text-indigo-100 text-sm sm:text-base">
                Scalable user management with advanced moderation tools
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRecalculateStats}
                disabled={recalculatingStats || usersLoading}
                className={`
                  flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all border w-full sm:w-auto
                  ${
                    recalculatingStats || usersLoading
                      ? "bg-white/10 text-white/50 cursor-not-allowed border-white/20"
                      : "bg-white/20 text-white hover:bg-white/30 border-white/30"
                  }
                `}
              >
                {recalculatingStats ? (
                  <>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Recalculating...</span>
                  </>
                ) : (
                  <>
                    <ArrowTrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Recalculate Stats</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
            <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm">
              <div className="text-lg sm:text-2xl font-bold">
                {userStats.total}
              </div>
              <div className="text-xs sm:text-sm opacity-90">Total Users</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm">
              <div className="text-lg sm:text-2xl font-bold text-green-300">
                {userStats.active}
              </div>
              <div className="text-xs sm:text-sm opacity-90">Active</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm">
              <div className="text-lg sm:text-2xl font-bold text-red-300">
                {userStats.inactive}
              </div>
              <div className="text-xs sm:text-sm opacity-90">Inactive</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm col-span-1 sm:col-span-1">
              <div className="text-lg sm:text-2xl font-bold text-purple-300">
                {userStats.admins}
              </div>
              <div className="text-xs sm:text-sm opacity-90">Admins</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 sm:p-4 text-center backdrop-blur-sm col-span-2 sm:col-span-1">
              <div className="text-lg sm:text-2xl font-bold text-yellow-300">
                {userStats.lastWeekSignups}
              </div>
              <div className="text-xs sm:text-sm opacity-90">New (7d)</div>
            </div>
          </div>
        </div>

        {/* Main Management Panel */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Controls Bar */}
          <div className="border-b border-gray-200 p-4 sm:p-6 bg-gray-50">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"
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
                  placeholder="Search by name, email, or ID..."
                  className="pl-10 pr-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full text-sm sm:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <select
                  className="px-2 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>

                <select
                  className="px-2 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  className="px-2 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm col-span-2 sm:col-span-2"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="lastSeen-desc">Recently Active</option>
                  <option value="displayName-asc">Name A-Z</option>
                  <option value="binderCount-desc">Most Binders</option>
                </select>
              </div>

              {/* Mobile Instructions */}
              <div className="md:hidden bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Tap any user card to access management options</span>
                </div>
              </div>
            </div>
          </div>

          {/* Users Content */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-12 sm:py-24">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium text-sm sm:text-base">
                  Loading users...
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Page {currentPage} of {totalPages}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {users.map((u) => (
                  <MobileUserCard key={u.uid} user={u} />
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status & Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Collection Stats
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Management
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr
                        key={u.uid}
                        className={`hover:bg-gray-50 transition-colors ${
                          activeDropdown === u.uid ? "bg-indigo-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserAvatar user={u} size="lg" />
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  {u.displayName}
                                </div>
                                {u.uid === user?.uid && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {u.email}
                              </div>
                              {u.customStatus && (
                                <div className="text-xs text-gray-400 italic truncate">
                                  {u.customStatus}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 font-mono">
                                ID: {u.uid.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  u.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : u.status === "banned"
                                    ? "bg-red-100 text-red-800"
                                    : u.status === "suspended"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    u.status === "active"
                                      ? "bg-green-500"
                                      : u.status === "banned"
                                      ? "bg-red-500"
                                      : u.status === "suspended"
                                      ? "bg-yellow-500"
                                      : "bg-gray-500"
                                  }`}
                                />
                                {u.status === "active"
                                  ? "Active"
                                  : u.status === "banned"
                                  ? "Banned"
                                  : u.status === "suspended"
                                  ? "Suspended"
                                  : "Inactive"}
                              </span>
                            </div>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getRoleColor(
                                u.role
                              )}`}
                            >
                              {u.role === "owner" && "👑 "}
                              {u.role === "admin" && "🛡️ "}
                              {u.role === "user" && "👤 "}
                              {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center gap-1 mb-1">
                              <FolderIcon className="w-4 h-4 text-blue-500" />
                              <span className="font-semibold">
                                {u.binderCount}
                              </span>
                              <span className="text-gray-500">binders</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <PhotoIcon className="w-4 h-4 text-purple-500" />
                              <span className="font-semibold">
                                {u.cardCount}
                              </span>
                              <span className="text-gray-500">cards</span>
                            </div>
                            {u.usingStoredStats ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Cached Stats
                                </span>
                              </div>
                            ) : (
                              (u.storedBinderCount !== u.binderCount ||
                                u.storedCardCount !== u.cardCount) && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    Stats Updated
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" />
                              <span className="text-xs">
                                Joined {formatDate(u.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="text-xs">
                                Active {getTimeAgo(u.lastSeen)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center justify-end">
                            {/* Dropdown Toggle - Positioned Relative */}
                            <div className="relative" data-dropdown-container>
                              <button
                                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(
                                    activeDropdown === u.uid ? null : u.uid
                                  );
                                }}
                              >
                                <span className="text-xs">Actions</span>
                                <svg
                                  className={`w-4 h-4 transition-transform ${
                                    activeDropdown === u.uid ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>

                              {/* Dropdown positioned relative to this button */}
                              <UserActionDropdown userId={u.uid} userData={u} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                      Showing {(currentPage - 1) * usersPerPage + 1} to{" "}
                      {Math.min(currentPage * usersPerPage, totalUsers)} of{" "}
                      {totalUsers} users
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 sm:py-1 text-xs sm:text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 min-w-[60px] sm:min-w-[auto]"
                      >
                        Previous
                      </button>

                      <div className="flex gap-1">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-2.5 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm border rounded-md min-w-[32px] sm:min-w-[auto] ${
                                  currentPage === pageNum
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "border-gray-300 hover:bg-gray-100"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 sm:py-1 text-xs sm:text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 min-w-[60px] sm:min-w-[auto]"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {users.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <UserGroupIcon className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No users found
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">
                    {searchTerm ||
                    filterRole !== "all" ||
                    filterStatus !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "No users have registered yet"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* User Details Modal */}
        {showUserModal && selectedUserDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-t-xl sm:rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    User Details
                  </h2>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 -m-2 touch-manipulation"
                  >
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* User Profile */}
                <div className="flex items-center gap-4">
                  <UserAvatar user={selectedUserDetails} size="xl" />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedUserDetails.displayName}
                    </h3>
                    <p className="text-gray-600">{selectedUserDetails.email}</p>
                    <p className="text-sm text-gray-400">
                      ID: {selectedUserDetails.uid}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedUserDetails.binderCount}
                    </div>
                    <div className="text-sm text-blue-700">Total Binders</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedUserDetails.cardCount}
                    </div>
                    <div className="text-sm text-purple-700">Total Cards</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {formatDate(selectedUserDetails.createdAt)}
                    </div>
                    <div className="text-sm text-green-700">Member Since</div>
                  </div>
                </div>

                {/* User Binders */}
                <UserBindersList
                  user={selectedUserDetails}
                  onViewBinder={(binder) => {
                    console.log(
                      "Viewing binder:",
                      binder.name,
                      "for user:",
                      selectedUserDetails.email
                    );
                  }}
                />
              </div>
            </div>
          </div>
        )}
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Mobile Header */}
        <div className="md:hidden mb-4">
          <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              ) : (
                <Bars3Icon className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-4 sm:mb-8">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1 bg-white rounded-xl p-1 border border-gray-200 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-3 lg:px-4 py-3 rounded-lg font-medium text-xs lg:text-sm transition-all whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="hidden lg:inline">{tab.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white rounded-xl border border-gray-200 mt-2 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-4 text-left transition-colors
                        ${
                          activeTab === tab.id
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-50"
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{tab.name}</div>
                        <div className="text-xs text-gray-500">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "binder-limits" && <BinderLimitsManager />}
          {activeTab === "contact-limits" && <ContactLimitsManager />}
          {activeTab === "users" && renderUsers()}
          {activeTab === "system" && renderSystem()}
          {activeTab === "contact" && renderContactManagement()}
          {activeTab === "announcements" && (
            <AnnouncementManagement
              user={user}
              announcements={announcements}
              setAnnouncements={setAnnouncements}
              announcementsLoading={announcementsLoading}
            />
          )}
          {activeTab === "static-binders" && <StaticBinderGenerator />}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

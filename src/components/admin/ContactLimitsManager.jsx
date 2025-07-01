import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRules } from "../../contexts/RulesContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { toast } from "react-hot-toast";
import { RULE_TEMPLATES } from "../../lib/rules";

// No more auto-save debouncing needed

const ContactLimitsManager = () => {
  console.log("ContactLimitsManager render");
  const rulesContext = useRules();

  // Extract values but don't destructure to avoid dependency issues
  const rules = rulesContext.rules;
  const isOwner = rulesContext.isOwner;

  const [limits, setLimits] = useState({
    directMessages: { limit: 5, window: "hour" },
    featureRequests: { limit: 3, window: "day" },
    bugReports: { limit: 10, window: "day" },
  });
  const [pendingChanges, setPendingChanges] = useState({});
  const [currentRules, setCurrentRules] = useState({
    directMessages: null,
    featureRequests: null,
    bugReports: null,
  });
  const [stats, setStats] = useState({});
  const [updating, setUpdating] = useState(false);
  const saveInProgressRef = useRef(false);

  // Store stable references to prevent re-render loops
  const rulesContextRef = useRef(rulesContext);
  rulesContextRef.current = rulesContext;

  // Remove auto-save - we'll use manual save instead

  // Stable function to load current rules without causing re-renders
  const loadCurrentRules = useCallback(() => {
    console.log("Loading current rules, rules count:", rules?.length || 0);

    if (!rules || rules.length === 0) return;

    const messageRule = rules.find(
      (rule) =>
        rule.type === "rate_limit" &&
        rule.config?.resource === "direct_messages"
    );
    const featureRule = rules.find(
      (rule) =>
        rule.type === "rate_limit" &&
        rule.config?.resource === "feature_requests"
    );
    const bugRule = rules.find(
      (rule) =>
        rule.type === "rate_limit" && rule.config?.resource === "bug_reports"
    );

    // Only update if rules actually changed
    setCurrentRules((prev) => {
      if (
        prev.directMessages?.id === messageRule?.id &&
        prev.featureRequests?.id === featureRule?.id &&
        prev.bugReports?.id === bugRule?.id
      ) {
        return prev; // No change needed
      }

      return {
        directMessages: messageRule || null,
        featureRequests: featureRule || null,
        bugReports: bugRule || null,
      };
    });

    // Update local state with current limits
    if (messageRule) {
      setLimits((prev) => ({
        ...prev,
        directMessages: {
          limit: messageRule.config.limit,
          window: messageRule.config.window,
        },
      }));
    }
    if (featureRule) {
      setLimits((prev) => ({
        ...prev,
        featureRequests: {
          limit: featureRule.config.limit,
          window: featureRule.config.window,
        },
      }));
    }
    if (bugRule) {
      setLimits((prev) => ({
        ...prev,
        bugReports: {
          limit: bugRule.config.limit,
          window: bugRule.config.window,
        },
      }));
    }
  }, [rules]);

  useEffect(() => {
    if (!isOwner) return;
    if (rules && rules.length > 0) {
      loadCurrentRules();
    }
  }, [isOwner, rules, loadCurrentRules]);

  // Store stable reference for getRuleStats
  const getRuleStatsRef = useRef(rulesContext.getRuleStats);
  useEffect(() => {
    getRuleStatsRef.current = rulesContextRef.current.getRuleStats;
  });

  // Create a stable key for currentRules to avoid unnecessary reloads
  const currentRulesKey = useMemo(() => {
    return JSON.stringify({
      directMessages: currentRules.directMessages?.id || null,
      featureRequests: currentRules.featureRequests?.id || null,
      bugReports: currentRules.bugReports?.id || null,
    });
  }, [currentRules]);

  // Memoized stats loading function
  const loadStats = useCallback(async () => {
    console.log("Loading stats for current rules");
    const newStats = {};
    for (const [key, rule] of Object.entries(currentRules)) {
      if (rule) {
        try {
          const stat = await getRuleStatsRef.current(rule.id);
          newStats[key] = stat;
        } catch (error) {
          console.error(`Failed to load stats for ${key}:`, error);
        }
      }
    }
    setStats(newStats);
  }, [currentRulesKey, currentRules]);

  // Load rule statistics
  useEffect(() => {
    if (!isOwner) return;
    if (Object.values(currentRules).some(Boolean)) {
      loadStats();
    }
  }, [isOwner, loadStats]);

  // Store stable references to prevent useCallback dependency changes - use context ref
  const updateRuleRef = useRef(rulesContext.updateRule);
  const createRuleRef = useRef(rulesContext.createRule);

  useEffect(() => {
    updateRuleRef.current = rulesContextRef.current.updateRule;
    createRuleRef.current = rulesContextRef.current.createRule;
  });

  // Manual save function with better protection against multiple calls
  const handleSaveChanges = useCallback(async () => {
    console.log(
      "Save button clicked, updating:",
      updating,
      "pending changes:",
      Object.keys(pendingChanges).length,
      "saveInProgress:",
      saveInProgressRef.current
    );

    if (Object.keys(pendingChanges).length === 0) {
      console.log("No pending changes, returning");
      return;
    }
    if (updating || saveInProgressRef.current) {
      console.log("Already updating or save in progress, returning");
      return;
    }

    setUpdating(true);
    saveInProgressRef.current = true;

    // Take a snapshot of current pending changes to avoid race conditions
    const changesToSave = { ...pendingChanges };
    console.log("Changes to save:", changesToSave);

    try {
      // Clear pending changes immediately to prevent double-saves
      setPendingChanges({});

      for (const [limitType, changes] of Object.entries(changesToSave)) {
        const currentRule = currentRules[limitType];
        console.log(
          `Processing ${limitType}:`,
          changes,
          "Current rule exists:",
          !!currentRule
        );

        if (currentRule) {
          // Update existing rule - ONLY pass the config changes
          console.log(`Updating rule ${currentRule.id} for ${limitType}`);
          await updateRuleRef.current(currentRule.id, {
            config: {
              ...currentRule.config,
              ...changes,
            },
          });
          console.log(`Successfully updated ${limitType}`);
        } else {
          // Create new rule based on template
          const template = getTemplateForType(limitType);
          if (template) {
            console.log(`Creating new rule for ${limitType}`);
            const newRule = {
              ...template,
              config: {
                ...template.config,
                ...changes,
              },
              createdBy: "admin", // You might want to use the actual user ID
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await createRuleRef.current(newRule);
            console.log(`Successfully created ${limitType}`);
          }
        }
      }

      toast.success("Contact limits saved successfully!");
      console.log("All changes saved successfully");
    } catch (error) {
      console.error("Failed to save limits:", error);
      toast.error("Failed to save limits");
      // Restore pending changes if save failed
      setPendingChanges(changesToSave);
    } finally {
      setUpdating(false);
      saveInProgressRef.current = false;
      console.log("Save operation completed");
    }
  }, [pendingChanges, currentRules, updating]);

  // Discard changes function
  const handleDiscardChanges = () => {
    setPendingChanges({});
    // Reset limits to current rule values
    Object.entries(currentRules).forEach(([limitType, rule]) => {
      if (rule) {
        setLimits((prev) => ({
          ...prev,
          [limitType]: {
            limit: rule.config.limit,
            window: rule.config.window,
          },
        }));
      }
    });
    toast.success("Changes discarded");
  };

  const handleLimitChange = useCallback((limitType, field, newValue) => {
    console.log(
      `handleLimitChange called: ${limitType}.${field} = ${newValue}`
    );

    if (field === "limit") {
      const numValue = parseInt(newValue);
      if (isNaN(numValue) || numValue < 1 || numValue > 100) {
        console.log(`Invalid limit value: ${newValue}, skipping update`);
        return; // Don't update if invalid
      }
      newValue = numValue;
    }

    // Update local state immediately for responsive UI
    setLimits((prev) => ({
      ...prev,
      [limitType]: {
        ...prev[limitType],
        [field]: newValue,
      },
    }));

    // Track pending changes for debounced update
    setPendingChanges((prev) => ({
      ...prev,
      [limitType]: {
        ...prev[limitType],
        [field]: newValue,
      },
    }));
  }, []);

  const getTemplateForType = (limitType) => {
    switch (limitType) {
      case "directMessages":
        return RULE_TEMPLATES.contact_message_rate_limit;
      case "featureRequests":
        return RULE_TEMPLATES.feature_request_rate_limit;
      case "bugReports":
        return RULE_TEMPLATES.bug_report_rate_limit;
      default:
        return null;
    }
  };

  const formatStatValue = (value) => {
    if (typeof value === "number") return value.toLocaleString();
    return value || "N/A";
  };

  if (!isOwner) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">
          You don't have permission to manage contact limits.
        </p>
      </div>
    );
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Contact Rate Limits
        </h3>
        <p className="text-text-secondary text-sm">
          Configure how often users can send messages and submit requests to
          prevent spam.
        </p>
        {hasPendingChanges && (
          <div className="mt-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <span>⚠️ You have unsaved changes</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDiscardChanges}
                variant="outline"
                size="sm"
                disabled={updating}
              >
                Discard
              </Button>
              <Button
                onClick={handleSaveChanges}
                size="sm"
                disabled={updating || Object.keys(pendingChanges).length === 0}
                style={{ pointerEvents: updating ? "none" : "auto" }}
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Current Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Direct Messages</h4>
          <div className="space-y-1 text-sm">
            <p className="text-blue-700">
              Active Users: {formatStatValue(stats.directMessages?.activeUsers)}
            </p>
            <p className="text-blue-700">
              Total Usage: {formatStatValue(stats.directMessages?.totalUsage)}
            </p>
            <p className="text-blue-700">
              Violations: {formatStatValue(stats.directMessages?.violations)}
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Feature Requests</h4>
          <div className="space-y-1 text-sm">
            <p className="text-green-700">
              Active Users:{" "}
              {formatStatValue(stats.featureRequests?.activeUsers)}
            </p>
            <p className="text-green-700">
              Total Usage: {formatStatValue(stats.featureRequests?.totalUsage)}
            </p>
            <p className="text-green-700">
              Violations: {formatStatValue(stats.featureRequests?.violations)}
            </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2">Bug Reports</h4>
          <div className="space-y-1 text-sm">
            <p className="text-red-700">
              Active Users: {formatStatValue(stats.bugReports?.activeUsers)}
            </p>
            <p className="text-red-700">
              Total Usage: {formatStatValue(stats.bugReports?.totalUsage)}
            </p>
            <p className="text-red-700">
              Violations: {formatStatValue(stats.bugReports?.violations)}
            </p>
          </div>
        </div>
      </div>

      {/* Limit Configuration */}
      <div className="space-y-6">
        {/* Direct Messages */}
        <div className="bg-card-background border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-text-primary">
                💬 Direct Message Limits
              </h4>
              <p className="text-sm text-text-secondary">
                How often users can send direct messages
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  currentRules.directMessages?.enabled
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {currentRules.directMessages?.enabled ? "Active" : "Inactive"}
              </span>
              {pendingChanges.directMessages && (
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Pending
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="directMessageLimit">Maximum Messages</Label>
              <Input
                id="directMessageLimit"
                type="number"
                min="1"
                max="100"
                value={limits.directMessages.limit}
                onChange={(e) =>
                  handleLimitChange("directMessages", "limit", e.target.value)
                }
                disabled={updating}
              />
            </div>
            <div>
              <Label htmlFor="directMessageWindow">Time Window</Label>
              <select
                id="directMessageWindow"
                value={limits.directMessages.window}
                onChange={(e) =>
                  handleLimitChange("directMessages", "window", e.target.value)
                }
                disabled={updating}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hour">Per Hour</option>
                <option value="day">Per Day</option>
                <option value="week">Per Week</option>
                <option value="month">Per Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feature Requests */}
        <div className="bg-card-background border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-text-primary">
                💡 Feature Request Limits
              </h4>
              <p className="text-sm text-text-secondary">
                How often users can submit feature requests
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  currentRules.featureRequests?.enabled
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {currentRules.featureRequests?.enabled ? "Active" : "Inactive"}
              </span>
              {pendingChanges.featureRequests && (
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Pending
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="featureRequestLimit">Maximum Requests</Label>
              <Input
                id="featureRequestLimit"
                type="number"
                min="1"
                max="100"
                value={limits.featureRequests.limit}
                onChange={(e) =>
                  handleLimitChange("featureRequests", "limit", e.target.value)
                }
                disabled={updating}
              />
            </div>
            <div>
              <Label htmlFor="featureRequestWindow">Time Window</Label>
              <select
                id="featureRequestWindow"
                value={limits.featureRequests.window}
                onChange={(e) =>
                  handleLimitChange("featureRequests", "window", e.target.value)
                }
                disabled={updating}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hour">Per Hour</option>
                <option value="day">Per Day</option>
                <option value="week">Per Week</option>
                <option value="month">Per Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bug Reports */}
        <div className="bg-card-background border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-text-primary">
                🐛 Bug Report Limits
              </h4>
              <p className="text-sm text-text-secondary">
                How often users can submit bug reports
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  currentRules.bugReports?.enabled
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {currentRules.bugReports?.enabled ? "Active" : "Inactive"}
              </span>
              {pendingChanges.bugReports && (
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Pending
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bugReportLimit">Maximum Reports</Label>
              <Input
                id="bugReportLimit"
                type="number"
                min="1"
                max="100"
                value={limits.bugReports.limit}
                onChange={(e) =>
                  handleLimitChange("bugReports", "limit", e.target.value)
                }
                disabled={updating}
              />
            </div>
            <div>
              <Label htmlFor="bugReportWindow">Time Window</Label>
              <select
                id="bugReportWindow"
                value={limits.bugReports.window}
                onChange={(e) =>
                  handleLimitChange("bugReports", "window", e.target.value)
                }
                disabled={updating}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hour">Per Hour</option>
                <option value="day">Per Day</option>
                <option value="week">Per Week</option>
                <option value="month">Per Month</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactLimitsManager;

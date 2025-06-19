import { useState, useEffect, useCallback, useMemo } from "react";
import { useRules } from "../../contexts/RulesContext";
import {
  createRuleFromTemplate,
  RULE_TEMPLATES,
  RULE_TYPES,
} from "../../lib/rules";

/**
 * Custom hook for managing rules in admin panel
 *
 * This hook handles:
 * - Rules CRUD operations (create, read, update, delete)
 * - Rule stats loading and management
 * - Rule toggling (enable/disable)
 * - Rule form state management
 * - Rule selection and UI state
 *
 * @returns {Object} Rules management state and operations
 */
export const useRulesManagement = () => {
  const {
    rules,
    loading: rulesLoading,
    isOwner: isRulesOwner,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    getRuleStats,
  } = useRules();

  // Rules management state
  const [selectedRule, setSelectedRule] = useState(null);
  const [showCreateRuleForm, setShowCreateRuleForm] = useState(false);
  const [ruleStats, setRuleStats] = useState({});
  const [ruleActionError, setRuleActionError] = useState("");
  const [ruleActionSuccess, setRuleActionSuccess] = useState("");
  const [ruleFormData, setRuleFormData] = useState({
    name: "",
    description: "",
    type: "",
    template: "",
    conditions: {},
    actions: {},
    enabled: true,
  });

  /**
   * Load rule statistics for all rules
   */
  const loadRuleStats = useCallback(async () => {
    if (!isRulesOwner || rules.length === 0) return;

    const stats = {};
    for (const rule of rules) {
      try {
        stats[rule.id] = await getRuleStats(rule.id);
      } catch (error) {
        console.error(`Failed to load stats for rule ${rule.id}:`, error);
        stats[rule.id] = { appliedCount: 0, lastApplied: null };
      }
    }
    setRuleStats(stats);
  }, [isRulesOwner, rules, getRuleStats]);

  /**
   * Handle creating a new rule
   * @param {Object} ruleData - Rule data to create
   */
  const handleCreateRule = useCallback(
    async (ruleData = null) => {
      try {
        setRuleActionError("");

        const dataToUse = ruleData || ruleFormData;

        // Validate required fields
        if (!dataToUse.name || !dataToUse.type) {
          throw new Error("Rule name and type are required");
        }

        await createRule(dataToUse);
        setShowCreateRuleForm(false);
        setRuleActionSuccess("Rule created successfully");
        setRuleFormData({
          name: "",
          description: "",
          type: "",
          template: "",
          conditions: {},
          actions: {},
          enabled: true,
        });

        // Refresh stats after creation
        await loadRuleStats();
      } catch (error) {
        console.error("Error creating rule:", error);
        setRuleActionError(error.message || "Failed to create rule");
      }
    },
    [createRule, ruleFormData, loadRuleStats]
  );

  /**
   * Handle updating an existing rule
   * @param {string} ruleId - Rule ID to update
   * @param {Object} updates - Updates to apply
   */
  const handleUpdateRule = useCallback(
    async (ruleId, updates) => {
      try {
        setRuleActionError("");
        await updateRule(ruleId, updates);
        setSelectedRule(null);
        setRuleActionSuccess("Rule updated successfully");

        // Refresh stats after update
        await loadRuleStats();
      } catch (error) {
        console.error("Error updating rule:", error);
        setRuleActionError(error.message || "Failed to update rule");
      }
    },
    [updateRule, loadRuleStats]
  );

  /**
   * Handle deleting a rule with confirmation
   * @param {string} ruleId - Rule ID to delete
   */
  const handleDeleteRule = useCallback(
    async (ruleId) => {
      if (
        !window.confirm(
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

        // Refresh stats after deletion
        await loadRuleStats();
      } catch (error) {
        console.error("Error deleting rule:", error);
        setRuleActionError(error.message || "Failed to delete rule");
      }
    },
    [deleteRule, loadRuleStats]
  );

  /**
   * Handle toggling rule enabled/disabled state
   * @param {string} ruleId - Rule ID to toggle
   * @param {boolean} enabled - New enabled state
   */
  const handleToggleRule = useCallback(
    async (ruleId, enabled) => {
      try {
        setRuleActionError("");
        await toggleRule(ruleId, enabled);
        setRuleActionSuccess(
          `Rule ${enabled ? "enabled" : "disabled"} successfully`
        );

        // Refresh stats after toggle
        await loadRuleStats();
      } catch (error) {
        console.error("Error toggling rule:", error);
        setRuleActionError(error.message || "Failed to toggle rule");
      }
    },
    [toggleRule, loadRuleStats]
  );

  /**
   * Create rule from template
   * @param {string} templateKey - Template key from RULE_TEMPLATES
   */
  const handleCreateRuleFromTemplate = useCallback(
    async (templateKey) => {
      try {
        setRuleActionError("");

        const template = RULE_TEMPLATES[templateKey];
        if (!template) {
          throw new Error("Invalid template selected");
        }

        const ruleData = createRuleFromTemplate(templateKey);
        await handleCreateRule(ruleData);
      } catch (error) {
        console.error("Error creating rule from template:", error);
        setRuleActionError(
          error.message || "Failed to create rule from template"
        );
      }
    },
    [handleCreateRule]
  );

  /**
   * Reset form data to initial state
   */
  const resetRuleForm = useCallback(() => {
    setRuleFormData({
      name: "",
      description: "",
      type: "",
      template: "",
      conditions: {},
      actions: {},
      enabled: true,
    });
    setShowCreateRuleForm(false);
    setRuleActionError("");
  }, []);

  /**
   * Select a rule for editing
   * @param {Object} rule - Rule to select
   */
  const selectRule = useCallback((rule) => {
    setSelectedRule(rule);
    setShowCreateRuleForm(false);
    setRuleActionError("");
  }, []);

  /**
   * Clear selected rule
   */
  const clearSelectedRule = useCallback(() => {
    setSelectedRule(null);
  }, []);

  /**
   * Clear success/error messages
   */
  const clearMessages = useCallback(() => {
    setRuleActionError("");
    setRuleActionSuccess("");
  }, []);

  /**
   * Update form data
   * @param {Object} updates - Form data updates
   */
  const updateRuleFormData = useCallback((updates) => {
    setRuleFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Get rule by ID
   * @param {string} ruleId - Rule ID
   * @returns {Object|null} Rule object or null if not found
   */
  const getRuleById = useCallback(
    (ruleId) => {
      return rules.find((rule) => rule.id === ruleId) || null;
    },
    [rules]
  );

  /**
   * Get rules by type
   * @param {string} type - Rule type
   * @returns {Array} Array of rules of the specified type
   */
  const getRulesByType = useCallback(
    (type) => {
      return rules.filter((rule) => rule.type === type);
    },
    [rules]
  );

  /**
   * Get enabled rules
   * @returns {Array} Array of enabled rules
   */
  const getEnabledRules = useCallback(() => {
    return rules.filter((rule) => rule.enabled);
  }, [rules]);

  /**
   * Get rule statistics with computed metrics
   */
  const rulesStatistics = useMemo(() => {
    const enabledRules = getEnabledRules();

    return {
      totalRules: rules.length,
      enabledRules: enabledRules.length,
      disabledRules: rules.length - enabledRules.length,
      rulesByType: Object.values(RULE_TYPES).reduce((acc, type) => {
        acc[type] = getRulesByType(type).length;
        return acc;
      }, {}),
      totalApplications: Object.values(ruleStats).reduce(
        (sum, stat) => sum + (stat.appliedCount || 0),
        0
      ),
    };
  }, [rules, ruleStats, getEnabledRules, getRulesByType]);

  /**
   * Check if user can manage rules
   */
  const canManageRules = useMemo(() => {
    return isRulesOwner;
  }, [isRulesOwner]);

  /**
   * Available rule templates
   */
  const availableTemplates = useMemo(() => {
    return Object.entries(RULE_TEMPLATES).map(([key, template]) => ({
      key,
      ...template,
    }));
  }, []);

  /**
   * Available rule types
   */
  const availableTypes = useMemo(() => {
    return Object.values(RULE_TYPES);
  }, []);

  // Load rule stats when rules change
  useEffect(() => {
    if (isRulesOwner && rules.length > 0) {
      loadRuleStats();
    }
  }, [loadRuleStats, isRulesOwner, rules]);

  // Auto-clear success messages after 5 seconds
  useEffect(() => {
    if (ruleActionSuccess) {
      const timer = setTimeout(() => {
        setRuleActionSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [ruleActionSuccess]);

  return {
    // Rules data
    rules,
    rulesLoading,
    ruleStats,
    rulesStatistics,
    canManageRules,

    // Selected rule state
    selectedRule,
    showCreateRuleForm,

    // Form state
    ruleFormData,

    // Messages
    ruleActionError,
    ruleActionSuccess,

    // Templates and types
    availableTemplates,
    availableTypes,

    // Actions
    handleCreateRule,
    handleUpdateRule,
    handleDeleteRule,
    handleToggleRule,
    handleCreateRuleFromTemplate,
    loadRuleStats,

    // Form actions
    resetRuleForm,
    updateRuleFormData,
    clearMessages,

    // Selection actions
    selectRule,
    clearSelectedRule,

    // Setters
    setSelectedRule,
    setShowCreateRuleForm,
    setRuleActionError,
    setRuleActionSuccess,

    // Utilities
    getRuleById,
    getRulesByType,
    getEnabledRules,

    // Computed values
    hasRules: rules.length > 0,
    hasSelectedRule: selectedRule !== null,
    isFormVisible: showCreateRuleForm,
    hasError: ruleActionError !== "",
    hasSuccess: ruleActionSuccess !== "",
  };
};

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRules } from "../../contexts/RulesContext";
import {
  BINDER_RULE_TEMPLATES,
  USER_TIER_RULES,
  applyUserTierRules,
} from "../../lib/binderRules";
import { RULE_TYPES } from "../../lib/rules";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentIcon,
  ShieldCheckIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

const BinderRulesManager = () => {
  const {
    rules,
    loading,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    getRuleStats,
    isOwner,
  } = useRules();

  const [selectedRuleType, setSelectedRuleType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customRuleData, setCustomRuleData] = useState({
    name: "",
    description: "",
    type: "feature_limit",
    config: {},
  });
  const [ruleStats, setRuleStats] = useState({});
  const [activeTab, setActiveTab] = useState("rules");

  useEffect(() => {
    // Load rule stats for all rules
    const loadStats = async () => {
      const stats = {};
      for (const rule of rules) {
        try {
          const stat = await getRuleStats(rule.id);
          stats[rule.id] = stat;
        } catch (error) {
          console.error(`Failed to load stats for rule ${rule.id}:`, error);
        }
      }
      setRuleStats(stats);
    };

    if (rules.length > 0) {
      loadStats();
    }
  }, [rules, getRuleStats]);

  // Filter rules based on selected type
  const filteredRules = rules.filter((rule) => {
    if (selectedRuleType === "all") return true;
    return rule.type === selectedRuleType;
  });

  const binderRules = filteredRules.filter(
    (rule) =>
      rule.name.toLowerCase().includes("binder") ||
      rule.name.toLowerCase().includes("card") ||
      rule.config?.feature?.includes("binder") ||
      rule.config?.feature?.includes("card") ||
      rule.config?.resource?.includes("binder") ||
      rule.config?.resource?.includes("card")
  );

  const handleCreateFromTemplate = async (templateKey) => {
    const template = BINDER_RULE_TEMPLATES[templateKey];
    if (!template) return;

    try {
      await createRule({
        ...template,
        enabled: true,
      });
      toast.success(`Created rule: ${template.name}`);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Failed to create rule:", error);
      toast.error("Failed to create rule");
    }
  };

  const handleCreateCustomRule = async () => {
    try {
      await createRule({
        ...customRuleData,
        enabled: true,
      });
      toast.success(`Created custom rule: ${customRuleData.name}`);
      setShowCreateModal(false);
      setCustomRuleData({
        name: "",
        description: "",
        type: "feature_limit",
        config: {},
      });
    } catch (error) {
      console.error("Failed to create custom rule:", error);
      toast.error("Failed to create custom rule");
    }
  };

  const handleUpdateRule = async (ruleId, updates) => {
    try {
      await updateRule(ruleId, updates);
      toast.success("Rule updated successfully");
      setEditingRule(null);
    } catch (error) {
      console.error("Failed to update rule:", error);
      toast.error("Failed to update rule");
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;

    try {
      await deleteRule(ruleId);
      toast.success("Rule deleted successfully");
    } catch (error) {
      console.error("Failed to delete rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  const handleToggleRule = async (ruleId, enabled) => {
    try {
      await toggleRule(ruleId, enabled);
      toast.success(`Rule ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to toggle rule:", error);
      toast.error("Failed to toggle rule");
    }
  };

  const formatRuleConfig = (rule) => {
    const { config } = rule;
    switch (rule.type) {
      case "feature_limit":
        return `Limit: ${config.limit} ${config.feature}`;
      case "rate_limit":
        return `${config.limit} per ${config.window}`;
      case "access_control":
        return `Roles: ${config.allowedRoles?.join(", ") || "None"}`;
      case "content_limit":
        return `Max size: ${
          config.maxSize
            ? (config.maxSize / 1024 / 1024).toFixed(1) + "MB"
            : "No limit"
        }`;
      default:
        return "Custom configuration";
    }
  };

  const getRuleIcon = (type) => {
    const icons = {
      feature_limit: DocumentIcon,
      rate_limit: ClockIcon,
      access_control: ShieldCheckIcon,
      content_limit: DocumentIcon,
      time_based: ClockIcon,
    };
    return icons[type] || CogIcon;
  };

  const applyTierRules = async (tier) => {
    try {
      const results = await applyUserTierRules(
        { createRule }, // Pass minimal service interface
        "system",
        tier
      );

      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (errorCount > 0) {
        toast.error(`Applied ${successCount} rules, ${errorCount} failed`);
      } else {
        toast.success(`Applied ${successCount} ${tier} tier rules`);
      }
    } catch (error) {
      console.error("Failed to apply tier rules:", error);
      toast.error("Failed to apply tier rules");
    }
  };

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <ShieldCheckIcon className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-sm font-medium text-slate-900">
          Access Denied
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Only owners can manage binder rules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Binder Rules Management
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Configure limits, restrictions, and access controls for binder
          operations.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "rules", name: "Rules", icon: CogIcon },
            { id: "templates", name: "Templates", icon: DocumentIcon },
            { id: "tiers", name: "User Tiers", icon: UserGroupIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          {/* Filters and Actions */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <select
                value={selectedRuleType}
                onChange={(e) => setSelectedRuleType(e.target.value)}
                className="rounded-lg border-slate-300 text-sm"
              >
                <option value="all">All Rule Types</option>
                {Object.entries(RULE_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>
                    {type.name}
                  </option>
                ))}
              </select>

              <span className="text-sm text-slate-500">
                {binderRules.length} binder-related rules
              </span>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create Rule
            </button>
          </div>

          {/* Rules List */}
          <div className="bg-card-background rounded-lg border border-border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">
                Loading rules...
              </div>
            ) : binderRules.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No binder rules found. Create your first rule to get started.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {binderRules.map((rule) => {
                  const Icon = getRuleIcon(rule.type);
                  const stats = ruleStats[rule.id];

                  return (
                    <div key={rule.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`
                            p-2 rounded-lg
                            ${
                              rule.enabled
                                ? "bg-green-100 text-green-600"
                                : "bg-slate-100 text-slate-400"
                            }
                          `}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-slate-900">
                                {rule.name}
                              </h3>
                              <span
                                className={`
                                px-2 py-1 text-xs rounded-full
                                ${
                                  rule.enabled
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-600"
                                }
                              `}
                              >
                                {rule.enabled ? "Active" : "Disabled"}
                              </span>
                            </div>

                            <p className="text-sm text-slate-600 mt-1">
                              {rule.description}
                            </p>

                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                              <span>{formatRuleConfig(rule)}</span>
                              {stats && (
                                <span>Used: {stats.totalUsage || 0} times</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleToggleRule(rule.id, !rule.enabled)
                            }
                            className={`
                              px-3 py-1 text-xs rounded-lg transition-colors
                              ${
                                rule.enabled
                                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  : "bg-green-100 text-green-600 hover:bg-green-200"
                              }
                            `}
                          >
                            {rule.enabled ? "Disable" : "Enable"}
                          </button>

                          <button
                            onClick={() => setEditingRule(rule)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-text-primary">
              Binder Rule Templates
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Quick-start templates for common binder restrictions and limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(BINDER_RULE_TEMPLATES).map(([key, template]) => {
              const Icon = getRuleIcon(template.type);

              return (
                <div
                  key={key}
                  className="bg-card-background border border-border rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium text-text-primary">
                        {template.name}
                      </h4>
                      <p className="text-sm text-text-secondary mt-1">
                        {template.description}
                      </p>

                      <div className="mt-3">
                        <button
                          onClick={() => handleCreateFromTemplate(key)}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Create Rule
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Tiers Tab */}
      {activeTab === "tiers" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-text-primary">
              User Tier Templates
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Apply predefined rule sets for different user subscription tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(USER_TIER_RULES).map(([tier, tierData]) => (
              <div
                key={tier}
                className="bg-card-background border border-border rounded-lg p-6"
              >
                <div className="text-center">
                  <UserGroupIcon className="w-8 h-8 text-blue-600 mx-auto" />
                  <h4 className="font-medium text-text-primary mt-2 capitalize">
                    {tier} Tier
                  </h4>
                  <p className="text-sm text-text-secondary mt-1">
                    {tierData.rules.length} rules included
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {tierData.rules.slice(0, 3).map((rule, index) => (
                    <div key={index} className="text-xs text-text-secondary">
                      • {rule.name}
                    </div>
                  ))}
                  {tierData.rules.length > 3 && (
                    <div className="text-xs text-text-secondary">
                      +{tierData.rules.length - 3} more rules
                    </div>
                  )}
                </div>

                <button
                  onClick={() => applyTierRules(tier)}
                  className="w-full mt-4 bg-background text-text-primary px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm"
                >
                  Apply {tier} Rules
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create New Rule</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={customRuleData.name}
                  onChange={(e) =>
                    setCustomRuleData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border-slate-300"
                  placeholder="Enter rule name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={customRuleData.description}
                  onChange={(e) =>
                    setCustomRuleData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border-slate-300"
                  rows="2"
                  placeholder="Describe what this rule does"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rule Type
                </label>
                <select
                  value={customRuleData.type}
                  onChange={(e) =>
                    setCustomRuleData((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border-slate-300"
                >
                  {Object.entries(RULE_TYPES).map(([key, type]) => (
                    <option key={key} value={key}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateCustomRule}
                  disabled={!customRuleData.name.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Rule
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BinderRulesManager;

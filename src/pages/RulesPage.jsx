import { useState, useEffect } from "react";
import { useRules } from "../contexts/RulesContext";
import {
  createRuleFromTemplate,
  RULE_TEMPLATES,
  RULE_TYPES,
} from "../lib/rules";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

const RulesPage = () => {
  const {
    rules,
    loading,
    error,
    isOwner,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    getRuleStats,
  } = useRules();

  const [selectedRule, setSelectedRule] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [ruleStats, setRuleStats] = useState({});
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Load rule stats for each rule
  useEffect(() => {
    const loadStats = async () => {
      if (!isOwner || rules.length === 0) return;

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

    loadStats();
  }, [rules, isOwner, getRuleStats]);

  const handleCreateRule = async (ruleData) => {
    try {
      setActionError("");
      await createRule(ruleData);
      setShowCreateForm(false);
      setActionSuccess("Rule created successfully");
    } catch (error) {
      setActionError(error.message);
    }
  };

  const handleUpdateRule = async (ruleId, updates) => {
    try {
      setActionError("");
      await updateRule(ruleId, updates);
      setSelectedRule(null);
      setActionSuccess("Rule updated successfully");
    } catch (error) {
      setActionError(error.message);
    }
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
      setActionError("");
      await deleteRule(ruleId);
      setSelectedRule(null);
      setActionSuccess("Rule deleted successfully");
    } catch (error) {
      setActionError(error.message);
    }
  };

  const handleToggleRule = async (ruleId, enabled) => {
    try {
      setActionError("");
      await toggleRule(ruleId, enabled);
      setActionSuccess(`Rule ${enabled ? "enabled" : "disabled"} successfully`);
    } catch (error) {
      setActionError(error.message);
    }
  };

  if (!isOwner) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert type="error">
          You don't have permission to access this page. Only the system owner
          can manage global rules.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Rules Management
        </h1>
        <p className="text-gray-600">
          Manage global rules and limits that apply to all users of the
          application.
        </p>
      </div>

      {/* Success/Error Messages */}
      {actionSuccess && (
        <Alert type="success" className="mb-6">
          {actionSuccess}
          <button
            onClick={() => setActionSuccess("")}
            className="ml-4 text-green-800 hover:text-green-900"
          >
            ×
          </button>
        </Alert>
      )}

      {actionError && (
        <Alert type="error" className="mb-6">
          {actionError}
          <button
            onClick={() => setActionError("")}
            className="ml-4 text-red-800 hover:text-red-900"
          >
            ×
          </button>
        </Alert>
      )}

      {error && (
        <Alert type="error" className="mb-6">
          Error loading rules: {error}
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Create New Rule
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Rules
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading rules...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rules List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Active Rules ({rules.length})
                </h2>
              </div>

              {rules.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No rules configured. Create your first rule to get started.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedRule?.id === rule.id
                          ? "bg-blue-50 border-l-4 border-l-blue-500"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedRule(rule)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">
                              {RULE_TYPES[rule.type]?.icon}
                            </span>
                            <h3 className="font-semibold text-gray-900">
                              {rule.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                rule.enabled
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {rule.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-2">
                            {rule.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span
                              className={`px-2 py-1 rounded bg-blue-100 text-blue-800`}
                            >
                              {RULE_TYPES[rule.type]?.name}
                            </span>
                            {ruleStats[rule.id] && (
                              <>
                                <span>
                                  Users: {ruleStats[rule.id].totalUsers}
                                </span>
                                <span>
                                  Usage: {ruleStats[rule.id].totalUsage}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRule(rule.id, !rule.enabled);
                            }}
                          >
                            {rule.enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRule(rule.id);
                            }}
                            className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rule Details/Forms */}
          <div className="lg:col-span-1">
            {showCreateForm ? (
              <CreateRuleForm
                onSubmit={handleCreateRule}
                onCancel={() => setShowCreateForm(false)}
              />
            ) : selectedRule ? (
              <RuleDetails
                rule={selectedRule}
                stats={ruleStats[selectedRule.id]}
                onUpdate={(updates) =>
                  handleUpdateRule(selectedRule.id, updates)
                }
                onClose={() => setSelectedRule(null)}
              />
            ) : (
              <RuleTypesOverview />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Rule Card Component
const RuleCard = ({
  rule,
  stats,
  onSelect,
  onToggle,
  onDelete,
  isSelected,
}) => {
  const ruleType = RULE_TYPES[rule.type];

  return (
    <div
      className={`p-4 cursor-pointer transition-colors ${
        isSelected
          ? "bg-blue-50 border-l-4 border-l-blue-500"
          : "hover:bg-gray-50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{ruleType?.icon}</span>
            <h3 className="font-semibold text-gray-900">{rule.name}</h3>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                rule.enabled
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {rule.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2">{rule.description}</p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span
              className={`px-2 py-1 rounded bg-${ruleType?.color}-100 text-${ruleType?.color}-800`}
            >
              {ruleType?.name}
            </span>
            {stats && (
              <>
                <span>Users: {stats.totalUsers}</span>
                <span>Usage: {stats.totalUsage}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(!rule.enabled);
            }}
          >
            {rule.enabled ? "Disable" : "Enable"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

// Create Rule Form Component
const CreateRuleForm = ({ onSubmit, onCancel }) => {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    config: {},
    enabled: true,
  });

  const handleTemplateSelect = (templateKey) => {
    const template = RULE_TEMPLATES[templateKey];
    if (template) {
      setSelectedTemplate(templateKey);
      setFormData({
        name: template.name,
        description: template.description,
        type: template.type,
        config: template.config,
        enabled: true,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Create New Rule</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start from Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a template...</option>
            {Object.entries(RULE_TEMPLATES).map(([key, template]) => (
              <option key={key} value={key}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {/* Rule Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rule Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* Config Preview */}
        {formData.type && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Configuration
            </label>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(formData.config, null, 2)}
            </pre>
          </div>
        )}

        {/* Enabled Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, enabled: e.target.checked }))
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
            Enable rule immediately
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            Create Rule
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

// Rule Details Component
const RuleDetails = ({ rule, stats, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: rule.name,
    description: rule.description,
    enabled: rule.enabled,
  });

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Rule Details</h3>
        <Button size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {isEditing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editData.description}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="edit-enabled"
                checked={editData.enabled}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    enabled: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="edit-enabled"
                className="ml-2 text-sm text-gray-700"
              >
                Enabled
              </label>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">{rule.name}</h4>
              <p className="text-sm text-gray-600">{rule.description}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <strong>Type:</strong> {RULE_TYPES[rule.type]?.name}
              </div>
              <div>
                <strong>Status:</strong>
                <span
                  className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    rule.enabled
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {rule.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div>
                <strong>Created:</strong>{" "}
                {new Date(
                  rule.createdAt?.seconds * 1000 || rule.createdAt
                ).toLocaleDateString()}
              </div>
            </div>

            {stats && (
              <div className="bg-gray-50 p-3 rounded">
                <h5 className="font-medium text-gray-900 mb-2">
                  Usage Statistics
                </h5>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Total Users: {stats.totalUsers}</div>
                  <div>Total Usage: {stats.totalUsage}</div>
                  <div>Average per User: {stats.averageUsage.toFixed(1)}</div>
                  {stats.lastActivity && (
                    <div>
                      Last Activity:{" "}
                      {new Date(stats.lastActivity).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded">
              <h5 className="font-medium text-gray-900 mb-2">Configuration</h5>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(rule.config, null, 2)}
              </pre>
            </div>

            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="w-full"
            >
              Edit Rule
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

// Rule Types Overview Component
const RuleTypesOverview = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Rule Types</h3>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Select a rule from the list to view details, or create a new rule
          using the button above.
        </p>

        {Object.entries(RULE_TYPES).map(([type, info]) => (
          <div
            key={type}
            className="flex items-start gap-3 p-3 border border-gray-200 rounded"
          >
            <span className="text-lg">{info.icon}</span>
            <div>
              <h4 className="font-medium text-gray-900">{info.name}</h4>
              <p className="text-sm text-gray-600">{info.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RulesPage;

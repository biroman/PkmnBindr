import React from "react";
import { Button } from "../../ui/Button";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { RULE_TEMPLATES } from "../../../lib/rules";

const RulesManagementPanel = ({
  isRulesOwner,
  rules,
  rulesLoading,
  selectedRule,
  setSelectedRule,
  showCreateRuleForm,
  setShowCreateRuleForm,
  ruleStats,
  ruleActionSuccess,
  setRuleActionSuccess,
  ruleActionError,
  setRuleActionError,
  onToggleRule,
  onDeleteRule,
  formatDate,
}) => {
  if (!isRulesOwner) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600">
          You don't have permission to manage rules. Only the system owner can
          access this section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Rules Management
            </h2>
            <p className="text-gray-600">
              Manage global rules and limits that apply to all users of the
              application.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreateRuleForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create New Rule
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Rules
            </Button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {ruleActionSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800">{ruleActionSuccess}</span>
            </div>
            <button
              onClick={() => setRuleActionSuccess("")}
              className="text-green-600 hover:text-green-800"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {ruleActionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{ruleActionError}</span>
            </div>
            <button
              onClick={() => setRuleActionError("")}
              className="text-red-600 hover:text-red-800"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {rulesLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rules...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rules List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Active Rules ({rules.length})
                </h3>
              </div>

              {rules.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium mb-2">No rules configured</p>
                  <p className="text-sm">
                    Create your first rule to get started.
                  </p>
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
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">
                              {rule.name}
                            </h4>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                rule.enabled
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {rule.enabled ? "Enabled" : "Disabled"}
                            </span>
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {rule.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {rule.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Created: {formatDate(rule.createdAt)}</span>
                            {ruleStats[rule.id] && (
                              <span>
                                Applied: {ruleStats[rule.id].appliedCount || 0}{" "}
                                times
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleRule(rule.id, !rule.enabled);
                            }}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                              rule.enabled
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            {rule.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRule(rule.id);
                            }}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rule Details/Create Form */}
          <div className="lg:col-span-1">
            {showCreateRuleForm ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Create New Rule
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rule Template
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="">Select a template...</option>
                      {Object.entries(RULE_TEMPLATES).map(([key, template]) => (
                        <option key={key} value={key}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowCreateRuleForm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                      Create Rule
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedRule ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Rule Details
                  </h3>
                  <button
                    onClick={() => setSelectedRule(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <p className="text-sm text-gray-900">{selectedRule.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <p className="text-sm text-gray-900">{selectedRule.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedRule.description}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        selectedRule.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {selectedRule.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {ruleStats[selectedRule.id] && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statistics
                      </label>
                      <p className="text-sm text-gray-900">
                        Applied {ruleStats[selectedRule.id].appliedCount || 0}{" "}
                        times
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Rule Management
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Select a rule from the list to view details, or create a new
                  rule to get started.
                </p>
                <Button
                  onClick={() => setShowCreateRuleForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create First Rule
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RulesManagementPanel;

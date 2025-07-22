import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRules } from "../../contexts/RulesContext";
import { BINDER_RULE_TEMPLATES } from "../../lib/binderRules";
import {
  CogIcon,
  DocumentIcon,
  UsersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const BinderLimitsManager = () => {
  const {
    rules,
    loading,
    createRule,
    updateRule,
    deleteRule,
    getRuleStats,
    isOwner,
  } = useRules();

  const [limits, setLimits] = useState({
    maxBinders: 5,
    maxCardsPerBinder: 500,
    maxPagesPerBinder: 50,
  });

  const [currentRules, setCurrentRules] = useState({
    maxBinders: null,
    maxCardsPerBinder: null,
    maxPagesPerBinder: null,
  });

  const [stats, setStats] = useState({});
  const [updating, setUpdating] = useState(false);

  // Load current rules and limits
  useEffect(() => {
    const loadCurrentLimits = () => {
      const binderRules = rules.filter(
        (rule) => rule.type === "feature_limit" && rule.enabled
      );

      const maxBindersRule = binderRules.find(
        (rule) => rule.config?.feature === "binders"
      );
      const maxCardsRule = binderRules.find(
        (rule) => rule.config?.feature === "cards_per_binder"
      );
      const maxPagesRule = binderRules.find(
        (rule) => rule.config?.feature === "pages_per_binder"
      );

      setCurrentRules({
        maxBinders: maxBindersRule,
        maxCardsPerBinder: maxCardsRule,
        maxPagesPerBinder: maxPagesRule,
      });

      // Update local state with current limits
      if (maxBindersRule) {
        setLimits((prev) => ({
          ...prev,
          maxBinders: maxBindersRule.config.limit,
        }));
      }
      if (maxCardsRule) {
        setLimits((prev) => ({
          ...prev,
          maxCardsPerBinder: maxCardsRule.config.limit,
        }));
      }
      if (maxPagesRule) {
        setLimits((prev) => ({
          ...prev,
          maxPagesPerBinder: maxPagesRule.config.limit,
        }));
      }
    };

    if (rules.length > 0) {
      loadCurrentLimits();
    }
  }, [rules]);

  // Load rule statistics
  useEffect(() => {
    const loadStats = async () => {
      const newStats = {};
      for (const rule of Object.values(currentRules).filter(Boolean)) {
        try {
          const stat = await getRuleStats(rule.id);
          newStats[rule.id] = stat;
        } catch (error) {
          console.error(`Failed to load stats for rule ${rule.id}:`, error);
        }
      }
      setStats(newStats);
    };

    if (Object.values(currentRules).some(Boolean)) {
      loadStats();
    }
  }, [currentRules, getRuleStats]);

  const handleUpdateLimit = async (limitType, newValue) => {
    if (newValue < 1 || newValue > 10000) {
      toast.error("Limit must be between 1 and 10,000");
      return;
    }

    setUpdating(true);
    try {
      const currentRule = currentRules[limitType];

      if (currentRule) {
        // Update existing rule
        await updateRule(currentRule.id, {
          config: {
            ...currentRule.config,
            limit: newValue,
          },
        });
        toast.success(
          `Updated ${getLimitDisplayName(limitType)} to ${newValue}`
        );
      } else {
        // Create new rule
        const ruleTemplate = getRuleTemplate(limitType);
        if (!ruleTemplate) {
          throw new Error(`No template found for ${limitType}`);
        }

        await createRule({
          ...ruleTemplate,
          config: {
            ...ruleTemplate.config,
            limit: newValue,
          },
          enabled: true,
        });
        toast.success(
          `Created ${getLimitDisplayName(limitType)} limit: ${newValue}`
        );
      }
    } catch (error) {
      console.error("Failed to update limit:", error);
      toast.error("Failed to update limit");
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickAdjust = (limitType, delta) => {
    const currentValue = limits[limitType];
    const newValue = Math.max(1, currentValue + delta);
    setLimits((prev) => ({ ...prev, [limitType]: newValue }));
  };

  const handleApplyChanges = async () => {
    setUpdating(true);
    try {
      await Promise.all([
        handleUpdateLimit("maxBinders", limits.maxBinders),
        handleUpdateLimit("maxCardsPerBinder", limits.maxCardsPerBinder),
        handleUpdateLimit("maxPagesPerBinder", limits.maxPagesPerBinder),
      ]);
    } finally {
      setUpdating(false);
    }
  };

  const getRuleTemplate = (limitType) => {
    switch (limitType) {
      case "maxBinders":
        return BINDER_RULE_TEMPLATES.max_binders_per_user;
      case "maxCardsPerBinder":
        return BINDER_RULE_TEMPLATES.max_cards_per_binder;
      case "maxPagesPerBinder":
        return BINDER_RULE_TEMPLATES.max_pages_per_binder;
      default:
        return null;
    }
  };

  const getLimitDisplayName = (limitType) => {
    switch (limitType) {
      case "maxBinders":
        return "Max Binders per User";
      case "maxCardsPerBinder":
        return "Max Cards per Binder";
      case "maxPagesPerBinder":
        return "Max Pages per Binder";
      default:
        return limitType;
    }
  };

  const getLimitIcon = (limitType) => {
    switch (limitType) {
      case "maxBinders":
        return DocumentIcon;
      case "maxCardsPerBinder":
        return CogIcon;
      case "maxPagesPerBinder":
        return UsersIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const hasChanges = () => {
    return (
      (currentRules.maxBinders?.config?.limit || 0) !== limits.maxBinders ||
      (currentRules.maxCardsPerBinder?.config?.limit || 0) !==
        limits.maxCardsPerBinder ||
      (currentRules.maxPagesPerBinder?.config?.limit || 0) !==
        limits.maxPagesPerBinder
    );
  };

  if (!isOwner) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-medium text-red-800">Access Denied</h3>
            <p className="text-red-600 text-sm">
              Only owners can manage binder limits.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card-background rounded-lg border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              Binder Limits Configuration
            </h2>
            <p className="text-text-secondary">
              Manage user and binder limits across the platform
            </p>
          </div>
          {hasChanges() && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-amber-600 font-medium">
                You have unsaved changes
              </span>
              <button
                onClick={handleApplyChanges}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {updating ? "Applying..." : "Apply Changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Limits Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Max Binders per User */}
        <div className="bg-card-background rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Max Binders</h3>
              <p className="text-sm text-text-secondary">Per user limit</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuickAdjust("maxBinders", -1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                disabled={limits.maxBinders <= 1}
              >
                <ArrowDownIcon className="w-4 h-4 text-gray-600" />
              </button>

              <input
                type="number"
                value={limits.maxBinders}
                onChange={(e) =>
                  setLimits((prev) => ({
                    ...prev,
                    maxBinders: parseInt(e.target.value) || 1,
                  }))
                }
                min="1"
                max="10000"
                className="w-full text-center text-2xl font-bold border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <button
                onClick={() => handleQuickAdjust("maxBinders", 1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ArrowUpIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {currentRules.maxBinders && (
              <div className="text-sm text-gray-600">
                Current: {currentRules.maxBinders.config.limit}
                {stats[currentRules.maxBinders.id] && (
                  <span className="ml-2 text-blue-600">
                    ({stats[currentRules.maxBinders.id].usage || 0}{" "}
                    enforcements)
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setLimits((prev) => ({ ...prev, maxBinders: 3 }))
                }
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Free (3)
              </button>
              <button
                onClick={() =>
                  setLimits((prev) => ({ ...prev, maxBinders: 5 }))
                }
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                Basic (5)
              </button>
              <button
                onClick={() =>
                  setLimits((prev) => ({ ...prev, maxBinders: 10 }))
                }
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
              >
                Premium (10)
              </button>
            </div>
          </div>
        </div>

        {/* Max Cards per Binder */}
        <div className="bg-card-background rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CogIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Max Cards</h3>
              <p className="text-sm text-text-secondary">Per binder limit</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuickAdjust("maxCardsPerBinder", -25)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                disabled={limits.maxCardsPerBinder <= 25}
              >
                <ArrowDownIcon className="w-4 h-4 text-gray-600" />
              </button>

              <input
                type="number"
                value={limits.maxCardsPerBinder}
                onChange={(e) =>
                  setLimits((prev) => ({
                    ...prev,
                    maxCardsPerBinder: parseInt(e.target.value) || 1,
                  }))
                }
                min="1"
                max="10000"
                step="25"
                className="w-full text-center text-2xl font-bold border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />

              <button
                onClick={() => handleQuickAdjust("maxCardsPerBinder", 25)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ArrowUpIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {currentRules.maxCardsPerBinder && (
              <div className="text-sm text-gray-600">
                Current: {currentRules.maxCardsPerBinder.config.limit}
                {stats[currentRules.maxCardsPerBinder.id] && (
                  <span className="ml-2 text-green-600">
                    ({stats[currentRules.maxCardsPerBinder.id].usage || 0}{" "}
                    enforcements)
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setLimits((prev) => ({ ...prev, maxCardsPerBinder: 200 }))
                }
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Basic (200)
              </button>
              <button
                onClick={() =>
                  setLimits((prev) => ({ ...prev, maxCardsPerBinder: 700 }))
                }
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
              >
                Standard (500)
              </button>
              <button
                onClick={() =>
                  setLimits((prev) => ({ ...prev, maxCardsPerBinder: 1000 }))
                }
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                Premium (1000)
              </button>
            </div>
          </div>
        </div>

        {/* Max Pages per Binder */}
        <div className="bg-card-background rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UsersIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Max Pages</h3>
              <p className="text-sm text-text-secondary">Per binder limit</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuickAdjust("maxPagesPerBinder", -5)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                disabled={limits.maxPagesPerBinder <= 5}
              >
                <ArrowDownIcon className="w-4 h-4 text-gray-600" />
              </button>

              <input
                type="number"
                value={limits.maxPagesPerBinder}
                onChange={(e) =>
                  setLimits((prev) => ({
                    ...prev,
                    maxPagesPerBinder: parseInt(e.target.value) || 1,
                  }))
                }
                min="1"
                max="1000"
                step="5"
                className="w-full text-center text-2xl font-bold border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />

              <button
                onClick={() => handleQuickAdjust("maxPagesPerBinder", 5)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ArrowUpIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {currentRules.maxPagesPerBinder && (
              <div className="text-sm text-gray-600">
                Current: {currentRules.maxPagesPerBinder.config.limit}
                {stats[currentRules.maxPagesPerBinder.id] && (
                  <span className="ml-2 text-purple-600">
                    ({stats[currentRules.maxPagesPerBinder.id].usage || 0}{" "}
                    enforcements)
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setLimits((prev) => ({ ...prev, maxPagesPerBinder: 20 }))
                }
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Basic (20)
              </button>
              <button
                onClick={() =>
                  setLimits((prev) => ({ ...prev, maxPagesPerBinder: 50 }))
                }
                className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
              >
                Standard (50)
              </button>
              <button
                onClick={() =>
                  setLimits((prev) => ({ ...prev, maxPagesPerBinder: 100 }))
                }
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                Premium (100)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Rule Status */}
      {Object.values(currentRules).some(Boolean) && (
        <div className="bg-card-background rounded-lg border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            Active Binder Rules
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(currentRules).map(([key, rule]) => {
              if (!rule) return null;

              return (
                <div key={key} className="bg-background rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {rule.name}
                    </span>
                    <span className="text-2xl font-bold text-gray-600">
                      {rule.config.limit}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{rule.description}</p>
                  {stats[rule.id] && (
                    <div className="mt-2 text-xs text-gray-500">
                      Enforced {stats[rule.id].usage || 0} times
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BinderLimitsManager;

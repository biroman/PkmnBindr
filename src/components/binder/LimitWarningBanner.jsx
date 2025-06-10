import { useState, useEffect } from "react";
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { useRules } from "../../contexts/RulesContext";
import { useSubscription } from "../../contexts/SubscriptionContext";

const LimitWarningBanner = ({ binder, className = "" }) => {
  const { canPerformAction } = useRules();
  const { getUpgradeInfo, isSubscriptionActive } = useSubscription();
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (!binder) return;

    const checkLimits = async () => {
      const newWarnings = [];

      // Check card limit
      const currentCardCount = Object.keys(binder.cards || {}).length;
      const cardCheck = await canPerformAction("add_card_to_binder", {
        currentCount: currentCardCount,
      });

      if (!cardCheck.allowed) {
        newWarnings.push({
          type: "error",
          feature: "cards",
          current: currentCardCount,
          limit: cardCheck.limit || 500,
          message: "Card limit reached",
          action: "upgrade",
        });
      } else if (cardCheck.limit) {
        const percentage = (currentCardCount / cardCheck.limit) * 100;
        if (percentage >= 90) {
          newWarnings.push({
            type: "warning",
            feature: "cards",
            current: currentCardCount,
            limit: cardCheck.limit,
            message: "Almost at card limit",
            action: "alert",
          });
        } else if (percentage >= 75) {
          newWarnings.push({
            type: "info",
            feature: "cards",
            current: currentCardCount,
            limit: cardCheck.limit,
            message: "Approaching card limit",
            action: "notify",
          });
        }
      }

      // Check page limit
      const currentPageCount = binder.settings?.pageCount || 1;
      const pageCheck = await canPerformAction("add_page_to_binder", {
        currentCount: currentPageCount,
      });

      if (!pageCheck.allowed) {
        newWarnings.push({
          type: "error",
          feature: "pages",
          current: currentPageCount,
          limit: pageCheck.limit || 50,
          message: "Page limit reached",
          action: "upgrade",
        });
      } else if (pageCheck.limit) {
        const percentage = (currentPageCount / pageCheck.limit) * 100;
        if (percentage >= 90) {
          newWarnings.push({
            type: "warning",
            feature: "pages",
            current: currentPageCount,
            limit: pageCheck.limit,
            message: "Almost at page limit",
            action: "alert",
          });
        }
      }

      setWarnings(newWarnings);
    };

    checkLimits();
  }, [binder, canPerformAction]);

  const handleUpgrade = (feature) => {
    const upgradeInfo = getUpgradeInfo(feature);
    console.log("Upgrade needed for:", feature, upgradeInfo);
    // Show upgrade modal or redirect to pricing
  };

  const getWarningStyle = (type) => {
    switch (type) {
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-orange-50 border-orange-200 text-orange-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "error":
      case "warning":
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case "info":
      default:
        return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  if (warnings.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {warnings.map((warning, index) => (
        <div
          key={`${warning.feature}-${warning.type}-${index}`}
          className={`border rounded-lg p-3 ${getWarningStyle(warning.type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {getIcon(warning.type)}
              <div className="flex-1">
                <div className="font-medium">{warning.message}</div>
                <div className="text-sm mt-1">
                  {warning.current}/{warning.limit} {warning.feature} used
                </div>

                {/* Progress bar */}
                <div className="mt-2 w-full bg-white bg-opacity-50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      warning.type === "error"
                        ? "bg-red-500"
                        : warning.type === "warning"
                        ? "bg-orange-500"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        (warning.current / warning.limit) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {warning.action === "upgrade" && !isSubscriptionActive() && (
              <button
                onClick={() => handleUpgrade(warning.feature)}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowUpIcon className="w-4 h-4" />
                <span>Upgrade</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LimitWarningBanner;

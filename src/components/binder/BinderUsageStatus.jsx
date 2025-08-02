import { useEffect, useState } from "react";
import { useRules } from "../../contexts/RulesContext";
import { GLOBAL_CARD_LIMIT } from "../../lib/globalRules.js";

const BinderUsageStatus = ({ binder, showProgress = true, className = "" }) => {
  const { canPerformAction } = useRules();
  const [usage, setUsage] = useState({ cards: {}, pages: {} });

  useEffect(() => {
    if (!binder) return;

    const fetchUsage = async () => {
      const currentCardCount = Object.keys(binder.cards || {}).length;
      const currentPageCount = binder.settings?.pageCount || 1;

      try {
        const cardCheck = await canPerformAction("add_card_to_binder", {
          currentCount: currentCardCount,
        });

        const pageCheck = await canPerformAction("add_page_to_binder", {
          currentCount: currentPageCount,
        });

        // Use fallback limits if rules don't provide them
        const cardLimit = cardCheck.limit || GLOBAL_CARD_LIMIT;
        const pageLimit = pageCheck.limit || 100;

        // Always calculate percentage, even if limit is not returned
        const cardPercentage = (currentCardCount / cardLimit) * 100;
        const pagePercentage = (currentPageCount / pageLimit) * 100;

        setUsage({
          cards: {
            current: currentCardCount,
            limit: cardLimit,
            percentage: cardPercentage,
            canAdd: cardCheck.allowed !== false,
          },
          pages: {
            current: currentPageCount,
            limit: pageLimit,
            percentage: pagePercentage,
            canAdd: pageCheck.allowed !== false,
          },
        });
      } catch (error) {
        console.error("Rules system error, using fallback:", error);
        // Fallback if rules system fails entirely
        const cardPercentage = (currentCardCount / GLOBAL_CARD_LIMIT) * 100;
        const pagePercentage = (currentPageCount / 100) * 100;

        setUsage({
          cards: {
            current: currentCardCount,
            limit: GLOBAL_CARD_LIMIT,
            percentage: cardPercentage,
            canAdd: currentCardCount < GLOBAL_CARD_LIMIT,
          },
          pages: {
            current: currentPageCount,
            limit: 100,
            percentage: pagePercentage,
            canAdd: currentPageCount < 100,
          },
        });
      }
    };

    fetchUsage();
  }, [binder, canPerformAction]);

  const getStatusColor = (percentage, canAdd) => {
    if (!canAdd || percentage >= 100) return "text-red-600";
    if (percentage >= 90) return "text-orange-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percentage, canAdd) => {
    if (!canAdd || percentage >= 100) return "bg-red-500";
    if (percentage >= 90) return "bg-orange-500";
    if (percentage >= 75) return "bg-yellow-400";
    if (percentage >= 50) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <div className={`text-sm ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        {/* Cards Status */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Cards</span>
            <span
              className={`font-medium ${getStatusColor(
                usage.cards.percentage,
                usage.cards.canAdd
              )}`}
            >
              {usage.cards.current}/{usage.cards.limit}
              <span className="text-xs text-text-secondary ml-1">
                ({Math.round(usage.cards.percentage)}%)
              </span>
            </span>
          </div>
          {showProgress && (
            <div className="w-full bg-secondary rounded-full h-2.5 border border-border">
              <div
                className={`h-2.5 rounded-full transition-all ${getProgressColor(
                  usage.cards.percentage,
                  usage.cards.canAdd
                )}`}
                style={{
                  width: `${Math.min(usage.cards.percentage, 100)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Pages Status */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Pages</span>
            <span
              className={`font-medium ${getStatusColor(
                usage.pages.percentage,
                usage.pages.canAdd
              )}`}
            >
              {usage.pages.current}/{usage.pages.limit}
              <span className="text-xs text-text-secondary ml-1">
                ({Math.round(usage.pages.percentage)}%)
              </span>
            </span>
          </div>
          {showProgress && (
            <div className="w-full bg-secondary rounded-full h-2.5 border border-border">
              <div
                className={`h-2.5 rounded-full transition-all ${getProgressColor(
                  usage.pages.percentage,
                  usage.pages.canAdd
                )}`}
                style={{
                  width: `${Math.min(usage.pages.percentage, 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BinderUsageStatus;

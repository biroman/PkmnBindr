import { useState, useEffect, useMemo } from "react";
import { useRules } from "../contexts/RulesContext";
import { useAuth } from "../hooks/useAuth";

const useBinderLimits = (binder) => {
  const { canPerformAction } = useRules();
  const { user } = useAuth();
  const [limits, setLimits] = useState({
    cards: { current: 0, limit: null, canAdd: true },
    pages: { current: 0, limit: null, canAdd: true },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!binder) {
      setLoading(false);
      return;
    }

    const fetchLimits = async () => {
      setLoading(true);
      try {
        const currentCardCount = Object.keys(binder.cards || {}).length;
        const currentPageCount = binder.settings?.pageCount || 1;

        const [cardCheck, pageCheck] = await Promise.all([
          canPerformAction("add_card_to_binder", {
            currentCount: currentCardCount,
          }),
          canPerformAction("add_page_to_binder", {
            currentCount: currentPageCount,
          }),
        ]);

        setLimits({
          cards: {
            current: currentCardCount,
            limit: cardCheck.limit || 700,
            canAdd: cardCheck.allowed,
            remaining: cardCheck.limit
              ? Math.max(0, cardCheck.limit - currentCardCount)
              : null,
          },
          pages: {
            current: currentPageCount,
            limit: pageCheck.limit || 50,
            canAdd: pageCheck.allowed,
            remaining: pageCheck.limit
              ? Math.max(0, pageCheck.limit - currentPageCount)
              : null,
          },
        });
      } catch (error) {
        console.error("Failed to fetch binder limits:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, [binder, canPerformAction]);

  // Calculate warning states
  const warnings = useMemo(() => {
    const result = {
      cards: { type: null, message: null },
      pages: { type: null, message: null },
    };

    // Card warnings
    if (limits.cards.limit) {
      const cardPercentage = (limits.cards.current / limits.cards.limit) * 100;
      if (!limits.cards.canAdd || cardPercentage >= 100) {
        result.cards = {
          type: "error",
          message: `Card limit reached (${limits.cards.current}/${limits.cards.limit})`,
        };
      } else if (cardPercentage >= 90) {
        result.cards = {
          type: "warning",
          message: `Almost at card limit (${limits.cards.current}/${limits.cards.limit})`,
        };
      } else if (cardPercentage >= 75) {
        result.cards = {
          type: "info",
          message: `Approaching card limit (${limits.cards.current}/${limits.cards.limit})`,
        };
      }
    }

    // Page warnings
    if (limits.pages.limit) {
      const pagePercentage = (limits.pages.current / limits.pages.limit) * 100;
      if (!limits.pages.canAdd || pagePercentage >= 100) {
        result.pages = {
          type: "error",
          message: `Page limit reached (${limits.pages.current}/${limits.pages.limit})`,
        };
      } else if (pagePercentage >= 90) {
        result.pages = {
          type: "warning",
          message: `Almost at page limit (${limits.pages.current}/${limits.pages.limit})`,
        };
      }
    }

    return result;
  }, [limits]);

  // Helper functions
  const canAddCards = (count = 1) => {
    return (
      limits.cards.canAdd &&
      (limits.cards.remaining === null || limits.cards.remaining >= count)
    );
  };

  const canAddPages = (count = 1) => {
    return (
      limits.pages.canAdd &&
      (limits.pages.remaining === null || limits.pages.remaining >= count)
    );
  };

  const getProgressPercentage = (type) => {
    const limit = limits[type];
    if (!limit.limit) return 0;
    return Math.min((limit.current / limit.limit) * 100, 100);
  };

  const getUpgradeMessage = () => {
    if (!user) {
      return "Sign up for higher limits and cloud sync!";
    }
    return "Upgrade your plan for higher limits and premium features.";
  };

  return {
    limits,
    warnings,
    loading,
    canAddCards,
    canAddPages,
    getProgressPercentage,
    getUpgradeMessage,
    hasActiveWarnings: Object.values(warnings).some((w) => w.type),
  };
};

export default useBinderLimits;

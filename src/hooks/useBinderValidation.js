import { useMemo } from "react";

/**
 * Custom hook to validate binder IDs and handle invalid binder scenarios
 */
const useBinderValidation = (binders, binderId) => {
  const validation = useMemo(() => {
    // If no binder ID provided, return no binder selected state (landing page)
    if (!binderId) {
      return {
        isValid: true,
        binder: null,
        error: null,
        status: "no_binder",
      };
    }

    // If binders array exists but is empty, user has no binders (deleted all)
    if (binders && binders.length === 0) {
      return {
        isValid: true,
        binder: null,
        error: null,
        status: "no_binder", // Show empty state, not loading
      };
    }

    // If binders are still loading (null or undefined)
    if (!binders) {
      return {
        isValid: false,
        binder: null,
        error: null,
        status: "loading",
      };
    }

    // Try to find the binder
    const foundBinder = binders.find((b) => b.id === binderId);

    if (foundBinder) {
      return {
        isValid: true,
        binder: foundBinder,
        error: null,
        status: "valid",
      };
    }

    // Binder not found
    return {
      isValid: false,
      binder: null,
      error: {
        type: "binder_not_found",
        message: `The binder you're looking for isn't available anymore`,
        suggestions: [
          "The binder may have been deleted",
          "Click 'Go Back' to return to the home page",
          "Select a different binder from the sidebar",
        ],
      },
      status: "invalid",
    };
  }, [binders, binderId]);

  return validation;
};

export default useBinderValidation;

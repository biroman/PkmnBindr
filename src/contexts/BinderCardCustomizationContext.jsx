import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-hot-toast";
import binderCardCustomizationService from "../services/binderCardCustomizationService";

const BinderCardCustomizationContext = createContext();

export const BinderCardCustomizationProvider = ({ children }) => {
  const { user } = useAuth();
  const [customizations, setCustomizations] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load user's customizations when they log in
  useEffect(() => {
    if (user) {
      loadUserCustomizations();
    } else {
      // Clear customizations when user logs out
      setCustomizations({});
    }
  }, [user]);

  const loadUserCustomizations = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await binderCardCustomizationService.getUserCustomizations(
        user.uid
      );
      if (result.success) {
        setCustomizations(result.data || {});
      }
    } catch (error) {
      console.error("Failed to load user customizations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveCustomization = useCallback(
    async (binderId, customizationData) => {
      if (!user || !binderId) {
        throw new Error("User must be logged in and binder ID is required");
      }

      try {
        const result = await binderCardCustomizationService.saveCustomization(
          binderId,
          user.uid,
          customizationData
        );

        if (result.success) {
          // Update local state
          setCustomizations((prev) => ({
            ...prev,
            [binderId]: result.data,
          }));

          toast.success("Binder card customization saved!");
          return result;
        }
      } catch (error) {
        console.error("Failed to save customization:", error);
        toast.error("Failed to save customization");
        throw error;
      }
    },
    [user]
  );

  const getCustomization = useCallback(
    (binderId) => {
      return customizations[binderId] || null;
    },
    [customizations]
  );

  const deleteCustomization = useCallback(
    async (binderId) => {
      if (!user || !binderId) {
        throw new Error("User must be logged in and binder ID is required");
      }

      try {
        const result = await binderCardCustomizationService.deleteCustomization(
          binderId,
          user.uid
        );

        if (result.success) {
          // Update local state
          setCustomizations((prev) => {
            const updated = { ...prev };
            delete updated[binderId];
            return updated;
          });

          toast.success("Binder card customization deleted!");
          return result;
        }
      } catch (error) {
        console.error("Failed to delete customization:", error);
        toast.error("Failed to delete customization");
        throw error;
      }
    },
    [user]
  );

  // Load customization for a specific binder (for viewing public binders)
  const loadBinderCustomization = useCallback(async (binderId, ownerId) => {
    if (!binderId || !ownerId) return null;

    try {
      const result = await binderCardCustomizationService.getCustomization(
        binderId,
        ownerId
      );

      if (result.success && result.data) {
        // Cache the customization locally
        setCustomizations((prev) => ({
          ...prev,
          [binderId]: result.data,
        }));
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to load binder customization:", error);
      return null;
    }
  }, []);

  // Helper function to get header color for a binder
  const getHeaderColor = useCallback(
    (binderId, ownerId = null) => {
      const customization = getCustomization(binderId);
      if (customization) {
        return customization.headerColor || null;
      }

      // If we don't have the customization cached and we know the owner,
      // we need to load it (this will be handled by the component)
      return null;
    },
    [getCustomization]
  );

  // Helper function to save just the header color
  const saveHeaderColor = useCallback(
    async (binderId, headerColor) => {
      const existingCustomization = getCustomization(binderId);
      const customizationData = {
        ...existingCustomization,
        headerColor,
      };

      return await saveCustomization(binderId, customizationData);
    },
    [getCustomization, saveCustomization]
  );

  const value = {
    // State
    customizations,
    isLoading,

    // Actions
    saveCustomization,
    getCustomization,
    deleteCustomization,
    loadUserCustomizations,
    loadBinderCustomization,

    // Helper functions
    getHeaderColor,
    saveHeaderColor,
  };

  return (
    <BinderCardCustomizationContext.Provider value={value}>
      {children}
    </BinderCardCustomizationContext.Provider>
  );
};

export const useBinderCardCustomization = () => {
  const context = useContext(BinderCardCustomizationContext);
  if (!context) {
    throw new Error(
      "useBinderCardCustomization must be used within a BinderCardCustomizationProvider"
    );
  }
  return context;
};

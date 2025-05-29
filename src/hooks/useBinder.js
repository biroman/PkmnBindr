import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCurrentBinder,
  getAllBinders,
  saveBinder,
  setCurrentBinder as setCurrentBinderInStorage,
  getSetFromCache,
  saveSetToCache,
  getCustomCards,
  getBinderHistory,
  setBinderType,
  createBinder,
  deleteBinder,
  renameBinder,
} from "../utils/storageUtilsIndexedDB";
import logger from "../utils/logger";

const useBinder = () => {
  const [binders, setBinders] = useState([]);
  const [currentBinder, setCurrentBinder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize storage and load saved data
  useEffect(() => {
    const loadBinderData = async () => {
      try {
        setLoading(true);
        const allBinders = await getAllBinders();
        setBinders(allBinders);

        const currentBinderFromStorage = await getCurrentBinder();
        if (currentBinderFromStorage) {
          setCurrentBinder(currentBinderFromStorage);
        }
      } catch (error) {
        logger.error("Failed to load binder data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBinderData();
  }, []);

  const handleBinderSelect = async (binder) => {
    try {
      setCurrentBinder(binder);
      await setCurrentBinderInStorage(binder.id);
      return binder;
    } catch (error) {
      logger.error("Failed to select binder:", error);
      throw error;
    }
  };

  const handleBinderCreate = async (name, binderType = "set") => {
    try {
      const newBinder = await createBinder(name);
      await setBinderType(newBinder.id, binderType);

      // Get the updated binder with the correct type
      const updatedBinders = await getAllBinders();
      const binderWithType = updatedBinders.find((b) => b.id === newBinder.id);

      setBinders(updatedBinders);
      return binderWithType;
    } catch (error) {
      logger.error("Failed to create binder:", error);
      throw error;
    }
  };

  const handleBinderDelete = async (binderId) => {
    try {
      await deleteBinder(binderId);
      const updatedBinders = await getAllBinders();
      setBinders(updatedBinders);

      if (currentBinder?.id === binderId) {
        setCurrentBinder(null);
      }
    } catch (error) {
      logger.error("Failed to delete binder:", error);
      throw error;
    }
  };

  const handleBinderRename = async (binderId, newName) => {
    try {
      const binder = binders.find((b) => b.id === binderId);
      if (binder) {
        const renamedBinder = await renameBinder(binderId, newName);
        const updatedBinders = await getAllBinders();
        setBinders(updatedBinders);

        if (currentBinder?.id === binderId) {
          setCurrentBinder(renamedBinder);
        }

        return renamedBinder;
      }
      return null;
    } catch (error) {
      logger.error("Failed to rename binder:", error);
      throw error;
    }
  };

  const handleDataImported = async () => {
    try {
      const allBinders = await getAllBinders();
      setBinders(allBinders);
      const current = await getCurrentBinder();
      if (current) {
        setCurrentBinder(current);
      }
    } catch (error) {
      logger.error("Failed to handle data import:", error);
    }
  };

  const updateBinderState = async (updatedBinder) => {
    try {
      await saveBinder(updatedBinder);
      setCurrentBinder(updatedBinder);
      setBinders((prev) =>
        prev.map((b) => (b.id === updatedBinder.id ? updatedBinder : b))
      );
    } catch (error) {
      logger.error("Failed to update binder state:", error);
      throw error;
    }
  };

  return {
    // State
    binders,
    currentBinder,
    loading,

    // Actions
    handleBinderSelect,
    handleBinderCreate,
    handleBinderDelete,
    handleBinderRename,
    handleDataImported,
    updateBinderState,

    // Direct setters (for cases where external components need direct access)
    setBinders,
    setCurrentBinder,
  };
};

export default useBinder;

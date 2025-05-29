import { useState, useEffect } from "react";
import {
  getCurrentBinder,
  getBinders,
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
} from "../utils/storageUtils";

const useBinder = () => {
  const [binders, setBinders] = useState([]);
  const [currentBinder, setCurrentBinder] = useState(null);

  // Initialize storage and load saved data
  useEffect(() => {
    setBinders(getBinders());

    const currentBinderFromStorage = getCurrentBinder();
    if (currentBinderFromStorage) {
      setCurrentBinder(currentBinderFromStorage);
    }
  }, []);

  const handleBinderSelect = async (binder) => {
    setCurrentBinder(binder);
    setCurrentBinderInStorage(binder.id);
    return binder;
  };

  const handleBinderCreate = (name, binderType = "set") => {
    const newBinder = createBinder(name);
    setBinderType(newBinder.id, binderType);

    // Get the updated binder with the correct type
    const updatedBinders = getBinders();
    const binderWithType = updatedBinders.find((b) => b.id === newBinder.id);

    setBinders(updatedBinders);
    return binderWithType;
  };

  const handleBinderDelete = (binderId) => {
    deleteBinder(binderId);
    setBinders(getBinders());

    if (currentBinder?.id === binderId) {
      setCurrentBinder(null);
    }
  };

  const handleBinderRename = (binderId, newName) => {
    const binder = binders.find((b) => b.id === binderId);
    if (binder) {
      const renamedBinder = renameBinder(binderId, newName);
      setBinders(getBinders());

      if (currentBinder?.id === binderId) {
        setCurrentBinder(renamedBinder);
      }

      return renamedBinder;
    }
    return null;
  };

  const handleDataImported = () => {
    setBinders(getBinders());
    const current = getCurrentBinder();
    if (current) {
      setCurrentBinder(current);
    }
  };

  const updateBinderState = (updatedBinder) => {
    saveBinder(updatedBinder);
    setCurrentBinder(updatedBinder);
    setBinders((prev) =>
      prev.map((b) => (b.id === updatedBinder.id ? updatedBinder : b))
    );
  };

  return {
    // State
    binders,
    currentBinder,

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

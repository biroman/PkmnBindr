// SelectionContext recreated after merge
import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";

const SelectionContext = createContext({
  selectionMode: false,
  selectedPositions: new Set(),
  toggleSelectionMode: () => {},
  toggleCardSelection: () => {},
  clearSelection: () => {},
  isSelected: () => false,
  previewOffset: null,
  setPreviewOffset: () => {},
  isBulkDragging: false,
  setIsBulkDragging: () => {},
});

export const SelectionProvider = ({ children }) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [previewOffset, setPreviewOffset] = useState(null);
  const [isBulkDragging, setIsBulkDragging] = useState(false);

  const clearSelection = useCallback(() => {
    setSelectedPositions(new Set());
    setPreviewOffset(null);
    setIsBulkDragging(false);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      const next = !prev;
      if (!next) clearSelection();
      return next;
    });
  }, [clearSelection]);

  const toggleCardSelection = useCallback((position) => {
    setSelectedPositions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(position)) {
        newSet.delete(position);
      } else {
        newSet.add(position);
      }
      return newSet;
    });
  }, []);

  const isSelected = useCallback(
    (position) => selectedPositions.has(position),
    [selectedPositions]
  );

  const value = useMemo(
    () => ({
      selectionMode,
      selectedPositions,
      toggleSelectionMode,
      toggleCardSelection,
      clearSelection,
      isSelected,
      previewOffset,
      setPreviewOffset,
      isBulkDragging,
      setIsBulkDragging,
    }),
    [
      selectionMode,
      selectedPositions,
      toggleSelectionMode,
      toggleCardSelection,
      clearSelection,
      isSelected,
      previewOffset,
      isBulkDragging,
    ]
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);

export default SelectionContext;

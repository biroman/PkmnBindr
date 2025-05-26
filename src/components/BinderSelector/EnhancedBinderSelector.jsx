import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Book,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Save,
  X,
  FolderOpen,
  Sparkles,
  Grid3X3,
} from "lucide-react";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useTheme } from "../../theme/ThemeContent";

const EnhancedBinderSelector = ({
  binders,
  currentBinder,
  onBinderSelect,
  onBinderCreate,
  onBinderDelete,
  onBinderRename,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewBinderInput, setShowNewBinderInput] = useState(false);
  const [newBinderName, setNewBinderName] = useState("");
  const [newBinderType, setNewBinderType] = useState("set");
  const [editingBinder, setEditingBinder] = useState(null);
  const dropdownRef = useRef(null);
  const newBinderInputRef = useRef(null);
  const editBinderInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [binderToDelete, setBinderToDelete] = useState(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    if (showNewBinderInput && newBinderInputRef.current) {
      newBinderInputRef.current.focus();
    }
  }, [showNewBinderInput]);

  useEffect(() => {
    if (editingBinder && editBinderInputRef.current) {
      editBinderInputRef.current.focus();
    }
  }, [editingBinder]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form states when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setShowNewBinderInput(false);
      setNewBinderName("");
      setNewBinderType("set");
      setEditingBinder(null);
    }
  }, [isOpen]);

  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;
      const needsScroll = scrollHeight > clientHeight;
      setShouldScroll(needsScroll);
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollTop < scrollHeight - clientHeight - 1);
    }
  };

  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      checkScrollPosition();
    }
  }, [isOpen, binders.length]);

  const handleDeleteClick = (binder) => {
    setBinderToDelete(binder);
  };

  const handleConfirmDelete = () => {
    if (binderToDelete) {
      onBinderDelete(binderToDelete.id);
      setBinderToDelete(null);
    }
  };

  const handleBinderKeyPress = (e, type) => {
    if (e.key === "Enter") {
      if (type === "new") {
        handleCreateBinder();
      } else if (type === "edit") {
        handleSaveEdit();
      }
    }
  };

  const handleCreateBinder = () => {
    if (newBinderName.trim()) {
      onBinderCreate(newBinderName.trim(), newBinderType);
      setNewBinderName("");
      setNewBinderType("set");
      setShowNewBinderInput(false);
    }
  };

  const handleEditBinder = (binder) => {
    setEditingBinder({
      ...binder,
      newName: binder.name,
    });
  };

  const handleSaveEdit = () => {
    if (
      editingBinder.newName.trim() &&
      editingBinder.newName !== editingBinder.name
    ) {
      onBinderRename(editingBinder.id, editingBinder.newName.trim());
    }
    setEditingBinder(null);
  };

  const getBinderIcon = (binder) => {
    if (binder.binderType === "custom") {
      return <Sparkles className={`w-4 h-4 ${theme.colors.text.accent}`} />;
    }
    return <Book className={`w-4 h-4 ${theme.colors.text.accent}`} />;
  };

  const getBinderTypeLabel = (binder) => {
    return binder.binderType === "custom"
      ? "Custom Collection"
      : "Set Collection";
  };

  const getBinderStats = (binder) => {
    if (binder.binderType === "custom") {
      const cardCount = binder.customCards?.length || 0;
      return `${cardCount} card${cardCount !== 1 ? "s" : ""}`;
    } else {
      const setCount = binder.sets?.length || 0;
      return `${setCount} set${setCount !== 1 ? "s" : ""}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full px-4 py-3 rounded-xl
            ${theme.colors.background.card}
            border ${theme.colors.border.accent}
            ${theme.colors.text.primary} 
            flex items-center gap-3
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
            transition-all duration-200
            hover:shadow-md
            ${isOpen ? "shadow-md" : ""}
          `}
        >
          <div
            className={`w-10 h-10 rounded-lg ${theme.colors.background.sidebar} flex items-center justify-center flex-shrink-0`}
          >
            {currentBinder ? (
              getBinderIcon(currentBinder)
            ) : (
              <FolderOpen className={`w-4 h-4 ${theme.colors.text.accent}`} />
            )}
          </div>
          <div className="flex-1 text-left">
            <div className={`font-medium ${theme.colors.text.primary}`}>
              {currentBinder ? currentBinder.name : "Select Binder"}
            </div>
            {currentBinder && (
              <div className={`text-sm ${theme.colors.text.secondary}`}>
                {getBinderTypeLabel(currentBinder)} •{" "}
                {getBinderStats(currentBinder)}
              </div>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 ${
              theme.colors.text.secondary
            } transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div
            className={`
              absolute top-full left-0 right-0 mt-2 
              bg-white 
              border ${theme.colors.border.accent}
              rounded-xl shadow-xl z-50
              max-h-[80vh] overflow-hidden
            `}
          >
            {binders.length > 0 ? (
              <div className="relative">
                {/* Scroll indicators */}
                {shouldScroll && canScrollUp && (
                  <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white via-white/80 to-transparent z-10 pointer-events-none flex items-start justify-center pt-1">
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                {shouldScroll && canScrollDown && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent z-10 pointer-events-none flex items-end justify-center pb-1">
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                )}

                <div
                  className={`p-2 ${
                    shouldScroll
                      ? "max-h-[50vh] overflow-y-auto"
                      : "overflow-visible"
                  }`}
                  ref={scrollContainerRef}
                  onScroll={checkScrollPosition}
                >
                  {binders.map((binder, index) => (
                    <div
                      key={binder.id}
                      className={`
                        ${index !== binders.length - 1 ? "mb-1" : ""}
                      `}
                    >
                      {editingBinder?.id === binder.id ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-opacity-50">
                          <div
                            className={`w-8 h-8 rounded-lg ${theme.colors.background.card} flex items-center justify-center flex-shrink-0`}
                          >
                            {getBinderIcon(binder)}
                          </div>
                          <input
                            ref={editBinderInputRef}
                            type="text"
                            value={editingBinder.newName}
                            onChange={(e) =>
                              setEditingBinder({
                                ...editingBinder,
                                newName: e.target.value,
                              })
                            }
                            onKeyPress={(e) => handleBinderKeyPress(e, "edit")}
                            className={`
                              flex-1 px-3 py-2 rounded-lg
                              ${theme.colors.background.card}
                              border ${theme.colors.border.accent}
                              ${theme.colors.text.primary}
                              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
                              transition-all duration-200
                            `}
                            placeholder="Binder name..."
                          />
                          <button
                            onClick={handleSaveEdit}
                            className={`w-8 h-8 rounded-lg ${theme.colors.button.success} flex items-center justify-center hover:scale-105 transition-transform`}
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingBinder(null)}
                            className={`w-8 h-8 rounded-lg ${theme.colors.button.secondary} flex items-center justify-center hover:scale-105 transition-transform`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`
                            relative p-3 rounded-lg cursor-pointer group
                            transition-all duration-200
                            hover:${theme.colors.background.sidebar}
                            ${
                              currentBinder?.id === binder.id
                                ? `${theme.colors.background.sidebar} shadow-sm`
                                : ""
                            }
                          `}
                          onClick={() => {
                            onBinderSelect(binder);
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg ${theme.colors.background.card} flex items-center justify-center flex-shrink-0`}
                            >
                              {getBinderIcon(binder)}
                            </div>
                            <div className="flex-1 min-w-0 pr-16">
                              <div
                                className={`font-medium ${theme.colors.text.primary} truncate`}
                              >
                                {binder.name}
                              </div>
                              <div
                                className={`text-sm ${theme.colors.text.secondary} truncate`}
                              >
                                {getBinderTypeLabel(binder)} •{" "}
                                {getBinderStats(binder)}
                              </div>
                            </div>
                            {currentBinder?.id === binder.id && (
                              <div
                                className={`w-2 h-2 rounded-full ${theme.colors.button.success} absolute right-12`}
                              />
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditBinder(binder);
                              }}
                              className={`w-6 h-6 rounded ${theme.colors.button.secondary} flex items-center justify-center hover:scale-110 transition-transform`}
                              title="Rename binder"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {binders.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(binder);
                                }}
                                className="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 flex items-center justify-center hover:scale-110 transition-all"
                                title="Delete binder"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div
                  className={`w-12 h-12 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center mb-3`}
                >
                  <FolderOpen
                    className={`w-6 h-6 ${theme.colors.text.accent}`}
                  />
                </div>
                <p className={`${theme.colors.text.secondary} text-sm`}>
                  No binders found
                </p>
              </div>
            )}

            {/* Create New Binder */}
            <div className={`border-t ${theme.colors.border.accent} p-3`}>
              {showNewBinderInput ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg ${theme.colors.background.card} flex items-center justify-center flex-shrink-0`}
                    >
                      <Plus className={`w-4 h-4 ${theme.colors.text.accent}`} />
                    </div>
                    <input
                      ref={newBinderInputRef}
                      type="text"
                      value={newBinderName}
                      onChange={(e) => setNewBinderName(e.target.value)}
                      onKeyPress={(e) => handleBinderKeyPress(e, "new")}
                      className={`
                        flex-1 px-3 py-2 rounded-lg
                        ${theme.colors.background.card}
                        border ${theme.colors.border.accent}
                        ${theme.colors.text.primary}
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
                        transition-all duration-200
                      `}
                      placeholder="New binder name..."
                    />
                  </div>

                  {/* Binder Type Selection */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewBinderType("set")}
                      className={`
                        p-3 rounded-lg border-2 transition-all duration-200
                        ${
                          newBinderType === "set"
                            ? `border-blue-500 ${theme.colors.background.sidebar}`
                            : `border-transparent ${theme.colors.background.card} hover:${theme.colors.background.sidebar}`
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Grid3X3
                          className={`w-5 h-5 ${theme.colors.text.accent}`}
                        />
                        <div>
                          <div
                            className={`text-sm font-medium ${theme.colors.text.primary}`}
                          >
                            Set Collection
                          </div>
                          <div
                            className={`text-xs ${theme.colors.text.secondary}`}
                          >
                            Complete sets
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setNewBinderType("custom")}
                      className={`
                        p-3 rounded-lg border-2 transition-all duration-200
                        ${
                          newBinderType === "custom"
                            ? `border-blue-500 ${theme.colors.background.sidebar}`
                            : `border-transparent ${theme.colors.background.card} hover:${theme.colors.background.sidebar}`
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Sparkles
                          className={`w-5 h-5 ${theme.colors.text.accent}`}
                        />
                        <div>
                          <div
                            className={`text-sm font-medium ${theme.colors.text.primary}`}
                          >
                            Custom Collection
                          </div>
                          <div
                            className={`text-xs ${theme.colors.text.secondary}`}
                          >
                            Individual cards
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateBinder}
                      disabled={!newBinderName.trim()}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme.colors.button.success}`}
                    >
                      Create Binder
                    </button>
                    <button
                      onClick={() => {
                        setShowNewBinderInput(false);
                        setNewBinderName("");
                        setNewBinderType("set");
                      }}
                      className={`px-4 py-2 rounded-lg ${theme.colors.button.secondary} text-sm transition-all duration-200`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewBinderInput(true)}
                  className={`
                    w-full p-3 rounded-lg flex items-center gap-3
                    ${theme.colors.button.secondary}
                    transition-all duration-200
                    hover:shadow-md
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
                  `}
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${theme.colors.background.card} flex items-center justify-center flex-shrink-0`}
                  >
                    <Plus className={`w-4 h-4 ${theme.colors.text.accent}`} />
                  </div>
                  <div>
                    <div className={`font-medium ${theme.colors.text.primary}`}>
                      Create New Binder
                    </div>
                    <div className={`text-sm ${theme.colors.text.secondary}`}>
                      Set or custom collection
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {binderToDelete && (
        <DeleteConfirmationModal
          binderName={binderToDelete.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setBinderToDelete(null)}
        />
      )}
    </div>
  );
};

EnhancedBinderSelector.propTypes = {
  binders: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      sets: PropTypes.array,
      binderType: PropTypes.string,
      customCards: PropTypes.array,
    })
  ).isRequired,
  currentBinder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    sets: PropTypes.array,
    binderType: PropTypes.string,
    customCards: PropTypes.array,
  }),
  onBinderSelect: PropTypes.func.isRequired,
  onBinderCreate: PropTypes.func.isRequired,
  onBinderDelete: PropTypes.func.isRequired,
  onBinderRename: PropTypes.func.isRequired,
};

export default EnhancedBinderSelector;

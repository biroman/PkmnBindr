import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Book,
  Plus,
  ChevronDown,
  Pencil,
  Trash2,
  Save,
  X,
  FolderOpen,
} from "lucide-react";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useTheme } from "../../theme/ThemeContent";

const BinderSelector = ({
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
  const [editingBinder, setEditingBinder] = useState(null);
  const dropdownRef = useRef(null);
  const newBinderInputRef = useRef(null);
  const editBinderInputRef = useRef(null);
  const [binderToDelete, setBinderToDelete] = useState(null);

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
      onBinderCreate(newBinderName.trim());
      setNewBinderName("");
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
            className={`w-8 h-8 rounded-lg ${theme.colors.background.sidebar} flex items-center justify-center flex-shrink-0`}
          >
            {currentBinder ? (
              <Book className={`w-4 h-4 ${theme.colors.text.accent}`} />
            ) : (
              <FolderOpen className={`w-4 h-4 ${theme.colors.text.accent}`} />
            )}
          </div>

          <div className="flex-1 text-left">
            {currentBinder ? (
              <div>
                <div className={`font-medium ${theme.colors.text.primary}`}>
                  {currentBinder.name}
                </div>
                <div className={`text-sm ${theme.colors.text.secondary}`}>
                  Current Collection
                </div>
              </div>
            ) : (
              <div>
                <div className={`font-medium ${theme.colors.text.secondary}`}>
                  Select Collection
                </div>
                <div
                  className={`text-sm ${theme.colors.text.secondary} opacity-60`}
                >
                  Choose or create a binder
                </div>
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
              absolute z-50 w-full mt-2 
              ${theme.colors.background.sidebar} 
              border ${theme.colors.border.accent} 
              rounded-xl shadow-2xl 
              max-h-96 overflow-hidden 
              flex flex-col
            `}
          >
            {/* Binders List */}
            <div className="max-h-64 overflow-y-auto">
              {binders.length === 0 ? (
                <div className="p-8 text-center">
                  <div
                    className={`w-12 h-12 mx-auto rounded-full ${theme.colors.background.card} flex items-center justify-center mb-3`}
                  >
                    <Book
                      className={`w-5 h-5 ${theme.colors.text.secondary}`}
                    />
                  </div>
                  <div className={`text-sm ${theme.colors.text.secondary}`}>
                    No binders yet
                  </div>
                  <div
                    className={`text-xs ${theme.colors.text.secondary} opacity-60 mt-1`}
                  >
                    Create your first collection below
                  </div>
                </div>
              ) : (
                <div className="p-2">
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
                            <Book
                              className={`w-4 h-4 ${theme.colors.text.accent}`}
                            />
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
                        <div className="group relative">
                          <button
                            onClick={() => {
                              onBinderSelect(binder);
                              setIsOpen(false);
                            }}
                            className={`
                              w-full p-3 rounded-lg text-left
                              ${theme.colors.button.secondary}
                              transition-all duration-200
                              hover:shadow-md
                              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
                              ${
                                currentBinder?.id === binder.id
                                  ? "ring-2 ring-blue-500/50"
                                  : ""
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg ${theme.colors.background.card} flex items-center justify-center flex-shrink-0`}
                              >
                                <Book
                                  className={`w-4 h-4 ${theme.colors.text.accent}`}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div
                                  className={`font-medium ${theme.colors.text.primary} truncate`}
                                >
                                  {binder.name}
                                </div>
                                <div
                                  className={`text-sm ${theme.colors.text.secondary}`}
                                >
                                  {binder.sets?.length || 0} sets • Updated{" "}
                                  {binder.updatedAt
                                    ? new Date(
                                        binder.updatedAt
                                      ).toLocaleDateString()
                                    : "never"}
                                </div>
                              </div>
                            </div>
                          </button>

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
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create New Binder */}
            <div className={`border-t ${theme.colors.border.accent} p-3`}>
              {showNewBinderInput ? (
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
                  <button
                    onClick={handleCreateBinder}
                    className={`w-8 h-8 rounded-lg ${theme.colors.button.success} flex items-center justify-center hover:scale-105 transition-transform`}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewBinderInput(false);
                      setNewBinderName("");
                    }}
                    className={`w-8 h-8 rounded-lg ${theme.colors.button.secondary} flex items-center justify-center hover:scale-105 transition-transform`}
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                      Start a new collection
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

BinderSelector.propTypes = {
  binders: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      sets: PropTypes.array,
    })
  ).isRequired,
  currentBinder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    sets: PropTypes.array,
  }),
  onBinderSelect: PropTypes.func.isRequired,
  onBinderCreate: PropTypes.func.isRequired,
  onBinderDelete: PropTypes.func.isRequired,
  onBinderRename: PropTypes.func.isRequired,
};

export default BinderSelector;

import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Book, Plus, ChevronDown, Pencil, Trash2, Save, X } from "lucide-react";
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
    <div className="space-y-2">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 rounded-lg
          flex items-center justify-between
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${theme.colors.button.secondary} border ${theme.colors.border.accent}`}
        >
          <div className="flex items-center gap-2">
            <Book className={`w-4 h-4 ${theme.colors.text.accent}`} />
            <span className="truncate">
              {currentBinder ? (
                <span className={theme.colors.text.accent}>
                  {currentBinder.name}
                </span>
              ) : (
                <span className={theme.colors.text.secondary}>
                  Select or create a binder
                </span>
              )}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 ${theme.colors.text.secondary}`} />
        </button>

        {isOpen && (
          <div
            className={`absolute z-50 w-full mt-1 
    ${theme.colors.dropdown.background}
    border ${theme.colors.border.light}
    rounded-lg shadow-lg overflow-hidden
    backdrop-blur-sm`}
          >
            <div className="max-h-96 overflow-y-auto">
              {binders.map((binder) => (
                <div
                  key={binder.id}
                  className={`border-b ${theme.colors.border.light}`}
                >
                  {editingBinder?.id === binder.id ? (
                    <div className="flex items-center gap-2 p-2">
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
                        className={`flex-1 px-2 py-1 
                ${theme.colors.dropdown.input}
                border ${theme.colors.border.light}
                rounded 
                ${theme.colors.text.primary}
                text-sm
                focus:outline-none focus:ring-1 
                focus:ring-offset-1
                focus:ring-sky-500/50
                transition-colors`}
                        placeholder="Binder name..."
                      />
                      <button
                        onClick={handleSaveEdit}
                        className={`p-1 ${theme.colors.button.success} rounded`}
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingBinder(null)}
                        className={`p-1 ${theme.colors.text.secondary} 
                hover:${theme.colors.text.primary} rounded
                transition-colors`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`group flex items-center justify-between p-2 
            ${theme.colors.dropdown.hover}
            transition-colors`}
                    >
                      <button
                        onClick={() => {
                          onBinderSelect(binder);
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <Book
                          className={`w-4 h-4 ${theme.colors.text.accent}`}
                        />
                        <div>
                          <span className={theme.colors.text.primary}>
                            {binder.name}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditBinder(binder)}
                          className={`p-1 ${theme.colors.text.secondary} 
                  hover:${theme.colors.text.primary} rounded
                  transition-colors`}
                          title="Rename binder"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {binders.length > 1 && (
                          <button
                            onClick={() => handleDeleteClick(binder)}
                            className="p-1 text-red-400 hover:text-red-500 rounded transition-colors"
                            title="Delete binder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showNewBinderInput ? (
              <div className={`p-2 border-t ${theme.colors.border.light}`}>
                <div className="flex items-center gap-2">
                  <input
                    ref={newBinderInputRef}
                    type="text"
                    value={newBinderName}
                    onChange={(e) => setNewBinderName(e.target.value)}
                    onKeyPress={(e) => handleBinderKeyPress(e, "new")}
                    className={`flex-1 px-2 py-1
            ${theme.colors.dropdown.input}
            border ${theme.colors.border.light}
            rounded 
            ${theme.colors.text.primary}
            text-sm
            focus:outline-none focus:ring-1
            focus:ring-offset-1
            focus:ring-sky-500/50
            transition-colors`}
                    placeholder="New binder name..."
                  />
                  <button
                    onClick={handleCreateBinder}
                    className={`p-1 ${theme.colors.button.success} rounded`}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewBinderInput(false);
                      setNewBinderName("");
                    }}
                    className={`p-1 ${theme.colors.text.secondary} 
            hover:${theme.colors.text.primary} rounded
            transition-colors`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewBinderInput(true)}
                className={`w-full p-2 flex items-center gap-2 
        ${theme.colors.text.secondary}
        hover:${theme.colors.text.primary}
        ${theme.colors.dropdown.hover}
        transition-colors
        border-t ${theme.colors.border.light}`}
              >
                <Plus className="w-4 h-4" />
                <span>Create New Binder</span>
              </button>
            )}
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

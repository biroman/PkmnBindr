import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Book, Plus, ChevronDown, Pencil, Trash2, Save, X } from "lucide-react";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

const BinderSelector = ({
  binders,
  currentBinder,
  onBinderSelect,
  onBinderCreate,
  onBinderDelete,
  onBinderRename,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewBinderInput, setShowNewBinderInput] = useState(false);
  const [newBinderName, setNewBinderName] = useState("");
  const [editingBinder, setEditingBinder] = useState(null);
  const dropdownRef = useRef(null);
  const newBinderInputRef = useRef(null);
  const editBinderInputRef = useRef(null);
  const [binderToDelete, setBinderToDelete] = useState(null);

  const handleDeleteClick = (binder) => {
    setBinderToDelete(binder);
  };

  const handleConfirmDelete = () => {
    if (binderToDelete) {
      onBinderDelete(binderToDelete.id);
      setBinderToDelete(null);
    }
  };

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
          className="w-full px-3 py-2 bg-gray-800 text-yellow-500 
          border border-yellow-500/20 rounded-lg
          flex items-center justify-between
          hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
        >
          <div className="flex items-center gap-2">
            <Book className="w-4 h-4" />
            <span className="truncate">
              {currentBinder ? (
                <>
                  <span className="text-yellow-500">{currentBinder.name}</span>
                </>
              ) : (
                "Select or create a binder"
              )}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-yellow-500/60" />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-yellow-500/20 rounded-lg shadow-xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {binders.map((binder) => (
                <div
                  key={binder.id}
                  className="border-b border-yellow-500/10 last:border-0"
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
                        className="flex-1 px-2 py-1 bg-gray-700 border border-yellow-500/20 rounded 
    text-yellow-500 text-sm
    focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                        placeholder="Binder name..."
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 text-green-500 hover:text-green-400"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingBinder(null)}
                        className="p-1 text-yellow-500/60 hover:text-yellow-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 hover:bg-gray-700/50">
                      <button
                        onClick={() => {
                          onBinderSelect(binder);
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <Book className="w-4 h-4 text-yellow-500/60" />
                        <div>
                          <span className="text-yellow-500">{binder.name}</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditBinder(binder)}
                          className="p-1 text-yellow-500/60 hover:text-yellow-500"
                          title="Rename binder"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {binders.length > 1 && (
                          <button
                            onClick={() => handleDeleteClick(binder)}
                            className="p-1 text-red-500/60 hover:text-red-500"
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
              <div className="p-2 border-t border-yellow-500/10">
                <div className="flex items-center gap-2">
                  <input
                    ref={newBinderInputRef}
                    type="text"
                    value={newBinderName}
                    onChange={(e) => setNewBinderName(e.target.value)}
                    onKeyPress={(e) => handleBinderKeyPress(e, "new")}
                    className="flex-1 px-2 py-1 bg-gray-700 border border-yellow-500/20 rounded 
    text-yellow-500 text-sm
    focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    placeholder="New binder name..."
                  />
                  <button
                    onClick={handleCreateBinder}
                    className="p-1 text-green-500 hover:text-green-400"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewBinderInput(false);
                      setNewBinderName("");
                    }}
                    className="p-1 text-yellow-500/60 hover:text-yellow-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewBinderInput(true)}
                className="w-full p-2 flex items-center gap-2 text-yellow-500/60 
                hover:text-yellow-500 hover:bg-gray-700/50
                border-t border-yellow-500/10"
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

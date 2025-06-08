import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBinderContext } from "../contexts/BinderContext";
import {
  PlusIcon,
  FolderIcon,
  EyeIcon,
  TrashIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const BindersPage = () => {
  const navigate = useNavigate();
  const {
    binders,
    currentBinder,
    isLoading,
    createBinder,
    deleteBinder,
    selectBinder,
  } = useBinderContext();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBinderName, setNewBinderName] = useState("");
  const [newBinderDescription, setNewBinderDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBinder = async (e) => {
    e.preventDefault();
    if (!newBinderName.trim()) return;

    try {
      setIsCreating(true);
      await createBinder(newBinderName, newBinderDescription);
      setNewBinderName("");
      setNewBinderDescription("");
      setShowCreateForm(false);
    } catch (error) {
      // Error handled by context
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectBinder = (binder) => {
    navigate(`/binder/${binder.id}`);
  };

  const handleDeleteBinder = async (binderId, binderName) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${binderName}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteBinder(binderId);
      } catch (error) {
        // Error handled by context
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div>Loading binders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Binders</h1>
          <p className="text-slate-300">Manage your Pokemon card collections</p>
        </div>

        {/* Current Binder Info */}
        {currentBinder && (
          <div className="bg-blue-600 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <div className="font-semibold">
                  Current Binder: {currentBinder.metadata.name}
                </div>
                <div className="text-blue-100 text-sm">
                  {Object.keys(currentBinder.cards || {}).length} cards • Last
                  updated{" "}
                  {new Date(currentBinder.lastModified).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => navigate(`/binder/${currentBinder.id}`)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Open Binder
              </button>
            </div>
          </div>
        )}

        {/* Create New Binder */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-colors group"
            >
              <PlusIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
              <span className="text-slate-600 group-hover:text-blue-600 font-medium">
                Create New Binder
              </span>
            </button>
          ) : (
            <form onSubmit={handleCreateBinder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Binder Name
                </label>
                <input
                  type="text"
                  value={newBinderName}
                  onChange={(e) => setNewBinderName(e.target.value)}
                  placeholder="My Pokemon Collection"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newBinderDescription}
                  onChange={(e) => setNewBinderDescription(e.target.value)}
                  placeholder="Description of your collection..."
                  rows="3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={isCreating || !newBinderName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg transition-colors"
                >
                  {isCreating ? "Creating..." : "Create Binder"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBinderName("");
                    setNewBinderDescription("");
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Binders Grid */}
        {binders.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No Binders Yet
            </h3>
            <p className="text-slate-300 mb-4">
              Create your first binder to start organizing your Pokemon cards
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Your First Binder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {binders.map((binder) => (
              <div
                key={binder.id}
                className={`
                  bg-white rounded-lg shadow-lg p-6 transition-all hover:shadow-xl
                  ${
                    currentBinder?.id === binder.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  }
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {binder.metadata.name}
                    </h3>
                    {binder.metadata.description && (
                      <p className="text-sm text-slate-600 mb-2">
                        {binder.metadata.description}
                      </p>
                    )}
                  </div>
                  {currentBinder?.id === binder.id && (
                    <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      Current
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-800">
                      {Object.keys(binder.cards || {}).length}
                    </div>
                    <div className="text-xs text-slate-600">Cards</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-800">
                      {binder.version}
                    </div>
                    <div className="text-xs text-slate-600">Version</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSelectBinder(binder)}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <EyeIcon className="w-4 h-4" />
                    <span>Open</span>
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteBinder(binder.id, binder.metadata.name)
                    }
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Metadata */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    Created{" "}
                    {new Date(binder.metadata.createdAt).toLocaleDateString()}
                  </div>
                  {binder.lastModified !== binder.metadata.createdAt && (
                    <div className="text-xs text-slate-500">
                      Updated{" "}
                      {new Date(binder.lastModified).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {binders.length > 0 && (
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => navigate("/browse")}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Browse Cards to Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BindersPage;

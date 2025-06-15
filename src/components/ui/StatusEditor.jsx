import { useState, useRef, useEffect } from "react";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { UserStatusService } from "../../services/UserStatusService";

const StatusEditor = ({
  user,
  onStatusUpdate,
  className = "",
  placeholder = "Set a status...",
  compact = false,
  showEditButton = true,
  editTrigger = null,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [statusText, setStatusText] = useState(user?.customStatus || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef(null);

  // Update local state when user prop changes
  useEffect(() => {
    setStatusText(user?.customStatus || "");
  }, [user?.customStatus]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setStatusText(user?.customStatus || "");
  };

  // Allow external components to trigger edit mode
  useEffect(() => {
    if (editTrigger && editTrigger > 0) {
      handleStartEdit();
    }
  }, [editTrigger]);

  const handleCancel = () => {
    setIsEditing(false);
    setStatusText(user?.customStatus || "");
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    setIsUpdating(true);
    try {
      const success = await UserStatusService.updateUserStatus(
        user.uid,
        statusText
      );

      if (success) {
        setIsEditing(false);
        // Callback to parent component
        if (onStatusUpdate) {
          onStatusUpdate(statusText.trim() || null);
        }
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const charInfo = UserStatusService.getCharacterInfo(statusText);
  const currentStatus = user?.customStatus;

  if (compact) {
    // Compact version for dropdown
    return (
      <div className={className}>
        {isEditing ? (
          <div className="space-y-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  charInfo.isOverLimit ? "border-red-500" : "border-gray-300"
                }`}
                maxLength={UserStatusService.MAX_STATUS_LENGTH + 10}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  charInfo.isOverLimit
                    ? "text-red-500"
                    : charInfo.isNearLimit
                    ? "text-yellow-600"
                    : "text-gray-500"
                }
              >
                {charInfo.current}/{charInfo.max}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleSave}
                  disabled={isUpdating || charInfo.isOverLimit}
                  className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save"
                >
                  {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="p-1 text-gray-500 hover:bg-gray-50 rounded disabled:opacity-50"
                  title="Cancel"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors group"
          >
            <PencilIcon className="w-4 h-4 mr-3 text-gray-400 group-hover:text-gray-600" />
            <div className="flex-1 min-w-0">
              {currentStatus ? (
                <span className="truncate">{currentStatus}</span>
              ) : (
                <span className="text-gray-500 italic">{placeholder}</span>
              )}
            </div>
          </button>
        )}
      </div>
    );
  }

  // Full version for profile page
  return (
    <div className={className}>
      {isEditing ? (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                charInfo.isOverLimit ? "border-red-500" : "border-gray-300"
              }`}
              rows={2}
              maxLength={UserStatusService.MAX_STATUS_LENGTH + 10}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${
                charInfo.isOverLimit
                  ? "text-red-500"
                  : charInfo.isNearLimit
                  ? "text-yellow-600"
                  : "text-gray-500"
              }`}
            >
              {charInfo.current}/{charInfo.max} characters
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUpdating || charInfo.isOverLimit}
                className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isUpdating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Status"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="group">
          <div
            className={`flex items-start ${
              showEditButton ? "justify-between" : ""
            }`}
          >
            <div className="flex-1">
              {currentStatus ? (
                <p className="text-sm text-gray-700 break-words">
                  {currentStatus}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  {placeholder || "No status set"}
                </p>
              )}
            </div>
            {showEditButton && (
              <button
                onClick={handleStartEdit}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                title="Edit status"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusEditor;

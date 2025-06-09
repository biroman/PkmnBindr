import {
  ExclamationTriangleIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const DeleteBinderModal = ({
  isOpen,
  onClose,
  onConfirm,
  binderName,
  cardCount,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[70] flex items-center justify-center p-6"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Delete Binder?
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-slate-700 mb-4">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900">"{binderName}"</span>
            ?
          </p>

          {cardCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800 mb-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="font-medium">Warning</span>
              </div>
              <p className="text-sm text-orange-700">
                This binder contains{" "}
                <span className="font-semibold">
                  {cardCount} card{cardCount !== 1 ? "s" : ""}
                </span>
                . All cards and data will be permanently deleted from both this
                device and the cloud.
              </p>
            </div>
          )}

          <p className="text-sm text-slate-600 mt-4">
            The binder will be removed from both your local device and your
            cloud account.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <TrashIcon className="w-4 h-4" />
            )}
            {isLoading ? "Deleting..." : "Delete Binder"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteBinderModal;

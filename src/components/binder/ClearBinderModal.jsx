import {
  ExclamationTriangleIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const ClearBinderModal = ({
  isOpen,
  onClose,
  onConfirm,
  binderName,
  cardCount,
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
                Clear Entire Binder?
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <TrashIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">
                  You are about to permanently delete ALL cards from:
                </p>
                <p className="text-red-700 font-bold text-lg mt-1">
                  "{binderName}"
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Cards to be deleted:</span>
              <span className="font-bold text-slate-900 text-lg">
                {cardCount} {cardCount === 1 ? "card" : "cards"}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              This will also clear any missing card tracking
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm font-medium flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              This action is permanent and cannot be undone
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Clear All Cards
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearBinderModal;

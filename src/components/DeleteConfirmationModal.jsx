import { X } from "lucide-react";
import PropTypes from "prop-types";

const DeleteConfirmationModal = ({ binderName, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full m-4 shadow-2xl border border-yellow-500/20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-500">Delete Binder</h2>
          <button
            onClick={onCancel}
            className="text-yellow-500/60 hover:text-yellow-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-yellow-500/80 mb-6">
          Are you sure you want to delete{" "}
          <span className="font-semibold pb-6">{binderName}</span>? This action
          cannot be undone.
        </p>

        <div className="flex justify-end gap-4">
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg 
              hover:bg-red-600 
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900
              shadow-lg shadow-red-500/20
              transition-all duration-200
              font-semibold"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-800 text-yellow-500 rounded-lg 
              hover:bg-gray-700 border border-yellow-500/20
              focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900
              transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

DeleteConfirmationModal.propTypes = {
  binderName: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default DeleteConfirmationModal;

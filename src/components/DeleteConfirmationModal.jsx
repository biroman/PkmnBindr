import { X } from "lucide-react";
import PropTypes from "prop-types";
import { useTheme } from "../theme/ThemeContent";

const DeleteConfirmationModal = ({ binderName, onConfirm, onCancel }) => {
  const { theme } = useTheme();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className={`${theme.colors.background.sidebar} rounded-2xl p-6 max-w-md w-full m-4 shadow-2xl border ${theme.colors.border.accent}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-bold ${theme.colors.text.accent}`}>
            Delete Binder
          </h2>
          <button
            onClick={onCancel}
            className={`${theme.colors.text.secondary} hover:${theme.colors.text.accent} transition-colors`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className={`${theme.colors.text.secondary} mb-6`}>
          Are you sure you want to delete{" "}
          <span className="font-semibold">{binderName}</span>? This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg
              hover:bg-red-600
              focus:outline-none focus:ring-2 focus:ring-offset-2
              shadow-lg shadow-red-500/20
              transition-all duration-200
              font-semibold"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2
              transition-colors duration-200
              border ${theme.colors.border.accent}
              ${theme.colors.button.secondary}`}
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

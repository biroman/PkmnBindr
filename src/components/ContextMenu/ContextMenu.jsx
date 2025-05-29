import { useEffect, useRef } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";
import PropTypes from "prop-types";

const ContextMenu = ({
  isVisible,
  position,
  onClose,
  onAddPage,
  onRemovePage,
  currentBinder,
  currentPage = 0,
}) => {
  const { theme } = useTheme();
  const menuRef = useRef(null);

  // Close menu when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, onClose]);

  // Don't render if not visible
  if (!isVisible) return null;

  const handleAddPage = () => {
    onAddPage();
    onClose();
  };

  const handleRemovePage = () => {
    onRemovePage();
    onClose();
  };

  const menuItems = [
    {
      id: "add-page",
      label: "Add Page",
      icon: Plus,
      action: handleAddPage,
      disabled: !currentBinder || currentBinder.binderType !== "custom",
      description: "Add a new book page",
    },
    {
      id: "remove-page",
      label: "Remove Page",
      icon: Trash2,
      action: handleRemovePage,
      disabled:
        !currentBinder ||
        currentBinder.binderType !== "custom" ||
        currentPage <= 0,
      description:
        currentPage <= 0
          ? "Cannot remove cover page"
          : "Remove the current page",
    },
  ];

  return (
    <div
      ref={menuRef}
      className={`
        fixed z-50 min-w-48
        ${theme.colors.background.card}
        border ${theme.colors.border.accent}
        rounded-lg shadow-xl
        py-2
        animate-in fade-in duration-200
      `}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Header */}
      <div className={`px-3 py-2 border-b ${theme.colors.border.light}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-medium ${theme.colors.text.primary}`}>
            Binder Actions
          </h3>
          <button
            onClick={onClose}
            className={`w-4 h-4 rounded ${theme.colors.button.secondary} flex items-center justify-center hover:scale-110 transition-transform`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-3 space-y-2">
        {menuItems.map((item) => {
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              onClick={item.action}
              disabled={item.disabled}
              className={`
                w-full px-4 py-3 text-left flex items-center gap-3
                rounded-lg transition-all duration-200 group
                ${
                  item.disabled
                    ? `${theme.colors.text.secondary} opacity-50 cursor-not-allowed ${theme.colors.background.card} border ${theme.colors.border.light}`
                    : `${theme.colors.text.primary} cursor-pointer hover:${theme.colors.background.sidebar} ${theme.colors.button.secondary} border ${theme.colors.border.accent} hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50`
                }
              `}
            >
              <IconComponent
                className={`w-5 h-5 flex-shrink-0 ${
                  item.disabled
                    ? ""
                    : "group-hover:scale-110 transition-transform duration-200"
                }`}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{item.label}</div>
                {item.description && (
                  <div
                    className={`text-xs ${theme.colors.text.secondary} opacity-75 mt-0.5`}
                  >
                    {item.description}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {currentBinder?.binderType !== "custom" && (
        <div className={`px-3 py-2 border-t ${theme.colors.border.light}`}>
          <div className={`text-xs ${theme.colors.text.secondary} opacity-75`}>
            Page actions are only available for custom binders
          </div>
        </div>
      )}
    </div>
  );
};

ContextMenu.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onAddPage: PropTypes.func.isRequired,
  onRemovePage: PropTypes.func.isRequired,
  currentBinder: PropTypes.shape({
    id: PropTypes.string,
    binderType: PropTypes.string,
  }),
  currentPage: PropTypes.number,
};

export default ContextMenu;

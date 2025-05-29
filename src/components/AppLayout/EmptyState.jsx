import { Grid3X3, FolderOpen } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";

const EmptyState = ({ currentBinder, onShowSidebar }) => {
  const { theme } = useTheme();

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-md">
        <div
          className={`w-16 h-16 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center`}
        >
          {currentBinder ? (
            <Grid3X3 className={`w-8 h-8 ${theme.colors.text.accent}`} />
          ) : (
            <FolderOpen className={`w-8 h-8 ${theme.colors.text.accent}`} />
          )}
        </div>
        <div>
          <h2
            className={`text-2xl font-bold ${theme.colors.text.primary} mb-2`}
          >
            {currentBinder ? "Select a Set" : "Get Started"}
          </h2>
          <p className={`${theme.colors.text.secondary} leading-relaxed`}>
            {currentBinder
              ? "Choose a Pokemon set from the sidebar to start tracking your collection"
              : "Create a new binder or select an existing one to begin organizing your Pokemon card collection"}
          </p>
        </div>
        {!currentBinder && (
          <button
            onClick={onShowSidebar}
            className={`px-6 py-3 rounded-xl ${theme.colors.button.primary} font-medium`}
          >
            Catch &apos;em all!
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;

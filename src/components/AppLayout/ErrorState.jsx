import { AlertTriangle, FolderX, ArrowLeft } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";

const ErrorState = ({
  error,
  onRetry = null,
  onGoBack = null,
  showSuggestions = true,
}) => {
  const { theme } = useTheme();

  const getErrorIcon = () => {
    switch (error?.type) {
      case "binder_not_found":
        return <FolderX className={`w-8 h-8 ${theme.colors.text.accent}`} />;
      default:
        return (
          <AlertTriangle className={`w-8 h-8 ${theme.colors.text.accent}`} />
        );
    }
  };

  const getErrorTitle = () => {
    switch (error?.type) {
      case "binder_not_found":
        return "Binder Not Found";
      default:
        return "Something went wrong";
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-md">
        <div
          className={`w-16 h-16 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center`}
        >
          {getErrorIcon()}
        </div>

        <div>
          <h2
            className={`text-2xl font-bold ${theme.colors.text.primary} mb-2`}
          >
            {getErrorTitle()}
          </h2>

          {error?.message && (
            <p
              className={`${theme.colors.text.secondary} leading-relaxed mb-4`}
            >
              {error.message}
            </p>
          )}
        </div>

        {showSuggestions && error?.suggestions && (
          <div
            className={`${theme.colors.background.card} rounded-lg p-4 text-left`}
          >
            <h3
              className={`text-sm font-medium ${theme.colors.text.primary} mb-3`}
            >
              Try these solutions:
            </h3>
            <ul className="space-y-2">
              {error.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className={`text-sm ${theme.colors.text.secondary} flex items-start gap-2`}
                >
                  <span className={`${theme.colors.text.accent} mt-1`}>•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          {onGoBack && (
            <button
              onClick={onGoBack}
              className={`px-4 py-2 rounded-lg ${theme.colors.button.secondary} font-medium flex items-center gap-2 transition-all duration-200 hover:scale-105`}
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className={`px-4 py-2 rounded-lg ${theme.colors.button.primary} font-medium transition-all duration-200 hover:scale-105`}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;

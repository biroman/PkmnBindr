import { Loader2 } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";

const RouteLoader = ({
  message = "Loading...",
  fullScreen = false,
  size = "default",
}) => {
  const { theme } = useTheme();

  const sizeClasses = {
    small: "w-4 h-4",
    default: "w-8 h-8",
    large: "w-12 h-12",
  };

  const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex items-center justify-center">
        <Loader2
          className={`${sizeClasses[size]} ${theme.colors.text.accent} animate-spin`}
        />
      </div>
      <div className="text-center">
        <p className={`text-sm font-medium ${theme.colors.text.primary}`}>
          {message}
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={`
        fixed inset-0 z-50 
        ${theme.colors.background.main} 
        flex items-center justify-center
      `}
      >
        <LoadingContent />
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-8">
      <LoadingContent />
    </div>
  );
};

// Specific loading states for different route scenarios
export const BinderLoader = () => (
  <RouteLoader message="Loading binder..." size="large" />
);

export const SetLoader = () => (
  <RouteLoader message="Loading card set..." size="default" />
);

export const PageLoader = () => (
  <RouteLoader message="Loading page..." size="small" />
);

export const AppLoader = () => (
  <RouteLoader message="Initializing PkmnBindr..." size="large" fullScreen />
);

export default RouteLoader;

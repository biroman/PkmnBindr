import React from "react";

/**
 * Reusable loading spinner component for admin interfaces
 *
 * @param {Object} props - Component props
 * @param {string} props.size - Size variant ('sm', 'md', 'lg', 'xl')
 * @param {string} props.message - Loading message to display
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.fullScreen - Whether to render as full screen overlay
 * @returns {JSX.Element} Loading spinner component
 */
const LoadingSpinner = ({
  size = "md",
  message = "Loading...",
  className = "",
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  const spinnerElement = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div
        className={`
          ${sizeClasses[size]} 
          border-2 border-current border-t-transparent 
          rounded-full animate-spin text-blue-600
        `}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className={`${textSizeClasses[size]} font-medium text-gray-600`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

export default LoadingSpinner;

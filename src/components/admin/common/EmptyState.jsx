import React from "react";

/**
 * Reusable empty state component for admin interfaces
 *
 * @param {Object} props - Component props
 * @param {React.ComponentType} props.icon - Icon component to display
 * @param {string} props.title - Primary message title
 * @param {string} props.description - Secondary description text
 * @param {React.ReactNode} props.action - Optional action button or element
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Empty state component
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div className={`text-center py-8 sm:py-12 ${className}`}>
      {Icon && (
        <Icon className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4" />
      )}

      {title && (
        <h3 className="text-sm sm:text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>
      )}

      {description && (
        <p className="text-xs sm:text-sm text-gray-500 mb-4 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;

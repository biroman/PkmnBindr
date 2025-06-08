import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Alert = forwardRef(
  ({ className, variant = "default", ...props }, ref) => {
    const baseClasses = "relative w-full rounded-lg border p-4";

    const variants = {
      default: "bg-white text-gray-900 border-gray-200",
      destructive: "border-red-200 text-red-700 bg-red-50",
      success: "border-green-200 text-green-700 bg-green-50",
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(baseClasses, variants[variant], className)}
        {...props}
      />
    );
  }
);

Alert.displayName = "Alert";

const AlertDescription = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed", className)}
    {...props}
  />
));

AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };

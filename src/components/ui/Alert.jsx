import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Alert = forwardRef(
  ({ className, variant = "default", ...props }, ref) => {
    const baseClasses = "relative w-full rounded-lg border p-4";

    const variants = {
      default: "bg-card-background text-text-primary border-border",
      destructive:
        "border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950",
      success:
        "border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950",
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

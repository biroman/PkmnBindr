import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useRules } from "../../contexts/RulesContext";
import { contactService } from "../../services/ContactService";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

// Validation schemas
const messageSchema = z.object({
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message too long"),
});

const featureRequestSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title too long"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description too long"),
});

const bugReportSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title too long"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description too long"),
  priority: z.enum(["low", "medium", "high"]),
});

const ContactModal = ({ isOpen, onClose, type = "message" }) => {
  const { user } = useAuth();
  const rules = useRules();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [rateLimits, setRateLimits] = useState({
    directMessages: { allowed: true, remaining: null, resetTime: null },
    featureRequests: { allowed: true, remaining: null, resetTime: null },
    bugReports: { allowed: true, remaining: null, resetTime: null },
  });

  // Get the appropriate schema and form based on type
  const getSchema = () => {
    switch (type) {
      case "bug":
        return bugReportSchema;
      case "feature":
        return featureRequestSchema;
      default:
        return messageSchema;
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: type === "bug" ? { priority: "medium" } : {},
  });

  // Prevent keyboard shortcuts from triggering in background
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Prevent all keyboard events from bubbling up when modal is open
      // This prevents BinderPage shortcuts from triggering
      e.stopPropagation();

      // Allow ESC key to close the modal
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown, true); // Use capture phase

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Check rate limits when modal opens
  useEffect(() => {
    if (isOpen && user && rules) {
      checkRateLimits();
    }
  }, [isOpen, user, rules]);

  // Reset form when modal closes or type changes
  useEffect(() => {
    if (!isOpen) {
      form.reset(type === "bug" ? { priority: "medium" } : {});
      setShowSuccess(false);
    }
  }, [isOpen, type, form]);

  const checkRateLimits = async () => {
    try {
      const actions = {
        message: "send_direct_message",
        feature: "submit_feature_request",
        bug: "submit_bug_report",
      };

      const result = await rules.canPerformAction(actions[type]);
      setRateLimits((prev) => ({
        ...prev,
        [type === "message"
          ? "directMessages"
          : type === "feature"
          ? "featureRequests"
          : "bugReports"]: result,
      }));
    } catch (error) {
      console.error("Error checking rate limits:", error);
    }
  };

  const handleSubmit = async (data) => {
    if (!user) {
      // Handle guest users
      alert("Please sign in to submit feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      switch (type) {
        case "bug":
          await contactService.submitBugReport(
            user.uid,
            user.displayName,
            data.title,
            data.description,
            data.priority,
            rules
          );
          break;
        case "feature":
          await contactService.submitFeatureRequest(
            user.uid,
            user.displayName,
            data.title,
            data.description,
            rules
          );
          break;
        default:
          await contactService.sendDirectMessage(
            user.uid,
            user.displayName,
            user.email,
            data.message,
            rules
          );
      }

      // Show success animation
      setShowSuccess(true);
      form.reset(type === "bug" ? { priority: "medium" } : {});

      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 3000);
    } catch (error) {
      console.error(`Error submitting ${type}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalConfig = () => {
    switch (type) {
      case "bug":
        return {
          title: "Report a Bug",
          emoji: "🐛",
          successMessage:
            "Your bug report was sent! Thanks for making the website better!",
          color: "red",
        };
      case "feature":
        return {
          title: "Request a Feature",
          emoji: "✨",
          successMessage:
            "Your feature request was sent! Thanks for helping us improve!",
          color: "green",
        };
      default:
        return {
          title: "Send Feedback",
          emoji: "💭",
          successMessage:
            "Your feedback was sent! Thanks for making the website better!",
          color: "blue",
        };
    }
  };

  const config = getModalConfig();
  const currentRateLimit =
    rateLimits[
      type === "message"
        ? "directMessages"
        : type === "feature"
        ? "featureRequests"
        : "bugReports"
    ];

  if (!isOpen) return null;

  // Handler to prevent event propagation on the modal content
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={handleModalClick}
      >
        {/* Success State */}
        {showSuccess ? (
          <div className="p-8 text-center">
            <div className="mb-4">
              <CheckCircleIcon className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Success! {config.emoji}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {config.successMessage}
              </p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all duration-[3000ms] ease-linear"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.emoji}</span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {config.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!user ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Please sign in to submit feedback
                  </p>
                  <Button onClick={onClose}>Close</Button>
                </div>
              ) : !currentRateLimit?.allowed ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {currentRateLimit?.reason ||
                      "Rate limit exceeded. Please try again later."}
                  </p>
                  <Button onClick={onClose}>Close</Button>
                </div>
              ) : (
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-4"
                >
                  {type === "message" ? (
                    <div>
                      <Label htmlFor="message">Your Message</Label>
                      <textarea
                        id="message"
                        {...form.register("message")}
                        rows={6}
                        placeholder="Tell us what's on your mind..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      {form.formState.errors.message && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                          {form.formState.errors.message.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          {...form.register("title")}
                          placeholder={`Brief ${
                            type === "bug" ? "bug" : "feature"
                          } description`}
                        />
                        {form.formState.errors.title && (
                          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                            {form.formState.errors.title.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <textarea
                          id="description"
                          {...form.register("description")}
                          rows={4}
                          placeholder={`Detailed ${
                            type === "bug"
                              ? "steps to reproduce the bug"
                              : "description of the feature"
                          }`}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        {form.formState.errors.description && (
                          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                            {form.formState.errors.description.message}
                          </p>
                        )}
                      </div>

                      {type === "bug" && (
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <select
                            id="priority"
                            {...form.register("priority")}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="low">Low - Minor issue</option>
                            <option value="medium">
                              Medium - Affects functionality
                            </option>
                            <option value="high">
                              High - Breaks core features
                            </option>
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Discord Alternative */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Need a faster response?
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Join our Discord community for real-time support and
                          quicker responses from our development team.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              "https://discord.gg/HYB88JAZhU",
                              "_blank"
                            )
                          }
                          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50 border border-blue-300 dark:border-blue-700 rounded-md transition-colors duration-200"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z" />
                          </svg>
                          Open Discord
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ContactModal;

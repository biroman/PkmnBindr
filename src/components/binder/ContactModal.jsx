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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={handleModalClick}
      >
        {/* Success State */}
        {showSuccess ? (
          <div className="p-8 text-center">
            <div className="mb-4">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Success! {config.emoji}
              </h3>
              <p className="text-gray-600">{config.successMessage}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-[3000ms] ease-linear"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.emoji}</span>
                <h2 className="text-xl font-bold text-gray-900">
                  {config.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!user ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    Please sign in to submit feedback
                  </p>
                  <Button onClick={onClose}>Close</Button>
                </div>
              ) : !currentRateLimit?.allowed ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      {form.formState.errors.message && (
                        <p className="text-red-600 text-sm mt-1">
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
                          <p className="text-red-600 text-sm mt-1">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                        {form.formState.errors.description && (
                          <p className="text-red-600 text-sm mt-1">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

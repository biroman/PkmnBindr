import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRules } from "../contexts/RulesContext";
import { contactService } from "../services/ContactService";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { Crown } from "lucide-react";

// Validation schemas
const directMessageSchema = z.object({
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

const ContactPage = () => {
  const { user } = useAuth();
  const rules = useRules();
  const [activeTab, setActiveTab] = useState("message");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimits, setRateLimits] = useState({
    directMessages: { allowed: true, remaining: null, resetTime: null },
    featureRequests: { allowed: true, remaining: null, resetTime: null },
    bugReports: { allowed: true, remaining: null, resetTime: null },
  });
  const [userHistory, setUserHistory] = useState({
    messages: null,
    featureRequests: [],
    bugReports: [],
    indexBuilding: false,
  });

  // Form setups for each type
  const messageForm = useForm({
    resolver: zodResolver(directMessageSchema),
  });

  const featureForm = useForm({
    resolver: zodResolver(featureRequestSchema),
  });

  const bugForm = useForm({
    resolver: zodResolver(bugReportSchema),
    defaultValues: { priority: "medium" },
  });

  // Check rate limits on component mount and user change
  useEffect(() => {
    if (user && rules) {
      checkAllRateLimits();
    }
  }, [user, rules]);

  // Load user's previous messages/requests on mount
  useEffect(() => {
    if (user) {
      loadUserHistory();
    }
  }, [user]);

  const checkAllRateLimits = async () => {
    try {
      const [messageLimit, featureLimit, bugLimit] = await Promise.all([
        rules.canPerformAction("send_direct_message"),
        rules.canPerformAction("submit_feature_request"),
        rules.canPerformAction("submit_bug_report"),
      ]);

      setRateLimits({
        directMessages: messageLimit,
        featureRequests: featureLimit,
        bugReports: bugLimit,
      });
    } catch (error) {
      console.error("Error checking rate limits:", error);
    }
  };

  const loadUserHistory = async () => {
    try {
      const [messageThread, featureRequests, bugReports] = await Promise.all([
        contactService.getUserMessageThread(user.uid),
        contactService.getUserFeatureRequests(user.uid),
        contactService.getUserBugReports(user.uid),
      ]);

      setUserHistory({
        messages: messageThread,
        featureRequests: featureRequests.indexBuilding ? [] : featureRequests,
        bugReports: bugReports.indexBuilding ? [] : bugReports,
        indexBuilding:
          featureRequests.indexBuilding || bugReports.indexBuilding,
      });
    } catch (error) {
      console.error("Error loading user history:", error);
      // Set empty state if there's an error
      setUserHistory({
        messages: null,
        featureRequests: [],
        bugReports: [],
        indexBuilding: false,
      });
    }
  };

  // Submit handlers
  const handleDirectMessage = async (data) => {
    setIsSubmitting(true);
    try {
      await contactService.sendDirectMessage(
        user.uid,
        user.displayName,
        user.email,
        data.message,
        rules
      );
      messageForm.reset();
      await Promise.all([loadUserHistory(), checkAllRateLimits()]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeatureRequest = async (data) => {
    setIsSubmitting(true);
    try {
      await contactService.submitFeatureRequest(
        user.uid,
        user.displayName,
        data.title,
        data.description,
        rules
      );
      featureForm.reset();
      await Promise.all([loadUserHistory(), checkAllRateLimits()]);
    } catch (error) {
      console.error("Error submitting feature request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBugReport = async (data) => {
    setIsSubmitting(true);
    try {
      await contactService.submitBugReport(
        user.uid,
        user.displayName,
        data.title,
        data.description,
        data.priority,
        rules
      );
      bugForm.reset({ priority: "medium" });
      await Promise.all([loadUserHistory(), checkAllRateLimits()]);
    } catch (error) {
      console.error("Error submitting bug report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatResetTime = (resetTime) => {
    if (!resetTime) return "";

    const resetDate = new Date(resetTime);
    const now = new Date();
    const diffMs = resetDate - now;

    if (diffMs <= 0) return "Available now";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `Resets in ${diffHours}h ${diffMinutes}m`;
    } else {
      return `Resets in ${diffMinutes}m`;
    }
  };

  const RateLimitInfo = ({ limitInfo, action }) => {
    if (limitInfo.allowed && limitInfo.remaining === null) {
      return null; // No rate limiting active
    }

    return (
      <div
        className={`mt-2 p-3 rounded-lg text-sm ${
          limitInfo.allowed
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}
      >
        {limitInfo.allowed ? (
          <div className="flex items-center justify-between">
            <span>✅ Available: {limitInfo.remaining} remaining</span>
            {limitInfo.resetTime && (
              <span className="text-xs">
                {formatResetTime(limitInfo.resetTime)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span>⏱️ {limitInfo.reason || "Rate limit reached"}</span>
            {limitInfo.resetTime && (
              <span className="text-xs">
                {formatResetTime(limitInfo.resetTime)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Sign In Required
          </h2>
          <p className="text-gray-600 mb-6">Please sign in to contact us.</p>
          <Button onClick={() => (window.location.href = "/auth/login")}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8 sm:px-8 sm:py-12">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Contact Us
              </h1>
              <p className="text-lg text-gray-600">
                We'd love to hear from you! Get in touch with questions, feature
                ideas, or report issues.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-8">
              <button
                onClick={() => setActiveTab("message")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "message"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                💬 Feedback
                {!rateLimits.directMessages.allowed && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Limited
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("feature")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "feature"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                💡 Feature Request
                {!rateLimits.featureRequests.allowed && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Limited
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("bug")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "bug"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                🐛 Report Bug
                {!rateLimits.bugReports.allowed && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Limited
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                📋 My History
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "message" && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    Send us a direct message
                  </h3>
                  <p className="text-blue-700">
                    Have some feedback, suggestion, or just want to say hello?
                    Send us a message!
                  </p>
                </div>

                <RateLimitInfo
                  limitInfo={rateLimits.directMessages}
                  action="send_direct_message"
                />

                <form
                  onSubmit={messageForm.handleSubmit(handleDirectMessage)}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="message">Your Message</Label>
                    <textarea
                      id="message"
                      rows={6}
                      placeholder="Tell us what's on your mind..."
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        messageForm.formState.errors.message
                          ? "border-red-500"
                          : ""
                      }`}
                      {...messageForm.register("message")}
                    />
                    {messageForm.formState.errors.message && (
                      <p className="text-sm text-red-600">
                        {messageForm.formState.errors.message.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      isSubmitting || !rateLimits.directMessages.allowed
                    }
                    className="w-full"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </div>
            )}

            {activeTab === "feature" && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-green-900 mb-2">
                    Request a new feature
                  </h3>
                  <p className="text-green-700">
                    Have an idea for improving pkmnbindr? We'd love to hear it!
                    Submit your feature requests and help us make the app
                    better.
                  </p>
                </div>

                <RateLimitInfo
                  limitInfo={rateLimits.featureRequests}
                  action="submit_feature_request"
                />

                <form
                  onSubmit={featureForm.handleSubmit(handleFeatureRequest)}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="featureTitle">Feature Title</Label>
                    <Input
                      id="featureTitle"
                      placeholder="Brief title for your feature idea"
                      className={
                        featureForm.formState.errors.title
                          ? "border-red-500"
                          : ""
                      }
                      {...featureForm.register("title")}
                    />
                    {featureForm.formState.errors.title && (
                      <p className="text-sm text-red-600">
                        {featureForm.formState.errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="featureDescription">Description</Label>
                    <textarea
                      id="featureDescription"
                      rows={6}
                      placeholder="Describe your feature idea in detail. What would it do? How would it help?"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        featureForm.formState.errors.description
                          ? "border-red-500"
                          : ""
                      }`}
                      {...featureForm.register("description")}
                    />
                    {featureForm.formState.errors.description && (
                      <p className="text-sm text-red-600">
                        {featureForm.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      isSubmitting || !rateLimits.featureRequests.allowed
                    }
                    className="w-full"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Feature Request"}
                  </Button>
                </form>
              </div>
            )}

            {activeTab === "bug" && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-900 mb-2">
                    Report a bug
                  </h3>
                  <p className="text-red-700">
                    Found something that's not working correctly? Let us know!
                    The more details you provide, the faster we can fix it.
                  </p>
                </div>

                <RateLimitInfo
                  limitInfo={rateLimits.bugReports}
                  action="submit_bug_report"
                />

                <form
                  onSubmit={bugForm.handleSubmit(handleBugReport)}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="bugTitle">Bug Title</Label>
                    <Input
                      id="bugTitle"
                      placeholder="Brief description of the issue"
                      className={
                        bugForm.formState.errors.title ? "border-red-500" : ""
                      }
                      {...bugForm.register("title")}
                    />
                    {bugForm.formState.errors.title && (
                      <p className="text-sm text-red-600">
                        {bugForm.formState.errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bugDescription">Description</Label>
                    <textarea
                      id="bugDescription"
                      rows={6}
                      placeholder="What happened? What were you trying to do? What did you expect to happen instead?"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        bugForm.formState.errors.description
                          ? "border-red-500"
                          : ""
                      }`}
                      {...bugForm.register("description")}
                    />
                    {bugForm.formState.errors.description && (
                      <p className="text-sm text-red-600">
                        {bugForm.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <select
                      id="priority"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...bugForm.register("priority")}
                    >
                      <option value="low">
                        Low - Minor issue, doesn't prevent usage
                      </option>
                      <option value="medium">
                        Medium - Noticeable issue, workaround available
                      </option>
                      <option value="high">
                        High - Major issue, prevents normal usage
                      </option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !rateLimits.bugReports.allowed}
                    className="w-full"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Bug Report"}
                  </Button>
                </form>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Your Contact History
                  </h3>
                  <p className="text-gray-600">
                    Here's a summary of your previous messages and requests.
                  </p>
                  {userHistory.indexBuilding && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-center gap-2 text-blue-700">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium">
                          Setting up your history... This may take a few
                          minutes.
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        You can still submit new messages and reports!
                      </p>
                    </div>
                  )}
                </div>

                {/* Message History */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    💬 Messages
                    {userHistory.messages &&
                      userHistory.messages.messageCount > 0 && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {userHistory.messages.messageCount}
                        </span>
                      )}
                  </h4>
                  {userHistory.messages &&
                  userHistory.messages.messages?.length > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {userHistory.messages.messages
                        .slice(-3)
                        .map((message, index) => (
                          <div
                            key={message.id}
                            className={`p-3 rounded-lg ${
                              message.senderId === "admin"
                                ? "bg-blue-100 ml-8"
                                : "bg-white mr-8 border"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-sm font-medium ${
                                    message.senderId === "admin"
                                      ? "text-transparent bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {message.senderId === "admin"
                                    ? "Admin"
                                    : "You"}
                                </span>
                                {message.senderId === "admin" && (
                                  <Crown className="w-3 h-3 text-yellow-500 animate-pulse" />
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {message.timestamp
                                  ?.toDate?.()
                                  ?.toLocaleDateString?.() || "Recent"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">
                              {message.text}
                            </p>
                          </div>
                        ))}
                      {userHistory.messages.messageCount > 3 && (
                        <p className="text-center text-sm text-gray-500">
                          ... and {userHistory.messages.messageCount - 3} more
                          messages
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No messages yet.
                    </p>
                  )}
                </div>

                {/* Feature Requests History */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    💡 Feature Requests
                    {userHistory.featureRequests.length > 0 && (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {userHistory.featureRequests.length}
                      </span>
                    )}
                  </h4>
                  {userHistory.featureRequests.length > 0 ? (
                    <div className="space-y-3">
                      {userHistory.featureRequests
                        .slice(0, 3)
                        .map((request) => (
                          <div
                            key={request.id}
                            className="bg-green-50 border border-green-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-green-900">
                                {request.title}
                              </h5>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  request.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : request.status === "in-progress"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {request.status}
                              </span>
                            </div>
                            <p className="text-sm text-green-700 line-clamp-2">
                              {request.description}
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No feature requests yet.
                    </p>
                  )}
                </div>

                {/* Bug Reports History */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    🐛 Bug Reports
                    {userHistory.bugReports.length > 0 && (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {userHistory.bugReports.length}
                      </span>
                    )}
                  </h4>
                  {userHistory.bugReports.length > 0 ? (
                    <div className="space-y-3">
                      {userHistory.bugReports.slice(0, 3).map((report) => (
                        <div
                          key={report.id}
                          className="bg-red-50 border border-red-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-red-900">
                              {report.title}
                            </h5>
                            <div className="flex gap-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  report.priority === "high"
                                    ? "bg-red-100 text-red-800"
                                    : report.priority === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {report.priority}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  report.status === "resolved"
                                    ? "bg-green-100 text-green-800"
                                    : report.status === "investigating"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {report.status}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-red-700 line-clamp-2">
                            {report.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No bug reports yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;

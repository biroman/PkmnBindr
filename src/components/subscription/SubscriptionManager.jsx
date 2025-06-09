import { useState } from "react";
import {
  CreditCardIcon,
  CalendarIcon,
  ChartBarIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { SUBSCRIPTION_TIERS } from "../../lib/subscriptionTiers";
import PricingTable from "./PricingTable";

const SubscriptionManager = () => {
  const {
    subscription,
    customer,
    paymentMethods,
    paymentHistory,
    usage,
    loading,
    error,
    getCurrentTier,
    getDaysUntilRenewal,
    isSubscriptionActive,
    isSubscriptionCanceled,
    openBillingPortal,
    cancelSubscription,
    reactivateSubscription,
  } = useSubscription();

  const [activeTab, setActiveTab] = useState("overview");
  const [showPricingModal, setShowPricingModal] = useState(false);

  const currentTier = getCurrentTier();
  const daysUntilRenewal = getDaysUntilRenewal();
  const isActive = isSubscriptionActive();
  const isCanceled = isSubscriptionCanceled();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatUsage = (feature, value) => {
    const limit = currentTier.features[feature];

    if (limit === Infinity) {
      return `${value.toLocaleString()} (Unlimited)`;
    }

    if (typeof limit === "number") {
      const percentage = (value / limit) * 100;
      return `${value.toLocaleString()} / ${limit.toLocaleString()} (${Math.round(
        percentage
      )}%)`;
    }

    return value.toLocaleString();
  };

  const getUsageColor = (feature, value) => {
    const limit = currentTier.features[feature];

    if (limit === Infinity) return "text-green-600";
    if (typeof limit !== "number") return "text-slate-600";

    const percentage = (value / limit) * 100;

    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
  };

  const handlePlanSelection = async (tierId, billingInterval) => {
    setShowPricingModal(false);
    // This would trigger the subscription upgrade/downgrade process
    console.log(`Selected plan: ${tierId} (${billingInterval})`);
  };

  const handleCancelSubscription = async () => {
    if (
      window.confirm(
        "Are you sure you want to cancel your subscription? It will remain active until the end of your billing period."
      )
    ) {
      try {
        await cancelSubscription(true);
      } catch (error) {
        console.error("Failed to cancel subscription:", error);
      }
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      await reactivateSubscription();
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">
            Error loading subscription: {error}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
            <p className="text-slate-600 mt-1">
              Manage your subscription and billing settings
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentTier.id !== "enthusiast" && (
              <button
                onClick={() => setShowPricingModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowUpIcon className="w-4 h-4" />
                Upgrade Plan
              </button>
            )}

            <button
              onClick={() => openBillingPortal()}
              className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <CogIcon className="w-4 h-4" />
              Manage Billing
            </button>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {isCanceled && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-orange-800">
                Subscription Canceled
              </h3>
              <p className="text-orange-700 mt-1">
                Your subscription will end on{" "}
                {formatDate(subscription.currentPeriodEnd)}. You'll be
                downgraded to the Free plan after that date.
              </p>
              <button
                onClick={handleReactivateSubscription}
                className="mt-3 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                Reactivate Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", name: "Overview", icon: ChartBarIcon },
            { id: "usage", name: "Usage", icon: ChartBarIcon },
            { id: "billing", name: "Billing", icon: CreditCardIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Current Plan
            </h2>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {currentTier.name}
                </h3>
                <p className="text-slate-600">{currentTier.description}</p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">
                  {currentTier.price === 0 ? "Free" : `$${currentTier.price}`}
                </div>
                {currentTier.interval && (
                  <div className="text-slate-600">/{currentTier.interval}</div>
                )}
              </div>
            </div>

            {/* Plan Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Binders</span>
                  <span className="font-medium">
                    {currentTier.features.maxBinders === Infinity
                      ? "Unlimited"
                      : currentTier.features.maxBinders}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Cards per Binder
                  </span>
                  <span className="font-medium">
                    {currentTier.features.maxCardsPerBinder === Infinity
                      ? "Unlimited"
                      : currentTier.features.maxCardsPerBinder.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Storage</span>
                  <span className="font-medium">
                    {currentTier.features.storageLimit === Infinity
                      ? "Unlimited"
                      : `${Math.round(
                          currentTier.features.storageLimit / 1024 / 1024
                        )}MB`}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Public Sharing</span>
                  <span className="font-medium">
                    {currentTier.features.publicSharing ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Analytics</span>
                  <span className="font-medium">
                    {currentTier.features.analytics ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Support</span>
                  <span className="font-medium capitalize">
                    {currentTier.features.supportLevel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Status</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status</span>
                  <span
                    className={`font-medium ${
                      isActive ? "text-green-600" : "text-orange-600"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {subscription && subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      {isCanceled ? "Ends" : "Renews"}
                    </span>
                    <span className="font-medium">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>
                )}

                {daysUntilRenewal !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Days Remaining
                    </span>
                    <span className="font-medium">{daysUntilRenewal}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>

              <div className="space-y-3">
                {!isCanceled &&
                  subscription &&
                  subscription.tier !== "free" && (
                    <button
                      onClick={handleCancelSubscription}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  )}

                <button
                  onClick={() => openBillingPortal()}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Update Payment Method
                </button>

                <button
                  onClick={() => openBillingPortal()}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Download Invoices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === "usage" && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            Current Usage
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                key: "maxBinders",
                label: "Binders Created",
                usage: usage.binderCreation || 0,
              },
              {
                key: "maxCardsPerBinder",
                label: "Cards Added",
                usage: usage.cardAddition || 0,
              },
              {
                key: "storageLimit",
                label: "Storage Used",
                usage: usage.storageUsed || 0,
                format: (value) => `${(value / 1024 / 1024).toFixed(1)}MB`,
              },
              {
                key: "maxImageUploads",
                label: "Images Uploaded",
                usage: usage.imageUploads || 0,
              },
              {
                key: "apiRateLimit",
                label: "API Calls",
                usage: usage.apiCalls || 0,
              },
              { key: "exports", label: "Exports", usage: usage.exports || 0 },
            ].map((item) => {
              const limit = currentTier.features[item.key];
              const percentage =
                limit === Infinity ? 0 : (item.usage / limit) * 100;

              return (
                <div
                  key={item.key}
                  className="border border-slate-200 rounded-lg p-4"
                >
                  <h3 className="font-medium text-slate-900 mb-2">
                    {item.label}
                  </h3>

                  <div className="mb-2">
                    <span
                      className={`text-2xl font-bold ${getUsageColor(
                        item.key,
                        item.usage
                      )}`}
                    >
                      {item.format
                        ? item.format(item.usage)
                        : item.usage.toLocaleString()}
                    </span>
                    <span className="text-slate-600 ml-2">
                      / {limit === Infinity ? "∞" : limit.toLocaleString()}
                    </span>
                  </div>

                  {limit !== Infinity && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          percentage >= 90
                            ? "bg-red-500"
                            : percentage >= 75
                            ? "bg-orange-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Payment Methods */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Payment Methods
            </h2>

            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="w-5 h-5 text-slate-400" />
                      <div>
                        <span className="font-medium">
                          •••• •••• •••• {method.card?.last4}
                        </span>
                        <span className="text-slate-600 ml-2">
                          {method.card?.brand?.toUpperCase()} expires{" "}
                          {method.card?.exp_month}/{method.card?.exp_year}
                        </span>
                      </div>
                    </div>
                    {method.isDefault && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">No payment methods on file.</p>
            )}

            <button
              onClick={() => openBillingPortal()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Manage Payment Methods
            </button>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Payment History
            </h2>

            {paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 text-sm font-medium text-slate-900">
                        Date
                      </th>
                      <th className="text-left py-2 text-sm font-medium text-slate-900">
                        Description
                      </th>
                      <th className="text-left py-2 text-sm font-medium text-slate-900">
                        Amount
                      </th>
                      <th className="text-left py-2 text-sm font-medium text-slate-900">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-slate-100"
                      >
                        <td className="py-3 text-sm text-slate-900">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="py-3 text-sm text-slate-600">
                          {payment.description}
                        </td>
                        <td className="py-3 text-sm text-slate-900">
                          ${(payment.amount / 100).toFixed(2)}
                        </td>
                        <td className="py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              payment.status === "succeeded"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-600">No payment history available.</p>
            )}
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Choose Your Plan</h2>
              <button
                onClick={() => setShowPricingModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <PricingTable onSelectPlan={handlePlanSelection} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;

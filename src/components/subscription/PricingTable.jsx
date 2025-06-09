import { useState } from "react";
import { CheckIcon, XMarkIcon, StarIcon } from "@heroicons/react/24/outline";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { SUBSCRIPTION_TIERS } from "../../lib/subscriptionTiers";

const PricingTable = ({
  onSelectPlan,
  showCurrentPlan = true,
  highlightUpgrades = true,
  className = "",
}) => {
  const { subscription, getCurrentTier, canUpgradeTo, getYearlySavings } =
    useSubscription();
  const [billingInterval, setBillingInterval] = useState("monthly");

  const currentTier = getCurrentTier();

  const formatPrice = (price) => {
    if (price === 0) return "Free";
    return `$${price.toFixed(2)}`;
  };

  const formatFeatureValue = (value) => {
    if (value === true) return "✓";
    if (value === false) return "✗";
    if (value === Infinity) return "Unlimited";
    if (typeof value === "number") return value.toLocaleString();
    if (Array.isArray(value)) return value.join(", ");
    return value;
  };

  const getButtonText = (tier) => {
    if (!subscription || subscription.tier === "free") {
      return tier.id === "free" ? "Current Plan" : "Get Started";
    }

    if (subscription.tier === tier.id) {
      return "Current Plan";
    }

    if (canUpgradeTo(tier.id)) {
      return "Upgrade";
    }

    return "Downgrade";
  };

  const getButtonVariant = (tier) => {
    if (subscription?.tier === tier.id) {
      return "current";
    }

    if (tier.highlight) {
      return "primary";
    }

    return "secondary";
  };

  const isCurrentPlan = (tier) => {
    return subscription?.tier === tier.id;
  };

  const displayPrice = (tier) => {
    if (tier.price === 0) return { main: "Free", period: "" };

    if (billingInterval === "yearly" && tier.yearlyPrice) {
      const monthlyEquivalent = tier.yearlyPrice / 12;
      return {
        main: formatPrice(monthlyEquivalent),
        period: "/month",
        billed: `Billed annually at ${formatPrice(tier.yearlyPrice)}`,
      };
    }

    return {
      main: formatPrice(tier.price),
      period: tier.interval ? `/${tier.interval}` : "",
    };
  };

  // Feature comparison data
  const featureComparison = [
    { key: "maxBinders", label: "Max Binders", category: "Limits" },
    { key: "maxCardsPerBinder", label: "Cards per Binder", category: "Limits" },
    { key: "totalCardsLimit", label: "Total Cards", category: "Limits" },
    {
      key: "storageLimit",
      label: "Storage",
      category: "Storage",
      format: (value) =>
        value === Infinity
          ? "Unlimited"
          : value >= 1024 * 1024 * 1024
          ? `${Math.round((value / 1024 / 1024 / 1024) * 10) / 10}GB`
          : `${Math.round(value / 1024 / 1024)}MB`,
    },
    { key: "availableGridSizes", label: "Grid Sizes", category: "Display" },
    { key: "publicSharing", label: "Public Sharing", category: "Sharing" },
    { key: "bulkOperations", label: "Bulk Operations", category: "Features" },
    { key: "exportFormats", label: "Export Formats", category: "Features" },
  ];

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-100 rounded-lg p-1 flex">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("yearly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
              billingInterval === "yearly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Yearly
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Object.values(SUBSCRIPTION_TIERS).map((tier) => {
          const price = displayPrice(tier);
          const savings = getYearlySavings(tier.id);
          const isCurrent = isCurrentPlan(tier);
          const canUpgrade = canUpgradeTo(tier.id);

          return (
            <div
              key={tier.id}
              className={`
                relative rounded-2xl border-2 p-6 transition-all duration-200
                ${
                  tier.highlight
                    ? "border-blue-500 bg-blue-50/50 shadow-lg scale-105"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }
                ${isCurrent ? "ring-2 ring-green-500 ring-offset-2" : ""}
              `}
            >
              {/* Badges */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-wrap gap-1">
                  {tier.badges.map((badge, index) => (
                    <span
                      key={index}
                      className={`
                        inline-flex items-center px-2 py-1 text-xs font-medium rounded-full
                        ${
                          tier.highlight
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        }
                      `}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                {isCurrent && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    Current
                  </span>
                )}
              </div>

              {/* Plan Name */}
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {tier.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-slate-600 mb-6">{tier.description}</p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-slate-900">
                    {price.main}
                  </span>
                  {price.period && (
                    <span className="text-slate-600 ml-1">{price.period}</span>
                  )}
                </div>
                {price.billed && (
                  <p className="text-xs text-slate-600 mt-1">{price.billed}</p>
                )}
                {billingInterval === "yearly" &&
                  savings &&
                  savings.amount > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Save ${savings.amount.toFixed(2)} ({savings.percentage}%)
                    </p>
                  )}
              </div>

              {/* Key Features */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center text-sm">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>
                    {formatFeatureValue(tier.features.maxBinders)} binders
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>
                    {formatFeatureValue(tier.features.totalCardsLimit)} total
                    cards
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>
                    {tier.features.storageLimit === Infinity
                      ? "Unlimited"
                      : tier.features.storageLimit >= 1024 * 1024 * 1024
                      ? `${
                          Math.round(
                            (tier.features.storageLimit / 1024 / 1024 / 1024) *
                              10
                          ) / 10
                        }GB`
                      : `${Math.round(
                          tier.features.storageLimit / 1024 / 1024
                        )}MB`}{" "}
                    storage
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>All grid sizes (3x3 to 6x6)</span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Full feature access</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => onSelectPlan(tier.id, billingInterval)}
                disabled={isCurrent}
                className={`
                  w-full py-3 px-4 rounded-lg font-medium transition-colors
                  ${
                    getButtonVariant(tier) === "current"
                      ? "bg-green-100 text-green-700 cursor-default"
                      : getButtonVariant(tier) === "primary"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }
                `}
              >
                {getButtonText(tier)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Compare All Features
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-6 font-medium text-slate-900">
                  Feature
                </th>
                {Object.values(SUBSCRIPTION_TIERS).map((tier) => (
                  <th
                    key={tier.id}
                    className={`text-center py-3 px-4 font-medium ${
                      tier.highlight ? "text-blue-700" : "text-slate-900"
                    }`}
                  >
                    {tier.name}
                    {isCurrentPlan(tier) && (
                      <span className="block text-xs text-green-600 font-normal">
                        Current
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureComparison.map((feature, index) => (
                <tr
                  key={feature.key}
                  className={index % 2 === 0 ? "bg-slate-50" : "bg-white"}
                >
                  <td className="py-3 px-6 text-sm text-slate-900">
                    {feature.label}
                  </td>
                  {Object.values(SUBSCRIPTION_TIERS).map((tier) => {
                    const value = tier.features[feature.key];
                    const formattedValue = feature.format
                      ? feature.format(value)
                      : formatFeatureValue(value);

                    return (
                      <td
                        key={`${tier.id}-${feature.key}`}
                        className="py-3 px-4 text-center text-sm"
                      >
                        {value === true ? (
                          <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : value === false ? (
                          <XMarkIcon className="w-5 h-5 text-slate-400 mx-auto" />
                        ) : (
                          <span className="text-slate-900">
                            {formattedValue}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-12 text-center">
        <p className="text-slate-600">
          Questions about plans?{" "}
          <a
            href="mailto:support@example.com"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Contact our support team
          </a>
        </p>
      </div>
    </div>
  );
};

export default PricingTable;

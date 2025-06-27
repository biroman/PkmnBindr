import { z } from "zod";

// Base rule schema that all rules must follow
const baseRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional(),
  type: z.string(),
  enabled: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(), // User ID who created the rule
});

// Rate limit rule (e.g., API calls per hour/day)
const rateLimitRuleSchema = baseRuleSchema.extend({
  type: z.literal("rate_limit"),
  config: z.object({
    limit: z.number().min(1, "Limit must be at least 1"),
    window: z.enum(["hour", "day", "week", "month"]),
    resource: z.string(), // e.g., 'api_calls', 'pokemon_searches'
    resetTime: z.string().optional(), // Time when limit resets (for daily/weekly limits)
  }),
});

// Feature limit rule (e.g., max collections, max Pokemon per collection)
const featureLimitRuleSchema = baseRuleSchema.extend({
  type: z.literal("feature_limit"),
  config: z.object({
    feature: z.string(), // e.g., 'collections', 'pokemon_per_collection'
    limit: z.number().min(0, "Limit cannot be negative"),
    scope: z.enum(["user", "global"]).default("user"),
  }),
});

// Access control rule (who can access what features)
const accessControlRuleSchema = baseRuleSchema.extend({
  type: z.literal("access_control"),
  config: z.object({
    feature: z.string(), // e.g., 'admin_panel', 'api_explorer'
    allowedRoles: z.array(z.string()).default(["user"]),
    requiredPermissions: z.array(z.string()).default([]),
    blockedUsers: z.array(z.string()).default([]),
  }),
});

// Content limit rule (file uploads, text length, etc.)
const contentLimitRuleSchema = baseRuleSchema.extend({
  type: z.literal("content_limit"),
  config: z.object({
    contentType: z.string(), // e.g., 'file_upload', 'text_input'
    maxSize: z.number().optional(), // In bytes for files, characters for text
    allowedTypes: z.array(z.string()).optional(), // MIME types for files
    maxCount: z.number().optional(), // Max number of items
  }),
});

// Time-based rule (maintenance windows, feature availability)
const timeBasedRuleSchema = baseRuleSchema.extend({
  type: z.literal("time_based"),
  config: z.object({
    feature: z.string(),
    schedule: z.object({
      startTime: z.string(), // ISO string
      endTime: z.string(), // ISO string
      timezone: z.string().default("UTC"),
      recurring: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
    }),
    action: z.enum(["disable", "enable", "restrict"]),
  }),
});

// Union schema for all rule types
export const ruleSchema = z.discriminatedUnion("type", [
  rateLimitRuleSchema,
  featureLimitRuleSchema,
  accessControlRuleSchema,
  contentLimitRuleSchema,
  timeBasedRuleSchema,
]);

// Rule enforcement result
export const ruleEnforcementSchema = z.object({
  allowed: z.boolean(),
  rule: ruleSchema.optional(),
  reason: z.string().optional(),
  remaining: z.number().optional(), // For rate limits
  resetTime: z.string().optional(), // When limit resets
});

// User rule usage tracking
export const userRuleUsageSchema = z.object({
  userId: z.string(),
  ruleId: z.string(),
  resource: z.string(),
  count: z.number().default(0),
  lastUsed: z.string(),
  resetTime: z.string(),
});

// Rule template for creating new rules
export const ruleTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  config: z.record(z.any()),
  enabled: z.boolean().default(true),
});

// Predefined rule templates
export const RULE_TEMPLATES = {
  api_rate_limit: {
    name: "API Rate Limit",
    description: "Limit API calls per user per hour",
    type: "rate_limit",
    config: {
      limit: 100,
      window: "hour",
      resource: "api_calls",
    },
  },
  max_collections: {
    name: "Max Collections per User",
    description: "Maximum number of collections a user can create",
    type: "feature_limit",
    config: {
      feature: "collections",
      limit: 10,
      scope: "user",
    },
  },
  pokemon_per_collection: {
    name: "Pokemon per Collection Limit",
    description: "Maximum Pokemon that can be added to a single collection",
    type: "feature_limit",
    config: {
      feature: "pokemon_per_collection",
      limit: 50,
      scope: "user",
    },
  },
  file_upload_size: {
    name: "File Upload Size Limit",
    description: "Maximum file size for uploads",
    type: "content_limit",
    config: {
      contentType: "file_upload",
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ["image/jpeg", "image/png", "image/gif"],
    },
  },
  admin_access: {
    name: "Admin Panel Access",
    description: "Control who can access the admin panel",
    type: "access_control",
    config: {
      feature: "admin_panel",
      allowedRoles: ["owner", "admin"],
      requiredPermissions: ["admin_access"],
    },
  },

  // Contact System Rate Limits
  contact_message_rate_limit: {
    name: "Direct Message Rate Limit",
    description: "Limit how often users can send direct messages",
    type: "rate_limit",
    config: {
      limit: 5, // 5 messages per hour
      window: "hour",
      resource: "direct_messages",
    },
  },

  feature_request_rate_limit: {
    name: "Feature Request Rate Limit",
    description: "Limit how often users can submit feature requests",
    type: "rate_limit",
    config: {
      limit: 3, // 3 feature requests per day
      window: "day",
      resource: "feature_requests",
    },
  },

  bug_report_rate_limit: {
    name: "Bug Report Rate Limit",
    description: "Limit how often users can submit bug reports",
    type: "rate_limit",
    config: {
      limit: 10, // 10 bug reports per day
      window: "day",
      resource: "bug_reports",
    },
  },
};

// Rule type definitions for the UI
export const RULE_TYPES = {
  rate_limit: {
    name: "Rate Limit",
    description: "Limit how often users can perform certain actions",
    icon: "⏱️",
    color: "blue",
  },
  feature_limit: {
    name: "Feature Limit",
    description: "Set maximum limits on features and resources",
    icon: "📊",
    color: "green",
  },
  access_control: {
    name: "Access Control",
    description: "Control who can access specific features",
    icon: "🔐",
    color: "red",
  },
  content_limit: {
    name: "Content Limit",
    description: "Limit file sizes, text length, and content types",
    icon: "📄",
    color: "purple",
  },
  time_based: {
    name: "Time-Based Rule",
    description: "Schedule feature availability and maintenance windows",
    icon: "⏰",
    color: "orange",
  },
};

// Helper functions for rule validation
export const validateRule = (rule) => {
  try {
    return ruleSchema.parse(rule);
  } catch (error) {
    throw new Error(`Invalid rule: ${error.message}`);
  }
};

export const createRuleFromTemplate = (templateKey, overrides = {}) => {
  const template = RULE_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Template ${templateKey} not found`);
  }

  return {
    ...template,
    ...overrides,
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// Rule enforcement utilities
export const checkRateLimit = (usage, rule) => {
  if (rule.type !== "rate_limit") return { allowed: true };

  const now = new Date();
  const resetTime = new Date(usage?.resetTime || 0);

  // Check if we need to reset the counter
  if (now > resetTime) {
    return {
      allowed: true,
      remaining: rule.config.limit - 1,
      resetTime: getNextResetTime(now, rule.config.window).toISOString(),
    };
  }

  const currentCount = usage?.count || 0;
  const allowed = currentCount < rule.config.limit;

  return {
    allowed,
    remaining: Math.max(
      0,
      rule.config.limit - currentCount - (allowed ? 1 : 0)
    ),
    resetTime: resetTime.toISOString(),
    reason: allowed
      ? undefined
      : `Rate limit exceeded. Limit: ${rule.config.limit} per ${rule.config.window}`,
  };
};

export const checkFeatureLimit = (currentCount, rule) => {
  if (rule.type !== "feature_limit") return { allowed: true };

  const allowed = currentCount < rule.config.limit;
  return {
    allowed,
    reason: allowed
      ? undefined
      : `Binder limit exceeded. Maximum: ${rule.config.limit}`,
  };
};

export const checkAccessControl = (user, rule) => {
  if (rule.type !== "access_control") return { allowed: true };

  const { allowedRoles, blockedUsers, requiredPermissions } = rule.config;

  // Check if user is blocked
  if (blockedUsers.includes(user.uid)) {
    return {
      allowed: false,
      reason: "User is blocked from accessing this feature",
    };
  }

  // Check role requirements
  const userRole = getUserRole(user);
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return { allowed: false, reason: "Insufficient role permissions" };
  }

  // Check permission requirements
  const userPermissions = getUserPermissions(user);
  const hasRequiredPermissions = requiredPermissions.every((perm) =>
    userPermissions.includes(perm)
  );

  if (requiredPermissions.length > 0 && !hasRequiredPermissions) {
    return { allowed: false, reason: "Missing required permissions" };
  }

  return { allowed: true };
};

// Utility functions
const getNextResetTime = (now, window) => {
  const next = new Date(now);

  switch (window) {
    case "hour":
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
    case "day":
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    case "week":
      next.setDate(next.getDate() + (7 - next.getDay()));
      next.setHours(0, 0, 0, 0);
      break;
    case "month":
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(0, 0, 0, 0);
      break;
    default:
      next.setHours(next.getHours() + 1, 0, 0, 0);
  }

  return next;
};

const getUserRole = (user) => {
  // Use only Firebase role, no email checking
  return user.role || "user";
};

const getUserPermissions = (user) => {
  // Use role-based permissions instead of email
  if (user.role === "owner") return ["admin_access", "all_permissions"];
  return user.permissions || [];
};

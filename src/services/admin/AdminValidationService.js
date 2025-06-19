/**
 * AdminValidationService - Form validation and business rules
 *
 * Features:
 * - User data validation
 * - Contact form validation
 * - System configuration validation
 * - Business rules enforcement
 * - Input sanitization and security
 * - Custom validation rules
 */

export class AdminValidationService {
  /**
   * Validate user data for admin operations
   */
  static validateUserData(userData, operation = "create") {
    const errors = [];
    const warnings = [];

    // Email validation
    if (!userData.email) {
      errors.push("Email is required");
    } else if (!this.isValidEmail(userData.email)) {
      errors.push("Invalid email format");
    }

    // Display name validation
    if (!userData.displayName) {
      errors.push("Display name is required");
    } else if (userData.displayName.length < 2) {
      errors.push("Display name must be at least 2 characters");
    } else if (userData.displayName.length > 50) {
      errors.push("Display name must be less than 50 characters");
    }

    // Role validation
    if (userData.role && !this.isValidRole(userData.role)) {
      errors.push("Invalid user role");
    }

    // Status validation
    if (userData.status && !this.isValidStatus(userData.status)) {
      errors.push("Invalid user status");
    }

    // Specific validations for updates
    if (operation === "update") {
      if (!userData.uid) {
        errors.push("User ID is required for updates");
      }
    }

    // Business rule validations
    if (userData.role === "owner" && operation === "update") {
      warnings.push("Changing owner role requires special consideration");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate contact form data
   */
  static validateContactData(contactData, type = "message") {
    const errors = [];
    const warnings = [];

    // Common validations for all contact types
    if (!contactData.email) {
      errors.push("Email is required");
    } else if (!this.isValidEmail(contactData.email)) {
      errors.push("Invalid email format");
    }

    if (!contactData.subject || contactData.subject.trim().length === 0) {
      errors.push("Subject is required");
    } else if (contactData.subject.length > 100) {
      errors.push("Subject must be less than 100 characters");
    }

    if (
      !contactData.description ||
      contactData.description.trim().length === 0
    ) {
      errors.push("Description is required");
    } else if (contactData.description.length > 2000) {
      errors.push("Description must be less than 2000 characters");
    }

    // Type-specific validations
    switch (type) {
      case "feature":
        if (
          contactData.priority &&
          !this.isValidPriority(contactData.priority)
        ) {
          errors.push("Invalid priority level");
        }
        if (
          contactData.category &&
          !this.isValidFeatureCategory(contactData.category)
        ) {
          errors.push("Invalid feature category");
        }
        break;

      case "bug":
        if (
          contactData.severity &&
          !this.isValidSeverity(contactData.severity)
        ) {
          errors.push("Invalid severity level");
        }
        if (
          contactData.reproducible !== undefined &&
          typeof contactData.reproducible !== "boolean"
        ) {
          errors.push("Reproducible must be a boolean value");
        }
        break;

      case "message":
        // No additional validations for messages
        break;

      default:
        warnings.push("Unknown contact type, using default validation");
    }

    // Security validations
    if (this.containsSuspiciousContent(contactData.description)) {
      warnings.push("Content may contain suspicious elements");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate system configuration data
   */
  static validateSystemConfig(configData) {
    const errors = [];
    const warnings = [];

    // Cache configuration validation
    if (configData.cache) {
      if (
        configData.cache.duration &&
        (configData.cache.duration < 60000 ||
          configData.cache.duration > 3600000)
      ) {
        warnings.push("Cache duration should be between 1 minute and 1 hour");
      }
    }

    // Limits validation
    if (configData.limits) {
      if (configData.limits.maxUsers && configData.limits.maxUsers < 1) {
        errors.push("Maximum users must be at least 1");
      }
      if (configData.limits.maxBinders && configData.limits.maxBinders < 1) {
        errors.push("Maximum binders must be at least 1");
      }
    }

    // Feature flags validation
    if (configData.features) {
      Object.entries(configData.features).forEach(([feature, enabled]) => {
        if (typeof enabled !== "boolean") {
          errors.push(`Feature flag '${feature}' must be a boolean value`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate admin action permissions
   */
  static validateAdminPermissions(adminUser, targetUser, action) {
    const errors = [];
    const warnings = [];

    if (!adminUser) {
      errors.push("Admin user information is required");
      return { isValid: false, errors, warnings };
    }

    if (
      !this.isValidRole(adminUser.role) ||
      !["admin", "owner"].includes(adminUser.role)
    ) {
      errors.push("Insufficient permissions for admin actions");
    }

    // Owner-specific validations
    if (action === "changeRole" && targetUser?.role === "owner") {
      if (adminUser.role !== "owner") {
        errors.push("Only owners can modify owner roles");
      }
    }

    // Self-modification warnings
    if (adminUser.uid === targetUser?.uid) {
      if (action === "changeRole") {
        warnings.push("Modifying your own role may affect your permissions");
      }
      if (action === "toggleStatus") {
        warnings.push("Disabling your own account may lock you out");
      }
    }

    // Dangerous actions
    if (action === "delete" && targetUser?.role === "owner") {
      errors.push("Owner accounts cannot be deleted");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate batch operation parameters
   */
  static validateBatchOperation(items, operation, options = {}) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(items)) {
      errors.push("Items must be an array");
      return { isValid: false, errors, warnings };
    }

    if (items.length === 0) {
      errors.push("At least one item is required for batch operations");
    }

    if (items.length > 1000) {
      warnings.push("Large batch operations may impact performance");
    }

    if (!operation || typeof operation !== "string") {
      errors.push("Operation type is required");
    }

    // Concurrency validation
    if (
      options.concurrency &&
      (options.concurrency < 1 || options.concurrency > 20)
    ) {
      warnings.push("Concurrency should be between 1 and 20");
    }

    // Validate each item has required properties
    items.forEach((item, index) => {
      if (!item.id) {
        errors.push(`Item at index ${index} is missing required 'id' property`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize user input to prevent XSS and injection attacks
   */
  static sanitizeInput(input, type = "text") {
    if (typeof input !== "string") {
      return input;
    }

    let sanitized = input.trim();

    switch (type) {
      case "email":
        // Remove any HTML tags and normalize
        sanitized = sanitized.toLowerCase().replace(/<[^>]*>/g, "");
        break;

      case "text":
        // Remove script tags and normalize whitespace
        sanitized = sanitized
          .replace(/<script[^>]*>.*?<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+="[^"]*"/gi, "")
          .replace(/\s+/g, " ");
        break;

      case "html":
        // Allow basic HTML but remove dangerous elements
        sanitized = sanitized
          .replace(/<script[^>]*>.*?<\/script>/gi, "")
          .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+="[^"]*"/gi, "");
        break;

      case "number":
        // Extract numeric characters only
        sanitized = sanitized.replace(/[^0-9.-]/g, "");
        break;

      default:
        // Basic sanitization for unknown types
        sanitized = sanitized.replace(/<[^>]*>/g, "");
    }

    return sanitized;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate user role
   */
  static isValidRole(role) {
    const validRoles = ["user", "admin", "owner"];
    return validRoles.includes(role);
  }

  /**
   * Validate user status
   */
  static isValidStatus(status) {
    const validStatuses = ["active", "inactive", "suspended", "pending"];
    return validStatuses.includes(status);
  }

  /**
   * Validate priority level
   */
  static isValidPriority(priority) {
    const validPriorities = ["low", "medium", "high", "urgent"];
    return validPriorities.includes(priority);
  }

  /**
   * Validate severity level
   */
  static isValidSeverity(severity) {
    const validSeverities = ["low", "medium", "high", "critical"];
    return validSeverities.includes(severity);
  }

  /**
   * Validate feature category
   */
  static isValidFeatureCategory(category) {
    const validCategories = [
      "ui",
      "performance",
      "functionality",
      "integration",
      "mobile",
      "desktop",
      "api",
      "security",
      "other",
    ];
    return validCategories.includes(category);
  }

  /**
   * Check for suspicious content patterns
   */
  static containsSuspiciousContent(content) {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /data:text\/html/i,
      /vbscript:/i,
      /eval\(/i,
      /expression\(/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Validate file upload data
   */
  static validateFileUpload(
    file,
    allowedTypes = [],
    maxSize = 5 * 1024 * 1024
  ) {
    const errors = [];
    const warnings = [];

    if (!file) {
      errors.push("File is required");
      return { isValid: false, errors, warnings };
    }

    // Size validation
    if (file.size > maxSize) {
      errors.push(
        `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
      );
    }

    // Type validation
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type '${file.type}' is not allowed`);
    }

    // Security checks
    if (
      file.name.includes("..") ||
      file.name.includes("/") ||
      file.name.includes("\\")
    ) {
      errors.push("Invalid file name");
    }

    // Warn about large files
    if (file.size > 1 * 1024 * 1024) {
      warnings.push("Large file uploads may take longer to process");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page, limit, maxLimit = 100) {
    const errors = [];
    const warnings = [];

    // Page validation
    if (page !== undefined) {
      const pageNum = parseInt(page, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push("Page must be a positive integer");
      }
    }

    // Limit validation
    if (limit !== undefined) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        errors.push("Limit must be a positive integer");
      } else if (limitNum > maxLimit) {
        warnings.push(`Limit exceeds recommended maximum of ${maxLimit}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create validation summary for multiple validations
   */
  static createValidationSummary(validationResults) {
    const allErrors = [];
    const allWarnings = [];
    let isValid = true;

    validationResults.forEach((result, index) => {
      if (!result.isValid) {
        isValid = false;
      }

      result.errors.forEach((error) => {
        allErrors.push(`Validation ${index + 1}: ${error}`);
      });

      result.warnings.forEach((warning) => {
        allWarnings.push(`Validation ${index + 1}: ${warning}`);
      });
    });

    return {
      isValid,
      errors: allErrors,
      warnings: allWarnings,
      totalValidations: validationResults.length,
      passedValidations: validationResults.filter((r) => r.isValid).length,
    };
  }
}

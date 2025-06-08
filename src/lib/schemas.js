import { z } from "zod";

// Strong password validation
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((password) => /[a-z]/.test(password), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((password) => /[0-9]/.test(password), {
    message: "Password must contain at least one number",
  })
  .refine((password) => /[^A-Za-z0-9]/.test(password), {
    message: "Password must contain at least one special character",
  })
  .refine((password) => !/(.)\1{2,}/.test(password), {
    message:
      "Password cannot contain more than 2 consecutive identical characters",
  });

// Common password blacklist (add more as needed)
const commonPasswords = [
  "password",
  "12345678",
  "password123",
  "admin123",
  "welcome123",
  "qwerty123",
  "abc123456",
  "password1",
  "123456789",
  "password12",
];

const securePasswordSchema = passwordSchema.refine(
  (password) => !commonPasswords.includes(password.toLowerCase()),
  {
    message: "Password is too common. Please choose a more secure password",
  }
);

// Enhanced email validation
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(254, "Email is too long")
  .refine(
    (email) => {
      // Basic domain validation
      const domain = email.split("@")[1];
      return domain && domain.includes(".") && domain.length > 3;
    },
    {
      message: "Please enter a valid email with a proper domain",
    }
  )
  .refine(
    (email) => {
      // Block obvious temporary/fake email patterns
      const blockedPatterns = [
        /temp.*mail/i,
        /fake.*mail/i,
        /test.*mail/i,
        /spam/i,
        /10minutemail/i,
        /mailinator/i,
        /guerrillamail/i,
      ];
      return !blockedPatterns.some((pattern) => pattern.test(email));
    },
    {
      message: "Temporary or disposable email addresses are not allowed",
    }
  );

// Enhanced display name validation
const displayNameSchema = z
  .string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be less than 50 characters")
  .refine(
    (name) => {
      // No offensive content (basic check)
      const blockedWords = ["admin", "root", "system", "null", "undefined"];
      return !blockedWords.some((word) => name.toLowerCase().includes(word));
    },
    {
      message: "Display name contains restricted words",
    }
  )
  .refine(
    (name) => {
      // Must contain at least one letter
      return /[a-zA-Z]/.test(name);
    },
    {
      message: "Display name must contain at least one letter",
    }
  )
  .refine(
    (name) => {
      // No excessive special characters
      const specialCharCount = (name.match(/[^a-zA-Z0-9\s]/g) || []).length;
      return specialCharCount <= 3;
    },
    {
      message: "Display name contains too many special characters",
    }
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: securePasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const profileSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
});

// New change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: securePasswordSchema,
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords don't match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

// Security helpers
export const validatePasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    noRepeating: !/(.)\1{2,}/.test(password),
    notCommon: !commonPasswords.includes(password.toLowerCase()),
  };

  const score = Object.values(checks).filter(Boolean).length;

  return {
    score,
    maxScore: Object.keys(checks).length,
    checks,
    strength: score < 4 ? "weak" : score < 6 ? "medium" : "strong",
    isValid: score === Object.keys(checks).length,
  };
};

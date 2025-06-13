import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";

export class BannerColorService {
  // Default banner colors
  static DEFAULT_COLORS = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Purple-blue
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", // Pink-red
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", // Blue-cyan
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", // Green-cyan
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", // Pink-yellow
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", // Cyan-pink
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", // Pink-light
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", // Orange-peach
  ];

  static DEFAULT_BANNER = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";

  /**
   * Update user banner color
   * @param {string} userId - User's UID
   * @param {string} bannerColor - CSS gradient or color string
   * @returns {Promise<boolean>} - Success status
   */
  static async updateBannerColor(userId, bannerColor) {
    try {
      // Validate color format
      const validation = this.validateBannerColor(bannerColor);
      if (!validation.isValid) {
        toast.error(validation.error);
        return false;
      }

      // Update the user's banner color in Firestore
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        bannerColor: bannerColor,
        bannerUpdatedAt: new Date(),
        updatedAt: new Date(),
      });

      toast.success("Banner color updated!");
      return true;
    } catch (error) {
      console.error("Error updating banner color:", error);

      if (error.code === "permission-denied") {
        toast.error("You don't have permission to update your banner.");
      } else if (error.code === "unavailable") {
        toast.error("Service temporarily unavailable. Please try again.");
      } else {
        toast.error("Failed to update banner color. Please try again.");
      }

      return false;
    }
  }

  /**
   * Validate banner color format
   * @param {string} color - Color string to validate
   * @returns {Object} - Validation result
   */
  static validateBannerColor(color) {
    if (typeof color !== "string") {
      return {
        isValid: false,
        error: "Banner color must be a string",
      };
    }

    // Allow gradients, hex colors, rgb, hsl, etc.
    const validPatterns = [
      /^linear-gradient\(.+\)$/i,
      /^radial-gradient\(.+\)$/i,
      /^#[0-9a-f]{3,8}$/i,
      /^rgb\(.+\)$/i,
      /^rgba\(.+\)$/i,
      /^hsl\(.+\)$/i,
      /^hsla\(.+\)$/i,
      /^[a-z]+$/i, // Named colors like 'blue', 'red'
    ];

    const isValid = validPatterns.some((pattern) => pattern.test(color.trim()));

    if (!isValid) {
      return {
        isValid: false,
        error: "Invalid color format",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  /**
   * Convert hex color to CSS gradient
   * @param {string} hexColor - Hex color string
   * @returns {string} - CSS gradient string
   */
  static hexToGradient(hexColor) {
    // Create a subtle gradient from the selected color
    const baseColor = hexColor;
    // Create a slightly darker version for the gradient end
    const darkerColor = this.adjustBrightness(hexColor, -20);

    return `linear-gradient(135deg, ${baseColor} 0%, ${darkerColor} 100%)`;
  }

  /**
   * Adjust color brightness
   * @param {string} hex - Hex color string
   * @param {number} percent - Brightness adjustment (-100 to 100)
   * @returns {string} - Adjusted hex color
   */
  static adjustBrightness(hex, percent) {
    // Remove # if present
    hex = hex.replace("#", "");

    // Parse RGB values
    const num = parseInt(hex, 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;

    // Ensure values stay within 0-255 range
    const clamp = (val) => Math.max(0, Math.min(255, val));

    return `#${(0x1000000 + (clamp(R) << 16) + (clamp(G) << 8) + clamp(B))
      .toString(16)
      .slice(1)}`;
  }

  /**
   * Get banner style object from color string
   * @param {string} bannerColor - Banner color/gradient string
   * @returns {Object} - Style object for React
   */
  static getBannerStyle(bannerColor) {
    if (!bannerColor) {
      return {
        background: this.DEFAULT_BANNER,
      };
    }

    // If it's a gradient, use as background
    if (bannerColor.includes("gradient")) {
      return {
        background: bannerColor,
      };
    }

    // If it's a solid color, convert to gradient
    if (bannerColor.startsWith("#")) {
      return {
        background: this.hexToGradient(bannerColor),
      };
    }

    // For other color formats, use as solid background
    return {
      backgroundColor: bannerColor,
    };
  }
}

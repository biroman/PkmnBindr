import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBinderContext } from "../../contexts/BinderContext";
import shareService from "../../services/ShareService";
import QRCodePdfService from "../../services/QRCodePdfService";
import { toast } from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import {
  XMarkIcon,
  LinkIcon,
  ClipboardIcon,
  TrashIcon,
  CalendarIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  QrCodeIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  ShareIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ClockIcon as TimeIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon, ShieldCheckIcon } from "@heroicons/react/24/solid";

/**
 * ShareLinkModal - Professional mobile-optimized modal for managing binder share links
 * Features visible QR codes, modern UI design, and enhanced UX following Tailwind best practices
 * Optimized for mobile devices with proper touch targets, gestures, and safe areas
 */

// --- Configuration for Expiration Options ---
const expirationOptions = [
  { id: "1-hour", label: "1 Hour", value: 1, icon: "🕐" },
  { id: "1-day", label: "1 Day", value: 24, icon: "📅" },
  { id: "7-days", label: "7 Days", value: 24 * 7, icon: "📊" },
  { id: "30-days", label: "30 Days", value: 24 * 30, icon: "📆" },
  { id: "never", label: "Never", value: null, icon: "♾️" },
];

const ShareLinkModal = ({ isOpen, onClose, binder }) => {
  const { user } = useAuth();
  const { updateBinder } = useBinderContext();
  const [shareLinks, setShareLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLinkDesc, setNewLinkDesc] = useState("");
  const [selectedExpiration, setSelectedExpiration] = useState("never");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [visibleQRCodes, setVisibleQRCodes] = useState(new Set());
  const [publishing, setPublishing] = useState(false);

  // Refs for gesture handling
  const modalRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  // Handle screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mobile gesture handling for swipe to dismiss
  useEffect(() => {
    if (!isMobile || !modalRef.current) return;

    const modal = modalRef.current;

    const handleTouchStart = (e) => {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
      modal.style.transition = "none";
    };

    const handleTouchMove = (e) => {
      if (!isDragging.current) return;

      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      // Only allow downward swipes
      if (deltaY > 0) {
        modal.style.transform = `translateY(${deltaY}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging.current) return;

      const deltaY = currentY.current - startY.current;
      modal.style.transition = "transform 0.3s ease-out";

      // If swiped down more than 100px, close modal
      if (deltaY > 100) {
        modal.style.transform = "translateY(100%)";
        setTimeout(onClose, 200);
      } else {
        modal.style.transform = "translateY(0)";
      }

      isDragging.current = false;
    };

    modal.addEventListener("touchstart", handleTouchStart, { passive: true });
    modal.addEventListener("touchmove", handleTouchMove, { passive: true });
    modal.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      if (modal) {
        modal.removeEventListener("touchstart", handleTouchStart);
        modal.removeEventListener("touchmove", handleTouchMove);
        modal.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [isMobile, onClose]);

  // Load share links when modal opens
  useEffect(() => {
    if (isOpen && binder && user) {
      loadShareLinks();
      // Reset form when modal opens
      setShowCreateForm(false);
      setNewLinkDesc("");
      setSelectedExpiration("never");
      setVisibleQRCodes(new Set());
    }
  }, [isOpen, binder?.id, user?.uid]);

  const loadShareLinks = async () => {
    try {
      setLoading(true);
      const links = await shareService.getShareLinks(binder.id, user.uid);
      setShareLinks(links);
    } catch (error) {
      console.error("Error loading share links:", error);
      toast.error("Failed to load share links");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    if (!binder?.permissions?.public) {
      toast.error("Binder must be public to create share links");
      return;
    }

    try {
      setCreating(true);

      const expirationOption = expirationOptions.find(
        (opt) => opt.id === selectedExpiration
      );
      let expiresAt = null;
      if (expirationOption && expirationOption.value) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expirationOption.value);
      }

      const options = {
        description: newLinkDesc.trim() || `Share Link`,
        expiresAt,
      };

      const result = await shareService.createShareLink(
        binder.id,
        user.uid,
        options
      );

      if (result.success) {
        // Show different success messages based on whether we replaced an existing link
        if (result.replacedExistingLinks) {
          toast.success(
            "🔗 Share link updated! Previous link was automatically replaced."
          );
        } else {
          toast.success("🔗 Share link created!");
        }

        // Since we only allow 1 link per binder, replace the entire array
        setShareLinks([result.shareData]);
        setShowCreateForm(false);
        setNewLinkDesc("");
        setSelectedExpiration("never");
      }
    } catch (error) {
      console.error("Error creating share link:", error);
      toast.error(error.message || "Failed to create share link");
    } finally {
      setCreating(false);
    }
  };

  // Toggle QR code visibility
  const toggleQRCode = (shareToken) => {
    setVisibleQRCodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(shareToken)) {
        newSet.delete(shareToken);
      } else {
        newSet.add(shareToken);
      }
      return newSet;
    });
  };

  // Robust copy function with multiple fallbacks for mobile compatibility
  const handleCopyLink = async (shareUrl, description = "") => {
    try {
      // Method 1: Try modern Clipboard API first (works best on desktop and newer mobile browsers)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("🔗 Link copied to clipboard!");
          return;
        } catch (clipboardError) {
          console.warn(
            "Clipboard API failed, trying fallback:",
            clipboardError
          );
        }
      }

      // Method 2: Fallback to legacy method (better mobile browser support)
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        toast.success("🔗 Link copied to clipboard!");
        return;
      } else {
        throw new Error("execCommand copy failed");
      }
    } catch (error) {
      console.error("All copy methods failed:", error);

      // Method 3: Last resort - show share dialog or manual copy instructions
      if (navigator.share && isMobile) {
        try {
          await navigator.share({
            title: `${
              binder?.metadata?.name || "Pokemon Binder"
            } - Shared Collection`,
            text: `Check out my Pokemon card binder${
              description ? ` (${description})` : ""
            }!`,
            url: shareUrl,
          });
          toast.success("📤 Shared successfully!");
          return;
        } catch (shareError) {
          if (shareError.name === "AbortError") {
            // User cancelled the share dialog
            return;
          }
          console.warn("Web Share API also failed:", shareError);
        }
      }

      // Final fallback: Show the URL for manual copying
      const message = isMobile
        ? "Tap and hold to copy: " + shareUrl
        : "Please copy manually: " + shareUrl;

      if (window.prompt) {
        window.prompt("Copy this link:", shareUrl);
      } else {
        toast.error(
          "Copy failed. Please copy the link manually from the text field."
        );
      }
    }
  };

  // Dedicated share function for mobile native sharing
  const handleShareLink = async (shareUrl, description = "") => {
    try {
      if (!navigator.share) {
        // Fallback to copy if share is not available
        await handleCopyLink(shareUrl, description);
        return;
      }

      await navigator.share({
        title: `${
          binder?.metadata?.name || "Pokemon Binder"
        } - Shared Collection`,
        text: `Check out my Pokemon card binder${
          description ? ` (${description})` : ""
        }!`,
        url: shareUrl,
      });
      toast.success("📤 Shared successfully!");
    } catch (error) {
      if (error.name === "AbortError") {
        // User cancelled the share dialog
        return;
      }
      console.error("Share failed:", error);
      // Fallback to copy
      await handleCopyLink(shareUrl, description);
    }
  };

  const handleRevokeLink = async (shareToken) => {
    try {
      const confirmed = window.confirm(
        "Are you sure you want to revoke this share link? It will no longer be accessible."
      );

      if (!confirmed) return;

      await shareService.revokeShareLink(shareToken, user.uid);
      toast.success("🗑️ Share link revoked");

      // Remove from local state
      setShareLinks((prev) =>
        prev.filter((link) => link.shareToken !== shareToken)
      );

      // Remove from visible QR codes
      setVisibleQRCodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(shareToken);
        return newSet;
      });
    } catch (error) {
      console.error("Error revoking share link:", error);
      toast.error(error.message || "Failed to revoke share link");
    }
  };

  const handleDownloadQRCode = async (shareUrl, description) => {
    try {
      const existingQRCode = document.querySelector(
        `[data-qr-url="${shareUrl}"]`
      );
      if (!existingQRCode) {
        toast.error("QR code not found. Please try again.");
        return;
      }
      const svg = existingQRCode.querySelector("svg");
      if (!svg) {
        toast.error("Could not find QR code SVG element");
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 400;
      canvas.width = size;
      canvas.height = size;

      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgUrl = URL.createObjectURL(
        new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      );

      await new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);

          const dataUrl = canvas.toDataURL("image/png");
          const binderName =
            binder?.metadata?.name || description || "Unnamed Binder";

          QRCodePdfService.generateQRCodePDF(shareUrl, binderName, dataUrl);
          toast.success("📄 QR code PDF downloaded!");
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = (err) => {
          toast.error("Failed to convert QR code for PDF");
          URL.revokeObjectURL(svgUrl);
          reject(err);
        };
        img.src = svgUrl;
      });
    } catch (error) {
      console.error("Error downloading QR code:", error);
      toast.error("Failed to download QR code PDF");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Never";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ---- Make Binder Public Handler ----
  const handleMakePublic = async () => {
    if (!binder || publishing) return;

    try {
      setPublishing(true);

      await updateBinder(binder.id, {
        permissions: {
          ...(binder.permissions || {}),
          public: true,
        },
      });

      toast.success("Binder is now public!");
    } catch (error) {
      console.error("Error making binder public:", error);
      toast.error(error.message || "Failed to make binder public");
    } finally {
      setPublishing(false);
    }
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  const renderCreateForm = () => (
    <div className="bg-gradient-to-br from-card-background to-secondary/50 rounded-2xl border border-border shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
      <div className="flex items-center space-x-3 mb-4 sm:mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <PlusIcon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-primary">
          {shareLinks.length > 0 ? "Replace Share Link" : "Create Share Link"}
        </h3>
      </div>

      <div className="space-y-6">
        {shareLinks.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-600 text-sm">⚠️</span>
              </div>
              <div>
                <h4 className="font-semibold text-amber-800 text-sm mb-1">
                  Replace Existing Link
                </h4>
                <p className="text-amber-700 text-sm">
                  Creating a new share link will automatically revoke your
                  current active link. Only 1 share link is allowed per binder
                  for security.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="link-description"
            className="block text-base sm:text-sm font-semibold text-primary mb-3"
          >
            Description
          </label>
          <input
            id="link-description"
            type="text"
            value={newLinkDesc}
            onChange={(e) => setNewLinkDesc(e.target.value)}
            placeholder="e.g., Friends only, Tournament deck, Family sharing"
            className="w-full px-4 py-4 sm:py-3 text-base sm:text-sm border border-border rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-card-background shadow-sm"
            maxLength={50}
          />
          <p className="text-sm sm:text-xs text-secondary mt-2">
            Optional - helps you identify this link later
          </p>
        </div>

        <div>
          <label className="block text-base sm:text-sm font-semibold text-primary mb-4">
            Link Expiration
          </label>
          <RadioGroup.Root
            value={selectedExpiration}
            onValueChange={setSelectedExpiration}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {expirationOptions.map((option) => (
              <div key={option.id} className="relative">
                <RadioGroup.Item
                  value={option.id}
                  className="w-full p-4 min-h-[48px] rounded-xl border border-border hover:border-blue-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-card-background shadow-sm cursor-pointer group data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-950"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroup.Indicator className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </RadioGroup.Indicator>
                    <span className="text-lg">{option.icon}</span>
                    <span className="text-base sm:text-sm font-medium text-primary group-data-[state=checked]:text-blue-800 dark:group-data-[state=checked]:text-blue-200">
                      {option.label}
                    </span>
                  </div>
                </RadioGroup.Item>
              </div>
            ))}
          </RadioGroup.Root>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-6 sm:mt-8">
        <button
          onClick={handleCreateShareLink}
          disabled={creating}
          className="w-full min-h-[48px] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-center shadow-lg hover:shadow-xl transform-gpu hover:scale-[1.02] active:scale-[0.98]"
        >
          {creating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <CheckIcon className="w-5 h-5" />
              <span>
                {shareLinks.length > 0 ? "Replace Link" : "Create Link"}
              </span>
            </div>
          )}
        </button>
        <button
          onClick={() => setShowCreateForm(false)}
          className="w-full min-h-[48px] border-2 border-border bg-card-background px-6 py-4 rounded-xl text-primary hover:bg-accent hover:border-text-secondary transition-all duration-200 font-semibold text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderLinkItem = (link) => {
    const isExpired =
      link.expiresAt &&
      (link.expiresAt.toDate
        ? link.expiresAt.toDate()
        : new Date(link.expiresAt)) < new Date();

    const qrVisible = visibleQRCodes.has(link.shareToken);

    return (
      <div
        key={link.shareToken}
        className={`bg-gradient-to-br from-card-background to-secondary/30 rounded-2xl border shadow-lg transition-all duration-300 hover:shadow-xl ${
          isExpired
            ? "border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 dark:from-red-950 to-red-100/30 dark:to-red-900/30"
            : "border-border hover:border-text-secondary"
        } p-4 sm:p-6 relative overflow-hidden`}
      >
        {/* Status Badge */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
          {isExpired ? (
            <div className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
              <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Expired</span>
            </div>
          ) : (
            <div className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
              <CheckCircleIcon className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Active</span>
            </div>
          )}
        </div>

        {/* Hidden QR Code for PDF Generation */}
        <div className="hidden" data-qr-url={link.shareUrl}>
          <QRCodeSVG value={link.shareUrl} size={256} />
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pr-16 sm:pr-20">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <LinkIcon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-bold text-primary truncate">
                  {link.description || "Share Link"}
                </h4>
                <p className="text-sm text-secondary mt-1">
                  Created {formatDate(link.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* URL Display */}
          <div className="bg-secondary/80 rounded-xl p-4 border border-border">
            <div className="flex items-center space-x-2 mb-3">
              <LinkIcon className="w-4 h-4 text-secondary flex-shrink-0" />
              <span className="font-semibold text-primary text-sm">
                Share URL
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={link.shareUrl}
                className="w-full bg-card-background text-primary border border-border rounded-lg p-3 pr-12 text-xs font-mono select-all shadow-sm"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={() => handleCopyLink(link.shareUrl, link.description)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 min-h-[40px] min-w-[40px] rounded-md bg-secondary hover:bg-accent transition-colors flex items-center justify-center"
                title="Copy URL"
                aria-label="Copy URL to clipboard"
              >
                <ClipboardIcon className="w-4 h-4 text-primary hover:text-accent-foreground" />
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-card-background/80 rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <QrCodeIcon className="w-4 h-4 text-secondary flex-shrink-0" />
                <span className="font-semibold text-primary text-sm">
                  QR Code
                </span>
              </div>
              <button
                onClick={() => toggleQRCode(link.shareToken)}
                className="inline-flex items-center space-x-2 px-3 py-2 min-h-[40px] rounded-lg bg-secondary hover:bg-accent transition-colors text-sm font-medium text-primary"
                aria-label={qrVisible ? "Hide QR code" : "Show QR code"}
              >
                {qrVisible ? (
                  <>
                    <EyeSlashIcon className="w-4 h-4" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <EyeIcon className="w-4 h-4" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>

            {qrVisible && (
              <div className="flex flex-col items-center space-y-3 pt-2">
                <div className="bg-card-background p-4 rounded-xl border border-border shadow-sm">
                  <QRCodeSVG
                    value={link.shareUrl}
                    size={isMobile ? 140 : 160}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-secondary text-center px-4">
                  Scan with your phone camera to open link directly
                </p>
              </div>
            )}
          </div>

          {/* Link Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-card-background/60 rounded-xl p-4 border border-border">
              <div className="flex items-center space-x-2 mb-2">
                <CalendarIcon className="w-4 h-4 text-secondary flex-shrink-0" />
                <span className="font-semibold text-primary text-sm">
                  Expires
                </span>
              </div>
              <p
                className={`text-sm font-medium ${
                  isExpired ? "text-red-600 dark:text-red-400" : "text-primary"
                }`}
              >
                {formatDate(link.expiresAt)}
              </p>
            </div>

            <div className="bg-card-background/60 rounded-xl p-4 border border-border">
              <div className="flex items-center space-x-2 mb-2">
                <TimeIcon className="w-4 h-4 text-secondary flex-shrink-0" />
                <span className="font-semibold text-primary text-sm">
                  Created
                </span>
              </div>
              <p className="text-sm font-medium text-primary">
                {formatDate(link.createdAt)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-3">
              {/* Copy Button */}
              <button
                onClick={() => handleCopyLink(link.shareUrl, link.description)}
                className="flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200/60 dark:border-blue-800/60 transition-all duration-200 font-medium shadow-sm hover:shadow transform-gpu active:scale-95"
                title="Copy link to clipboard"
                aria-label="Copy link to clipboard"
              >
                <ClipboardIcon className="w-5 h-5" />
                <span className="text-sm">Copy</span>
              </button>

              {/* Share Button - Always show on mobile, conditional on desktop */}
              {(isMobile || navigator.share) && (
                <button
                  onClick={() =>
                    handleShareLink(link.shareUrl, link.description)
                  }
                  className="flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900 border border-green-200/60 dark:border-green-800/60 transition-all duration-200 font-medium shadow-sm hover:shadow transform-gpu active:scale-95"
                  title="Share via device apps"
                  aria-label="Share via device apps"
                >
                  <ShareIcon className="w-5 h-5" />
                  <span className="text-sm">Share</span>
                </button>
              )}

              {/* Download QR Button */}
              <button
                onClick={() =>
                  handleDownloadQRCode(link.shareUrl, link.description)
                }
                className={`flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200/60 dark:border-purple-800/60 transition-all duration-200 font-medium shadow-sm hover:shadow transform-gpu active:scale-95 ${
                  !isMobile && !navigator.share
                    ? ""
                    : "col-span-2 sm:col-span-1"
                }`}
                title="Download QR code PDF"
                aria-label="Download QR code as PDF"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span className="text-sm">QR to PDF</span>
              </button>

              {/* Revoke Button */}
              <button
                onClick={() => handleRevokeLink(link.shareToken)}
                className="col-span-2 flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200/60 dark:border-red-800/60 transition-all duration-200 font-medium shadow-sm hover:shadow transform-gpu active:scale-95"
                title="Revoke link"
                aria-label="Revoke this share link"
              >
                <TrashIcon className="w-5 h-5" />
                <span className="text-sm">Revoke Link</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Mobile-first responsive design with gesture support
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-all duration-300">
      <div
        ref={modalRef}
        className={`bg-card-background shadow-2xl w-full flex flex-col transform-gpu ${
          isMobile
            ? "rounded-t-3xl max-h-[95vh] min-h-[70vh]"
            : "rounded-2xl max-w-5xl max-h-[90vh]"
        }`}
        style={{
          paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : "0",
        }}
      >
        {/* Header - Mobile Optimized */}
        <div className="p-4 sm:p-6 border-b border-border flex items-center rounded-t-2xl justify-between flex-shrink-0 bg-gradient-to-r from-card-background to-secondary/50">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <ShareIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-primary">
                Share Binder
              </h2>
              <p className="text-sm text-secondary truncate mt-1">
                {binder?.metadata?.name || "Unnamed Binder"} • 1 Link Max
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl text-secondary hover:bg-accent hover:text-primary transition-all duration-200 flex-shrink-0 flex items-center justify-center"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Pull indicator for mobile */}
        {isMobile && (
          <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-border rounded-full"></div>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
          {/* Binder status check */}
          {!binder?.permissions?.public && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-bold text-yellow-800 text-base sm:text-lg">
                    Binder is Private
                  </h3>
                  <p className="text-sm text-yellow-700 mt-2">
                    Make your binder public first to create share links.
                  </p>

                  {/* Make Public Button */}
                  <button
                    onClick={handleMakePublic}
                    disabled={publishing}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {publishing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ShieldCheckIcon className="w-4 h-4" />
                    )}
                    <span>
                      {publishing ? "Making Public..." : "Make Public"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Web Share API info for mobile */}
          {navigator.share && isMobile && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DevicePhoneMobileIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-800 text-base sm:text-lg">
                    Enhanced Mobile Sharing
                  </h3>
                  <p className="text-sm text-blue-700 mt-2">
                    Share directly to your favorite apps with native mobile
                    sharing! Copy links, scan QR codes, or use the share button.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Create New Link Button / Form */}
          {binder?.permissions?.public && !showCreateForm && (
            <div className="mb-6 sm:mb-8">
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center space-x-3 sm:space-x-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 sm:px-8 py-5 sm:py-6 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform-gpu hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl min-h-[56px]"
                aria-label={
                  shareLinks.length > 0
                    ? "Replace existing share link"
                    : "Create new share link"
                }
              >
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <PlusIcon className="w-5 h-5" />
                </div>
                <span className="text-base sm:text-lg font-bold">
                  {shareLinks.length > 0
                    ? "Replace Share Link"
                    : "Create Share Link"}
                </span>
              </button>
              {shareLinks.length > 0 && (
                <p className="text-sm text-secondary text-center mt-3 px-4">
                  📝 Creating a new link will automatically replace your current
                  share link
                </p>
              )}
            </div>
          )}

          {showCreateForm && renderCreateForm()}

          {/* Links List */}
          <div className="space-y-4 sm:space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-secondary font-medium text-base">
                  Loading share links...
                </p>
              </div>
            ) : shareLinks.length === 0 && !showCreateForm ? (
              <div className="text-center py-12 sm:py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <ShareIcon className="w-8 h-8 sm:w-10 sm:h-10 text-secondary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-primary mb-3">
                  No Share Link Yet
                </h3>
                <p className="text-secondary mb-6 max-w-md mx-auto px-4">
                  Create a share link to share this binder with friends, family,
                  or the community. Each binder can have 1 secure share link
                  with a scannable QR code!
                </p>
                {binder?.permissions?.public && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 min-h-[48px] rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                    aria-label="Create share link"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Create Share Link</span>
                  </button>
                )}
              </div>
            ) : (
              shareLinks.map(renderLinkItem)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;

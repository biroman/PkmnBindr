import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
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
} from "@heroicons/react/24/outline";

/**
 * ShareLinkModal - Mobile-optimized modal for managing binder share links
 * Allows users to create, view, copy, and share links with native mobile sharing
 */

// --- Configuration for Expiration Options ---
const expirationOptions = [
  { id: "1-hour", label: "1 Hour", value: 1 },
  { id: "1-day", label: "1 Day", value: 24 },
  { id: "7-days", label: "7 Days", value: 24 * 7 },
  { id: "30-days", label: "30 Days", value: 24 * 30 },
  { id: "never", label: "Never", value: null },
];

const ShareLinkModal = ({ isOpen, onClose, binder }) => {
  const { user } = useAuth();
  const [shareLinks, setShareLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLinkDesc, setNewLinkDesc] = useState("");
  const [selectedExpiration, setSelectedExpiration] = useState("never");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load share links when modal opens
  useEffect(() => {
    if (isOpen && binder && user) {
      loadShareLinks();
      // Reset form when modal opens
      setShowCreateForm(false);
      setNewLinkDesc("");
      setSelectedExpiration("never");
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
        toast.success("Share link created!");
        setShareLinks((prev) => [result.shareData, ...prev]);
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

  // Robust copy function with multiple fallbacks for mobile compatibility
  const handleCopyLink = async (shareUrl, description = "") => {
    try {
      // Method 1: Try modern Clipboard API first (works best on desktop and newer mobile browsers)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied to clipboard!");
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
        toast.success("Link copied to clipboard!");
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
          toast.success("Shared successfully!");
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
      toast.success("Shared successfully!");
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
      toast.success("Share link revoked");

      // Remove from local state
      setShareLinks((prev) =>
        prev.filter((link) => link.shareToken !== shareToken)
      );
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
          toast.success("QR code PDF downloaded!");
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
    return date.toLocaleDateString();
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  const renderCreateForm = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Create New Share Link
      </h3>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="link-description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description (optional)
          </label>
          <input
            id="link-description"
            type="text"
            value={newLinkDesc}
            onChange={(e) => setNewLinkDesc(e.target.value)}
            placeholder="e.g., Friends only, Tournament deck"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Link Expiration
          </label>
          <RadioGroup.Root
            value={selectedExpiration}
            onValueChange={setSelectedExpiration}
            className="space-y-2"
          >
            {expirationOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-3">
                <RadioGroup.Item
                  value={option.id}
                  className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <RadioGroup.Indicator className="w-2 h-2 rounded-full bg-blue-600" />
                </RadioGroup.Item>
                <label className="text-sm text-gray-700 cursor-pointer">
                  {option.label}
                </label>
              </div>
            ))}
          </RadioGroup.Root>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={handleCreateShareLink}
          disabled={creating}
          className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-center"
        >
          {creating ? "Creating..." : "Create Link"}
        </button>
        <button
          onClick={() => setShowCreateForm(false)}
          className="flex-1 border border-gray-300 bg-white px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-center"
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

    return (
      <div
        key={link.shareToken}
        className={`bg-white rounded-xl border transition-all ${
          isExpired ? "border-red-200 bg-red-50" : "border-gray-200"
        } p-4 sm:p-6`}
      >
        {/* Hidden QR Code for PDF Generation */}
        <div className="hidden" data-qr-url={link.shareUrl}>
          <QRCodeSVG value={link.shareUrl} size={256} />
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {isExpired && (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <p className="text-lg font-semibold text-gray-900 truncate">
                {link.description || "Share Link"}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium text-gray-700">Share URL:</span>
              </div>
              <input
                type="text"
                readOnly
                value={link.shareUrl}
                className="w-full bg-white text-gray-700 border border-gray-200 rounded-md p-2 text-xs font-mono select-all"
                onClick={(e) => e.target.select()}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>
                  Expires:{" "}
                  <span
                    className={`font-medium ${
                      isExpired ? "text-red-600" : "text-gray-700"
                    }`}
                  >
                    {formatDate(link.expiresAt)}
                  </span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Created: {formatDate(link.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Mobile Optimized */}
          <div
            className={`grid gap-2 pt-4 border-t border-gray-100 ${
              isMobile && navigator.share
                ? "grid-cols-3" // Mobile with share: Copy, Share, QR, Revoke (spans 3)
                : "grid-cols-2 sm:grid-cols-4" // Desktop or mobile without share
            }`}
          >
            {/* Copy Button */}
            <button
              onClick={() => handleCopyLink(link.shareUrl, link.description)}
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              title="Copy link to clipboard"
            >
              <ClipboardIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Copy</span>
            </button>

            {/* Share Button - Only show on mobile if Web Share API is supported */}
            {isMobile && navigator.share && (
              <button
                onClick={() => handleShareLink(link.shareUrl, link.description)}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                title="Share via device apps"
              >
                <ShareIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Share</span>
              </button>
            )}

            {/* QR Code Button */}
            <button
              onClick={() =>
                handleDownloadQRCode(link.shareUrl, link.description)
              }
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
              title="Download QR code"
            >
              <QrCodeIcon className="w-5 h-5" />
              <span className="text-sm font-medium">QR</span>
            </button>

            {/* Revoke Button */}
            <button
              onClick={() => handleRevokeLink(link.shareToken)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors ${
                isMobile && navigator.share
                  ? "col-span-3" // Span all 3 columns on mobile with share
                  : "col-span-2 sm:col-span-2" // Original spanning
              }`}
              title="Revoke link"
            >
              <TrashIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Revoke Link</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Mobile-first responsive design
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-opacity">
      <div
        className={`bg-white shadow-2xl w-full flex flex-col ${
          isMobile
            ? "rounded-t-3xl max-h-[90vh] min-h-[60vh]"
            : "rounded-2xl max-w-4xl max-h-[90vh]"
        }`}
      >
        {/* Header - Mobile Optimized */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ShareIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Share Binder
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {binder?.metadata?.name || "Unnamed Binder"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Pull indicator for mobile */}
        {isMobile && (
          <div className="flex justify-center py-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
          {/* Binder status check */}
          {!binder?.permissions?.public && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800">
                    Binder is private
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Make your binder public first to create share links.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Web Share API info for mobile */}
          {navigator.share && isMobile && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <DevicePhoneMobileIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-800">
                    Enhanced Mobile Sharing
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Share directly to your favorite apps with native mobile
                    sharing!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Create New Link Button / Form */}
          {binder?.permissions?.public &&
            !showCreateForm &&
            shareLinks.length < 5 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center space-x-3 bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 transition-all transform active:scale-[0.98] shadow-lg"
                >
                  <PlusIcon className="w-6 h-6" />
                  <span className="text-lg font-semibold">
                    Create New Share Link
                  </span>
                </button>
              </div>
            )}

          {shareLinks.length >= 5 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-sm text-blue-800">
                You have reached the maximum of 5 active share links. Revoke an
                existing link to create a new one.
              </p>
            </div>
          )}

          {showCreateForm && renderCreateForm()}

          {/* Links List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : shareLinks.length === 0 && !showCreateForm ? (
              <div className="text-center py-12 text-gray-500">
                <ShareIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-800">
                  No share links yet
                </h3>
                <p className="text-sm mt-2">
                  Create your first link to share this binder with others.
                </p>
              </div>
            ) : (
              shareLinks.map(renderLinkItem)
            )}
          </div>
        </div>

        {/* Safe area padding for mobile */}
        {isMobile && (
          <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
        )}
      </div>
    </div>
  );
};

export default ShareLinkModal;

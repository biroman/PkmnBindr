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
} from "@heroicons/react/24/outline";

/**
 * ShareLinkModal - Modal for managing binder share links
 * Allows users to create, view, copy, and revoke share links
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
  const [selectedExpiration, setSelectedExpiration] = useState("never"); // Default to 'Never'

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

  const handleCopyLink = async (shareUrl) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Failed to copy link");
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
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (!isOpen) return null;

  const renderCreateForm = () => (
    <div className="bg-gray-50 rounded-lg p-6 mt-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Create a New Share Link
      </h3>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="link-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (Optional)
          </label>
          <input
            id="link-description"
            type="text"
            value={newLinkDesc}
            onChange={(e) => setNewLinkDesc(e.target.value)}
            placeholder="e.g., For sharing on social media"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expires In
          </label>
          <RadioGroup.Root
            value={selectedExpiration}
            onValueChange={setSelectedExpiration}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
          >
            {expirationOptions.map((opt) => (
              <RadioGroup.Item
                key={opt.id}
                value={opt.id}
                id={opt.id}
                className="group relative flex items-center justify-center rounded-md border py-3 px-4 text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 cursor-pointer bg-white text-gray-900 shadow-sm transition-all"
              >
                <RadioGroup.Indicator className="absolute -inset-px rounded-md border-2 border-blue-500" />
                {opt.label}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </div>
      </div>

      <div className="flex space-x-3 mt-6">
        <button
          onClick={handleCreateShareLink}
          disabled={creating}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition"
        >
          {creating ? "Creating..." : "Create Link"}
        </button>
        <button
          onClick={() => setShowCreateForm(false)}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
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
        className={`bg-white rounded-lg p-4 border transition-all ${
          isExpired ? "border-red-200 bg-red-50" : "border-gray-200"
        }`}
      >
        {/* Hidden QR Code for PDF Generation */}
        <div className="hidden" data-qr-url={link.shareUrl}>
          <QRCodeSVG value={link.shareUrl} size={256} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              {isExpired && (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <p className="text-md font-semibold text-gray-900 truncate">
                {link.description || "Share Link"}
              </p>
            </div>

            <div className="mt-2 space-y-2 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <LinkIcon className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  readOnly
                  value={link.shareUrl}
                  className="w-full bg-gray-50 text-gray-700 border-gray-200 rounded-md p-1 text-xs"
                />
              </div>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
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
              <div className="flex items-center space-x-2 pt-1">
                <ClockIcon className="w-4 h-4 text-gray-400" />
                <span>Created: {formatDate(link.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2">
            <button
              onClick={() => handleCopyLink(link.shareUrl)}
              className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition"
              aria-label="Copy link"
            >
              <ClipboardIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() =>
                handleDownloadQRCode(link.shareUrl, link.description)
              }
              className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition"
              aria-label="Download QR code"
            >
              <QrCodeIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleRevokeLink(link.shareToken)}
              className="p-2 rounded-md bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition"
              aria-label="Revoke link"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share Links</h2>
              <p className="text-sm text-gray-500 truncate">
                {binder?.metadata?.name || "Unnamed Binder"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-grow overflow-y-auto">
          {/* Binder status check */}
          {!binder?.permissions?.public && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-lg">
              <div className="flex">
                <div className="py-1">
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 mr-3" />
                </div>
                <div>
                  <p className="font-bold">This binder is private</p>
                  <p className="text-sm">
                    Make your binder public first to create share links.
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
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-md"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="text-lg font-semibold">
                    Create New Share Link
                  </span>
                </button>
              </div>
            )}

          {shareLinks.length >= 5 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
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
                <LinkIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-800">
                  No share links yet
                </h3>
                <p>Create your first link to share this binder with others.</p>
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

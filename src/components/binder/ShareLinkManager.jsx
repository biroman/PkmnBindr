import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import {
  XMarkIcon,
  ShareIcon,
  LinkIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  PlusIcon,
  QrCodeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GlobeAltIcon,
  CalendarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { useBinderContext } from "../../contexts/BinderContext";
import {
  copyShareLink,
  generateSocialUrls,
  generateSocialShareData,
  validateCustomSlug,
  formatShareUrlForDisplay,
  generateShareUrl,
} from "../../utils/shareUtils";

const ShareLinkManager = ({ binder, isOpen, onClose }) => {
  const { createShareLink, getBinderShares, deactivateShareLink } =
    useBinderContext();

  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedShare, setExpandedShare] = useState(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    customSlug: "",
    hasExpiration: false,
    expirationDays: 30,
  });
  const [slugValidation, setSlugValidation] = useState({
    isValid: true,
    error: "",
  });

  // Load existing shares
  useEffect(() => {
    if (isOpen && binder?.id) {
      loadShares();
    }
  }, [isOpen, binder?.id]);

  // Validate custom slug on change
  useEffect(() => {
    if (createForm.customSlug.trim()) {
      const validation = validateCustomSlug(createForm.customSlug.trim());
      setSlugValidation(validation);
    } else {
      setSlugValidation({ isValid: true, error: "" });
    }
  }, [createForm.customSlug]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, onClose]);

  const loadShares = async () => {
    try {
      setLoading(true);
      const binderShares = await getBinderShares(binder.id);
      setShares(binderShares || []);
    } catch (error) {
      console.error("Failed to load shares:", error);
      toast.error("Failed to load share links");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    try {
      setCreating(true);

      // Validate slug if provided
      if (createForm.customSlug.trim() && !slugValidation.isValid) {
        toast.error(slugValidation.error);
        return;
      }

      const options = {};

      // Add custom slug if provided
      if (createForm.customSlug.trim()) {
        options.customSlug = createForm.customSlug.trim();
      }

      // Add expiration if enabled
      if (createForm.hasExpiration) {
        const expirationDate = new Date();
        expirationDate.setDate(
          expirationDate.getDate() + parseInt(createForm.expirationDays)
        );
        options.expiresAt = expirationDate;
      }

      const shareLink = await createShareLink(binder.id, options);

      toast.success("Share link created successfully!");

      // Reset form
      setCreateForm({
        customSlug: "",
        hasExpiration: false,
        expirationDays: 30,
      });
      setShowCreateForm(false);

      // Reload shares
      await loadShares();
    } catch (error) {
      console.error("Failed to create share link:", error);
      toast.error(error.message || "Failed to create share link");
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivateShare = async (shareId) => {
    if (
      !confirm(
        "Are you sure you want to deactivate this share link? It will no longer be accessible."
      )
    ) {
      return;
    }

    try {
      await deactivateShareLink(shareId);
      toast.success("Share link deactivated");
      await loadShares();
    } catch (error) {
      console.error("Failed to deactivate share:", error);
      toast.error("Failed to deactivate share link");
    }
  };

  const handleCopyLink = async (shareUrl) => {
    const success = await copyShareLink(shareUrl);
    if (success) {
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("Failed to copy link");
    }
  };

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(
      date.seconds ? date.seconds * 1000 : date
    ).toLocaleDateString();
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    const expDate = new Date(
      expiresAt.seconds ? expiresAt.seconds * 1000 : expiresAt
    );
    return expDate < new Date();
  };

  const getSocialUrls = (shareUrl) => {
    const shareData = generateSocialShareData(
      binder,
      shareUrl,
      binder?.owner || {},
      {}
    );
    return generateSocialUrls(shareData);
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ShareIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share Links</h2>
              <p className="text-sm text-gray-500">{binder?.metadata?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <GlobeAltIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">
                    Public Binder Sharing
                  </h3>
                  <p className="text-sm text-blue-700">
                    Create shareable links that allow anyone to view your public
                    binder, even without an account. Perfect for sharing on
                    social media or with friends.
                  </p>
                </div>
              </div>
            </div>

            {/* Create New Share Link */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Share Links</h3>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Create New Link
                </button>
              </div>

              {/* Create Form */}
              {showCreateForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="space-y-4">
                    {/* Custom Slug */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom URL (optional)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-l-lg border">
                          pkmnbindr.com/s/
                        </span>
                        <input
                          type="text"
                          value={createForm.customSlug}
                          onChange={(e) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              customSlug: e.target.value,
                            }))
                          }
                          placeholder="my-pokemon-collection"
                          className={`flex-1 p-2 border rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            createForm.customSlug && !slugValidation.isValid
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                        />
                      </div>
                      {createForm.customSlug && !slugValidation.isValid && (
                        <p className="text-sm text-red-600 mt-1">
                          {slugValidation.error}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty for auto-generated URL. Use lowercase
                        letters, numbers, and hyphens only.
                      </p>
                    </div>

                    {/* Expiration */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={createForm.hasExpiration}
                          onChange={(e) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              hasExpiration: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Set expiration date
                      </label>

                      {createForm.hasExpiration && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            Expires in
                          </span>
                          <select
                            value={createForm.expirationDays}
                            onChange={(e) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                expirationDays: e.target.value,
                              }))
                            }
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="1">1 day</option>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCreateShare}
                        disabled={
                          creating ||
                          (createForm.customSlug.trim() &&
                            !slugValidation.isValid)
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {creating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4" />
                            Create Link
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Existing Shares */}
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : shares.length === 0 ? (
                <div className="text-center py-8">
                  <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No share links created yet</p>
                  <p className="text-sm text-gray-400">
                    Create your first share link to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shares.map((share) => (
                    <div
                      key={share.shareId}
                      className={`border rounded-lg p-4 ${
                        isExpired(share.expiresAt)
                          ? "border-red-200 bg-red-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {share.customSlug ? (
                              <span className="text-sm font-medium text-gray-900">
                                /s/{share.customSlug}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500 font-mono">
                                {share.shareId}
                              </span>
                            )}

                            {isExpired(share.expiresAt) && (
                              <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                                Expired
                              </span>
                            )}

                            {!share.isActive && (
                              <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <EyeIcon className="w-4 h-4" />
                              {share.analytics?.viewCount || 0} views
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              Created {formatDate(share.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedShare(
                                expandedShare === share.shareId
                                  ? null
                                  : share.shareId
                              )
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View details"
                          >
                            {expandedShare === share.shareId ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </button>

                          {share.isActive && !isExpired(share.expiresAt) && (
                            <button
                              onClick={() =>
                                handleCopyLink(
                                  generateShareUrl(
                                    share.shareId,
                                    share.customSlug
                                  )
                                )
                              }
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Copy link"
                            >
                              <ClipboardDocumentIcon className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeactivateShare(share.shareId)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Deactivate link"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedShare === share.shareId && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {/* Full URL */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Share URL
                            </label>
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <input
                                type="text"
                                value={generateShareUrl(
                                  share.shareId,
                                  share.customSlug
                                )}
                                readOnly
                                className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                              />
                              <button
                                onClick={() =>
                                  handleCopyLink(
                                    generateShareUrl(
                                      share.shareId,
                                      share.customSlug
                                    )
                                  )
                                }
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Copy URL"
                              >
                                <ClipboardDocumentIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Social Sharing */}
                          {share.isActive && !isExpired(share.expiresAt) && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Share on Social Media
                              </label>
                              <div className="flex gap-2">
                                {Object.entries(
                                  getSocialUrls(
                                    generateShareUrl(
                                      share.shareId,
                                      share.customSlug
                                    )
                                  )
                                ).map(([platform, url]) => (
                                  <a
                                    key={platform}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors capitalize"
                                  >
                                    {platform}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Analytics Summary */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Analytics
                            </label>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-gray-500">Total Views</div>
                                <div className="font-semibold">
                                  {share.analytics?.viewCount || 0}
                                </div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-gray-500">
                                  Unique Visitors
                                </div>
                                <div className="font-semibold">
                                  {share.analytics?.uniqueVisitors || 0}
                                </div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-gray-500">Last Viewed</div>
                                <div className="font-semibold">
                                  {formatDate(share.analytics?.lastViewed)}
                                </div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-gray-500">Expires</div>
                                <div className="font-semibold">
                                  {formatDate(share.expiresAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Use React Portal to render modal at document body level
  return createPortal(modalContent, document.body);
};

export default ShareLinkManager;

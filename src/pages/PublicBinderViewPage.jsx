import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBinderContext } from "../contexts/BinderContext";
import { getUserProfile } from "../utils/userManagement";
import {
  createFallbackOwnerData,
  generateSharingData,
  handleShare,
} from "../utils/publicUtils";

import { toast } from "react-hot-toast";
import BinderContainer from "../components/binder/BinderContainer";
import PublicBreadcrumb from "../components/ui/PublicBreadcrumb";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

const PublicBinderViewPage = () => {
  const { binderId, userId: urlUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getPublicBinder } = useBinderContext();

  const [binder, setBinder] = useState(null);
  const [binderOwner, setBinderOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);

  // Get state from navigation (if available)
  const {
    ownerId,
    isPublic,
    binderName,
    ownerDisplayName,
    ownerPhotoURL,
    fallbackOwnerData,
  } = location.state || {};

  useEffect(() => {
    const loadPublicBinder = async () => {
      try {
        setLoading(true);

        if (!user) {
          toast.error("Please log in to view public binders");
          navigate("/login");
          return;
        }

        if (!binderId) {
          toast.error("Binder ID is required");
          navigate("/");
          return;
        }

        // Try to get owner ID from multiple sources
        let ownerIdToUse = ownerId || urlUserId;

        // If no owner ID from navigation state or URL, try to extract from binder data
        if (!ownerIdToUse) {
          console.warn(
            "No owner ID in navigation state, attempting to fetch binder to determine owner"
          );

          // Try to fetch all public binders to find this one (fallback method)
          try {
            const { fetchUserPublicBinders } = await import(
              "../contexts/BinderContext"
            );
            // This is a fallback - in a real app you'd want a more efficient method
            console.warn(
              "Owner ID missing - this should be handled by better URL structure"
            );
          } catch (fallbackError) {
            console.error("Fallback method failed:", fallbackError);
          }

          // If we still don't have owner ID, show error
          if (!ownerIdToUse) {
            toast.error(
              "Unable to determine binder owner. Please access this binder from the owner's profile."
            );
            navigate("/");
            return;
          }
        }

        // Fetch the public binder
        const binderData = await getPublicBinder(binderId, ownerIdToUse);
        setBinder(binderData);

        // Try to get owner data - prioritize real profile data
        let ownerData = null;

        // First, try to fetch the real user profile from Firebase
        try {
          ownerData = await getUserProfile(ownerIdToUse);
        } catch (profileError) {
          console.error("Error fetching owner profile:", profileError);

          // If that fails, try using fallback data from navigation state
          if (fallbackOwnerData) {
            ownerData = fallbackOwnerData;
          } else {
            // Last resort: create minimal owner data from available information
            ownerData = createFallbackOwnerData(
              ownerIdToUse,
              ownerDisplayName || binderData.lastModifiedBy,
              ownerPhotoURL
            );
          }
        }

        setBinderOwner(ownerData);
      } catch (error) {
        console.error("Error loading public binder:", error);

        if (error.message === "Binder is private") {
          toast.error("This binder is private and cannot be viewed publicly");
        } else if (error.message === "Binder not found") {
          toast.error("Binder not found");
        } else {
          toast.error("Failed to load binder");
        }
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadPublicBinder();
  }, [
    binderId,
    ownerId,
    urlUserId,
    user,
    navigate,
    getPublicBinder,
    ownerDisplayName,
    ownerPhotoURL,
    fallbackOwnerData,
  ]);

  const handleCardClick = (card) => {
    // If the same card is clicked again, close the modal
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  const handleShareBinder = async () => {
    if (!binder || !binderOwner) return;

    const sharingData = generateSharingData(binder, binderOwner);
    await handleShare(
      sharingData,
      () => toast.success("Link copied to clipboard!"),
      (error) => toast.error("Failed to share: " + error.message)
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading binder...</p>
        </div>
      </div>
    );
  }

  if (!binder || !binderOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <DocumentTextIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Binder Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The binder you're looking for doesn't exist or is private.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb Navigation */}
      {binderOwner && (
        <div className="absolute top-4 left-4 z-40">
          <PublicBreadcrumb
            ownerName={binderOwner.displayName}
            ownerPhotoURL={binderOwner.photoURL}
            ownerId={binderOwner.uid}
            contentType="binder"
            contentName={binder?.metadata?.name}
          />
        </div>
      )}

      {/* Main Content Layout using BinderContainer */}
      <BinderContainer
        binder={binder}
        owner={binderOwner}
        mode="readonly"
        features={{
          toolbar: false,
          sidebar: false,
          dragDrop: false,
          modals: false, // We handle card modal separately
          keyboard: true,
          edgeNavigation: false,
          export: false,
          addCards: false,
          deleteCards: false,
          clearBinder: false,
          pageManagement: false,
          sorting: false,
          autoSort: false,
        }}
        onCardClick={handleCardClick}
        className="relative"
        style={{
          background:
            "linear-gradient(to bottom right, rgb(248 250 252), rgb(241 245 249))",
        }}
        // Public view specific props
        isPublicView={true}
        binderOwner={binderOwner}
      />

      {/* Card Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal when clicking outside
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          {/* Card Image - No background */}
          <div className="mb-4">
            {(selectedCard.image || selectedCard.imageSmall) && (
              <img
                src={selectedCard.image || selectedCard.imageSmall}
                alt={selectedCard.name}
                className="max-w-sm w-full h-auto cursor-pointer shadow-2xl rounded-lg"
                onClick={handleCloseModal}
                style={{ maxHeight: "60vh" }}
              />
            )}
          </div>

          {/* White Info Panel Below */}
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl transform transition-all duration-300 ease-out cursor-pointer"
            onClick={handleCloseModal}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 truncate">
                {selectedCard.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseModal();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Card Details */}
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Set</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedCard.set?.name || "Unknown"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Number
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedCard.number || "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Rarity
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedCard.rarity || "Unknown"}
                  </span>
                </div>

                {selectedCard.artist && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Artist
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedCard.artist}
                    </span>
                  </div>
                )}

                {selectedCard.types && selectedCard.types.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Types
                    </span>
                    <div className="flex gap-1">
                      {selectedCard.types.map((type, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCard.binderMetadata?.notes && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="pt-2">
                      <span className="text-sm font-medium text-gray-600 block mb-1">
                        Notes
                      </span>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-lg">
                        {selectedCard.binderMetadata.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Click to close hint */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Click the card or outside to close
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicBinderViewPage;

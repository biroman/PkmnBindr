import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import BinderContainer from "../binder/BinderContainer";
import AdminBinderSidebar from "./AdminBinderSidebar";
import CardRepairTool from "./CardRepairTool";
import ImageUpdateTool from "./ImageUpdateTool";
import { fetchBinderForAdminView } from "../../utils/userManagement";

const BinderViewer = () => {
  const navigate = useNavigate();
  const { userId, binderId, source } = useParams();
  const [currentBinder, setCurrentBinder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [showRepairTool, setShowRepairTool] = useState(false);
  const [showImageUpdateTool, setShowImageUpdateTool] = useState(false);

  // Load binder data
  useEffect(() => {
    const loadBinder = async () => {
      if (!userId || !binderId) {
        setError("Invalid binder parameters");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log(
          `Loading binder ${binderId} for user ${userId} from ${source}`
        );
        const binderData = await fetchBinderForAdminView(
          binderId,
          userId,
          source
        );

        setCurrentBinder(binderData);

        // Debug logging for card data
        console.log(`[BinderViewer] Loaded binder:`, binderData);
        console.log(`[BinderViewer] Cards data:`, binderData.cards);

        // Log cards without images
        const cardsWithoutImages = Object.entries(
          binderData.cards || {}
        ).filter(([pos, card]) => {
          return card && !card.image && !card.imageSmall;
        });

        if (cardsWithoutImages.length > 0) {
          console.warn(
            `[BinderViewer] Found ${cardsWithoutImages.length} cards without images:`,
            cardsWithoutImages
          );
        }

        // Log cards with broken/invalid image URLs
        const cardsWithPotentialImageIssues = Object.entries(
          binderData.cards || {}
        ).filter(([pos, card]) => {
          if (!card) return false;
          const imageUrl = card.imageSmall || card.image;
          return (
            imageUrl &&
            (!imageUrl.startsWith("http") ||
              imageUrl.includes("undefined") ||
              imageUrl.includes("null"))
          );
        });

        if (cardsWithPotentialImageIssues.length > 0) {
          console.warn(
            `[BinderViewer] Found ${cardsWithPotentialImageIssues.length} cards with potential image URL issues:`,
            cardsWithPotentialImageIssues
          );
        }

        toast.success(
          `Loaded ${binderData.metadata.name} (${
            Object.keys(binderData.cards || {}).length
          } cards)`
        );
      } catch (err) {
        console.error("Error loading binder:", err);
        setError(err.message);
        toast.error(`Failed to load binder: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadBinder();
  }, [userId, binderId, source]);

  // Admin tool handlers
  const handleRepairComplete = async (results) => {
    console.log("Card repair completed:", results);
    if (results.repairedCount > 0) {
      toast.success(`Repaired ${results.repairedCount} cards successfully!`);
      // Reload binder to show updated data
      try {
        const binderData = await fetchBinderForAdminView(
          binderId,
          userId,
          source
        );
        setCurrentBinder(binderData);
      } catch (err) {
        console.error("Error reloading binder after repair:", err);
        toast.error("Failed to reload binder data");
      }
    }
  };

  const handleImageUpdateComplete = async (results) => {
    console.log("Image update completed:", results);
    if (results.updatedCount > 0) {
      toast.success(
        `Updated ${results.updatedCount} card images successfully!`
      );
      // Reload binder to show updated data
      try {
        const binderData = await fetchBinderForAdminView(
          binderId,
          userId,
          source
        );
        setCurrentBinder(binderData);
      } catch (err) {
        console.error("Error reloading binder after image update:", err);
        toast.error("Failed to reload binder data");
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin binder view...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/admin")}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  if (!currentBinder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Binder Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The binder you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/admin")}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Main Content Layout - Full screen with proper background handling */}
      <div className="flex min-h-screen">
        {/* Admin Sidebar */}
        <AdminBinderSidebar
          binder={currentBinder}
          userId={userId}
          binderId={binderId}
          source={source}
          showRepairTool={showRepairTool}
          onToggleRepairTool={() => setShowRepairTool(!showRepairTool)}
          showImageUpdateTool={showImageUpdateTool}
          onToggleImageUpdateTool={() =>
            setShowImageUpdateTool(!showImageUpdateTool)
          }
          isVisible={isSidebarVisible}
          onToggleVisibility={() => setIsSidebarVisible(!isSidebarVisible)}
        />

        {/* Main Binder Area using BinderContainer */}
        <div className="flex-1">
          <BinderContainer
            binder={currentBinder}
            mode="admin"
            features={{
              toolbar: false,
              sidebar: false, // We handle sidebar separately
              dragDrop: false, // Admin view is read-only
              modals: false,
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
            className="min-h-screen"
          />
        </div>
      </div>

      {/* Admin Tool Panels - positioned as overlay when active */}
      {showRepairTool && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 p-6">
          <div className="max-w-6xl mx-auto">
            <CardRepairTool
              userId={userId}
              binderId={binderId}
              source={source}
              onRepairComplete={handleRepairComplete}
            />
          </div>
        </div>
      )}

      {showImageUpdateTool && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 p-6">
          <div className="max-w-6xl mx-auto">
            <ImageUpdateTool
              userId={userId}
              binderId={binderId}
              source={source}
              onUpdateComplete={handleImageUpdateComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BinderViewer;

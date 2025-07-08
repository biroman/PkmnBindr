import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocumentHead } from "../hooks/useDocumentHead";
import { toast } from "react-hot-toast";

// Import our refactored components
import BinderContainer from "../components/binder/BinderContainer";
// Sidebar removed to match public view

const StaticBinderPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [binderData, setBinderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Card modal state
  const [selectedCard, setSelectedCard] = useState(null);

  const handleCardClick = (card) => {
    // Toggle modal on same card click
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  // Load static binder data
  useEffect(() => {
    const loadStaticBinder = async () => {
      if (!slug) {
        setError("Invalid binder slug");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load from public static files (no Firebase!)
        const response = await fetch(`/static-binders/${slug}.json`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Binder not found");
          }
          throw new Error(`Failed to load binder: ${response.status}`);
        }

        const data = await response.json();
        setBinderData(data);

        // Track view (optional analytics without Firebase)
        console.log(`Viewed static binder: ${data.metadata.name}`);
      } catch (err) {
        console.error("Error loading static binder:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadStaticBinder();
  }, [slug]);

  // Share handler
  const handleShare = async () => {
    const url = `https://www.pkmnbindr.com/binders/${slug}`;
    const title = `${binderData.metadata.name} - Pokemon Card Collection`;
    const text = `Check out this amazing Pokemon card collection: ${binderData.metadata.name}`;

    try {
      if (navigator.share && navigator.canShare({ title, text, url })) {
        await navigator.share({ title, text, url });
      } else {
        fallbackShare(url);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
        fallbackShare(url);
      }
    }
  };

  const fallbackShare = (url) => {
    try {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);

      // Final fallback - show URL in a prompt
      const userAgent = navigator.userAgent;
      if (userAgent.includes("Mobile") || userAgent.includes("Tablet")) {
        // On mobile, try to open share dialog anyway
        try {
          window.open(
            `mailto:?subject=${encodeURIComponent(
              `${binderData.metadata.name} - Pokemon Card Collection`
            )}&body=${encodeURIComponent(
              `Check out this amazing Pokemon card collection: ${binderData.metadata.name}\n\n${url}`
            )}`,
            "_blank"
          );
        } catch {
          prompt("Copy this link to share:", url);
        }
      } else {
        prompt("Copy this link to share:", url);
      }
    }
  };

  // SEO optimization
  useDocumentHead({
    title: binderData?.seo?.title,
    description: binderData?.seo?.description,
    keywords: binderData?.seo?.keywords,
    ogTitle: binderData?.seo?.title,
    ogDescription: binderData?.seo?.description,
    ogImage: binderData?.seo?.ogImage,
    ogUrl: `https://www.pkmnbindr.com/binders/${slug}`,
    canonicalUrl: binderData?.seo?.canonicalUrl,
    structuredData: binderData
      ? {
          "@context": "https://schema.org",
          "@type": "Collection",
          name: binderData.metadata.name,
          description: binderData.metadata.description,
          url: `https://www.pkmnbindr.com/binders/${slug}`,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: binderData.metadata.statistics.cardCount,
            itemListElement: Object.values(binderData.cards || {}).map(
              (card, index) => ({
                "@type": "Thing",
                position: index + 1,
                name: card?.name || "Pokemon Card",
                description: card?.set?.name || "Trading Card",
              })
            ),
          },
          creator: {
            "@type": "Organization",
            name: "Pokemon Card Collection",
          },
        }
      : null,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card-background rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="animate-pulse">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-blue-200 rounded-full"></div>
            </div>
            <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto mb-6"></div>
            <div className="space-y-3">
              <div className="h-3 bg-slate-200 rounded"></div>
              <div className="h-3 bg-slate-200 rounded w-5/6"></div>
              <div className="h-3 bg-slate-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Binder Not Found
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/binders")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Collections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* Full-width Binder – identical to share-link view, but accounting for navbar */}
      <BinderContainer
        binder={binderData}
        mode="readonly"
        hasNavbar={true}
        features={{
          toolbar: false,
          sidebar: false,
          dragDrop: false,
          modals: false,
          keyboard: true,
          edgeNavigation: true,
          export: false,
          addCards: false,
          deleteCards: false,
          clearBinder: false,
          pageManagement: false,
          sorting: false,
          autoSort: false,
        }}
        onCardClick={handleCardClick}
        isPublicView={true}
        binderOwner={null}
      />

      {/* Card Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          {/* Card Image */}
          <div className="mb-4">
            {(selectedCard.image || selectedCard.imageSmall) && (
              <img
                src={selectedCard.image || selectedCard.imageSmall}
                alt={selectedCard.name}
                className="cursor-pointer shadow-2xl rounded-lg"
                style={{ maxHeight: "60vh" }}
                onClick={handleCloseModal}
              />
            )}
          </div>

          {/* Info Panel */}
          <div
            className="bg-card-background rounded-2xl max-w-lg w-full shadow-2xl transform transition-all duration-300 ease-out cursor-pointer"
            onClick={handleCloseModal}
          >
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
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Set</span>
                <span className="font-semibold text-gray-900">
                  {selectedCard.set?.name || "Unknown"}
                </span>
              </div>
              {selectedCard.number && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Number</span>
                  <span className="font-semibold text-gray-900">
                    {selectedCard.number}
                  </span>
                </div>
              )}
              {selectedCard.rarity && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rarity</span>
                  <span className="font-semibold text-gray-900">
                    {selectedCard.rarity}
                  </span>
                </div>
              )}
              {selectedCard.types && selectedCard.types.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Type</span>
                  <span className="font-semibold text-gray-900">
                    {selectedCard.types.join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaticBinderPage;

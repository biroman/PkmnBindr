import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocumentHead } from "../hooks/useDocumentHead";
import { toast } from "react-hot-toast";

// Import our refactored components
import BinderContainer from "../components/binder/BinderContainer";
import StaticBinderSidebar from "../components/binder/StaticBinderSidebar";

const StaticBinderPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [binderData, setBinderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
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
    <div className="bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main Content Layout */}
      <div className="flex h-[calc(100vh-65px)]">
        {/* Custom Sidebar for Static Binders */}
        <StaticBinderSidebar
          binder={binderData}
          onShare={handleShare}
          isVisible={isSidebarVisible}
          onToggleVisibility={() => setIsSidebarVisible(!isSidebarVisible)}
        />

        {/* Main Binder Area using BinderContainer */}
        <div className="flex-1 flex mt-10 justify-center relative">
          <BinderContainer
            binder={binderData}
            mode="readonly"
            features={{
              toolbar: false,
              sidebar: false, // We handle sidebar separately
              dragDrop: false,
              modals: false,
              keyboard: true, // Keep keyboard navigation
              edgeNavigation: false,
              export: false,
              addCards: false,
              deleteCards: false,
              clearBinder: false,
              pageManagement: false,
              sorting: false,
              autoSort: false,
            }}
            className="relative"
          />
        </div>
      </div>
    </div>
  );
};

export default StaticBinderPage;

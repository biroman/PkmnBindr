import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { EyeIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

const PublicBinderShowcase = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [staticBinders, setStaticBinders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Don't show for logged-in users - check this first!
  if (user) {
    return null;
  }

  useEffect(() => {
    loadStaticBinders();
  }, []);

  const loadStaticBinders = async () => {
    try {
      const response = await fetch("/static-binders/index.json");
      if (response.ok) {
        const data = await response.json();
        setStaticBinders(data.binders || []);
      }
    } catch (error) {
      console.log("No static binders found");
    } finally {
      setIsLoading(false);
    }
  };

  const featuredBinders = staticBinders.filter((binder) => binder.featured);
  const regularBinders = staticBinders.filter((binder) => !binder.featured);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (staticBinders.length === 0) {
    return null; // Don't show section if no static binders
  }

  const handleBinderClick = (binder) => {
    navigate(`/binders/${binder.slug}`);
  };

  const BinderCard = ({ binder, featured = false }) => (
    <div
      onClick={() => handleBinderClick(binder)}
      className={`group cursor-pointer transition-all duration-200 ${
        featured
          ? "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 hover:border-blue-300"
          : "bg-white hover:bg-gray-50"
      } border rounded-lg p-3 hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
          {binder.name}
        </h3>
        {featured && (
          <StarIconSolid className="h-4 w-4 text-yellow-500 flex-shrink-0 ml-2" />
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center">
          <PhotoIcon className="h-3 w-3 mr-1" />
          <span>{binder.statistics.cardCount} cards</span>
        </div>
        <div className="flex items-center text-gray-500">
          <EyeIcon className="h-3 w-3 mr-1" />
          <span>View</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Binder Examples
          </h2>
          <p className="text-sm text-gray-600">
            Explore Pokemon card collections
          </p>
        </div>
        <div className="text-2xl opacity-30">🎴</div>
      </div>

      {/* Show only featured binders in a compact horizontal layout */}
      {featuredBinders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {featuredBinders.slice(0, 3).map((binder) => (
            <BinderCard key={binder.slug} binder={binder} featured={true} />
          ))}
        </div>
      ) : (
        // Show first 3 regular binders if no featured ones
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {regularBinders.slice(0, 3).map((binder) => (
            <BinderCard key={binder.slug} binder={binder} />
          ))}
        </div>
      )}

      {staticBinders.length > 3 && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            +{staticBinders.length - 3} more collections available
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicBinderShowcase;

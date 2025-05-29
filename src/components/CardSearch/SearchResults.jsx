import { Search, Loader2 } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";
import { useQueryClient } from "@tanstack/react-query";
import SearchCard from "./SearchCard";

const SearchResults = ({
  isLoading,
  error,
  searchResults,
  searchQuery,
  selectedFilters,
  onAddCard,
  onAddToClipboard,
  recentlyAdded,
  pulsing,
  resultsRef,
}) => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className={`text-lg font-medium ${theme.colors.text.primary} mb-2`}
          >
            Search Error
          </div>
          <p className={`text-sm ${theme.colors.text.secondary} mb-4`}>
            {error.message}
          </p>
          <button
            onClick={() => {
              queryClient.invalidateQueries(["cards", "search"]);
            }}
            className={`
              px-4 py-2 rounded-lg
              ${theme.colors.button.primary}
              hover:${theme.colors.button.primaryHover}
              transition-colors
            `}
          >
            Retry Search
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2
            className={`w-8 h-8 animate-spin mx-auto mb-4 ${theme.colors.text.accent}`}
          />
          <p className={theme.colors.text.secondary}>Searching for cards...</p>
        </div>
      </div>
    );
  }

  if (searchResults.length > 0) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {searchResults.map((card) => (
          <SearchCard
            key={card.id}
            card={card}
            onAddCard={onAddCard}
            onAddToClipboard={onAddToClipboard}
            recentlyAdded={recentlyAdded}
            pulsing={pulsing}
          />
        ))}
      </div>
    );
  }

  if (searchQuery.trim() || selectedFilters.set) {
    return (
      <div className="text-center py-12">
        <div
          className={`w-16 h-16 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center mb-4`}
        >
          <Search className={`w-8 h-8 ${theme.colors.text.accent}`} />
        </div>
        <h3 className={`text-lg font-medium ${theme.colors.text.primary} mb-2`}>
          No cards found
        </h3>
        <p className={theme.colors.text.secondary}>
          Try adjusting your search terms or filters
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div
        className={`w-16 h-16 mx-auto rounded-full ${theme.colors.background.sidebar} flex items-center justify-center mb-4`}
      >
        <Search className={`w-8 h-8 ${theme.colors.text.accent}`} />
      </div>
      <h3 className={`text-lg font-medium ${theme.colors.text.primary} mb-2`}>
        Search for Pokemon Cards
      </h3>
      <p className={theme.colors.text.secondary}>
        Enter a card name or use filters to find cards to add to your binder
      </p>
    </div>
  );
};

export default SearchResults;

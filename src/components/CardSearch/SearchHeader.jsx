import { Search, X, Loader2 } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";
import SearchHelp from "./SearchHelp";

const SearchHeader = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  onClose,
  isLoading,
  isFetching,
  searchInputRef,
}) => {
  const { theme } = useTheme();

  return (
    <div className={`p-6 border-b ${theme.colors.border.light}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-2xl font-bold ${theme.colors.text.primary}`}>
          Add Cards to Binder
        </h2>
        <button
          onClick={onClose}
          className={`p-2 rounded-lg ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={onSearch} className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10 ${theme.colors.text.secondary}`}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search: Pikachu, Pikachu #25, artist:Ken Sugimori, number:5..."
              className={`w-full pl-10 pr-4 py-3 rounded-xl ${theme.colors.background.card} border ${theme.colors.border.accent} ${theme.colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-3 rounded-xl ${theme.colors.button.primary} font-medium flex items-center gap-2 disabled:opacity-50`}
          >
            {isLoading || isFetching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Search
          </button>
        </div>
      </form>

      {/* Search Help Section */}
      <SearchHelp />
    </div>
  );
};

export default SearchHeader;

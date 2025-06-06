import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Search, Loader2, ChevronDown, Package } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";
import { useFilteredSets } from "../../hooks";

const SetSelector = ({
  onSetSelect,
  selectedSet,
  loading = false,
  error = null,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Use React Query for sets data with built-in filtering
  const {
    data: filteredSets = [],
    isLoading,
    error: queryError,
  } = useFilteredSets(searchTerm);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !loading && setIsOpen(!isOpen)}
        disabled={loading}
        className={`
          w-full px-4 py-3 rounded-xl
          ${theme.colors.background.card}
          border ${theme.colors.border.accent}
          ${theme.colors.text.primary} 
          flex items-center gap-3
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
          transition-all duration-200
          hover:shadow-md
          ${isOpen ? "shadow-md" : ""}
          ${loading ? "cursor-not-allowed opacity-75" : ""}
        `}
      >
        <div
          className={`w-8 h-8 rounded-lg ${theme.colors.background.sidebar} flex items-center justify-center flex-shrink-0`}
        >
          {loading ? (
            <Loader2
              className={`w-4 h-4 ${theme.colors.text.accent} animate-spin`}
            />
          ) : selectedSet ? (
            <img
              src={selectedSet.images.symbol}
              alt={`${selectedSet.name} symbol`}
              className="w-5 h-5"
            />
          ) : (
            <Package className={`w-4 h-4 ${theme.colors.text.accent}`} />
          )}
        </div>

        <div className="flex-1 text-left">
          {loading ? (
            <div>
              <div className={`font-medium ${theme.colors.text.primary}`}>
                Loading Cards...
              </div>
              <div className={`text-sm ${theme.colors.text.secondary}`}>
                {selectedSet
                  ? `Fetching ${selectedSet.name} cards`
                  : "Please wait"}
              </div>
            </div>
          ) : error ? (
            <div>
              <div className={`font-medium text-red-400`}>API Error</div>
              <div className={`text-sm text-red-300`}>
                {error.includes("quota")
                  ? "Rate limit exceeded"
                  : "Loading failed"}
              </div>
            </div>
          ) : selectedSet ? (
            <div>
              <div className={`font-medium ${theme.colors.text.primary}`}>
                {selectedSet.name}
              </div>
              <div className={`text-sm ${theme.colors.text.secondary}`}>
                {selectedSet.series}
              </div>
            </div>
          ) : (
            <div>
              <div className={`font-medium ${theme.colors.text.secondary}`}>
                Choose a Pokemon Set
              </div>
              <div
                className={`text-sm ${theme.colors.text.secondary} opacity-60`}
              >
                Select from available sets
              </div>
            </div>
          )}
        </div>

        {!loading && (
          <ChevronDown
            className={`w-5 h-5 ${
              theme.colors.text.secondary
            } transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {isOpen && !loading && (
        <div
          className={`
            absolute z-50 w-full mt-2 
            ${theme.colors.background.sidebar} 
            border ${theme.colors.border.accent} 
            rounded-xl shadow-2xl 
            max-h-96 overflow-hidden 
            flex flex-col
          `}
        >
          {/* Search Header */}
          <div className={`p-4 border-b ${theme.colors.border.accent}`}>
            <div className="relative">
              <Search
                className={`w-4 h-4 ${theme.colors.text.secondary} absolute left-3 top-1/2 transform -translate-y-1/2 z-10`}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sets or series..."
                className={`
                  w-full pl-10 pr-4 py-3 rounded-lg
                  ${theme.colors.background.card}
                  border ${theme.colors.border.accent}
                  ${theme.colors.text.primary} 
                  placeholder:${theme.colors.text.secondary}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
                  transition-all duration-200
                `}
              />
            </div>
          </div>

          {/* Sets List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-3">
                  <Loader2
                    className={`w-8 h-8 ${theme.colors.text.accent} animate-spin mx-auto`}
                  />
                  <div className={`text-sm ${theme.colors.text.secondary}`}>
                    Loading Pokemon sets...
                  </div>
                </div>
              </div>
            ) : queryError ? (
              <div className="p-8 text-center">
                <div className={`text-sm ${theme.colors.text.secondary} mb-2`}>
                  Failed to load sets
                </div>
                <div
                  className={`text-xs ${theme.colors.text.secondary} opacity-60`}
                >
                  {queryError.message}
                </div>
              </div>
            ) : filteredSets.length === 0 ? (
              <div className="p-8 text-center">
                <div
                  className={`w-12 h-12 mx-auto rounded-full ${theme.colors.background.card} flex items-center justify-center mb-3`}
                >
                  <Search
                    className={`w-5 h-5 ${theme.colors.text.secondary}`}
                  />
                </div>
                <div className={`text-sm ${theme.colors.text.secondary}`}>
                  No sets found matching &ldquo;{searchTerm}&rdquo;
                </div>
              </div>
            ) : (
              <div className="p-2">
                {filteredSets.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => {
                      onSetSelect(set);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`
                      w-full p-3 rounded-lg text-left
                      ${theme.colors.button.secondary}
                      transition-all duration-200
                      hover:shadow-md
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
                      mb-1
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg ${theme.colors.background.card} flex items-center justify-center flex-shrink-0`}
                      >
                        <img
                          src={set.images.symbol}
                          alt={`${set.name} symbol`}
                          className="w-6 h-6"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium ${theme.colors.text.primary} truncate`}
                        >
                          {set.name}
                        </div>
                        <div
                          className={`text-sm ${theme.colors.text.secondary} truncate`}
                        >
                          {set.series} • {set.total} cards
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

SetSelector.propTypes = {
  onSetSelect: PropTypes.func.isRequired,
  selectedSet: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.object,
};

export default SetSelector;

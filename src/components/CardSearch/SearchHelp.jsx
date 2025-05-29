import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";

const SearchHelp = () => {
  const { theme } = useTheme();
  const [showSearchHelp, setShowSearchHelp] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowSearchHelp(!showSearchHelp)}
        className={`flex items-center gap-2 text-sm ${theme.colors.text.secondary} hover:${theme.colors.text.primary} transition-colors`}
      >
        <HelpCircle className="w-4 h-4" />
        <span>Search Help & Examples</span>
        {showSearchHelp ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {showSearchHelp && (
        <div
          className={`mt-3 p-4 rounded-lg ${theme.colors.background.card} border ${theme.colors.border.accent}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className={`font-medium ${theme.colors.text.primary} mb-2`}>
                Search Patterns
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <code
                    className={`px-2 py-1 rounded ${theme.colors.background.sidebar} font-mono text-xs`}
                  >
                    Pikachu
                  </code>
                  <span className={theme.colors.text.secondary}>Card name</span>
                </div>
                <div className="flex items-center gap-3">
                  <code
                    className={`px-2 py-1 rounded ${theme.colors.background.sidebar} font-mono text-xs`}
                  >
                    Pikachu #25
                  </code>
                  <span className={theme.colors.text.secondary}>
                    Name + number
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <code
                    className={`px-2 py-1 rounded ${theme.colors.background.sidebar} font-mono text-xs`}
                  >
                    25
                  </code>
                  <span className={theme.colors.text.secondary}>
                    Number only
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <code
                    className={`px-2 py-1 rounded ${theme.colors.background.sidebar} font-mono text-xs`}
                  >
                    number:25
                  </code>
                  <span className={theme.colors.text.secondary}>
                    Explicit number
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className={`font-medium ${theme.colors.text.primary} mb-2`}>
                Advanced Search
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <code
                    className={`px-2 py-1 rounded ${theme.colors.background.sidebar} font-mono text-xs`}
                  >
                    artist:Ken Sugimori
                  </code>
                  <span className={theme.colors.text.secondary}>By artist</span>
                </div>
                <div className="flex items-center gap-3">
                  <code
                    className={`px-2 py-1 rounded ${theme.colors.background.sidebar} font-mono text-xs`}
                  >
                    set:base1 Charizard
                  </code>
                  <span className={theme.colors.text.secondary}>
                    Set + name
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className={`mt-3 pt-3 border-t ${theme.colors.border.accent}`}>
            <p className={`text-xs ${theme.colors.text.secondary}`}>
              💡 <strong>Tip:</strong> Combine search patterns with the filters
              for even more precise results!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchHelp;

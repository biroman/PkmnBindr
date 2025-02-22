import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";

const SetSelector = ({ onSetSelect, selectedSet }) => {
  const { theme } = useTheme();
  const [sets, setSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const response = await fetch("https://api.pokemontcg.io/v2/sets");
        const data = await response.json();
        const sortedSets = data.data.sort(
          (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)
        );
        setSets(sortedSets);
      } catch (error) {
        console.error("Failed to fetch sets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSets();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSets = sets.filter(
    (set) =>
      set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      set.series.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-1.5 
          ${theme.colors.button.secondary}
          border ${theme.colors.border.accent} rounded 
          ${theme.colors.text.primary} text-sm 
          flex items-center justify-between 
          focus:outline-none focus:ring-1 focus:ring-offset-2
          ${!selectedSet ? "animate-pulse" : ""}
        `}
      >
        <span className="truncate">
          {selectedSet ? (
            <span className={theme.colors.text.primary}>
              {selectedSet.name}
            </span>
          ) : (
            <span className={theme.colors.text.secondary}>Select a set</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 ${theme.colors.text.secondary}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-full mt-1 ${theme.colors.background.sidebar} border ${theme.colors.border.accent} rounded-lg shadow-xl max-h-96 overflow-hidden flex flex-col`}
        >
          <div
            className={`p-2 border-b ${theme.colors.border.light} ${theme.colors.button.secondary}`}
          >
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sets..."
                className={`w-full px-3 py-1.5 pl-8 
                  ${theme.colors.button.secondary}
                  border ${theme.colors.border.accent} rounded 
                  ${theme.colors.text.primary} text-sm 
                  placeholder:${theme.colors.text.secondary}
                  focus:outline-none focus:ring-1 focus:ring-offset-2`}
              />
              <Search
                className={`w-4 h-4 ${theme.colors.text.secondary} absolute left-2 top-1/2 transform -translate-y-1/2`}
              />
            </div>
          </div>

          <div
            className={`overflow-y-auto flex-1 ${theme.colors.background.sidebar}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2
                  className={`w-6 h-6 ${theme.colors.text.accent} animate-spin`}
                />
              </div>
            ) : filteredSets.length === 0 ? (
              <div className={`p-4 text-center ${theme.colors.text.secondary}`}>
                No sets found
              </div>
            ) : (
              <div className="py-1">
                {filteredSets.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => {
                      onSetSelect(set);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`w-full px-4 py-2 text-left ${theme.colors.button.secondary} transition-colors`}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={set.images.symbol}
                        alt={`${set.name} symbol`}
                        className="w-6 h-6"
                      />
                      <div>
                        <div className={theme.colors.text.primary}>
                          {set.name}
                        </div>
                        <div className={theme.colors.text.secondary}>
                          {set.series}
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
};

export default SetSelector;

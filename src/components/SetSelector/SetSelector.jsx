import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Search, Loader2, ChevronDown } from "lucide-react";

const SetSelector = ({ onSetSelect, selectedSet }) => {
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
        bg-gray-700/50 backdrop-blur-sm 
        border border-gray-600 rounded 
        text-white text-sm 
        flex items-center justify-between 
        focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent
        ${!selectedSet ? "animate-pulse" : ""}
      `}
      >
        <span className="truncate">
          {selectedSet ? selectedSet.name : "Select a set"}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sets..."
                className="w-full px-3 py-1.5 pl-8 bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-2 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : filteredSets.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No sets found</div>
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
                    className="w-full px-4 py-2 text-left hover:bg-gray-700 focus:outline-none focus:bg-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={set.images.symbol}
                        alt={`${set.name} symbol`}
                        className="w-6 h-6"
                      />
                      <div>
                        <div className="text-white text-sm">{set.name}</div>
                        <div className="text-gray-400 text-xs">
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

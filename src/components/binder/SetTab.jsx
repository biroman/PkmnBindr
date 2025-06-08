import { useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import useSetSearch from "../../hooks/useSetSearch";
import { toast } from "react-hot-toast";

const SetTab = ({ currentBinder, onAddCards }) => {
  const {
    sets,
    isLoading,
    error,
    searchQuery,
    updateSearchQuery,
    getSetCards,
    filteredCount,
    totalSets,
  } = useSetSearch();

  const [selectedSets, setSelectedSets] = useState([]);
  const [addingSetId, setAddingSetId] = useState(null);

  const handleSetSelect = (set) => {
    setSelectedSets((prev) => {
      const isSelected = prev.some((s) => s.id === set.id);
      if (isSelected) {
        return prev.filter((s) => s.id !== set.id);
      } else {
        return [...prev, set];
      }
    });
  };

  const handleAddSingleSet = async (set) => {
    try {
      setAddingSetId(set.id);

      const cards = await getSetCards(set.id);
      await onAddCards(cards);

      toast.success(
        `Added ${cards.length} cards from ${set.name} to ${currentBinder.metadata.name}`
      );
    } catch (error) {
      console.error("Failed to add set:", error);
      toast.error(`Failed to add cards from ${set.name}`);
    } finally {
      setAddingSetId(null);
    }
  };

  const handleAddSelectedSets = async () => {
    if (selectedSets.length === 0) return;

    try {
      let totalCards = 0;

      for (const set of selectedSets) {
        setAddingSetId(set.id);
        const cards = await getSetCards(set.id);
        await onAddCards(cards);
        totalCards += cards.length;
      }

      toast.success(
        `Added ${totalCards} cards from ${selectedSets.length} sets to ${currentBinder.metadata.name}`
      );
      setSelectedSets([]);
    } catch (error) {
      console.error("Failed to add sets:", error);
      toast.error("Failed to add some sets");
    } finally {
      setAddingSetId(null);
    }
  };

  const isSetSelected = (setId) => {
    return selectedSets.some((set) => set.id === setId);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="text-red-800 font-medium">Error Loading Sets</div>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-6 border-b border-slate-200">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            placeholder="Search sets by name or series..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-600">
            Showing {filteredCount} of {totalSets} sets
          </div>

          {selectedSets.length > 0 && (
            <button
              onClick={handleAddSelectedSets}
              disabled={addingSetId !== null}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>
                {addingSetId
                  ? "Adding..."
                  : `Add ${selectedSets.length} Set${
                      selectedSets.length > 1 ? "s" : ""
                    }`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Sets Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-slate-600">Loading sets...</div>
          </div>
        ) : sets.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-400 text-lg mb-2">No sets found</div>
            <div className="text-slate-500 text-sm">
              {searchQuery
                ? "Try a different search term"
                : "Unable to load sets"}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((set) => (
              <div
                key={set.id}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  isSetSelected(set.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
                } ${addingSetId === set.id ? "opacity-50" : ""}`}
                onClick={() => !addingSetId && handleSetSelect(set)}
              >
                {/* Selection indicator */}
                {isSetSelected(set.id) && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Loading indicator */}
                {addingSetId === set.id && (
                  <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                )}

                <div className="flex items-start space-x-4">
                  {/* Set Symbol/Logo */}
                  <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {set.symbol ? (
                      <img
                        src={set.symbol}
                        alt={`${set.name} symbol`}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "block";
                        }}
                      />
                    ) : null}
                    <div
                      className="text-slate-400 text-xs text-center leading-tight"
                      style={{ display: set.symbol ? "none" : "block" }}
                    >
                      {set.name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 3)}
                    </div>
                  </div>

                  {/* Set Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">
                      {set.name}
                    </h3>
                    <div className="text-sm text-slate-500 mt-1">
                      <div className="truncate">{set.series}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span>{set.cardCount} cards</span>
                        {set.releaseDate && (
                          <span className="text-xs">
                            {new Date(set.releaseDate).getFullYear()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick add button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddSingleSet(set);
                  }}
                  disabled={addingSetId !== null}
                  className="w-full mt-3 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 text-sm rounded-lg transition-colors flex items-center justify-center space-x-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Set</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetTab;

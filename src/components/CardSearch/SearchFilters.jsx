import { Filter } from "lucide-react";
import { useTheme } from "../../theme/ThemeContent";

const SearchFilters = ({
  selectedFilters,
  onFilterChange,
  availableSets,
  setsLoading,
  onClearFilters,
  onClearAll,
}) => {
  const { theme } = useTheme();

  return (
    <div
      className={`w-80 ${theme.colors.background.sidebar} ${theme.colors.border.light} p-6 border-l overflow-y-auto rounded-r-2xl`}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className={`w-5 h-5 ${theme.colors.text.accent}`} />
          <h3 className={`text-lg font-semibold ${theme.colors.text.primary}`}>
            Filters
          </h3>
        </div>

        {/* Rarity Filter */}
        <div>
          <label
            className={`block text-sm font-medium ${theme.colors.text.secondary} mb-2`}
          >
            Rarity
          </label>
          <select
            value={selectedFilters.rarity}
            onChange={(e) => onFilterChange("rarity", e.target.value)}
            className={`w-full px-3 py-2 rounded-lg ${theme.colors.background.card} border ${theme.colors.border.accent} ${theme.colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
          >
            <option value="">All Rarities</option>
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Rare">Rare</option>
            <option value="Rare Holo">Rare Holo</option>
            <option value="Ultra Rare">Ultra Rare</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label
            className={`block text-sm font-medium ${theme.colors.text.secondary} mb-2`}
          >
            Type
          </label>
          <select
            value={selectedFilters.type}
            onChange={(e) => onFilterChange("type", e.target.value)}
            className={`w-full px-3 py-2 rounded-lg ${theme.colors.background.card} border ${theme.colors.border.accent} ${theme.colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
          >
            <option value="">All Types</option>
            <option value="Fire">Fire</option>
            <option value="Water">Water</option>
            <option value="Grass">Grass</option>
            <option value="Electric">Electric</option>
            <option value="Psychic">Psychic</option>
            <option value="Fighting">Fighting</option>
            <option value="Darkness">Darkness</option>
            <option value="Metal">Metal</option>
            <option value="Fairy">Fairy</option>
            <option value="Dragon">Dragon</option>
            <option value="Colorless">Colorless</option>
          </select>
        </div>

        {/* Set Filter */}
        <div>
          <label
            className={`block text-sm font-medium ${theme.colors.text.secondary} mb-2`}
          >
            Set
          </label>
          <select
            value={selectedFilters.set}
            onChange={(e) => onFilterChange("set", e.target.value)}
            disabled={setsLoading}
            className={`w-full px-3 py-2 rounded-lg ${theme.colors.background.card} border ${theme.colors.border.accent} ${theme.colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50`}
          >
            <option value="">All Sets</option>
            {availableSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Actions */}
        <div className="space-y-3 pt-4 border-t border-gray-700">
          <button
            onClick={onClearFilters}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
          >
            Clear Filters
          </button>
          <button
            onClick={onClearAll}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${theme.colors.button.secondary} hover:scale-105 transition-transform`}
          >
            Clear All & Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;

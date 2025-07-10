import { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  CogIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  Target,
  BookOpen,
  Gem,
  Hash,
  Tag,
  SortAsc,
  SortDesc,
} from "lucide-react";
import {
  getSortOptions,
  getSortDisplayInfo,
  getSortDirectionInfo,
} from "../../utils/binderSorting";
import TypeOrderCustomizer from "./TypeOrderCustomizer";

// Map icon names to icon components
const IconMap = {
  Target,
  BookOpen,
  Gem,
  Hash,
  Tag,
  SortAsc,
  SortDesc,
};

// Helper function to render icon component
const renderIcon = (iconName, className = "w-4 h-4") => {
  const IconComponent = IconMap[iconName];
  return IconComponent ? <IconComponent className={className} /> : null;
};

const SortControls = ({
  currentSortBy = "custom",
  currentSortDirection = "asc",
  autoSort = false,
  onSortChange,
  onSortDirectionChange,
  onAutoSortChange,
  disabled = false,
  className = "",
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showTypeCustomizer, setShowTypeCustomizer] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const sortOptions = getSortOptions();
  const currentSortInfo = getSortDisplayInfo(currentSortBy);
  const currentDirectionInfo = getSortDirectionInfo(
    currentSortBy,
    currentSortDirection
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleSortSelect = (sortValue) => {
    onSortChange?.(sortValue);
    // When changing sort type, reset direction to default 'asc'
    onSortDirectionChange?.("asc");
    setIsDropdownOpen(false);
  };

  const handleToggleDirection = () => {
    const newDirection = currentSortDirection === "asc" ? "desc" : "asc";
    onSortDirectionChange?.(newDirection);
  };

  const handleToggleAutoSort = () => {
    onAutoSortChange?.(!autoSort);
  };

  const handleTypeOrderChanged = () => {
    // Trigger a re-sort if currently sorting by type
    if (currentSortBy === "type" || currentSortBy === "typeRarity") {
      // Re-apply current sort to reflect new custom type order
      onSortChange?.(currentSortBy);
    }
  };

  const supportsDirection =
    currentSortBy !== "custom" && currentDirectionInfo.label;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Primary Row: Sort Dropdown + Direction Toggle */}
      <div className="flex items-center gap-2">
        {/* Sort Dropdown */}
        <div className="relative flex-1">
          <button
            ref={buttonRef}
            onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className={`
              w-full flex items-center justify-between gap-2 px-3 py-2 bg-card-background border border-border rounded-md
              text-sm font-medium text-primary shadow-sm
              transition-all duration-200
              ${
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent hover:border-text-secondary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              }
              ${isDropdownOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
            `}
            title="Sort binder cards"
          >
            <div className="flex items-center gap-2">
              {renderIcon(currentSortInfo.icon, "w-4 h-4 text-secondary")}
              <span className="text-primary font-medium">
                {currentSortInfo.label}
              </span>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 text-secondary transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 mt-1 w-full bg-card-background border border-border rounded-md shadow-lg z-50"
            >
              <div className="py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortSelect(option.value)}
                    className={`
                      w-full px-3 py-2 text-left text-sm flex items-center gap-3
                      transition-colors duration-150
                      ${
                        option.value === currentSortBy
                          ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                          : "text-primary hover:bg-accent"
                      }
                    `}
                  >
                    {renderIcon(option.icon, "w-4 h-4 text-secondary")}
                    <span className="flex-1">{option.label}</span>
                    {option.value === currentSortBy && (
                      <CheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Direction Toggle */}
        <div className="relative">
          <button
            onClick={handleToggleDirection}
            disabled={disabled || !supportsDirection}
            className={`
              flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 bg-card-background border border-border rounded-md
              text-sm font-medium text-primary shadow-sm
              transition-all duration-200
              ${
                disabled || !supportsDirection
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent hover:border-text-secondary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              }
            `}
            title={
              supportsDirection
                ? `Change sort order (current: ${currentDirectionInfo.label})`
                : "Sort order not applicable"
            }
          >
            {currentSortDirection === "asc" ? (
              <SortAsc className="w-4 h-4 text-secondary" />
            ) : (
              <SortDesc className="w-4 h-4 text-secondary" />
            )}
            <span className="hidden sm:inline">
              {currentDirectionInfo.label || "N/A"}
            </span>
          </button>
        </div>
      </div>

      {/* Secondary Row: Auto-sort and other options */}
      <div className="flex items-center justify-between pt-1">
        {/* Type Customizer Button (only shown when sorting by type) */}
        <div>
          {(currentSortBy === "type" || currentSortBy === "typeRarity") && (
            <button
              onClick={() => setShowTypeCustomizer(true)}
              disabled={disabled}
              className={`
              flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors
              ${
                disabled
                  ? "text-secondary border-border cursor-not-allowed"
                  : "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-600"
              }
            `}
              title="Customize type order"
            >
              <CogIcon className="w-3.5 h-3.5" />
              Customize
            </button>
          )}
        </div>

        {/* Auto-sort Toggle Switch */}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium whitespace-nowrap ${
              currentSortBy === "custom" ? "text-secondary" : "text-primary"
            }`}
            title={
              currentSortBy === "custom"
                ? "Auto-sort not available for custom order"
                : ""
            }
          >
            Auto-sort
          </span>
          <button
            onClick={handleToggleAutoSort}
            disabled={disabled || currentSortBy === "custom"}
            className={`
              relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800
              ${
                autoSort && currentSortBy !== "custom"
                  ? "bg-blue-600"
                  : "bg-gray-200 dark:bg-gray-600"
              }
              ${
                disabled || currentSortBy === "custom"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }
            `}
            role="switch"
            aria-checked={autoSort && currentSortBy !== "custom"}
            title={
              currentSortBy === "custom"
                ? "Auto-sort not available for custom order"
                : "Toggle auto-sort"
            }
          >
            <span
              className={`
                pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 
                transition duration-200 ease-in-out
                ${
                  autoSort && currentSortBy !== "custom"
                    ? "translate-x-4"
                    : "translate-x-0"
                }
              `}
            />
          </button>
        </div>
      </div>

      {/* Type Order Customizer Modal */}
      <TypeOrderCustomizer
        isOpen={showTypeCustomizer}
        onClose={() => setShowTypeCustomizer(false)}
        onOrderChanged={handleTypeOrderChanged}
      />
    </div>
  );
};

export default SortControls;

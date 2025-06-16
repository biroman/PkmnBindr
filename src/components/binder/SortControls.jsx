import { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { Target, BookOpen, Gem, Hash, Tag, SortAsc } from "lucide-react";
import { getSortOptions, getSortDisplayInfo } from "../../utils/binderSorting";
import TypeOrderCustomizer from "./TypeOrderCustomizer";

// Map icon names to icon components
const IconMap = {
  Target,
  BookOpen,
  Gem,
  Hash,
  Tag,
  SortAsc,
};

// Helper function to render icon component
const renderIcon = (iconName, className = "w-4 h-4") => {
  const IconComponent = IconMap[iconName];
  return IconComponent ? <IconComponent className={className} /> : null;
};

const SortControls = ({
  currentSortBy = "custom",
  autoSort = false,
  onSortChange,
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
    setIsDropdownOpen(false);
  };

  const handleToggleAutoSort = () => {
    onAutoSortChange?.(!autoSort);
  };

  const handleTypeOrderChanged = () => {
    // Trigger a re-sort if currently sorting by type
    if (currentSortBy === "type") {
      onSortChange?.("type"); // This will re-apply the sort with new type order
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Top Row: Sort Dropdown + Auto-sort Toggle */}
      <div className="flex items-center justify-between gap-3">
        {/* Sort Dropdown */}
        <div className="relative flex-1">
          <button
            ref={buttonRef}
            onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className={`
              w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md
              text-sm font-medium text-gray-700 shadow-sm
              transition-all duration-200
              ${
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              }
              ${isDropdownOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
            `}
            title="Sort binder cards"
          >
            <div className="flex items-center gap-2">
              <ArrowsUpDownIcon className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{currentSortInfo.label}</span>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50"
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
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    {renderIcon(option.icon, "w-4 h-4 text-gray-500")}
                    <span className="flex-1">{option.label}</span>
                    {option.value === currentSortBy && (
                      <CheckIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Auto-sort Toggle Switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAutoSort}
            disabled={disabled || currentSortBy === "custom"}
            className={`
              relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${
                autoSort && currentSortBy !== "custom"
                  ? "bg-blue-600"
                  : "bg-gray-200"
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
          <span
            className={`text-sm font-medium whitespace-nowrap ${
              currentSortBy === "custom" ? "text-gray-400" : "text-gray-700"
            }`}
          >
            Auto-sort
          </span>
        </div>
      </div>

      {/* Auto-sort Info Text */}
      {autoSort && currentSortBy !== "custom" && (
        <div className="px-1">
          <p className="text-xs text-gray-500">
            ✨ New cards will be automatically sorted when added
          </p>
        </div>
      )}

      {/* Bottom Row: Type Customizer Button (only shown when sorting by type) */}
      {currentSortBy === "type" && (
        <div className="flex justify-start">
          <button
            onClick={() => setShowTypeCustomizer(true)}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors
              ${
                disabled
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "text-blue-600 border-blue-200 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300"
              }
            `}
            title="Customize type order"
          >
            <CogIcon className="w-3.5 h-3.5" />
            Customize Type Order
          </button>
        </div>
      )}

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

import React, { useState } from "react";
import {
  XMarkIcon,
  SwatchIcon,
  SparklesIcon,
  PaintBrushIcon,
  CheckIcon,
  FolderIcon,
  PlusIcon,
  PhotoIcon,
  ArrowPathIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { useBinderCardCustomization } from "../../contexts/BinderCardCustomizationContext";

const BinderCustomizationModal = ({
  isOpen,
  onClose,
  binder,
  onSave,
  isPremium = false,
}) => {
  const { getHeaderColor, saveHeaderColor } = useBinderCardCustomization();
  const [activeTab, setActiveTab] = useState("colors");
  const [selectedColor, setSelectedColor] = useState(
    getHeaderColor(binder?.id) || null
  );

  // Predefined color schemes
  const colorSchemes = [
    {
      name: "Ocean Blue",
      gradient: "linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)",
      value: "linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)",
    },
    {
      name: "Purple Magic",
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      value: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
    },
    {
      name: "Forest Green",
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      value: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    },
    {
      name: "Sunset Orange",
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      value: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    },
    {
      name: "Ruby Red",
      gradient: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
      value: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
    },
    {
      name: "Royal Purple",
      gradient: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
      value: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
    },
  ];

  const handleSave = async () => {
    const finalColor = selectedColor;

    if (finalColor && binder?.id) {
      try {
        await saveHeaderColor(binder.id, finalColor);
        // No need to call onSave anymore since we're handling it independently
      } catch (error) {
        console.error("Failed to save header color:", error);
        // Error is already handled by the service with toast
      }
    }
    onClose();
  };

  const handleColorSelect = (colorValue) => {
    setSelectedColor(colorValue);
  };

  const getPreviewColor = () => {
    return selectedColor || "#6366f1";
  };

  const renderColorScheme = (scheme) => (
    <div
      key={scheme.name}
      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
        selectedColor === scheme.value
          ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
          : "border-border hover:border-text-secondary"
      }`}
      onClick={() => handleColorSelect(scheme.value)}
    >
      <div className="h-16 w-full" style={{ background: scheme.gradient }} />
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            {scheme.name}
          </span>
        </div>
        {selectedColor === scheme.value && (
          <CheckIcon className="absolute top-2 right-2 w-5 h-5 text-white bg-blue-500 rounded-full p-0.5" />
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-card-background rounded-xl shadow-xl w-full h-full max-w-7xl max-h-[98vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Customize Binder
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Personalize the appearance of "
              {binder?.metadata?.name || "Unnamed Binder"}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex flex-col xl:flex-row flex-1 min-h-0">
          {/* Left Sidebar - Navigation */}
          <div className="xl:w-64 border-b xl:border-b-0 xl:border-r border-border p-4 flex-shrink-0">
            <nav className="flex xl:flex-col xl:space-y-2 space-x-2 xl:space-x-0 overflow-x-auto xl:overflow-x-visible">
              <button
                onClick={() => setActiveTab("colors")}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors whitespace-nowrap ${
                  activeTab === "colors"
                    ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-text-primary hover:bg-accent"
                }`}
              >
                <SwatchIcon className="w-5 h-5 flex-shrink-0" />
                Header Colors
              </button>
            </nav>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 sm:p-6">
              {/* Content based on active tab */}
              {activeTab === "colors" && (
                <div className="space-y-8">
                  {/* Color Schemes Section */}
                  <div className="bg-card-background border border-border rounded-xl p-6 shadow-sm">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-text-primary mb-2">
                        Header Colors
                      </h3>
                      <p className="text-sm text-text-secondary">
                        Choose from beautiful color schemes for your binder
                        header
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {colorSchemes.map((scheme) => renderColorScheme(scheme))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Preview (Fixed) */}
          <div className="xl:w-80 border-t xl:border-t-0 xl:border-l border-border p-4 sm:p-6 flex-shrink-0 bg-secondary">
            <div className="sticky top-0">
              <h3 className="text-sm font-medium text-text-primary mb-4">
                Live Preview
              </h3>

              {/* Preview Card */}
              <div className="bg-card-background rounded-xl shadow-sm border border-border overflow-hidden mb-4">
                <div
                  className="h-16 relative"
                  style={{
                    background: getPreviewColor(),
                  }}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                  <div className="absolute inset-0 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderIcon className="w-4 h-4 text-white opacity-90" />
                      <span className="text-white text-xs font-medium opacity-90">
                        {Object.keys(binder?.cards || {}).length || 0} cards
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold mb-1 text-text-primary">
                    {binder?.metadata?.name || "Unnamed Binder"}
                  </h3>
                  {binder?.metadata?.description && (
                    <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                      {binder.metadata.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-border bg-secondary flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-primary hover:bg-accent rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSelectedColor(null);
                setCustomizationMode("presets");
                handleSave();
              }}
              className="px-4 py-2 text-text-primary hover:bg-accent rounded-lg transition-colors"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BinderCustomizationModal;

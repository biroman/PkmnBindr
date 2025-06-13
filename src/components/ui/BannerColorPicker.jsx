import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { XMarkIcon, CheckIcon, SwatchIcon } from "@heroicons/react/24/outline";
import { BannerColorService } from "../../services/BannerColorService";

const BannerColorPicker = ({
  isOpen,
  onClose,
  currentColor,
  onColorChange,
  user,
}) => {
  const [selectedColor, setSelectedColor] = useState(currentColor || "#667eea");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const modalRef = useRef(null);

  // Extract hex color from gradient or use as-is
  const getHexFromColor = (color) => {
    if (!color) return "#667eea";

    // If it's a gradient, extract the first color
    const gradientMatch = color.match(/#[0-9a-f]{6}/i);
    if (gradientMatch) {
      return gradientMatch[0];
    }

    // If it's already a hex color
    if (color.startsWith("#")) {
      return color;
    }

    return "#667eea";
  };

  // Update selected color when currentColor changes
  useEffect(() => {
    setSelectedColor(getHexFromColor(currentColor));
    setSelectedPreset(null); // Reset preset selection when currentColor changes
  }, [currentColor]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!user?.uid) return;

    setIsUpdating(true);
    try {
      let colorToSave;

      // Use preset if selected, otherwise convert hex to gradient
      if (selectedPreset) {
        colorToSave = selectedPreset;
      } else {
        colorToSave = BannerColorService.hexToGradient(selectedColor);
      }

      // Save to Firebase
      const success = await BannerColorService.updateBannerColor(
        user.uid,
        colorToSave
      );

      if (success) {
        // Update parent component
        if (onColorChange) {
          onColorChange(colorToSave);
        }
        onClose();
      }
    } catch (error) {
      console.error("Failed to update banner color:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePresetSelect = (presetGradient) => {
    // Just select the preset, don't save immediately
    setSelectedPreset(presetGradient);
    // Clear custom color selection when preset is selected
    setSelectedColor(getHexFromColor(presetGradient));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <SwatchIcon className="w-5 h-5" />
            Banner Color
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            disabled={isUpdating}
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Preview</label>
            <div
              className="h-16 rounded-lg border-2 border-gray-200"
              style={BannerColorService.getBannerStyle(
                selectedPreset ||
                  BannerColorService.hexToGradient(selectedColor)
              )}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Custom Color
            </label>
            <div className="flex justify-center">
              <HexColorPicker
                color={selectedColor}
                onChange={(color) => {
                  setSelectedColor(color);
                  setSelectedPreset(null); // Clear preset when custom color is changed
                }}
                style={{ width: "200px", height: "150px" }}
              />
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500 font-mono">
                {selectedColor}
              </span>
            </div>
          </div>

          {/* Preset Colors */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Preset Gradients
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BannerColorService.DEFAULT_COLORS.map((gradient, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetSelect(gradient)}
                  disabled={isUpdating}
                  className={`h-12 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedPreset === gradient
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  style={{ background: gradient }}
                  title={`Preset ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isUpdating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Save Color
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerColorPicker;

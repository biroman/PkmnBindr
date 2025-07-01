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
        className="relative bg-card-background rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-secondary border-b border-border">
          <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
            <SwatchIcon className="w-5 h-5" />
            Banner Color
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            disabled={isUpdating}
          >
            <XMarkIcon className="w-5 h-5 text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Preview</label>
            <div
              className="h-16 rounded-lg border-2 border-border"
              style={BannerColorService.getBannerStyle(
                selectedPreset ||
                  BannerColorService.hexToGradient(selectedColor)
              )}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">
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
              <span className="text-xs text-secondary font-mono">
                {selectedColor}
              </span>
            </div>
          </div>

          {/* Preset Colors */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">
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
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                      : "border-border hover:border-slate-400 dark:hover:border-slate-500"
                  }`}
                  style={{ background: gradient }}
                  title={`Preset ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2 text-sm text-secondary hover:bg-accent rounded-md transition-colors disabled:opacity-50"
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

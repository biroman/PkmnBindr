import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { XMarkIcon } from "@heroicons/react/24/outline";

const BinderColorPicker = ({
  isOpen,
  onClose,
  currentColor = "#3b82f6",
  onColorChange,
  onPreviewChange,
  initialPosition = { x: 200, y: 200 },
}) => {
  const [color, setColor] = useState(currentColor);
  const [originalColor, setOriginalColor] = useState(currentColor);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef(null);

  // Predefined color palette
  const colorPalette = [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Green
    "#f59e0b", // Yellow
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#f97316", // Orange
    "#ec4899", // Pink
    "#6b7280", // Gray
    "#000000", // Black
    "#ffffff", // White
    "#dc2626", // Dark Red
  ];

  useEffect(() => {
    if (isOpen) {
      setColor(currentColor);
      setOriginalColor(currentColor);
    }
  }, [currentColor, isOpen]);

  const handleMouseDown = (e) => {
    if (e.target.closest(".color-picker-content")) return;

    setIsDragging(true);
    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Keep popup within viewport bounds
    const maxX = window.innerWidth - 320;
    const maxY = window.innerHeight - 400;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleColorChange = (newColor) => {
    setColor(newColor);
    onPreviewChange?.(newColor); // Live preview
  };

  const handlePaletteColorClick = (paletteColor) => {
    handleColorChange(paletteColor);
  };

  const handleSave = () => {
    onColorChange?.(color);
    onClose();
  };

  const handleCancel = () => {
    onPreviewChange?.(originalColor); // Revert to original
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Draggable Color Picker Popup */}
      <div
        ref={popupRef}
        className={`fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "320px",
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Binder Color</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 color-picker-content">
          {/* Color Preview */}
          <div className="mb-4">
            <div
              className="w-full h-12 rounded-lg border-2 border-gray-200 shadow-inner"
              style={{ backgroundColor: color }}
            />
            <div className="mt-2 text-center text-sm text-gray-600 font-mono">
              {color.toUpperCase()}
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-4">
            <HexColorPicker
              color={color}
              onChange={handleColorChange}
              style={{ width: "100%", height: "200px" }}
            />
          </div>

          {/* Color Palette */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Quick Colors
            </h4>
            <div className="grid grid-cols-6 gap-2">
              {colorPalette.map((paletteColor) => (
                <button
                  key={paletteColor}
                  onClick={() => handlePaletteColorClick(paletteColor)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                    color.toLowerCase() === paletteColor.toLowerCase()
                      ? "border-gray-900 ring-2 ring-gray-300"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={{ backgroundColor: paletteColor }}
                  title={paletteColor}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              Apply Color
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BinderColorPicker;

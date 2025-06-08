const GridSizeSelector = ({ currentSize, onSizeChange }) => {
  const gridSizes = [
    { value: "1x1", label: "1×1", description: "Single Card" },
    { value: "2x2", label: "2×2", description: "4 Cards" },
    { value: "3x3", label: "3×3", description: "9 Cards" },
    { value: "4x3", label: "4×3", description: "12 Cards" },
    { value: "4x4", label: "4×4", description: "16 Cards" },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
      <div className="text-xs font-medium text-gray-600 mb-2">Grid Size</div>
      <div className="flex gap-1">
        {gridSizes.map((size) => (
          <button
            key={size.value}
            onClick={() => onSizeChange(size.value)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              currentSize === size.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            title={size.description}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GridSizeSelector;

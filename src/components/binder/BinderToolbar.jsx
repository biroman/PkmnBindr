import { useState } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  PhotoIcon,
  ShareIcon,
  TrashIcon,
  Squares2X2Icon,
  DocumentArrowDownIcon,
  SwatchIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ToolbarButton = ({
  icon: Icon,
  onClick,
  active = false,
  className = "",
  title,
  variant = "default",
  isMobile = false,
}) => {
  const baseClasses = isMobile
    ? `w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
       hover:bg-gray-100 active:scale-95`
    : `w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
       hover:bg-white/10 hover:scale-110 active:scale-95`;

  const variantClasses = {
    default: isMobile
      ? "text-gray-600 hover:text-gray-800"
      : "text-white/70 hover:text-white",
    primary: isMobile
      ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
      : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl",
    danger: isMobile
      ? "text-red-500 hover:text-red-600 hover:bg-red-50"
      : "text-red-400 hover:text-red-300 hover:bg-red-500/10",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${
        active
          ? isMobile
            ? "bg-gray-200 text-gray-800"
            : "bg-white/20 text-white"
          : ""
      } ${className}`}
      title={title}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

const BinderToolbar = ({
  onAddCard,
  onSettings,
  onExport,
  onClearBinder,
  onPageOverview,
  onPdfExport,
  onColorPicker,
  onMobileSettings, // New prop for mobile settings modal
  currentBinder,
  isPdfExporting = false,
  isMobile = false,
}) => {
  const [activeTool, setActiveTool] = useState(null);

  const handleToolClick = (tool, action) => {
    setActiveTool(tool === activeTool ? null : tool);
    action?.();
  };

  // Mobile layout - horizontal toolbar at top
  if (isMobile) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Primary Action - Add Card */}
          <ToolbarButton
            icon={PlusIcon}
            onClick={() => handleToolClick("add", onAddCard)}
            variant="primary"
            title="Add Cards"
            isMobile={true}
          />

          <div className="flex items-center space-x-3">
            {/* Settings - Mobile specific */}
            <ToolbarButton
              icon={Cog6ToothIcon}
              onClick={() => handleToolClick("settings", onMobileSettings)}
              title="Binder Settings"
              isMobile={true}
            />

            {/* Page Overview */}
            <ToolbarButton
              icon={Squares2X2Icon}
              onClick={() => handleToolClick("overview", onPageOverview)}
              title="Page Overview"
              isMobile={true}
            />

            {/* Color Picker */}
            <ToolbarButton
              icon={SwatchIcon}
              onClick={() => handleToolClick("color", onColorPicker)}
              title="Customize Color"
              isMobile={true}
            />

            {/* PDF Export */}
            <div className="relative group">
              <ToolbarButton
                icon={DocumentArrowDownIcon}
                onClick={() => handleToolClick("pdf", onPdfExport)}
                title="Export PDF"
                className={
                  isPdfExporting ? "opacity-50 cursor-not-allowed" : ""
                }
                isMobile={true}
              />

              {/* Warning Triangle */}
              <div className="absolute -top-1 -right-1 z-10">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 drop-shadow-sm" />
              </div>

              {/* Warning Tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800 shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                <div className="flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3 h-3 text-yellow-600" />
                  <span>Limited functionality - works best in Firefox</span>
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-50 border-l border-t border-yellow-200 rotate-45"></div>
              </div>

              {isPdfExporting && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-800/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap z-30">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    <span>Generating...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Binder */}
            <ToolbarButton
              icon={TrashIcon}
              onClick={() => handleToolClick("clear", onClearBinder)}
              variant="danger"
              title="Clear Binder"
              isMobile={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout - vertical sidebar (existing)
  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50">
      {/* Main toolbar container */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-3 shadow-xl border border-white/10">
        <div className="flex flex-col space-y-3">
          {/* Add Card - Primary Action */}
          <ToolbarButton
            icon={PlusIcon}
            onClick={() => handleToolClick("add", onAddCard)}
            variant="primary"
            title="Add Cards to Binder"
            className="relative"
          />

          {/* Divider */}
          <div className="h-px bg-white/20 mx-2"></div>

          {/* Page Overview */}
          <ToolbarButton
            icon={Squares2X2Icon}
            onClick={() => handleToolClick("overview", onPageOverview)}
            title="Page Overview"
          />

          {/* Color Picker */}
          <ToolbarButton
            icon={SwatchIcon}
            onClick={() => handleToolClick("color", onColorPicker)}
            title="Customize Binder Color"
          />

          {/* PDF Export */}
          <div className="relative flex items-center group">
            <div className="relative">
              <ToolbarButton
                icon={DocumentArrowDownIcon}
                onClick={() => handleToolClick("pdf", onPdfExport)}
                title="Export as PDF"
                className={
                  isPdfExporting ? "opacity-50 cursor-not-allowed" : ""
                }
              />

              {/* Warning Triangle */}
              <div className="absolute -top-1 -right-1 z-10">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 drop-shadow-sm" />
              </div>
            </div>

            {/* Warning Tooltip */}
            <div className="absolute left-full ml-3 flex items-center bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">
                Limited functionality - works best in Firefox
              </span>
              {/* Arrow pointing to button */}
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-2 h-2 bg-yellow-50 border-l border-b border-yellow-200 rotate-45"></div>
            </div>

            {isPdfExporting && (
              <div className="absolute left-full ml-3 flex items-center bg-slate-800/95 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white shadow-lg border border-white/10 z-30">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 flex-shrink-0" />
                <span className="text-white/90 font-medium whitespace-nowrap">
                  Generating PDF...
                </span>
                {/* Arrow pointing to button */}
                <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-white/10"></div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/20 mx-2"></div>

          {/* Clear binder */}
          <ToolbarButton
            icon={TrashIcon}
            onClick={() => handleToolClick("clear", onClearBinder)}
            variant="danger"
            title="Clear Binder"
          />
        </div>

        {/* Binder info tooltip */}
        {currentBinder && (
          <div className="absolute left-full ml-3 top-0 bg-slate-800/95 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white shadow-lg border border-white/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <div className="font-medium">{currentBinder.metadata.name}</div>
            <div className="text-slate-300 text-xs">
              {Object.keys(currentBinder.cards || {}).length} cards
            </div>
            {/* Arrow pointing to toolbar */}
            <div className="absolute right-full top-3 w-2 h-2 bg-slate-800 transform rotate-45 border-l border-b border-white/10"></div>
          </div>
        )}
      </div>

      {/* Floating action button style for small screens */}
      <div className="md:hidden fixed bottom-6 right-6">
        <button
          onClick={onAddCard}
          className="w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-white active:scale-95"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default BinderToolbar;

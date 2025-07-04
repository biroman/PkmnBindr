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
  EllipsisVerticalIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  SquaresPlusIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleIconSolid } from "@heroicons/react/24/solid";

const ToolbarButton = ({
  icon: Icon,
  onClick,
  active = false,
  activeClassName = "",
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

  const defaultActiveClasses = isMobile
    ? "bg-gray-200 text-gray-800"
    : "bg-white/20 text-white";

  const activeClasses = active ? activeClassName || defaultActiveClasses : "";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${activeClasses} ${className}`}
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
  onShare, // New prop for share functionality
  onMobileSettings, // New prop for mobile settings modal
  currentBinder,
  isPdfExporting = false,
  isMobile = false,
  // Selection mode props
  isSelectionMode = false,
  selectedCards = new Set(),
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onBulkMove,
  onBulkDelete,
}) => {
  const [activeTool, setActiveTool] = useState(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleToolClick = (tool, action) => {
    setActiveTool(tool === activeTool ? null : tool);
    action?.();
  };

  // Mobile layout - horizontal toolbar at top
  if (isMobile) {
    return (
      <div className="bg-card-background/95 backdrop-blur-sm rounded-md border-b border-border px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Left side - Add Card button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onAddCard}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm"
              title="Add new card to binder"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Add Card</span>
            </button>
          </div>

          {/* Center - Binder name */}
          {currentBinder?.metadata?.name && (
            <div className="flex-1 text-center">
              <h2 className="text-lg font-semibold text-primary truncate max-w-xs">
                {currentBinder.metadata.name}
              </h2>
            </div>
          )}

          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2">
            {/* Selection Mode Toggle */}
            <button
              onClick={onToggleSelectionMode}
              disabled={disabled}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isSelectionMode
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                  : "text-primary hover:bg-accent disabled:text-secondary disabled:cursor-not-allowed"
              }`}
              title={
                isSelectionMode
                  ? "Exit Selection Mode"
                  : "Select Multiple Cards"
              }
            >
              {isSelectionMode ? (
                <CheckCircleIconSolid className="w-5 h-5" />
              ) : (
                <SquaresPlusIcon className="w-5 h-5" />
              )}
              <span className="hidden lg:inline">
                {isSelectionMode ? "Done" : "Select"}
              </span>
            </button>

            <button
              onClick={onPageOverview}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 text-primary hover:bg-accent disabled:text-secondary disabled:cursor-not-allowed rounded-lg transition-colors"
              title="View all pages"
            >
              <Squares2X2Icon className="w-4 h-4" />
              <span className="hidden lg:inline">Pages</span>
            </button>

            <button
              onClick={onColorPicker}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 text-primary hover:bg-accent disabled:text-secondary disabled:cursor-not-allowed rounded-lg transition-colors"
              title="Customize binder"
            >
              <SwatchIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Customize</span>
            </button>

            <button
              onClick={onShare}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 text-primary hover:bg-accent disabled:text-secondary disabled:cursor-not-allowed rounded-lg transition-colors"
              title="Share binder"
            >
              <ShareIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Share</span>
            </button>

            {/* More menu for additional actions */}
            <div className="relative">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 text-primary hover:bg-accent disabled:text-secondary disabled:cursor-not-allowed rounded-lg transition-colors"
                title="More actions"
              >
                <EllipsisVerticalIcon className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-card-background border border-border rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onExport?.();
                        setIsMoreMenuOpen(false);
                      }}
                      disabled={disabled}
                      className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-accent disabled:text-secondary disabled:cursor-not-allowed flex items-center gap-3"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Export Data
                    </button>
                    <button
                      onClick={() => {
                        onPdfExport?.();
                        setIsMoreMenuOpen(false);
                      }}
                      disabled={disabled || isPdfExporting}
                      className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-accent disabled:text-secondary disabled:cursor-not-allowed flex items-center gap-3"
                    >
                      {isPdfExporting ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <DocumentTextIcon className="w-4 h-4" />
                      )}
                      {isPdfExporting ? "Exporting..." : "Export PDF"}
                    </button>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => {
                        onClearBinder?.();
                        setIsMoreMenuOpen(false);
                      }}
                      disabled={disabled}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 disabled:text-secondary disabled:cursor-not-allowed flex items-center gap-3"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Clear Binder
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout - vertical sidebar (existing)
  return (
    <>
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

            {/* Selection Mode Toggle */}
            <div className="relative">
              <ToolbarButton
                icon={isSelectionMode ? CheckCircleIconSolid : SquaresPlusIcon}
                onClick={() =>
                  handleToolClick("selection", onToggleSelectionMode)
                }
                active={isSelectionMode}
                activeClassName="!bg-green-500/90 text-white"
                title={
                  isSelectionMode
                    ? "Exit Selection Mode"
                    : "Select Multiple Cards"
                }
              />
              {isSelectionMode && !isMobile && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 flex items-center gap-2 bg-green-500/95 text-white font-semibold px-4 py-2 rounded-lg shadow-lg border border-green-400/50 animate-in fade-in slide-in-from-left-4 duration-300 whitespace-nowrap">
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500/95 transform rotate-45 border-l-0 border-t-0 border-b border-r-0 border-green-400/50" />
                  <span>Select Mode Active</span>
                </div>
              )}
            </div>

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

            {/* Share - Only show for public binders */}
            {currentBinder?.permissions?.public && onShare && (
              <ToolbarButton
                icon={ShareIcon}
                onClick={() => handleToolClick("share", onShare)}
                title="Share Binder"
              />
            )}

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
        </div>
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
    </>
  );
};

export default BinderToolbar;

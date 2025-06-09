import { useState } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  PhotoIcon,
  ShareIcon,
  TrashIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

const ToolbarButton = ({
  icon: Icon,
  onClick,
  active = false,
  className = "",
  title,
  variant = "default",
}) => {
  const baseClasses = `
    w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
    hover:bg-white/10 hover:scale-110 active:scale-95
  `;

  const variantClasses = {
    default: "text-white/70 hover:text-white",
    primary:
      "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl",
    danger: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${
        active ? "bg-white/20 text-white" : ""
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
  currentBinder,
}) => {
  const [activeTool, setActiveTool] = useState(null);

  const handleToolClick = (tool, action) => {
    setActiveTool(tool === activeTool ? null : tool);
    action?.();
  };

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

      {/* Floating action button style for mobile */}
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

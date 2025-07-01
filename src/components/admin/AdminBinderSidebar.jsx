import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import {
  ShieldCheckIcon,
  UserIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  CalendarIcon,
  WrenchScrewdriverIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { Menu, ChevronLeft } from "lucide-react";

const AdminBinderSidebar = ({
  binder,
  userId,
  binderId,
  source,
  showRepairTool,
  onToggleRepairTool,
  showImageUpdateTool,
  onToggleImageUpdateTool,
  isVisible,
  onToggleVisibility,
}) => {
  const navigate = useNavigate();

  if (!binder) return null;

  return (
    <>
      {/* Sidebar Toggle Button */}
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={onToggleVisibility}
          className="p-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          title={isVisible ? "Hide sidebar" : "Show sidebar"}
        >
          <Menu className="w-5 h-5 text-gray-700" />
          <span className="text-sm font-medium text-gray-700">
            {isVisible ? "Hide Info" : "Show Info"}
          </span>
        </button>
      </div>

      {/* Sidebar Panel */}
      <div
        className={`${
          isVisible ? "w-80" : "w-0"
        } bg-card-background border-r border-border flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {binder.metadata.name}
              </h1>
              <p className="text-sm text-gray-500">Admin View</p>
            </div>
          </div>
        </div>

        {/* Binder Information */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Binder Information
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <UserIcon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Owner ID:</span>
              <span className="font-medium text-gray-900 font-mono text-xs">
                {binder.ownerId}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Squares2X2Icon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Grid Size:</span>
              <span className="font-medium text-gray-900">
                {binder.settings?.gridSize || "3x3"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <DocumentTextIcon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Total Cards:</span>
              <span className="font-medium text-gray-900">
                {Object.keys(binder.cards || {}).length}
              </span>
            </div>

            {binder.metadata.createdAt && (
              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Created:</span>
                <span className="font-medium text-gray-900">
                  {new Date(binder.metadata.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Admin Tools */}
          <div className="mt-6 pt-4 border-t border-border space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Admin Tools
            </h4>

            <Button
              onClick={onToggleRepairTool}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
              {showRepairTool ? "Hide" : "Show"} Card Repair Tool
            </Button>

            <Button
              onClick={onToggleImageUpdateTool}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <PhotoIcon className="w-4 h-4 mr-2" />
              {showImageUpdateTool ? "Hide" : "Show"} Image Update Tool
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminBinderSidebar;

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
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

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
  incompleteCardsCount = 0,
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
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {isVisible ? "Hide Info" : "Show Info"}
          </span>
          {/* Incomplete cards badge */}
          {incompleteCardsCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {incompleteCardsCount}
            </span>
          )}
        </button>
      </div>

      {/* Sidebar Panel */}
      <div
        className={`${
          isVisible ? "w-80" : "w-0"
        } bg-white border-r border-slate-200 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-200">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
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

          {/* Incomplete Cards Alert */}
          {incompleteCardsCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {incompleteCardsCount} Incomplete Card
                    {incompleteCardsCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-red-600">
                    Missing Pokemon card data
                  </p>
                </div>
              </div>
            </div>
          )}
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

            {incompleteCardsCount > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                <span className="text-gray-600">Incomplete:</span>
                <span className="font-medium text-red-600">
                  {incompleteCardsCount}
                </span>
              </div>
            )}

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
          <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Admin Tools
            </h4>

            <Button
              onClick={onToggleRepairTool}
              variant="outline"
              size="sm"
              className={`w-full ${
                incompleteCardsCount > 0
                  ? "border-red-300 text-red-700 hover:bg-red-50"
                  : ""
              }`}
            >
              <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
              {showRepairTool ? "Hide" : "Show"} Card Repair Tool
              {incompleteCardsCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {incompleteCardsCount}
                </span>
              )}
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

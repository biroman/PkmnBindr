import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  EyeIcon,
  ShareIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  FolderIcon,
  TagIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

const StaticBinderSidebar = ({
  binder,
  onShare,
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
            onClick={() => navigate("/binders")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Collections
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <EyeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {binder.metadata.name}
              </h1>
              <p className="text-sm text-gray-500">Public Collection</p>
            </div>
          </div>

          <button
            onClick={onShare}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ShareIcon className="w-4 h-4" />
            Share Collection
          </button>
        </div>

        {/* Binder Information */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Collection Information
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <DocumentTextIcon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Total Cards:</span>
              <span className="font-medium text-gray-900">
                {binder.metadata.statistics.cardCount}
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
              <FolderIcon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Unique Sets:</span>
              <span className="font-medium text-gray-900">
                {binder.metadata.statistics.uniqueSets}
              </span>
            </div>

            {binder.metadata.category && (
              <div className="flex items-center gap-3 text-sm">
                <TagIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Category:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {binder.metadata.category}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Updated:</span>
              <span className="font-medium text-gray-900">
                {new Date(
                  binder.metadata.statistics.lastUpdated
                ).toLocaleDateString()}
              </span>
            </div>
          </div>

          {binder.metadata.description && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Description
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {binder.metadata.description}
              </p>
            </div>
          )}

          {binder.metadata.tags && binder.metadata.tags.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {binder.metadata.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default StaticBinderSidebar;

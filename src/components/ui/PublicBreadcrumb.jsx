import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRightIcon,
  HomeIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const PublicBreadcrumb = ({
  ownerName,
  ownerPhotoURL,
  ownerId,
  contentType = "binder",
  contentName,
  className = "",
}) => {
  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate("/");
  };

  const handleProfileClick = () => {
    navigate(`/profile/${ownerId}`);
  };

  return (
    <nav
      className={`flex items-center space-x-2 text-sm text-gray-500 mb-4 ${className}`}
    >
      {/* Home */}
      <button
        onClick={handleHomeClick}
        className="flex items-center hover:text-gray-700 transition-colors"
      >
        <HomeIcon className="w-4 h-4" />
      </button>

      <ChevronRightIcon className="w-4 h-4 text-gray-300" />

      {/* Owner Profile */}
      <button
        onClick={handleProfileClick}
        className="flex items-center space-x-2 hover:text-gray-700 transition-colors max-w-xs truncate"
      >
        {ownerPhotoURL ? (
          <img
            src={ownerPhotoURL}
            alt={ownerName}
            className="w-4 h-4 rounded-full"
          />
        ) : (
          <UserIcon className="w-4 h-4" />
        )}
        <span className="truncate">{ownerName}</span>
      </button>

      {/* Current Content */}
      {contentName && (
        <>
          <ChevronRightIcon className="w-4 h-4 text-gray-300" />
          <span className="text-gray-900 font-medium truncate max-w-xs">
            {contentName}
          </span>
        </>
      )}
    </nav>
  );
};

export default PublicBreadcrumb;

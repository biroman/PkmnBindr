import React from "react";
import { useNavigate } from "react-router-dom";
import { UserIcon } from "@heroicons/react/24/outline";

const FloatingProfileButton = ({
  ownerName,
  ownerPhotoURL,
  ownerId,
  className = "",
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/profile/${ownerId}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-50 bg-white shadow-lg hover:shadow-xl border border-gray-200 rounded-full p-3 transition-all duration-200 hover:scale-105 group ${className}`}
      title={`View ${ownerName}'s profile`}
    >
      <div className="flex items-center space-x-2">
        {ownerPhotoURL ? (
          <img
            src={ownerPhotoURL}
            alt={ownerName}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <UserIcon className="w-6 h-6 text-gray-600" />
        )}

        {/* Expandable text on hover */}
        <span className="text-sm font-medium text-gray-700 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-200 whitespace-nowrap">
          {ownerName}'s Profile
        </span>
      </div>
    </button>
  );
};

export default FloatingProfileButton;

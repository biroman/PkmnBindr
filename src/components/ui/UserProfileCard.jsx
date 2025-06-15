import { useState } from "react";
import { CheckBadgeIcon, CameraIcon } from "@heroicons/react/24/outline";
import ProfilePictureUpload from "./ProfilePictureUpload";
import StatusEditor from "./StatusEditor";
import EditButton from "./EditButton";
import BannerColorPicker from "./BannerColorPicker";
import { BannerColorService } from "../../services/BannerColorService";

const UserProfileCard = ({
  user,
  onImageUpdate,
  onStatusUpdate,
  onBannerUpdate,
  className = "",
  size = "small", // small, medium, large
  showBanner = true,
  showStatus = true,
  showBadges = true,
  editable = false,
  badges = [],
  isOwnProfile = false,
}) => {
  // Status editing state
  const [statusEditTrigger, setStatusEditTrigger] = useState(0);
  // Banner color picker state
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  const handleStatusEdit = () => {
    setStatusEditTrigger((prev) => prev + 1);
  };

  const handleBannerClick = () => {
    if (editable) {
      setShowBannerPicker(true);
    }
  };

  const handleBannerColorChange = (newColor) => {
    if (onBannerUpdate) {
      onBannerUpdate(newColor);
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      container: "max-w-xs",
      banner: "h-16",
      profileOffset: "-mt-8",
      profileSize: "small",
      padding: "p-4",
      titleSize: "text-lg",
    },
    medium: {
      container: "max-w-sm",
      banner: "h-20",
      profileOffset: "-mt-10",
      profileSize: "medium",
      padding: "p-5",
      titleSize: "text-xl",
    },
    large: {
      container: "max-w-lg",
      banner: "h-28",
      profileOffset: "-mt-14",
      profileSize: "large",
      padding: "p-6",
      titleSize: "text-2xl",
    },
  };

  const config = sizeConfig[size];

  // Generate username from display name or email
  const getUsername = (user) => {
    if (user?.displayName) {
      return user.displayName.toLowerCase().replace(/\s+/g, "");
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "user";
  };

  // Default badges if none provided
  const defaultBadges = [
    {
      id: "pokemon-master",
      label: "Pokemon Master",
      icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
      color: "bg-slate-200 text-slate-700",
    },
    {
      id: "early-supporter",
      label: "Early Supporter",
      color: "bg-slate-200 text-slate-700",
    },
  ];

  const displayBadges = badges.length > 0 ? badges : defaultBadges;

  return (
    <div
      className={`bg-white rounded-2xl shadow-xl border border-gray-100 ${config.container} mx-auto lg:mx-0 overflow-hidden ${className}`}
    >
      {/* Banner Section */}
      {showBanner && (
        <div className="relative mb-2">
          <div
            className={`${config.banner} relative overflow-hidden group ${
              editable ? "cursor-pointer" : ""
            }`}
            style={BannerColorService.getBannerStyle(user?.bannerColor)}
            onClick={handleBannerClick}
          >
            {/* Subtle overlay for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20"></div>

            {/* Edit banner overlay */}
            {editable && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2 border border-white/30">
                  <CameraIcon className="w-4 h-4" />
                  Change Banner
                </div>
              </div>
            )}
          </div>

          {/* Profile Picture - Positioned over banner */}
          <div className={`absolute ${config.profileOffset} left-6`}>
            <div className="relative">
              <div className="ring-4 ring-white rounded-full">
                <ProfilePictureUpload
                  user={user}
                  onImageUpdate={onImageUpdate}
                  size={config.profileSize}
                  editable={editable}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className={`${config.padding} ${showBanner ? "pt-8" : "pt-4"}`}>
        {/* User Info Header */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-gray-900 ${config.titleSize}`}>
              {user?.displayName || "User"}
            </h3>
            {user?.emailVerified && (
              <CheckBadgeIcon
                className="w-5 h-5 text-blue-500"
                title="Verified"
              />
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium">
            @{getUsername(user)}
          </p>
          {!isOwnProfile && (
            <p className="text-xs text-gray-400">
              Joined{" "}
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Unknown"}
            </p>
          )}
        </div>

        {/* Status Section */}
        {showStatus && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Status
                </span>
              </div>
              {editable && (
                <EditButton
                  onClick={handleStatusEdit}
                  size="xs"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                />
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <StatusEditor
                user={user}
                onStatusUpdate={onStatusUpdate}
                placeholder={
                  editable
                    ? "Share something about yourself..."
                    : "No status set"
                }
                showEditButton={editable}
                editTrigger={editable ? statusEditTrigger : undefined}
              />
            </div>
          </div>
        )}

        {/* Badges Section */}
        {showBadges && displayBadges.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Achievements
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    badge.color || "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {badge.icon && (
                    <img
                      src={badge.icon}
                      alt=""
                      className="w-3 h-3 rounded-full"
                    />
                  )}
                  {badge.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Banner Color Picker Modal */}
      {editable && showBannerPicker && (
        <BannerColorPicker
          currentColor={user?.bannerColor}
          onColorChange={handleBannerColorChange}
          onClose={() => setShowBannerPicker(false)}
        />
      )}
    </div>
  );
};

export default UserProfileCard;

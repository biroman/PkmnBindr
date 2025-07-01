import React from "react";

const UserAvatar = ({
  user,
  size = "md",
  showOnlineStatus = false,
  className = "",
  onClick = null,
}) => {
  const getUserInitials = (user) => {
    if (user?.displayName) {
      return user.displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
    "2xl": "w-20 h-20",
    "3xl": "w-24 h-24",
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    "2xl": "text-xl",
    "3xl": "text-2xl",
  };

  const statusSizeClasses = {
    xs: "w-1.5 h-1.5 -bottom-0 -right-0",
    sm: "w-2 h-2 -bottom-0 -right-0",
    md: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
    lg: "w-3 h-3 -bottom-0.5 -right-0.5",
    xl: "w-4 h-4 -bottom-1 -right-1",
    "2xl": "w-5 h-5 -bottom-1 -right-1",
    "3xl": "w-6 h-6 bottom-1 right-1",
  };

  const borderClasses = {
    xs: "border",
    sm: "border",
    md: "border-2",
    lg: "border-2",
    xl: "border-2",
    "2xl": "border-2",
    "3xl": "border-2",
  };

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden ${borderClasses[size]} border-border bg-background`}
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user?.displayName || user?.email || "User"}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails to load
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}

        {/* Fallback initials display */}
        <div
          className={`w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold ${
            textSizeClasses[size]
          } ${user?.photoURL ? "hidden" : "flex"}`}
        >
          {getUserInitials(user)}
        </div>
      </div>

      {/* Online Status Indicator */}
      {showOnlineStatus && (
        <div
          className={`absolute ${statusSizeClasses[size]} bg-green-500 rounded-full border-2 border-white`}
        ></div>
      )}
    </div>
  );
};

export default UserAvatar;

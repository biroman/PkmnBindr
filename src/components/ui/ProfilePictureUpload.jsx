import { useState, useRef, useEffect } from "react";
import { CameraIcon, ClockIcon } from "@heroicons/react/24/outline";
import { ProfileImageService } from "../../services/ProfileImageService";
import { UploadRateLimitService } from "../../services/UploadRateLimitService";
import ImageCropModal from "./ImageCropModal";
import { toast } from "react-hot-toast";

const ProfilePictureUpload = ({
  user,
  onImageUpdate,
  className = "",
  size = "large",
  editable = true,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const fileInputRef = useRef(null);

  // Check rate limit on component mount and after uploads - only if editable
  useEffect(() => {
    const checkRateLimit = async () => {
      if (user?.uid && editable) {
        const info = await UploadRateLimitService.checkUploadLimit(user.uid);
        setRateLimitInfo(info);
      }
    };

    // Only check rate limit if the component is editable
    if (editable) {
      checkRateLimit();
    }
  }, [user?.uid, isUploading, editable]); // Re-check after upload completes

  const getUserInitials = (name, email) => {
    if (name)
      return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    if (email) return email[0].toUpperCase();
    return "U";
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check rate limit first - only if we have rate limit info
    if (rateLimitInfo && !rateLimitInfo.canUpload) {
      toast.error(rateLimitInfo.error || "Upload limit exceeded");
      event.target.value = "";
      return;
    }

    // Validate the file
    const validation = ProfileImageService.validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      event.target.value = "";
      return;
    }

    // Create a preview URL for the cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);

    // Reset the file input
    event.target.value = "";
  };

  const handleCropComplete = async (blob) => {
    if (!blob || !user?.uid) return;

    setIsUploading(true);
    try {
      // Upload to Firebase
      const newImageUrl = await ProfileImageService.uploadProfileImage(
        user.uid,
        blob,
        user.photoURL
      );

      // Callback to parent component
      if (onImageUpdate) {
        onImageUpdate(newImageUrl);
      }
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      toast.error("Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploading(false);
      setSelectedImage(null);
    }
  };

  const handleClick = () => {
    if (isUploading || !editable) return;

    // Check rate limit before allowing file selection - only if we have rate limit info
    if (rateLimitInfo && !rateLimitInfo.canUpload) {
      toast.error(rateLimitInfo.error || "Upload limit exceeded");
      return;
    }

    fileInputRef.current?.click();
  };

  // Size configurations
  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-20 h-20",
    large: "w-24 h-24",
  };

  const textSizeClasses = {
    small: "text-lg",
    medium: "text-xl",
    large: "text-2xl",
  };

  const iconSizeClasses = {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6",
  };

  const statusSizeClasses = {
    small: "w-4 h-4 bottom-0 right-0",
    medium: "w-5 h-5 bottom-0.5 right-0.5",
    large: "w-6 h-6 bottom-1 right-1",
  };

  const statusIconSizeClasses = {
    small: "w-2 h-2 mt-0.5",
    medium: "w-2.5 h-2.5 mt-0.5",
    large: "w-3 h-3 mt-0.5",
  };

  return (
    <>
      <div
        className={`relative group ${
          editable ? "cursor-pointer" : "cursor-default"
        } ${className}`}
        onClick={handleClick}
      >
        {/* Profile Picture */}
        <div
          className={`${sizeClasses[size]} rounded-full bg-background p-1 shadow-md`}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white ${textSizeClasses[size]} font-bold`}
            >
              {getUserInitials(user?.displayName, user?.email)}
            </div>
          )}
        </div>

        {/* Upload Overlay - Only show if editable */}
        {editable && (
          <div className="absolute inset-0 rounded-full bg-text-primary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploading ? (
              <div
                className={`${iconSizeClasses[size]} border-2 border-white border-t-transparent rounded-full animate-spin`}
              />
            ) : rateLimitInfo && !rateLimitInfo.canUpload ? (
              <ClockIcon className={`${iconSizeClasses[size]} text-red-400`} />
            ) : (
              <CameraIcon className={`${iconSizeClasses[size]} text-white`} />
            )}
          </div>
        )}

        {/* Status Indicator - Only show if editable and rate limit info is available */}
        {editable && rateLimitInfo && (
          <div
            className={`absolute ${
              statusSizeClasses[size]
            } rounded-full border-2 border-white ${
              !rateLimitInfo.canUpload ? "bg-red-500" : "bg-green-500"
            }`}
          >
            {!rateLimitInfo.canUpload && (
              <ClockIcon
                className={`${statusIconSizeClasses[size]} text-white m-auto`}
              />
            )}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || !editable}
        />
      </div>

      {/* Crop Modal - Only show if editable */}
      {editable && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setSelectedImage(null);
          }}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
};

export default ProfilePictureUpload;

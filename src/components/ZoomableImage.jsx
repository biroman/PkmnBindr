import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Image, AlertCircle } from "lucide-react";

// Check WebP support
const checkWebPSupport = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
};

const ZoomableImage = ({
  src,
  alt,
  className = "",
  zoom = false,
  caption = null,
  preload = false,
  ...props
}) => {
  const [modalImage, setModalImage] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [webpSupported, setWebpSupported] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Check WebP support on mount
  useEffect(() => {
    setWebpSupported(checkWebPSupport());
  }, []);

  // Get appropriate image source based on format support
  const getImageSrc = (originalSrc) => {
    // If WebP is not supported and the image is WebP, we might need a fallback
    if (!webpSupported && originalSrc.endsWith(".webp")) {
      console.warn(`WebP not supported, using original: ${originalSrc}`);
      // For now, still try the WebP - the server might handle conversion
      // In a production app, you'd have fallback images
    }
    return originalSrc;
  };

  // Preload image if requested
  useEffect(() => {
    if (preload && webpSupported !== null) {
      const imgSrc = getImageSrc(src);
      const img = new Image();
      img.onload = () => {
        console.log(`✅ Preloaded: ${imgSrc}`);
        setIsLoaded(true);
      };
      img.onerror = (error) => {
        console.error(`❌ Failed to preload: ${imgSrc}`, error);
        setIsError(true);
      };
      img.src = imgSrc;
    }
  }, [src, preload, webpSupported]);

  const openImageModal = (imageSrc, altText) => {
    if (zoom) {
      setModalImage({ src: imageSrc, alt: altText });
    }
  };

  const closeImageModal = () => {
    setModalImage(null);
  };

  const imageClasses = zoom
    ? `${className} cursor-zoom-in hover:shadow-xl transition-shadow duration-300`
    : className;

  const handleImageLoad = (e) => {
    console.log(`✅ Loaded: ${src}`);
    setIsLoaded(true);
  };

  const handleImageError = (e) => {
    console.error(`❌ Failed to load: ${src}`, e);

    // Try to retry once after a short delay
    if (retryCount < 1) {
      console.log(`🔄 Retrying image load: ${src}`);
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setIsError(false);
        // Force reload by updating the src with a cache buster
        const img = e.target;
        const originalSrc = img.src;
        img.src =
          originalSrc +
          (originalSrc.includes("?") ? "&" : "?") +
          "t=" +
          Date.now();
      }, 1000);
    } else {
      setIsError(true);
    }
  };

  return (
    <>
      {/* Image Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-full max-h-full flex flex-col">
            <button
              onClick={closeImageModal}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            <img
              src={modalImage.src}
              alt={modalImage.alt}
              className="max-w-full max-h-[calc(100vh-2rem)] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              loading="eager"
            />
          </div>
        </div>
      )}

      {/* Main Image */}
      <div className="text-center relative">
        {/* Loading skeleton */}
        {!isLoaded && !isError && (
          <div
            className={`${className} bg-background animate-pulse flex items-center justify-center`}
          >
            <div className="text-text-secondary">
              <Image className="w-8 h-8" />
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div
            className={`${className} bg-card-background flex items-center justify-center border-2 border-dashed border-border`}
          >
            <div className="text-text-secondary text-center p-4">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Failed to load image</p>
              <p className="text-xs text-gray-400 mt-1">
                {src.split("/").pop()}
              </p>
              {retryCount > 0 && (
                <p className="text-xs text-orange-500 mt-1">
                  Retried {retryCount} time(s)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actual image */}
        <img
          src={getImageSrc(src)}
          alt={alt}
          className={`${imageClasses} ${
            !isLoaded && !preload ? "opacity-0" : "opacity-100"
          } transition-opacity duration-300`}
          onClick={() => openImageModal(getImageSrc(src), alt)}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
          {...props}
        />

        {caption && (
          <p className="text-sm text-text-secondary mt-2 font-medium">{caption}</p>
        )}
      </div>
    </>
  );
};

export default ZoomableImage;

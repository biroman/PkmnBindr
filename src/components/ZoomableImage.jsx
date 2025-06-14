import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

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
            className={`${className} bg-gray-200 animate-pulse flex items-center justify-center`}
          >
            <div className="text-gray-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div
            className={`${className} bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300`}
          >
            <div className="text-gray-500 text-center p-4">
              <svg
                className="w-8 h-8 mx-auto mb-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
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
          <p className="text-sm text-gray-600 mt-2 font-medium">{caption}</p>
        )}
      </div>
    </>
  );
};

export default ZoomableImage;

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./Button";
import { XMarkIcon, ArrowUturnLeftIcon } from "@heroicons/react/24/outline";

const ImageCropModal = ({ isOpen, onClose, imageSrc, onCropComplete }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const CANVAS_SIZE = 200;
  const CROP_RADIUS = 90;

  // Load image when modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
        // Center the image initially
        setPosition({ x: 0, y: 0 });
        setScale(1);
        setRotation(0);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Draw the image on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const image = imageRef.current;

    if (!canvas || !ctx || !image) return;

    // Clear canvas with dark background
    ctx.fillStyle = "rgba(47, 51, 56, 1)"; // Dark gray background (Discord style)
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Create circular clipping path for the image
    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CROP_RADIUS, 0, 2 * Math.PI);
    ctx.clip();

    // Now draw the image within the clipped circle
    ctx.save();

    // Move to center
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply scale
    ctx.scale(scale, scale);

    // Calculate image size to fit in circle
    const size = Math.min(image.width, image.height);
    const imageScale = (CROP_RADIUS * 2) / size;
    const drawWidth = image.width * imageScale;
    const drawHeight = image.height * imageScale;

    // Draw image with position offset
    ctx.drawImage(
      image,
      -drawWidth / 2 + position.x,
      -drawHeight / 2 + position.y,
      drawWidth,
      drawHeight
    );

    // Restore transformations
    ctx.restore();

    // Restore clipping
    ctx.restore();

    // Draw circular border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CROP_RADIUS, 0, 2 * Math.PI);
    ctx.stroke();
  }, [scale, rotation, position]);

  // Redraw canvas when parameters change
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [imageLoaded, scale, rotation, position, drawCanvas]);

  // Mouse/touch handlers for dragging
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    // Check if click is within the crop circle
    const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
    if (distance <= CROP_RADIUS) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Limit dragging within reasonable bounds
    const maxOffset = 100;
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const handleScaleChange = (e) => {
    setScale(parseFloat(e.target.value));
  };

  const handleRotationChange = (e) => {
    setRotation(parseInt(e.target.value));
  };

  const handleSave = async () => {
    if (!imageRef.current) return;

    setIsProcessing(true);
    try {
      // Create a new canvas for the final cropped image
      const outputCanvas = document.createElement("canvas");
      const outputCtx = outputCanvas.getContext("2d");
      const size = 300; // Final output size

      outputCanvas.width = size;
      outputCanvas.height = size;

      // Save context
      outputCtx.save();

      // Move to center
      outputCtx.translate(size / 2, size / 2);

      // Apply rotation
      outputCtx.rotate((rotation * Math.PI) / 180);

      // Apply scale
      outputCtx.scale(scale, scale);

      // Calculate scaling for final output
      const image = imageRef.current;
      const imageSize = Math.min(image.width, image.height);
      const finalScale = size / (CROP_RADIUS * 2);
      const imageScale = (CROP_RADIUS * 2) / imageSize;
      const drawWidth = image.width * imageScale * finalScale;
      const drawHeight = image.height * imageScale * finalScale;

      // Draw the final cropped image
      outputCtx.drawImage(
        image,
        -drawWidth / 2 + position.x * finalScale,
        -drawHeight / 2 + position.y * finalScale,
        drawWidth,
        drawHeight
      );

      outputCtx.restore();

      // Convert to blob
      const blob = await new Promise((resolve) => {
        outputCanvas.toBlob(resolve, "image/jpeg", 0.8);
      });

      await onCropComplete(blob);
      onClose();
    } catch (error) {
      console.error("Failed to process image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(false);
    onClose();
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-80 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-card-background rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            Edit Profile Picture
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Canvas Editor */}
        <div className="p-6 bg-card-background">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onMouseDown={handleMouseDown}
                className={`border-4 border-gray-600 rounded-lg ${
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                }`}
                style={{ display: imageLoaded ? "block" : "none" }}
              />
              {!imageLoaded && (
                <div className="w-[200px] h-[200px] border-4 border-border rounded-lg bg-background flex items-center justify-center">
                  <div className="text-gray-400 text-sm">Loading...</div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Scale Control */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-text-secondary">
                  Zoom
                </label>
                <span className="text-xs text-gray-400">
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.05}
                value={scale}
                onChange={handleScaleChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer discord-slider"
              />
            </div>

            {/* Rotation Control */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-text-secondary">
                  Rotation
                </label>
                <span className="text-xs text-gray-400">{rotation}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={handleRotationChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer discord-slider"
              />
            </div>

            {/* Instructions */}
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-300 text-center">
                Drag within the circle to reposition • Use sliders to zoom and
                rotate
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 bg-gray-900 border-t border-gray-700">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowUturnLeftIcon className="w-4 h-4 mr-2" />
            Reset
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isProcessing}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing || !imageLoaded}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[80px]"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Sliders, Check, RotateCcw, Image as ImageIcon } from 'lucide-react';

export default function DiagramImageCropper({ onCropComplete }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [enhanceFilter, setEnhanceFilter] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(new Image());

  // Crop Box coordinates
  const [cropBox, setCropBox] = useState({ x: 50, y: 50, w: 200, h: 200 });
  const [dragStart, setDragStart] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null); // 'tl', 'tr', 'bl', 'br' or 'move'

  useEffect(() => {
    if (!imageSrc) return;
    imageRef.current.src = imageSrc;
    imageRef.current.onload = () => {
      // Set initial crop box centered
      const imgW = imageRef.current.width;
      const imgH = imageRef.current.height;
      setCropBox({
        x: Math.round(imgW * 0.1),
        y: Math.round(imgH * 0.1),
        w: Math.round(imgW * 0.8),
        h: Math.round(imgH * 0.8),
      });
      drawCanvas();
    };
  }, [imageSrc]);

  useEffect(() => {
    if (imageSrc) {
      drawCanvas();
    }
  }, [brightness, contrast, enhanceFilter, cropBox]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setImageSrc(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      alert('Camera access denied or unavailable.');
    }
  };

  const captureFrame = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      setImageSrc(canvas.toDataURL('image/jpeg'));

      // Stop camera stream
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Redraw canvas with crop box and filters
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current.src) return;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    canvas.width = img.width;
    canvas.height = img.height;

    // Apply brightness and contrast filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, 0, 0);

    // Apply custom perspective threshold filter if checked
    if (enhanceFilter) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Simple binarization algorithm (high contrast high pass look)
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = gray > 120 ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Reset filters for drawing crop overlays
    ctx.filter = 'none';

    // Draw dim overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    // Top
    ctx.fillRect(0, 0, canvas.width, cropBox.y);
    // Bottom
    ctx.fillRect(0, cropBox.y + cropBox.h, canvas.width, canvas.height - (cropBox.y + cropBox.h));
    // Left
    ctx.fillRect(0, cropBox.y, cropBox.x, cropBox.h);
    // Right
    ctx.fillRect(cropBox.x + cropBox.w, cropBox.y, canvas.width - (cropBox.x + cropBox.w), cropBox.h);

    // Draw Crop Box border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);

    // Draw Corner Handles
    ctx.fillStyle = '#6366f1';
    const handleSize = 12;
    ctx.fillRect(cropBox.x - handleSize/2, cropBox.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropBox.x + cropBox.w - handleSize/2, cropBox.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropBox.x - handleSize/2, cropBox.y + cropBox.h - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropBox.x + cropBox.w - handleSize/2, cropBox.y + cropBox.h - handleSize/2, handleSize, handleSize);
  };

  const getCanvasMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Support touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const pos = getCanvasMousePos(e);
    const handleSize = 30; // touch target padding

    // Detect if clicking corners
    const isTL = Math.abs(pos.x - cropBox.x) < handleSize && Math.abs(pos.y - cropBox.y) < handleSize;
    const isTR = Math.abs(pos.x - (cropBox.x + cropBox.w)) < handleSize && Math.abs(pos.y - cropBox.y) < handleSize;
    const isBL = Math.abs(pos.x - cropBox.x) < handleSize && Math.abs(pos.y + cropBox.h - pos.y) < handleSize; // bottom left
    const isBR = Math.abs(pos.x - (cropBox.x + cropBox.w)) < handleSize && Math.abs(pos.y - (cropBox.y + cropBox.h)) < handleSize;

    if (isTL) setResizeHandle('tl');
    else if (isTR) setResizeHandle('tr');
    else if (isBR) setResizeHandle('br');
    else if (pos.x >= cropBox.x && pos.x <= cropBox.x + cropBox.w && pos.y >= cropBox.y && pos.y <= cropBox.y + cropBox.h) {
      setResizeHandle('move');
      setDragStart({ x: pos.x - cropBox.x, y: pos.y - cropBox.y });
    }
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const pos = getCanvasMousePos(e);

    if (resizeHandle === 'move' && dragStart) {
      setCropBox((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(canvasRef.current.width - prev.w, pos.x - dragStart.x)),
        y: Math.max(0, Math.min(canvasRef.current.height - prev.h, pos.y - dragStart.y)),
      }));
    } else if (resizeHandle === 'br') {
      const w = Math.max(50, Math.min(canvasRef.current.width - cropBox.x, pos.x - cropBox.x));
      const h = Math.max(50, Math.min(canvasRef.current.height - cropBox.y, pos.y - cropBox.y));
      setCropBox((prev) => ({ ...prev, w, h }));
    } else if (resizeHandle === 'tl') {
      const newX = Math.max(0, Math.min(cropBox.x + cropBox.w - 50, pos.x));
      const newY = Math.max(0, Math.min(cropBox.y + cropBox.h - 50, pos.y));
      setCropBox((prev) => ({
        x: newX,
        y: newY,
        w: prev.w + (prev.x - newX),
        h: prev.h + (prev.y - newY),
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizeHandle(null);
  };

  // Performs crop and triggers callback with cropped Blob
  const processCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a new canvas to hold the cropped image
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropBox.w;
    croppedCanvas.height = cropBox.h;
    const croppedCtx = croppedCanvas.getContext('2d');

    // Draw the cropped portion of the main filtered canvas
    croppedCtx.drawImage(
      canvas,
      cropBox.x, cropBox.y, cropBox.w, cropBox.h, // source coordinates
      0, 0, cropBox.w, cropBox.h // destination coordinates
    );

    croppedCanvas.toBlob((blob) => {
      onCropComplete(blob, croppedCanvas.toDataURL('image/jpeg'));
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-w-2xl mx-auto text-slate-100">
      
      {!imageSrc ? (
        /* Uploader View */
        <div className="space-y-6 text-center">
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-slate-700 transition cursor-pointer"
               onClick={() => fileInputRef.current.click()}>
            <Upload className="w-12 h-12 text-slate-500" />
            <div>
              <span className="font-bold text-slate-200">Click to upload diagram</span>
              <p className="text-xs text-slate-450 mt-1">Supports PNG, JPG, or WEBP formats up to 10MB</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Or</span>
            <button
              onClick={startCamera}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" /> Use Camera
            </button>
          </div>

          {/* Camera Video Stream Demonstration */}
          <div className="relative rounded-2xl overflow-hidden bg-black max-w-sm mx-auto">
            <video ref={videoRef} className="w-full h-auto" />
            {videoRef.current && videoRef.current.srcObject && (
              <button
                onClick={captureFrame}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 bg-red-600 hover:bg-red-550 text-white font-black text-xs rounded-full shadow-lg cursor-pointer"
              >
                Capture Photo
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Cropper & Filters View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <ImageIcon className="w-4.5 h-4.5 text-indigo-400" />
              Adjust & Crop diagram area
            </h4>
            <button
              onClick={() => setImageSrc(null)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start Over
            </button>
          </div>

          {/* Canvas Wrapper */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-850 max-h-[420px] flex items-center justify-center cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              className="max-w-full max-h-[400px] object-contain"
            />
          </div>

          {/* Filters Dashboard Panel */}
          <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-350 text-xs font-black uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Filters / Handwriting Enhancer
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-300">
              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Brightness</span>
                  <span className="font-mono">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Contrast</span>
                  <span className="font-mono">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-300 cursor-pointer pt-2 border-t border-slate-900">
              <input
                type="checkbox"
                checked={enhanceFilter}
                onChange={(e) => setEnhanceFilter(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 rounded"
              />
              Adaptive Binarization (Boost faint pencil handwriting)
            </label>
          </div>

          <button
            onClick={processCrop}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-550 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4.5 h-4.5" /> Analyze Cropped Region
          </button>
        </div>
      )}
    </div>
  );
}

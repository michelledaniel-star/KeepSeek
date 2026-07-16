import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function PhotoEditor({ imageUrl, onSave, onCancel, showRemoveBg = true }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [processedImageUrl, setProcessedImageUrl] = useState(imageUrl);

  const CANVAS_SIZE = 400;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
   ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
ctx.save();
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.filter = `brightness(${brightness}%)`;

    const fitScale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
    const scaledW = img.naturalWidth * fitScale * zoom;
    const scaledH = img.naturalHeight * fitScale * zoom;

    ctx.drawImage(img, -scaledW / 2 + position.x, -scaledH / 2 + position.y, scaledW, scaledH);
    ctx.restore();
  }, [zoom, rotation, brightness, position]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      drawCanvas();
    };
    img.src = processedImageUrl;
  }, [processedImageUrl]);

  useEffect(() => {
    if (imgRef.current?.complete) {
      drawCanvas();
    }
  }, [zoom, rotation, brightness, position]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleRemoveBg = async () => {
    setRemovingBg(true);
    setBgProgress(0);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'photo.png', { type: 'image/png' });

      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', 'everheld');
      data.append('cloud_name', 'dg5pprmpg');

      const response = await fetch('https://api.cloudinary.com/v1_1/dg5pprmpg/image/upload', {
        method: 'POST',
        body: data,
      });
      const result = await response.json();

      const bgRemovedUrl = result.secure_url.replace('/upload/', '/upload/e_background_removal/');

      // Animate progress bar over 3 seconds while Cloudinary processes
      const interval = setInterval(() => {
        setBgProgress(prev => {
          if (prev >= 90) { clearInterval(interval); return 90; }
          return prev + 10;
        });
      }, 300);

      await new Promise(resolve => setTimeout(resolve, 3000));
      clearInterval(interval);
      setBgProgress(100);

      setProcessedImageUrl(bgRemovedUrl);
      setBgRemoved(true);
    } catch (error) {
      console.error('Background removal error:', error);
      alert('Background removal failed. Please try again.');
    } finally {
      setRemovingBg(false);
    }
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setPosition({ x: 0, y: 0 });
    setProcessedImageUrl(imageUrl);
    setBgRemoved(false);
    setBgProgress(0);
  };

  const handleSave = async () => {
    if (bgRemoved && processedImageUrl !== imageUrl) {
      // Background was removed — image lives at a Cloudinary URL.
      // Fetch it as a blob so we pass a real File back, same as the normal path.
      try {
        const response = await fetch(processedImageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'edited-photo.png', { type: 'image/png' });
        const previewUrl = URL.createObjectURL(blob);
        onSave(file, previewUrl);
      } catch (error) {
        console.error('Error fetching processed image:', error);
        onSave(null, processedImageUrl, processedImageUrl);
      }
      return;
    }

    // No background removal — read from canvas as before
    const canvas = canvasRef.current;
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'edited-photo.jpg', { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);
        onSave(file, previewUrl);
      }
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-[70] overflow-y-auto">
      <div className="bg-white w-full max-w-lg mx-4 my-6 p-6">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl" style={{ fontFamily: 'Merriweather, serif', fontStyle: 'italic' }}>
            Edit Photo
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-black text-2xl leading-none">×</button>
        </div>

        <p className="text-xs text-gray-400 mb-3" style={{ fontFamily: 'Roboto, sans-serif' }}>
          Drag to reposition · Use slider to zoom
        </p>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative overflow-hidden bg-gray-100 cursor-grab active:cursor-grabbing mx-auto"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, maxWidth: '100%', touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Controls */}
        <div className="mt-4 space-y-4">

          {/* Zoom */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs uppercase tracking-widest text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>Zoom</label>
              <span className="text-xs text-gray-400">{Math.round(zoom * 100)}%</span>
            </div>
            <input type="range" min="0.5" max="3" step="0.01" value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))} className="w-full accent-black" />
          </div>

          {/* Brightness */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs uppercase tracking-widest text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>Brightness</label>
              <span className="text-xs text-gray-400">{brightness}%</span>
            </div>
            <input type="range" min="50" max="200" step="1" value={brightness}
              onChange={e => setBrightness(parseInt(e.target.value))} className="w-full accent-black" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={handleRotate}
              className="px-4 py-2 border border-gray-300 text-sm hover:border-gray-400 transition-colors"
              style={{ fontFamily: 'Roboto, sans-serif' }}>
              ↻ Rotate 90°
            </button>
            {showRemoveBg && (
              <button type="button" onClick={handleRemoveBg} disabled={removingBg || bgRemoved}
                className="px-4 py-2 border border-gray-300 text-sm hover:border-gray-400 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Roboto, sans-serif' }}>
                {bgRemoved ? '✓ Background Removed' : 'Remove Background'}
              </button>
            )}
            <button type="button" onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-sm text-gray-400 hover:border-gray-400 transition-colors"
              style={{ fontFamily: 'Roboto, sans-serif' }}>
              Reset
            </button>
          </div>

          {/* Background removal progress bar */}
          {removingBg && (
            <div className="w-full">
              <div className="w-full bg-gray-200 h-1.5">
                <div
                  className="bg-[#669999] h-1.5 transition-all duration-300"
                  style={{ width: `${bgProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Removing background...
              </p>
            </div>
          )}

        </div>

        {/* Save / Cancel */}
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-sm"
            style={{ fontFamily: 'Roboto, sans-serif' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            className="flex-1 px-4 py-2 bg-black text-white text-sm"
            style={{ fontFamily: 'Roboto, sans-serif' }}>
            Use This Photo
          </button>
        </div>
      </div>
    </div>
  );
}

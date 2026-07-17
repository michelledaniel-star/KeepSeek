import React, { useState, useEffect } from 'react';

/**
 * Full-screen photo review: browse a grid, tap into a large full-screen view
 * with a filmstrip to move between shots, set a Main photo, or remove one.
 *
 * Replaces the old hover-only 3-column grid controls in AddItemForm.jsx,
 * which don't work on a touchscreen (group-hover:opacity-100 requires a
 * mouse hover that doesn't exist on mobile). Mirrors the phone's native
 * Photos app so nobody has to learn a new pattern.
 *
 * Props:
 *   photos          [{ id, previewUrl, imageUrl, uploading }] — required
 *   mainPhotoId     id of the current Main photo (defaults to photos[0])
 *   initialPhotoId  if provided, opens straight into full-screen on that
 *                   photo instead of the grid — use this right after taking
 *                   a shot, so there's no extra tap to review it.
 *   onSetMain(id)   called when the user picks a new Main photo
 *   onRemove(id)    called when the user removes a photo
 *   onClose()       called when the user backs all the way out
 */
export default function PhotoReviewScreen({
  photos,
  mainPhotoId,
  initialPhotoId,
  onSetMain,
  onRemove,
  onClose,
}) {
  const startIndex = initialPhotoId
    ? Math.max(0, (photos || []).findIndex(p => p.id === initialPhotoId))
    : 0;

  const [mode, setMode] = useState(initialPhotoId ? 'fullscreen' : 'grid');
  const [activeIndex, setActiveIndex] = useState(startIndex);

  // Keep activeIndex in bounds if the photos array changes size out from
  // under us (e.g. a remove finishes and the parent re-renders shorter).
  useEffect(() => {
    if (!photos || photos.length === 0) return;
    if (activeIndex >= photos.length) {
      setActiveIndex(Math.max(0, photos.length - 1));
    }
  }, [photos, activeIndex]);

  if (!photos || photos.length === 0) {
    return null;
  }

  const effectiveMainId = mainPhotoId || photos[0].id;
  const active = photos[activeIndex] || photos[0];

  const goTo = (index) => {
    if (index < 0 || index >= photos.length) return;
    setActiveIndex(index);
  };

  const openFullscreen = (index) => {
    setActiveIndex(index);
    setMode('fullscreen');
  };

  const handleRemove = (photo) => {
    const removedIndex = photos.findIndex(p => p.id === photo.id);
    if (photos.length <= 1) {
      onRemove?.(photo.id);
      onClose?.();
      return;
    }
    const nextIndex = removedIndex >= photos.length - 1 ? removedIndex - 1 : removedIndex;
    setActiveIndex(Math.max(0, nextIndex));
    onRemove?.(photo.id);
  };

  return (
    <div className="fixed inset-0 bg-black z-[80] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 flex-shrink-0">
        {mode === 'fullscreen' && photos.length > 1 ? (
          <button
            type="button"
            onClick={() => setMode('grid')}
            className="text-white/80 hover:text-white flex items-center gap-2 font-subhead text-sm tracking-[0.01em]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All photos
          </button>
        ) : (
          <span className="font-subhead text-sm tracking-[0.01em] text-white/80">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-white/80 hover:text-white text-2xl leading-none"
        >
          &times;
        </button>
      </div>

      {mode === 'grid' ? (
        <div className="flex-1 overflow-y-auto px-4 pb-8 md:px-6">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => openFullscreen(index)}
                className="relative aspect-square rounded-lg overflow-hidden"
              >
                <img
                  src={photo.previewUrl || photo.imageUrl}
                  alt=""
                  className={`w-full h-full object-cover ${photo.uploading ? 'opacity-50' : ''}`}
                />
                {photo.id === effectiveMainId && (
                  <span className="absolute bottom-1 left-1 bg-black text-white text-xs font-subhead tracking-[0.01em] px-2 py-0.5 rounded">
                    Main
                  </span>
                )}
                {photo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Full-screen image */}
          <div className="flex-1 relative flex items-center justify-center px-2 min-h-0">
            <img
              src={active.previewUrl || active.imageUrl}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(activeIndex - 1)}
                  disabled={activeIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white disabled:opacity-0 w-10 h-10 rounded-full flex items-center justify-center transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => goTo(activeIndex + 1)}
                  disabled={activeIndex === photos.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white disabled:opacity-0 w-10 h-10 rounded-full flex items-center justify-center transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Set as Main / Remove */}
          <div className="flex gap-3 px-4 py-4 md:px-6 flex-shrink-0">
            <button
              type="button"
              onClick={() => onSetMain?.(active.id)}
              disabled={active.id === effectiveMainId}
              className="flex-1 px-4 py-3 bg-white text-black font-subhead text-sm tracking-[0.01em] rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              {active.id === effectiveMainId ? 'This is the Main photo' : 'Set as Main'}
            </button>
            <button
              type="button"
              onClick={() => handleRemove(active)}
              className="flex-1 px-4 py-3 border border-white/30 text-white font-subhead text-sm tracking-[0.01em] rounded-lg hover:bg-white/10 transition-colors"
            >
              Remove
            </button>
          </div>

          {/* Filmstrip */}
          {photos.length > 1 && (
            <div className="flex gap-2 px-4 pb-4 md:px-6 overflow-x-auto flex-shrink-0">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                    index === activeIndex ? 'border-white' : 'border-transparent opacity-60'
                  }`}
                >
                  <img
                    src={photo.previewUrl || photo.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {photo.id === effectiveMainId && (
                    <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.287 3.959c.3.921-.755 1.688-1.538 1.118l-3.367-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.197-1.538-1.118l1.287-3.959a1 1 0 00-.363-1.118L2.98 9.385c-.784-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

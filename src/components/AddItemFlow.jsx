import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { createItem, addItemImage, createStory, fetchItems } from '../services/airtable';
import { uploadImage } from '../services/cloudinary';
import QuestionFlow from './QuestionFlow';
import PhotoReviewScreen from './PhotoReviewScreen';

const genId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;

/**
 * AddItemFlow — the redesigned, camera-first "Add Item" experience.
 * See KeepSeek Add Item Redesign Plan v2 (Drive) for the full spec.
 *
 * Fast Flow and Easy Flow are one screen: take photos of whatever's in
 * front of you, tap Next Item to lock the current one in and start the
 * next, or tap Tell the Story Now any time to record a story for the item
 * you're currently shooting. The moment an item is locked in (Next Item,
 * or Tell the Story Now), it becomes a real saved row — not a local
 * draft — with name/category left blank to fill in later. Photos stay as
 * free local previews until that moment, so culling rejects never costs
 * an upload.
 *
 * Not yet wired into /add — this is reachable at /add-preview for testing
 * before it replaces the old 4-step wizard (see task: "Route new flow in
 * as real /add experience").
 */
export default function AddItemFlow({ onClose }) {
  const { keeperId, keeperSlug } = useAuth();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('draft');

  // The item currently being photographed — not yet saved to the database.
  const [currentPhotos, setCurrentPhotos] = useState([]); // [{ id, previewUrl, blob }]
  const [mainPhotoId, setMainPhotoId] = useState(null);
  const [finalizing, setFinalizing] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [reviewInitialId, setReviewInitialId] = useState(null);

  const [storyTargetItemId, setStoryTargetItemId] = useState(null);

  // The persistent gallery underneath the camera.
  const [items, setItems] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  // "Add another photo to something I already saved" overlay.
  const [quickAddItem, setQuickAddItem] = useState(null);
  const [quickAddUploading, setQuickAddUploading] = useState(false);

  // --- Camera setup ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // --- Default status: draft if this keeper already has seekers, same rule AddItemForm used ---
  useEffect(() => {
    (async () => {
      if (!keeperSlug) return;
      const { data: accessRows } = await supabase
        .from('access')
        .select('id')
        .eq('keeper_slug', keeperSlug)
        .limit(1);
      setDefaultStatus(accessRows && accessRows.length > 0 ? 'draft' : 'public');
    })();
  }, [keeperSlug]);

  // --- Live gallery underneath ---
  const loadGallery = async () => {
    const data = await fetchItems(keeperId);
    setItems(data);
    setLoadingGallery(false);
  };
  useEffect(() => {
    if (keeperId) loadGallery();
  }, [keeperId]);

  // --- Release any local preview URLs on unmount ---
  useEffect(() => {
    return () => {
      currentPhotos.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const id = genId();
      const previewUrl = URL.createObjectURL(blob);
      setCurrentPhotos((prev) => [...prev, { id, previewUrl, blob }]);
      setMainPhotoId((prev) => prev || id);
    }, 'image/jpeg', 0.92);
  };

  const handleFilePicked = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((file) => {
      const id = genId();
      const previewUrl = URL.createObjectURL(file);
      setCurrentPhotos((prev) => [...prev, { id, previewUrl, blob: file }]);
      setMainPhotoId((prev) => prev || id);
    });
  };

  const removeCurrentPhoto = (id) => {
    const target = currentPhotos.find((p) => p.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    const remaining = currentPhotos.filter((p) => p.id !== id);
    setCurrentPhotos(remaining);
    setMainPhotoId((prev) => (prev === id ? (remaining[0]?.id || null) : prev));
    if (remaining.length === 0) setShowReview(false);
  };

  const resetCurrentItem = () => {
    setCurrentPhotos([]);
    setMainPhotoId(null);
  };

  // Uploads whatever's left in currentPhotos (anything explicitly removed
  // via review never got this far, so it never cost an upload) and creates
  // the real database row. Name and category are left blank on purpose —
  // this is the "front door" only; details get filled in later.
  const finalizeCurrentItem = async () => {
    if (currentPhotos.length === 0) return null;
    setFinalizing(true);
    try {
      const ordered = [...currentPhotos].sort((a) => (a.id === mainPhotoId ? -1 : 1));
      const uploadedUrls = [];
      for (const photo of ordered) {
        const result = await uploadImage(photo.blob);
        uploadedUrls.push(result.url);
      }

      const newItem = await createItem({
        name: '',
        category: '',
        status: defaultStatus,
        imageUrl: uploadedUrls[0] || '',
      }, keeperId);

      for (let i = 1; i < uploadedUrls.length; i++) {
        await addItemImage(newItem.id, uploadedUrls[i], keeperId);
      }

      currentPhotos.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
      resetCurrentItem();
      setShowReview(false);
      await loadGallery();
      return newItem.id;
    } catch (err) {
      console.error('Error saving item:', err);
      alert("Something went wrong saving that — your photos are still here, so it's safe to try again.");
      return null;
    } finally {
      setFinalizing(false);
    }
  };

  const handleNextItem = async () => {
    await finalizeCurrentItem();
  };

  const handleTellStoryNow = async () => {
    const itemId = await finalizeCurrentItem();
    if (itemId) setStoryTargetItemId(itemId);
  };

  const handleStoryComplete = async (answers) => {
    const itemId = storyTargetItemId;
    setStoryTargetItemId(null);
    const text = (answers?.story || '').trim();
    if (!itemId || !text) return;
    try {
      await createStory({ storyType: 'text', textContent: text, itemId });
      await loadGallery();
    } catch (err) {
      console.error('Error saving story:', err);
      alert('The item saved, but the story itself failed to save. You can add it again from the item page.');
    }
  };

  const handleQuickAddFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !quickAddItem) return;
    setQuickAddUploading(true);
    try {
      const result = await uploadImage(file);
      await addItemImage(quickAddItem.id, result.url, keeperId);
      await loadGallery();
    } catch (err) {
      console.error('Error adding photo:', err);
      alert('Could not add that photo. Please try again.');
    } finally {
      setQuickAddUploading(false);
    }
  };

  const handleClose = () => {
    if (currentPhotos.length > 0) {
      if (!window.confirm('You have photos here that are not saved yet. Leave anyway?')) return;
      currentPhotos.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
    }
    onClose?.();
  };

  const hasCurrentPhotos = currentPhotos.length > 0;

  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h1 className="font-heading italic tracking-[0.05em] text-xl">Add Items</h1>
        <button
          type="button"
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      {/* Camera + controls, pinned */}
      <div className="flex-shrink-0 bg-black">
        <div className="relative w-full" style={{ height: '38vh', minHeight: '260px' }}>
          {!cameraError ? (
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/70 px-6 text-center">
              <p className="font-body text-sm">Couldn't access a camera on this device.</p>
              <label className="cursor-pointer px-6 py-3 bg-white text-black font-subhead text-sm tracking-[0.01em] rounded-full">
                Choose Photos Instead
                <input type="file" accept="image/*" multiple onChange={handleFilePicked} className="hidden" />
              </label>
            </div>
          )}

          {/* Thumbnail strip of the item currently being shot */}
          {hasCurrentPhotos && (
            <div className="absolute top-2 left-2 right-2 flex gap-2 overflow-x-auto">
              {currentPhotos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setReviewInitialId(p.id); setShowReview(true); }}
                  className={`relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 ${p.id === mainPhotoId ? 'border-white' : 'border-white/40'}`}
                >
                  <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Shutter + secondary controls */}
        <div className="flex items-center justify-center gap-8 py-4">
          {!cameraError && (
            <button
              type="button"
              onClick={takePhoto}
              disabled={!cameraReady || finalizing}
              aria-label="Take photo"
              className="w-16 h-16 rounded-full bg-white border-4 border-white/30 disabled:opacity-40"
            />
          )}
          {cameraError && (
            <label className="cursor-pointer px-5 py-3 bg-white text-black font-subhead text-sm tracking-[0.01em] rounded-full">
              + Photo
              <input type="file" accept="image/*" multiple onChange={handleFilePicked} className="hidden" />
            </label>
          )}
        </div>

        <div className="flex gap-3 px-4 pb-4">
          <button
            type="button"
            onClick={handleTellStoryNow}
            disabled={!hasCurrentPhotos || finalizing}
            className="flex-1 px-4 py-3 border border-white/30 text-white font-subhead text-sm tracking-[0.01em] rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            Tell the Story Now
          </button>
          <button
            type="button"
            onClick={handleNextItem}
            disabled={!hasCurrentPhotos || finalizing}
            className="flex-1 px-4 py-3 bg-white text-black font-subhead text-sm tracking-[0.01em] rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-colors"
          >
            {finalizing ? 'Saving…' : 'Next Item'}
          </button>
        </div>
      </div>

      {/* Live gallery underneath */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loadingGallery ? (
          <p className="text-center text-gray-400 font-body text-sm py-8">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-400 font-body text-sm py-8">
            Take your first photo above — it'll show up here the moment you tap Next Item.
          </p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setQuickAddItem(item)}
                className="relative aspect-square rounded-sm overflow-hidden bg-gray-50"
              >
                {item.image && (
                  <img
                    src={item.image.includes('cloudinary')
                      ? item.image.replace('/upload/', '/upload/c_fill,g_auto,w_400,h_400/')
                      : item.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Review/cull overlay for the item currently being shot */}
      {showReview && hasCurrentPhotos && (
        <PhotoReviewScreen
          photos={currentPhotos}
          mainPhotoId={mainPhotoId}
          initialPhotoId={reviewInitialId}
          onSetMain={setMainPhotoId}
          onRemove={removeCurrentPhoto}
          onClose={() => setShowReview(false)}
        />
      )}

      {/* Tell the story now */}
      {storyTargetItemId && (
        <QuestionFlow
          questions={[{ id: 'story', field: 'story', prompt: "What's the story behind this?" }]}
          onComplete={handleStoryComplete}
          onCancel={() => setStoryTargetItemId(null)}
        />
      )}

      {/* Quick "add another photo" overlay for an already-saved item */}
      {quickAddItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-6">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            {quickAddItem.image && (
              <img src={quickAddItem.image} alt="" className="w-24 h-24 object-cover rounded-lg mx-auto" />
            )}
            <p className="font-body text-sm text-gray-600">Add another photo to this item.</p>
            <label className="block cursor-pointer px-6 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] rounded-lg">
              {quickAddUploading ? 'Uploading…' : '+ Add Photo'}
              <input type="file" accept="image/*" onChange={handleQuickAddFile} disabled={quickAddUploading} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => setQuickAddItem(null)}
              className="w-full px-4 py-2 text-sm font-body text-gray-400 hover:text-gray-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

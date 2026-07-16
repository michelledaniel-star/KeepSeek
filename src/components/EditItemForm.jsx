import React, { useState, useEffect } from 'react';
import { updateItem, fetchStoryForItem, createStory, updateStory, fetchItemImages, addItemImage, deleteImage, replaceItemPrimaryImage, deleteItemAndOrphanCheck } from '../services/airtable';
import { useAuth } from '../context/AuthContext';
import { uploadImage } from '../services/cloudinary';
import PersonPhotoModal from './PersonPhotoModal';
import QRCode from 'qrcode';

export default function EditItemForm({ item, people, onClose, onSuccess, onCompleteLater, onDelete }) {
  const { keeperId } = useAuth();
  const [formData, setFormData] = useState({
    name: item.name || '',
    value: item.value || '',
    ownerId: item.ownerId || '',
    beneficiary: item.beneficiary || '',
    notes: item.notes || '',
    storyText: '',
    category: item.category || '',
  });

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };
  const [story, setStory] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [primaryImage, setPrimaryImage] = useState(item.image || null);
  const [newPrimaryFile, setNewPrimaryFile] = useState(null);
  const [newPrimaryPreview, setNewPrimaryPreview] = useState(null);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPersonPhotoModal, setShowPersonPhotoModal] = useState(false);
  const [showPrimaryQR, setShowPrimaryQR] = useState(false);
  const [primaryQRDataUrl, setPrimaryQRDataUrl] = useState('');
  const [primaryQRSessionId, setPrimaryQRSessionId] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  useEffect(() => {
    fetchStoryForItem(item.id).then(existing => {
      if (existing) {
        setStory(existing);
        if (existing.storyType === 'text') {
          setFormData(prev => ({ ...prev, storyText: existing.textContent }));
        }
      }
    });
    fetchItemImages(item.id).then(images => {
      const extras = images.filter(img => img.order !== 0);
      setExistingImages(extras);
      const primary = images.find(img => img.order === 0);
      if (primary) setPrimaryImage(primary.url);
    });
  }, [item.id]);

  useEffect(() => {
    if (!showPrimaryQR || !primaryQRSessionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/upload-session?sessionId=${primaryQRSessionId}`);
        const data = await res.json();
        if (data.imageUrl) {
          setNewPrimaryPreview(data.imageUrl);
          setNewPrimaryFile(null);
          setShowPrimaryQR(false);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [showPrimaryQR, primaryQRSessionId]);

  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files);
    setNewImages(prev => [...prev, ...files]);
    const previews = files.map(f => URL.createObjectURL(f));
    setNewImagePreviews(prev => [...prev, ...previews]);
  };

  const handleDeleteExistingImage = async (imageId) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await deleteImage(imageId, keeperId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      alert('Error deleting photo. Please try again.');
    }
  };

  const handleRemoveNewImage = (index) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePrimaryImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewPrimaryFile(file);
    setNewPrimaryPreview(URL.createObjectURL(file));
  };

  const handleShowPrimaryQR = async () => {
    const newSessionId = `session_${Date.now()}`;
    setPrimaryQRSessionId(newSessionId);
    const uploadUrl = `${window.location.origin}/mobile-upload?session=${newSessionId}`;
    const qr = await QRCode.toDataURL(uploadUrl, { width: 300, margin: 2 });
    setPrimaryQRDataUrl(qr);
    setShowPrimaryQR(true);
  };

  const handleSave = async (complete = false) => {
    setSaving(true);
    try {
      if (newPrimaryFile) {
        const result = await uploadImage(newPrimaryFile);
        await replaceItemPrimaryImage(item.id, result.url, keeperId);
      }

      for (const file of newImages) {
        const result = await uploadImage(file);
        await addItemImage(item.id, result.url, keeperId);
      }

      const fields = {
        name: formData.name,
        notes: formData.notes,
        beneficiary: formData.beneficiary,
        category: formData.category || '',
        entry_complete: complete,
      };

      fields.value = formData.value ? parseFloat(formData.value) : null;
      fields.person_id = formData.ownerId || null;

      await updateItem(item.id, fields, keeperId);

      if (!story || story.storyType === 'text') {
        const currentText = story?.textContent || '';
        if (formData.storyText !== currentText) {
          if (story && story.id) {
            await updateStory(story.id, {
              storyType: 'text',
              textContent: formData.storyText,
              mediaUrl: story.mediaUrl || '',
            });
          } else if (formData.storyText) {
            await createStory({
              storyType: 'text',
              textContent: formData.storyText,
              itemId: item.id,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
      setIsDirty(false);
    }
  };

  const handleSaveChanges = async () => {
    await handleSave(true);
    onSuccess?.();
  };

  const handleSaveAsIs = async () => {
    await handleSave(true);
    onSuccess?.();
  };

  const handleCompleteLater = async () => {
    await handleSave(false);
    onCompleteLater?.();
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this keepsake? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteItemAndOrphanCheck(item.id, keeperId);
      onDelete?.();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting item. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[60] overflow-y-auto">
      <div className="bg-white w-full max-w-lg mx-4 my-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl" style={{ fontFamily: 'Merriweather, serif', fontStyle: 'italic' }}>
            Complete Item Information
          </h2>
          <button
            onClick={() => isDirty ? setShowUnsavedWarning(true) : onClose()}
            className="text-gray-400 hover:text-black text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-5">

          {/* Name */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => updateFormData({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
              style={{ fontFamily: 'Lora, serif' }}
            />
          </div>
{/* Category */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Category
            </label>
            <select
              value={formData.category}
              onChange={e => updateFormData({ category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
              style={{ fontFamily: 'Lora, serif' }}
            >
              <option value="">Select a category...</option>
              <option value="Jewelry">Jewelry</option>
              <option value="Art & Photographs">Art & Photographs</option>
              <option value="Furniture">Furniture</option>
              <option value="Clothing & Textiles">Clothing & Textiles</option>
              <option value="Books & Documents">Books & Documents</option>
              <option value="Decorative">Decorative</option>
              <option value="Dinnerware">Dinnerware</option>
              <option value="Tools & Equipment">Tools & Equipment</option>
              <option value="Toys & Games">Toys & Games</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          {/* Value */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Value ($)
            </label>
            <input
              type="number"
              value={formData.value}
              onChange={e => updateFormData({ value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ fontFamily: 'Lora, serif' }}
            />
          </div>

          {/* Owner */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Came From
            </label>
            <select
              value={formData.ownerId}
              onChange={e => updateFormData({ ownerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
              style={{ fontFamily: 'Lora, serif' }}
            >
              <option value="">Select a person...</option>
              {people.map(person => (
                <option key={person.id} value={person.id}>
                  {person.name} — {person.relationship}
                </option>
              ))}
            </select>
            {(() => {
              const owner = people.find(p => p.id === formData.ownerId);
              if (!owner || owner.photo || owner.noPhoto) return null;
              return (
                <button
                  type="button"
                  onClick={() => setShowPersonPhotoModal(true)}
                  className="mt-2 flex items-center gap-2 text-xs text-[#669999] hover:text-teal-700 transition-colors"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add a photo of {owner.name}
                </button>
              );
            })()}
          </div>

          {/* Beneficiary */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Goes To
            </label>
            <input
  type="text"
  value={formData.beneficiary}
  onChange={e => updateFormData({ beneficiary: e.target.value })}
  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm"
  placeholder="Name of person or organization..."
  style={{ textTransform: 'capitalize' }}
/>
          </div>

          {/* Story text */}
          {(!story || story.storyType === 'text') && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Story
              </label>
              <textarea
                value={formData.storyText}
                onChange={e => updateFormData({ storyText: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black resize-none text-sm"
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>
          )}

          {/* Extra Notes */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={e => updateFormData({ notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black resize-none text-sm"
              placeholder="Any additional details, context, or memories..."
              style={{ fontFamily: 'Lora, serif' }}
            />
          </div>

          {/* Primary Image */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Main Photo
            </label>

            {/* Current primary preview */}
            {(newPrimaryPreview || primaryImage) && (
              <div className="mb-3">
                <img src={newPrimaryPreview || primaryImage} className="w-24 h-24 object-cover rounded" alt="" />
                {newPrimaryPreview && (
                  <button
                    type="button"
                    onClick={() => { setNewPrimaryPreview(null); setNewPrimaryFile(null); }}
                    className="mt-1 text-xs text-gray-400 underline"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}

            {/* QR waiting state */}
            {showPrimaryQR && !newPrimaryPreview && (
              <div className="mb-3 text-center bg-gray-50 p-4">
                <img src={primaryQRDataUrl} alt="QR Code" className="mx-auto mb-2 w-40" />
                <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>Scan with your phone camera</p>
                <button
                  type="button"
                  onClick={() => setShowPrimaryQR(false)}
                  className="text-xs text-gray-400 underline"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Upload options — hidden once new preview exists */}
            {!newPrimaryPreview && !showPrimaryQR && (
              <>
                {/* Desktop: two-panel */}
                <div className="hidden md:flex rounded overflow-hidden border border-gray-300" style={{ minHeight: '80px' }}>
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-4 hover:bg-gray-50 transition-colors border-r border-gray-300">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {primaryImage ? 'Replace from computer' : 'Upload from computer'}
                    </span>
                    <input type="file" accept="image/*" onChange={handlePrimaryImageChange} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleShowPrimaryQR}
                    className="flex-1 flex items-center justify-center gap-2 p-4 bg-black text-white hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span className="text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>Use Phone Camera</span>
                  </button>
                </div>

                {/* Mobile: stacked */}
                <div className="md:hidden space-y-2">
                  <label className="cursor-pointer flex items-center justify-center gap-2 p-3 bg-black text-white rounded">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>Take or Upload Photo</span>
                    <input type="file" accept="image/*" onChange={handlePrimaryImageChange} className="hidden" />
                  </label>
                  <label className="cursor-pointer flex items-center justify-center gap-2 p-3 border border-gray-300 rounded">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>Upload from files</span>
                    <input type="file" accept="image/*" onChange={handlePrimaryImageChange} className="hidden" />
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Additional Images */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Additional Photos
            </label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {existingImages.map(img => (
                <div key={img.id} className="relative">
                  <img src={img.url} className="w-16 h-16 object-cover rounded" alt="" />
                  <button
                    type="button"
                    onClick={() => handleDeleteExistingImage(img.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white rounded-full text-xs flex items-center justify-center leading-none hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
              {newImagePreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative">
                  <img src={src} className="w-16 h-16 object-cover rounded" alt="" />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewImage(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white rounded-full text-xs flex items-center justify-center leading-none hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="block w-full px-3 py-2 border border-dashed border-gray-300 text-center text-sm text-gray-500 cursor-pointer hover:border-gray-400 transition-colors" style={{ fontFamily: 'Roboto, sans-serif' }}>
              + Add Photos
              <input type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
            </label>
          </div>

        </div>

        {showPersonPhotoModal && (() => {
          const owner = people.find(p => p.id === formData.ownerId);
          return owner ? (
            <PersonPhotoModal
              person={owner}
              onClose={() => setShowPersonPhotoModal(false)}
              onSuccess={() => setShowPersonPhotoModal(false)}
            />
          ) : null;
        })()}

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveAsIs}
              disabled={saving || deleting}
              className="flex-1 px-4 py-2 border border-gray-300 text-sm disabled:opacity-50"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              {saving ? 'Saving...' : 'Save As Is'}
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving || deleting}
              className="flex-1 px-4 py-2 bg-black text-white text-sm disabled:opacity-50"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          <button
            type="button"
            onClick={handleCompleteLater}
            disabled={saving || deleting}
            className="w-full px-4 py-2 border border-gray-300 text-sm disabled:opacity-50"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Complete Later
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="w-full px-4 py-2 border border-red-200 text-red-400 text-sm hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {deleting ? 'Deleting...' : 'Delete Keepsake'}
          </button>
        </div>
      </div>

      {/* Unsaved changes warning */}
      {showUnsavedWarning && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]"
          onClick={() => setShowUnsavedWarning(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full mx-4 p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-heading italic tracking-[0.05em]">You have unsaved changes</h3>
            <p className="font-body text-sm text-gray-600">If you leave now your changes will be lost.</p>
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setShowUnsavedWarning(false);
                  await handleSaveChanges();
                }}
                className="w-full px-6 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors rounded-lg"
              >
                Save and close
              </button>
              <button
                type="button"
                onClick={() => { setShowUnsavedWarning(false); onClose(); }}
                className="w-full px-6 py-3 border-2 border-gray-300 font-subhead text-sm tracking-[0.01em] hover:border-gray-400 transition-colors rounded-lg"
              >
                Discard changes
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="w-full text-sm font-body text-gray-400 hover:text-gray-600"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

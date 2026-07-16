import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '../services/cloudinary';
import { addPersonPhoto, setPersonPrimaryPhoto, updatePerson, deleteImage } from '../services/airtable';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import QRCode from 'qrcode';

export default function PersonPhotoModal({ person, onClose, onSuccess, navigateOnSave = false }) {
  const { keeperId } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [showAddNew, setShowAddNew] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const loadPhotos = async () => {
    const { data } = await supabase
      .from('images')
      .select('id, url, "order"')
      .eq('person_id', person.id)
      .order('order', { ascending: true });
    setExistingPhotos(data || []);
    setLoadingPhotos(false);
  };

  useEffect(() => {
    loadPhotos();
  }, [person.id]);

  useEffect(() => {
    if (!showQR || !sessionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/upload-session?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.imageUrl) {
          setPreview(data.imageUrl);
          setFile(null);
          setShowQR(false);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [showQR, sessionId]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setShowQR(false);
  };

  const handleShowQR = async () => {
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);
    const uploadUrl = `${window.location.origin}/mobile-upload?session=${newSessionId}`;
    const qr = await QRCode.toDataURL(uploadUrl, { width: 300, margin: 2 });
    setQrDataUrl(qr);
    setShowQR(true);
  };

  // Toggle selection — tap selected photo again to deselect
  const handleSelectPhoto = (imageId) => {
    const photo = existingPhotos.find(p => p.id === imageId);
    if (photo && photo.order === 0) return; // already primary, ignore
    setSelectedId(prev => prev === imageId ? null : imageId);
  };

  const handleConfirmPrimary = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await setPersonPrimaryPhoto(person.id, selectedId, keeperId);
      if (navigateOnSave) {
        navigate(`/person/${person.id}`);
      } else {
        onSuccess();
      }
    } catch {
      alert('Error setting primary photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async (imageId, e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await deleteImage(imageId, keeperId);
      await loadPhotos();
      if (selectedId === imageId) setSelectedId(null);
    } catch {
      alert('Error deleting photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNew = async () => {
    setSaving(true);
    try {
      let url = preview;
      if (file) {
        const result = await uploadImage(file);
        url = result.url;
      }
      await addPersonPhoto(person.id, url, keeperId);
      setPreview(null);
      setFile(null);
      setShowAddNew(false);
      await loadPhotos();
    } catch {
      alert('Error saving photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNoPhoto = async () => {
    setSaving(true);
    try {
      await updatePerson(person.id, {
        firstName: person.name.split(' ')[0],
        lastName: person.name.split(' ').slice(1).join(' '),
        relationship: person.relationship,
        side: person.side,
        generation: person.generation,
        years: person.years,
        location: person.location,
        birthdate: person.birthdate,
        notes: person.notes,
        middleName: person.middleName,
        maidenName: person.maidenName,
        entryComplete: person.entryComplete,
        noPhoto: true,
      }, keeperId);
      onSuccess();
    } catch {
      alert('Error saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasPhotos = existingPhotos.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-6">
      <div className="bg-white w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl" style={{ fontFamily: 'Merriweather, serif', fontStyle: 'italic' }}>
            {hasPhotos ? 'Manage Photos' : `Add a photo of ${person.name}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl leading-none">×</button>
        </div>

        {loadingPhotos ? (
          <p className="text-sm text-gray-400 text-center py-8" style={{ fontFamily: 'Roboto, sans-serif' }}>Loading...</p>
        ) : (
          <>
            {/* Existing photos grid */}
            {hasPhotos && !showAddNew && !preview && (
              <div className="mb-6">
                <p className="text-xs text-gray-400 mb-3" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Tap a photo to set it as your profile photo. Tap again to deselect.
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {existingPhotos.map(photo => {
                    const isPrimary = photo.order === 0;
                    const isSelected = photo.id === selectedId;
                    return (
                      <div key={photo.id} className="relative">
                        <button
                          type="button"
                          onClick={() => handleSelectPhoto(photo.id)}
                          disabled={saving || isPrimary}
                          className={`relative w-full aspect-square overflow-hidden rounded focus:outline-none border-2 transition-colors ${
                            isPrimary
                              ? 'border-black cursor-default'
                              : isSelected
                              ? 'border-[#669999]'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
                          {isPrimary && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5">
                              <p className="text-white text-center" style={{ fontSize: '9px', fontFamily: 'Roboto, sans-serif' }}>PROFILE</p>
                            </div>
                          )}
                          {isSelected && !isPrimary && (
                            <div className="absolute inset-0 bg-[#669999]/20 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-[#669999] flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePhoto(photo.id, e)}
                          disabled={saving}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Selected photo actions */}
                {selectedId && (
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={handleConfirmPrimary}
                      disabled={saving}
                      className="flex-1 px-4 py-3 bg-black text-white text-sm disabled:opacity-50"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      {saving ? 'Saving...' : 'Set as Profile Photo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      disabled={saving}
                      className="px-4 py-3 text-sm text-gray-400 disabled:opacity-50"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowAddNew(true)}
                  className="w-full px-4 py-3 border border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 transition-colors"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  + Add a new photo
                </button>
              </div>
            )}

            {/* New photo upload */}
            {(!hasPhotos || showAddNew) && (
              <>
                {preview && (
                  <div className="mb-6">
                    <img src={preview} alt="Preview" className="w-full aspect-square object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => { setPreview(null); setFile(null); }}
                      className="mt-2 text-xs text-gray-400 underline"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {showQR && !preview && (
                  <div className="mb-6 text-center bg-gray-50 p-6">
                    <img src={qrDataUrl} alt="QR Code" className="mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-3" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      Scan with your phone camera
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowQR(false)}
                      className="text-sm text-gray-400 underline"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {!preview && !showQR && (
                  <div className="space-y-3 mb-6">
                    <div className="hidden md:flex rounded overflow-hidden border border-gray-300" style={{ minHeight: '120px' }}>
                      <label className="flex-1 cursor-pointer flex flex-col items-center justify-center p-6 hover:bg-gray-50 transition-colors border-r border-gray-300 gap-2">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>Upload from computer</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={handleShowQR}
                        className="flex-1 flex flex-col items-center justify-center p-6 bg-black text-white hover:bg-gray-800 transition-colors gap-2"
                      >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span className="text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>Use Phone Camera</span>
                      </button>
                    </div>

                    <div className="md:hidden space-y-3">
                      <label className="cursor-pointer flex items-center justify-center gap-3 p-5 bg-black text-white rounded">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>Take or Upload Photo</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                      <label className="cursor-pointer flex items-center justify-center gap-3 p-4 border border-gray-300 rounded">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>Upload from files</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {preview && (
                <button
                  type="button"
                  onClick={handleSaveNew}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-black text-white text-sm disabled:opacity-50"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  {saving ? 'Saving...' : 'Save Photo'}
                </button>
              )}
              {showAddNew && !preview && !showQR && (
                <button
                  type="button"
                  onClick={() => { setShowAddNew(false); setPreview(null); setFile(null); setSelectedId(null); }}
                  className="w-full px-4 py-3 border border-gray-300 text-sm text-gray-500"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  ← Back to photos
                </button>
              )}
              {!hasPhotos && (
                <button
                  type="button"
                  onClick={handleNoPhoto}
                  disabled={saving}
                  className="w-full px-4 py-3 border border-gray-300 text-sm text-gray-500 disabled:opacity-50"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  No photo available
                </button>
              )}
              {hasPhotos && !showAddNew && !preview && (
                <button
                  type="button"
                  onClick={onSuccess}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-black text-white text-sm disabled:opacity-50"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  Done
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="w-full px-4 py-3 text-sm text-gray-400 disabled:opacity-50"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
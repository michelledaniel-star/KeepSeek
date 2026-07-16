import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { uploadImage } from '../services/cloudinary';
import PhotoEditor from './PhotoEditor';

export default function KeeperProfileSetup({ onComplete }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [keeperRow, setKeeperRow] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [saveError, setSaveError] = useState('');

  const [formData, setFormData] = useState({
    photo: null,
    photoPreview: null,
    birthdate: '',
    location: '',
  });
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState(null);

  useEffect(() => {
    const loadProfile = async (attempts = 0) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      const { data: keeper, error } = await supabase
        .from('keepers')
        .select('id, self_person_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching keeper row:', error);
        setFetchingProfile(false);
        return;
      }

      if (!keeper && attempts < 5) {
        setTimeout(() => loadProfile(attempts + 1), 500);
        return;
      }

      if (keeper) {
        setKeeperRow(keeper);

        if (keeper.self_person_id) {
          const { data: person } = await supabase
            .from('people')
            .select('birthdate, location')
            .eq('id', keeper.self_person_id)
            .maybeSingle();

          if (person) {
            setFormData(prev => ({
              ...prev,
              birthdate: person.birthdate || '',
              location: person.location || '',
            }));
          }

          const { data: photos } = await supabase
            .from('images')
            .select('url')
            .eq('person_id', keeper.self_person_id)
            .order('order', { ascending: true })
            .limit(1);

          if (photos && photos.length > 0) {
            setFormData(prev => ({ ...prev, photoPreview: photos[0].url }));
          }
        }
      }

      setFetchingProfile(false);
    };

    loadProfile();
  }, []);

  const markProfileComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('keepers')
        .update({ profile_complete: true })
        .eq('user_id', user.id);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPendingPhotoPreview(URL.createObjectURL(file));
      setShowPhotoEditor(true);
    }
  };

  const handleSave = async () => {
    if (!keeperRow?.self_person_id) {
      setSaveError("Your account isn't fully set up yet. Try signing out and signing back in.");
      return;
    }

    setLoading(true);
    setSaveError('');

    try {
      if (formData.photo) {
        setUploadProgress('Uploading photo...');
        const result = await uploadImage(formData.photo);

        const { data: existingPhotos } = await supabase
          .from('images')
          .select('id, order')
          .eq('person_id', keeperRow.self_person_id)
          .order('order', { ascending: true })
          .limit(1);
        const existingPhoto = existingPhotos && existingPhotos.length > 0 && existingPhotos[0].order === 0
          ? existingPhotos[0]
          : null;

        if (existingPhoto) {
          await supabase
            .from('images')
            .update({ url: result.url })
            .eq('id', existingPhoto.id);
        } else {
          await supabase
            .from('images')
            .insert({
              person_id: keeperRow.self_person_id,
              url: result.url,
              order: 0,
            });
        }
      }

      setUploadProgress('Saving profile...');

      const updateData = {};
      if (formData.birthdate) updateData.birthdate = formData.birthdate;
      if (formData.location) updateData.location = formData.location;

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('people')
          .update(updateData)
          .eq('id', keeperRow.self_person_id);
      }

      await markProfileComplete();
      if (onComplete) onComplete();
      navigate('/viewer');
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveError('Error saving profile. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const handleSkip = async () => {
    await markProfileComplete();
    if (onComplete) onComplete();
    navigate('/viewer');
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm";
  const labelClass = "block text-xs uppercase tracking-widest text-gray-400 mb-1";

  if (fetchingProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Setting up your account...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <div className="border-b border-gray-200 px-8 py-5">
        <div className="flex items-baseline gap-0">
          <span className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
          <span className="text-2xl font-heading italic tracking-[0.05em]">seek</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center pt-12 px-4 pb-16">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <h1 className="text-3xl font-heading italic tracking-[0.05em] mb-2">Your Profile</h1>
            <p className="text-sm text-gray-500" style={{ fontFamily: 'Lora, serif' }}>
              This is how your family will know you. It only takes a moment.
            </p>
          </div>

          {uploadProgress && (
            <p className="text-sm text-blue-600 mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>{uploadProgress}</p>
          )}

          {saveError && (
            <p className="text-sm text-red-500 mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>{saveError}</p>
          )}

          <div className="space-y-6">

            <div>
              <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Your Photo</label>
              <div className="flex items-center gap-4 mt-1">
                {formData.photoPreview ? (
                  <img
                    src={formData.photoPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-medium flex-shrink-0"
                    style={{ backgroundColor: '#669999', fontFamily: 'Roboto, sans-serif' }}
                  >
                    ?
                  </div>
                )}
                <label className="cursor-pointer px-4 py-2 border border-gray-300 text-sm hover:border-gray-400 transition-colors" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {formData.photoPreview ? 'Change Photo' : 'Add Photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Birthdate</label>
              <input
                type="text"
                value={formData.birthdate}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                  let formatted = raw;
                  if (raw.length >= 5) formatted = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
                  else if (raw.length >= 3) formatted = raw.slice(0, 2) + '/' + raw.slice(2);
                  setFormData(prev => ({ ...prev, birthdate: formatted }));
                }}
                placeholder="mm/dd/yyyy"
                className={inputClass}
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>

            <div>
              <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Birthplace</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => {
                  const val = e.target.value.replace(/\b\w/g, c => c.toUpperCase());
                  setFormData(prev => ({ ...prev, location: val }));
                }}
                placeholder="City, State or Country"
                className={inputClass}
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3 bg-black text-white text-sm disabled:bg-gray-300"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {loading ? 'Saving...' : 'Save & Continue'}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Skip for now
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import { fetchItems, fetchPeople, fetchStoryForItem, deleteItem } from '../services/airtable';
import { getDisplayRelationship } from '../services/utils';
import { useAuth } from '../context/AuthContext';
import EditItemForm from './EditItemForm';
import EditPerson from './EditPerson';
import PersonPhotoModal from './PersonPhotoModal';
import RestoryModal from './RestoryModal';
import PhotoEditor from './PhotoEditor';
import { uploadImage } from '../services/cloudinary';
import { updateItem } from '../services/airtable';

const ItemDetail = () => {
 const { id } = useParams();
  const navigate = useNavigate();
  const { keeperId } = useAuth();
  const [item, setItem] = useState(null);
  const [people, setPeople] = useState([]);
  const [story, setStory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRestory, setShowRestory] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [pendingEditedFile, setPendingEditedFile] = useState(null);
  const [pendingEditedPreview, setPendingEditedPreview] = useState(null);
  const [pendingEditedUrl, setPendingEditedUrl] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [showEditPerson, setShowEditPerson] = useState(false);
  const [showPersonPhotoModal, setShowPersonPhotoModal] = useState(false);

  const loadItem = async () => {
    const [allItems, allPeople] = await Promise.all([fetchItems(keeperId), fetchPeople(keeperId)]);
    const found = allItems.find(i => i.id === id);
    setItem(found || null);
    setPeople(allPeople);
    setLoading(false);
    if (found) {
      const storyData = await fetchStoryForItem(found.id);
      console.log('Story data:', storyData);
      setStory(storyData);
    }
  };

  useEffect(() => {
    loadItem();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this keepsake? This cannot be undone.')) return;
    await deleteItem(item.id, keeperId);
    navigate('/viewer');
  };

  const handlePhotoEditorSave = (file, previewUrl, directUrl) => {
    if (directUrl) {
      setPendingEditedFile(null);
      setPendingEditedUrl(directUrl);
      setPendingEditedPreview(directUrl);
    } else {
      setPendingEditedFile(file);
      setPendingEditedUrl(null);
      setPendingEditedPreview(previewUrl);
    }
    setShowPhotoEditor(false);
  };

  const handleConfirmPhoto = async () => {
    setSavingPhoto(true);
    try {
      let finalUrl = pendingEditedUrl;
      if (pendingEditedFile) {
        const result = await uploadImage(pendingEditedFile);
        finalUrl = result.url;
      }
      await updateItem(item.id, { image_url: finalUrl }, keeperId);
      setPendingEditedFile(null);
      setPendingEditedPreview(null);
      setPendingEditedUrl(null);
      await loadItem();
    } catch (error) {
      console.error('Error saving photo:', error);
      alert('Error saving photo. Please try again.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleDiscardPhoto = () => {
    setPendingEditedFile(null);
    setPendingEditedPreview(null);
    setPendingEditedUrl(null);
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <SiteHeader />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="bg-white min-h-screen">
        <SiteHeader />
        <div className="max-w-[1400px] mx-auto px-12 py-16">Item not found</div>
      </div>
    );
  }

  const owner = people.find(p => p.id === item.ownerId);
  const partnerName = people.find(p => p.relationship === 'Partner' || p.relationship === 'Spouse / Partner')?.name.split(' ')[0] || null;
  const images = item.images?.length > 0 ? item.images : item.image ? [item.image] : [];

  const nextImage = () => setCurrentImageIndex(prev => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);

  return (
    <div className="bg-white min-h-screen">
      <SiteHeader />

      <div className="max-w-[1400px] mx-auto px-4 md:px-12 py-12 md:py-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">

          {/* Image Section */}
          <div className="relative">
            <div className="relative bg-gray-50 rounded-2xl overflow-hidden">
              <img
                src={pendingEditedPreview || images[currentImageIndex]}
                alt={item.name}
                className="w-full h-auto object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white w-10 h-10 flex items-center justify-center transition-colors rounded-full"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white w-10 h-10 flex items-center justify-center transition-colors rounded-full"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-1.5 h-1.5 transition-colors ${index === currentImageIndex ? 'bg-black' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
            )}

            {/* Edit Photo button */}
            {!pendingEditedPreview && (
              <button
                onClick={() => setShowPhotoEditor(true)}
                className="mt-4 text-sm text-gray-400 underline"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Edit Photo
              </button>
            )}

            {/* Pending edited photo confirm banner */}
            {pendingEditedPreview && (
              <div className="mt-4 p-4 border border-[#B8A888] rounded-xl bg-[#faf9f7] space-y-3">
                <p className="text-sm font-subhead tracking-[0.01em] text-gray-700">Save this edited photo?</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmPhoto}
                    disabled={savingPhoto}
                    className="flex-1 px-4 py-2 bg-black text-white text-sm font-subhead tracking-[0.01em] disabled:opacity-50"
                  >
                    {savingPhoto ? 'Saving...' : 'Save Photo'}
                  </button>
                  <button
                    onClick={handleDiscardPhoto}
                    disabled={savingPhoto}
                    className="flex-1 px-4 py-2 border border-gray-300 text-sm font-subhead tracking-[0.01em] text-gray-500 hover:border-gray-400"
                  >
                    Discard
                  </button>
                </div>
                <button
                  onClick={() => setShowPhotoEditor(true)}
                  className="text-xs text-gray-400 underline"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  Edit again
                </button>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-10">

            <h1 className="text-2xl md:text-3xl font-heading italic tracking-[0.05em] leading-tight">{item.name}</h1>

            {/* Provenance */}
            {owner && (
              <Link to={`/person/${owner.id}`} className="block border-t border-gray-200 pt-6">
                <div className="flex items-start gap-4 hover:opacity-70 transition-opacity">
                  {owner.photo ? (
                    <img
                      src={owner.photo}
                      alt={owner.name}
                      className="w-16 h-16 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0"
                    />
                  ) : owner.noPhoto ? (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-medium ring-1 ring-gray-200 flex-shrink-0"
                      style={{ backgroundColor: '#669999' }}
                    >
                      {owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setShowPersonPhotoModal(true); }}
                      className="w-16 h-16 rounded-full flex items-center justify-center ring-2 ring-dashed ring-[#B8A888] flex-shrink-0 hover:ring-[#669999] transition-colors"
                      style={{ backgroundColor: '#e8f0f0' }}
                    >
                      <svg className="w-6 h-6 text-[#669999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-subhead mb-1">Who did this come from?</p>
                    <p className="text-lg font-heading italic tracking-[0.05em]">{owner.name}</p>
                    {owner.relationship && <p className="text-sm text-gray-500 font-body mt-0.5">{getDisplayRelationship(owner.relationship, owner.side, partnerName)}</p>}
                    {!owner.photo && !owner.noPhoto && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setShowPersonPhotoModal(true); }}
                        className="text-xs text-[#B8A888] mt-1 text-left hover:underline"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        Tap to add a photo
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            )}

            {/* Description */}
            {item.description && (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-subhead mb-4">Description</p>
                <p className="text-gray-700 leading-relaxed font-body">{item.description}</p>
              </div>
            )}

            {/* Value */}
            {item.value && (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-subhead mb-2">Value</p>
                <p className="text-gray-700 font-body">${item.value}</p>
              </div>
            )}

            {/* Beneficiary */}
            {item.beneficiary && (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-subhead mb-2">Goes To</p>
                <p className="text-gray-700 font-body">{item.beneficiary}</p>
              </div>
            )}

            {/* Why It Matters */}
            {story && (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-subhead mb-4">Why It Matters</p>
                {story.storyType === 'text' ? (
                  <blockquote className="text-gray-700 text-lg leading-relaxed font-heading italic tracking-[0.05em]">
                    "{story.textContent}"
                  </blockquote>
                ) : story.storyType === 'voice' ? (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <audio controls className="w-full" src={story.mediaUrl}>
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                ) : story.storyType === 'video' ? (
                  <video controls className="w-full rounded-xl" src={story.mediaUrl}>
                    Your browser does not support video playback.
                  </video>
                ) : null}
                <button
  onClick={() => setShowRestory(true)}
  className="mt-4 text-sm text-gray-400 underline"
  style={{ fontFamily: 'Roboto, sans-serif' }}
>
  Replace story
</button>
              </div>
            )}

            {/* Extra Notes */}
            {item.notes && (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-subhead mb-4">Additional Notes</p>
                <p className="text-gray-700 leading-relaxed font-body">{item.notes}</p>
              </div>
            )}

            </div>
        </div>

        {/* Complete Entry — full width below grid */}
        <div className="mt-12 border-t border-gray-200 pt-6">
          <button
            onClick={() => setShowEdit(true)}
            className="w-full py-4 bg-black text-white text-sm"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Complete or Edit Entry
          </button>
        </div>

      </div>

      {showEdit && (
        <EditItemForm
          item={item}
          people={people}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            loadItem();
          }}
          onCompleteLater={() => {
            setShowEdit(false);
            navigate('/viewer');
          }}
          onDelete={() => {
            navigate('/viewer');
          }}
        />
      )}
      {showEditPerson && owner && (
        <EditPerson
          person={owner}
          onClose={() => { setShowEditPerson(false); loadItem(); }}
          onSuccess={() => { setShowEditPerson(false); loadItem(); }}
          onDone={() => { setShowEditPerson(false); loadItem(); }}
          onCompleteLater={() => { setShowEditPerson(false); loadItem(); }}
        />
      )}
      {showPhotoEditor && (
        <PhotoEditor
          imageUrl={pendingEditedPreview || images[currentImageIndex]}
          onSave={handlePhotoEditorSave}
          onCancel={() => setShowPhotoEditor(false)}
        />
      )}

      {showPersonPhotoModal && owner && (
        <PersonPhotoModal
          person={owner}
          onClose={() => setShowPersonPhotoModal(false)}
          onSuccess={() => { setShowPersonPhotoModal(false); loadItem(); }}
          navigateOnSave={true}
        />
      )}

      {showRestory && (
  <RestoryModal
    item={item}
    existingStory={story}
    onClose={() => setShowRestory(false)}
    onSuccess={() => {
      setShowRestory(false);
      setTimeout(() => loadItem(), 1500);
    }}
  />
)}
    </div>
  );
};

export default ItemDetail;

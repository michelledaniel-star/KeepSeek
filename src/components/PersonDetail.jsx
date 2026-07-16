import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import EditPerson from './EditPerson';
import PhotoEditor from './PhotoEditor';
import { fetchItems, fetchPeople, updatePerson } from '../services/airtable';
import PersonPhotoModal from './PersonPhotoModal';
import { getDisplayRelationship } from '../services/utils';
import { uploadImage } from '../services/cloudinary';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const PersonDetail = () => {
  const { personId } = useParams();
  const navigate = useNavigate();
  const { keeperId } = useAuth();
  const [person, setPerson] = useState(null);
  const [personItems, setPersonItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [pendingEditedFile, setPendingEditedFile] = useState(null);
  const [pendingEditedPreview, setPendingEditedPreview] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [showPersonPhotoModal, setShowPersonPhotoModal] = useState(false);

  const loadData = async () => {
    const [allPeople, allItems] = await Promise.all([fetchPeople(keeperId), fetchItems(keeperId)]);
    const found = allPeople.find(p => p.id === personId);
    setPerson(found || null);
    setPeople(allPeople);
    setPersonItems(allItems.filter(item => item.ownerId === personId));
    setCurrentPhotoIndex(0);
    setLoading(false);
  };

  const handlePhotoEditorSave = (file, previewUrl) => {
    setPendingEditedFile(file);
    setPendingEditedPreview(previewUrl);
    setShowPhotoEditor(false);
  };

  const handleConfirmPhoto = async () => {
    setSavingPhoto(true);
    try {
      const result = await uploadImage(pendingEditedFile);
      const finalUrl = result.url;
      const photos = person.photos || [];
      const targetUrl = photos[currentPhotoIndex] || person.photo;

      const { data: existingImg } = await supabase
        .from('images')
        .select('id, order')
        .eq('person_id', person.id)
        .eq('url', targetUrl)
        .maybeSingle();

      if (existingImg) {
        await supabase.from('images').update({ url: finalUrl }).eq('id', existingImg.id);
      } else {
        await supabase.from('images').insert({ person_id: person.id, url: finalUrl, order: currentPhotoIndex });
      }

      setPendingEditedFile(null);
      setPendingEditedPreview(null);
      await loadData();
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
  };

  useEffect(() => {
    loadData();
  }, [personId]);

  useEffect(() => {
    if (!person || person.profileVisited) return;
    updatePerson(person.id, {
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
      profileVisited: true,
    }, keeperId);
  }, [person]);

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

  if (!person) {
    return (
      <div className="bg-white min-h-screen">
        <SiteHeader />
        <div className="max-w-[1400px] mx-auto px-12 py-16">Person not found</div>
      </div>
    );
  }

  const partnerName = people.find(p => p.relationship === 'Partner' || p.relationship === 'Spouse / Partner')?.name.split(' ')[0] || null;

  return (
    <div className="bg-white min-h-screen">
      <SiteHeader />

      {/* Person Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 py-12">
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                {(() => {
                  const photos = person.photos?.length > 0 ? person.photos : person.photo ? [person.photo] : [];
                  const displayPhoto = pendingEditedPreview || photos[currentPhotoIndex];
                  return (
                    <div className="relative">
                      {displayPhoto ? (
                        <img
                          src={displayPhoto}
                          alt={person.name}
                          className="w-48 h-48 md:w-64 md:h-64 rounded object-cover ring-1 ring-gray-200"
                        />
                      ) : person.noPhoto ? (
                        <div
                          className="w-48 h-48 md:w-64 md:h-64 rounded flex items-center justify-center text-white text-3xl font-medium ring-1 ring-gray-200"
                          style={{ backgroundColor: '#669999' }}
                        >
                          {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPersonPhotoModal(true)}
                          className="w-48 h-48 md:w-64 md:h-64 rounded flex items-center justify-center ring-2 ring-dashed ring-[#B8A888] hover:ring-[#669999] transition-colors"
                          style={{ backgroundColor: '#e8f0f0' }}
                        >
                          <svg className="w-8 h-8 text-[#669999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      )}
                      {photos.length > 1 && (
                        <div className="flex justify-center gap-1 mt-2">
                          <button
                            onClick={() => setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length)}
                            className="w-6 h-6 bg-white border border-gray-200 rounded-full text-xs flex items-center justify-center hover:bg-gray-50"
                          >‹</button>
                          <button
                            onClick={() => setCurrentPhotoIndex(prev => (prev + 1) % photos.length)}
                            className="w-6 h-6 bg-white border border-gray-200 rounded-full text-xs flex items-center justify-center hover:bg-gray-50"
                          >›</button>
                        </div>
                      )}
                      {displayPhoto && !pendingEditedPreview && (
                        <button
                          onClick={() => setShowPhotoEditor(true)}
                          className="mt-1 text-xs text-gray-400 underline w-full text-center"
                          style={{ fontFamily: 'Roboto, sans-serif' }}
                        >
                          Edit Photo
                        </button>
                      )}
                      {pendingEditedPreview && (
                        <div className="mt-2 p-3 border border-[#B8A888] rounded-xl bg-[#faf9f7] space-y-2">
                          <p className="text-xs font-subhead tracking-[0.01em] text-gray-700">Save this edit?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleConfirmPhoto}
                              disabled={savingPhoto}
                              className="flex-1 px-2 py-1 bg-black text-white text-xs font-subhead disabled:opacity-50"
                            >
                              {savingPhoto ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleDiscardPhoto}
                              disabled={savingPhoto}
                              className="flex-1 px-2 py-1 border border-gray-300 text-xs font-subhead text-gray-500"
                            >
                              Discard
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-heading italic tracking-[0.05em] mb-1">{person.name}</h1>
                {(person.middleName || person.maidenName) && (
                  <p className="text-sm text-gray-400 font-body mb-2">
                    {[
                      person.name.split(' ')[0],
                      person.middleName || '',
                      person.maidenName ? `(${person.maidenName})` : '',
                      person.name.split(' ').slice(-1)[0],
                    ].filter(Boolean).join(' ')}
                  </p>
                )}
                {person.relationship !== 'Self' && (
                  <div className="text-sm font-body text-gray-500">
                    <span className="font-subhead tracking-[0.01em] uppercase text-xs">
                      {getDisplayRelationship(person.relationship, person.side, people.find(p => p.relationship === 'Partner' || p.relationship === 'Spouse / Partner')?.name.split(' ')[0])}
                    </span>
                    {(person.birthdate || person.location || person.years) && (
                      <div className="flex flex-wrap gap-2 md:gap-4 mt-1">
                        {person.years && <span>{person.years}</span>}
                        {person.birthdate && <span>b. {person.birthdate}</span>}
                        {person.location && <><span>·</span><span>{person.location}</span></>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowEdit(true)}
              className="self-start md:self-auto px-6 py-3 bg-black text-white text-sm font-subhead tracking-[0.01em] hover:bg-gray-800 transition-colors"
            >
              {person.profileVisited ? 'Edit Profile' : `Complete ${person.name.split(' ')[0]}'s profile`}
            </button>
          </div>

          {/* Notes */}
          {person.notes && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <p className="text-gray-600 leading-relaxed font-body">{person.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Person's Items */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-12 py-12">
        {personItems.length > 0 ? (
          <>
            <h2 className="text-2xl font-heading italic tracking-[0.05em] mb-8">Items from {person.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {personItems.map(item => (
                <Link
                  key={item.id}
                  to={`/item/${item.id}`}
                  className="block group"
                >
                  <div className="relative bg-gray-50 overflow-hidden" style={{ paddingBottom: '100%' }}>
                    <img
                      src={item.image?.includes('cloudinary')
                        ? item.image.replace('/upload/', '/upload/c_fill,g_auto,w_600,h_600/')
                        : item.image}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      onError={e => e.target.style.display = 'none'}
                    />
                  </div>
                  <p className="mt-2 text-sm font-body text-gray-700">{item.name}</p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <p className="text-gray-400 font-body mb-6">No items yet from {person.name}</p>
            <Link
              to="/add"
              className="inline-block px-8 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors"
            >
              Add a Keepsake
            </Link>
          </div>
        )}
      </div>

      {showEdit && (
        <EditPerson
          person={person}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            loadData();
          }}
          onCompleteLater={() => {
            setShowEdit(false);
            loadData();
          }}
        />
      )}

      {showPersonPhotoModal && (
        <PersonPhotoModal
          person={person}
          onClose={() => setShowPersonPhotoModal(false)}
          onSuccess={() => { setShowPersonPhotoModal(false); loadData(); }}
        />
      )}
      {showPhotoEditor && (
        <PhotoEditor
          imageUrl={pendingEditedPreview || (person.photos?.length > 0 ? person.photos[currentPhotoIndex] : person.photo)}
          onSave={handlePhotoEditorSave}
          onCancel={() => setShowPhotoEditor(false)}
          showRemoveBg={false}
        />
      )}
    </div>
  );
};

export default PersonDetail;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchItems, fetchPeople } from '../services/airtable';
import { getPersonalizedLabel } from './SeekerGallery';
import SeekerHeader from './SeekerHeader';
import { useAuth } from '../context/AuthContext';

const SeekerPersonDetail = () => {
  const { slug, personId } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [allPeople, setAllPeople] = useState([]);
  const [personItems, setPersonItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, seekerName, connections } = useAuth();
const seekerGeneration = connections[slug]?.generation ?? 0;
const [keeperName, setKeeperName] = useState('');

useEffect(() => {
  if (!user) { navigate(`/s/${slug}`); return; }
  if (!connections[slug]) { navigate(`/s/${slug}`); return; }
  loadData(seekerGeneration);
}, [user, connections, slug, personId]);

  const loadData = async (seekerGen) => {
    const keeperId = connections[slug]?.keeperId;
    const [allPeopleData, allItems] = await Promise.all([fetchPeople(keeperId), fetchItems(keeperId)]);
    setAllPeople(allPeopleData);
    const found = allPeopleData.find(p => p.id === personId);
    setPerson(found || null);

    const keeper = allPeopleData.find(p => p.relationship === 'Self');
    setKeeperName(keeper?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

    setPersonItems(allItems.filter(item => item.ownerId === personId && item.status === 'public'));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Loading...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Person not found.</p>
      </div>
    );
  }

  const partnerName = allPeople ? allPeople.find(p => p.relationship === 'Partner' || p.relationship === 'Spouse / Partner')?.name.split(' ')[0] || null : null;
  const personalizedLabel = getPersonalizedLabel(
    person.relationship,
    person.generation || 0,
    seekerGeneration,
    person.side,
    keeperName,
    partnerName
  );

  return (
    <div className="bg-white min-h-screen">

      <SeekerHeader slug={slug} seekerName={seekerName} />

      {/* Person Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 py-12">
          <div className="flex items-center gap-6">
            {person.photo ? (
              <img
                src={person.photo}
                alt={person.name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0"
              />
            ) : (
              <div
                className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-white text-3xl font-medium ring-1 ring-gray-200 flex-shrink-0"
                style={{ backgroundColor: '#669999' }}
              >
                {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-5xl font-heading italic tracking-[0.05em] mb-2">{person.name}</h1>
              <div className="flex flex-wrap gap-2 md:gap-4 text-sm text-gray-500">
                <span className="uppercase text-xs tracking-widest" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {personalizedLabel}
                </span>
                {person.years && <><span>·</span><span style={{ fontFamily: 'Lora, serif' }}>{person.years}</span></>}
                {person.location && <><span>·</span><span style={{ fontFamily: 'Lora, serif' }}>{person.location}</span></>}
              </div>
              {person.birthdate && (
                <p className="text-sm text-gray-400 mt-1" style={{ fontFamily: 'Lora, serif' }}>b. {person.birthdate}</p>
              )}
            </div>
          </div>

          {person.notes && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <p className="text-gray-600 leading-relaxed" style={{ fontFamily: 'Lora, serif' }}>{person.notes}</p>
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
                  to={`/s/${slug}/item/${item.id}`}
                  className="block group"
                >
                  <div className="relative bg-gray-50 overflow-hidden" style={{ paddingBottom: '100%' }}>
                    {item.image && (
                      <img
                        src={item.image?.includes('cloudinary')
                          ? item.image.replace('/upload/', '/upload/c_fill,g_auto,w_600,h_600/')
                          : item.image}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        onError={e => e.target.style.display = 'none'}
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-700" style={{ fontFamily: 'Lora, serif' }}>{item.name}</p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>No items yet from {person.name}</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default SeekerPersonDetail;

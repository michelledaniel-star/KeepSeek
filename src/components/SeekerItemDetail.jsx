import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchItems, fetchPeople, fetchStoryForItem } from '../services/airtable';
import { getPersonalizedLabel } from './SeekerGallery';
import SeekerHeader from './SeekerHeader';
import { useAuth } from '../context/AuthContext';

export default function SeekerItemDetail() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [story, setStory] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { user, seekerName, connections } = useAuth();
const seekerGeneration = connections[slug]?.generation ?? 0;

useEffect(() => {
  if (!user) { navigate(`/s/${slug}`); return; }
  if (!connections[slug]) { navigate(`/s/${slug}`); return; }
  loadData();
}, [user, connections, slug]);


  const loadData = async () => {
    const keeperId = connections[slug]?.keeperId;
    const [items, people, storyData] = await Promise.all([
      fetchItems(keeperId),
      fetchPeople(keeperId),
      fetchStoryForItem(id),
    ]);

    const found = items.find(i => i.id === id);
    if (!found) {
      navigate(`/s/${slug}/gallery`);
      return;
    }

    const keeperPerson = people.find(p => p.relationship === 'Self');
    const keeperName = keeperPerson?.name || slug.replace(/-/g, ' ');

    setItem(found);
    setStory(storyData);

    if (found.ownerId) {
      const person = people.find(p => p.id === found.ownerId);
      if (person) {
        const partnerName = people.find(p => p.relationship === 'Partner' || p.relationship === 'Spouse / Partner')?.name.split(' ')[0] || null;
        const label = getPersonalizedLabel(
          person.relationship,
          person.generation || 0,
          seekerGeneration,
          person.side,
          keeperName,
          partnerName
        );
        setOwner({ ...person, personalizedLabel: label });
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Loading...</p>
      </div>
    );
  }

  if (!item) return null;

  const allImages = item.images?.length > 0 ? item.images : item.image ? [item.image] : [];

  return (
    <div className="min-h-screen bg-white">

      <SeekerHeader slug={slug} seekerName={seekerName} />

      <div className="max-w-[1000px] mx-auto px-4 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          {/* Images */}
          <div>
            {allImages.length > 0 ? (
              <>
                <div className="aspect-square bg-gray-100 overflow-hidden mb-3">
                  <img
                    src={allImages[currentImageIndex]?.includes('cloudinary')
                      ? allImages[currentImageIndex].replace('/upload/', '/upload/c_fill,g_auto,w_600,h_600/')
                      : allImages[currentImageIndex]}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {allImages.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {allImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`w-14 h-14 overflow-hidden border-2 transition-colors ${i === currentImageIndex ? 'border-black' : 'border-transparent'}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <span className="text-gray-300 text-6xl">◻</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="text-3xl font-heading italic tracking-[0.05em] mb-2">{item.name}</h1>
            {item.year && (
              <p className="text-sm text-gray-400 mb-6" style={{ fontFamily: 'Roboto, sans-serif' }}>{item.year}</p>
            )}

            {/* Owner */}
            {owner && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  From your {owner.personalizedLabel}
                </p>
                <Link
                  to={`/s/${slug}/person/${owner.id}`}
                  className="flex items-center gap-3 group"
                >
                  {owner.photo ? (
                    <img src={owner.photo} alt={owner.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                      style={{ backgroundColor: '#669999', fontFamily: 'Roboto, sans-serif' }}>
                      {owner.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <span className="text-sm group-hover:underline" style={{ fontFamily: 'Roboto, sans-serif' }}>{owner.name}</span>
                </Link>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>About</p>
                <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: 'Lora, serif' }}>{item.description}</p>
              </div>
            )}

            {/* Story */}
            {story && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-3" style={{ fontFamily: 'Roboto, sans-serif' }}>Why It Matters</p>
                {story.storyType === 'text' && story.textContent && (
                  <p className="text-sm leading-relaxed text-gray-700 italic" style={{ fontFamily: 'Lora, serif' }}>
                    "{story.textContent}"
                  </p>
                )}
                {story.storyType === 'voice' && story.mediaUrl && (
                  <audio controls className="w-full" src={story.mediaUrl} />
                )}
                {story.storyType === 'video' && story.mediaUrl && (
                  <video controls className="w-full" src={story.mediaUrl} />
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

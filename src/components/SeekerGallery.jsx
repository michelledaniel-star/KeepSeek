import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchItems, fetchPeople } from '../services/airtable';
import SeekerHeader from './SeekerHeader';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

import { getDisplayRelationship } from '../services/utils';

export const getPersonalizedLabel = (storedRelationship, storedGeneration, seekerGeneration, side, keeperName, partnerName) => {
  const displayRelationship = getDisplayRelationship(storedRelationship, side, partnerName);
  if (!displayRelationship) return '';
  return `${keeperName}'s ${displayRelationship}`;
};

export default function SeekerGallery() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keeperDisplayName, setKeeperDisplayName] = useState(
    slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );

  const { user, seekerName, connections, ready } = useAuth();
  const seekerGeneration = connections[slug]?.generation ?? 0;
  const keeperId = connections[slug]?.keeperId ?? null;
  const hasConnection = !!connections[slug];

  useEffect(() => {
    if (!ready) return;
    if (!user) { navigate(`/s/${slug}`); return; }
    if (!hasConnection) { navigate(`/s/${slug}`); return; }
    loadData();
  }, [ready, user?.id, keeperId, slug]);

  const loadData = async () => {
    try {
      const [itemsData, peopleData, keeperRow] = await Promise.all([
        fetchItems(keeperId),
        fetchPeople(keeperId),
        supabase.from('keepers').select('name').eq('slug', slug).maybeSingle(),
      ]);
      console.log('SeekerGallery loaded — items:', itemsData.length, 'people:', peopleData.length);
      setItems(itemsData.filter(item => item.status === 'public'));
      setPeople(peopleData);
      if (keeperRow.data?.name) setKeeperDisplayName(keeperRow.data.name);
    } catch (err) {
      console.error('SeekerGallery loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const keeper = people.find(p => p.relationship === 'Self');
  const keeperName = keeperDisplayName || keeper?.name || slug.replace(/-/g, ' ');

  const getPersonName = (ownerId) => {
    const person = people.find(p => p.id === ownerId);
    if (!person) return null;
    const partnerName = people.find(p => p.relationship === 'Partner' || p.relationship === 'Spouse / Partner')?.name.split(' ')[0] || null;
    const label = getPersonalizedLabel(person.relationship, person.generation || 0, seekerGeneration, person.side, keeperName, partnerName);
    return { name: person.name, label, id: person.id };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SeekerHeader slug={slug} seekerName={seekerName} />

      <div className="max-w-[1400px] mx-auto px-4 md:px-12 py-12">
        <h1 className="text-4xl font-heading italic tracking-[0.05em] mb-2 text-center">Gallery</h1>
        <p className="text-sm text-gray-400 mb-10 text-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
          {keeperName}'s Collection · {items.length} {items.length === 1 ? 'keepsake' : 'keepsakes'}
        </p>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>No items have been shared yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(item => {
              const owner = getPersonName(item.ownerId);
              return (
                <Link key={item.id} to={`/s/${slug}/item/${item.id}`} className="group block">
                  <div className="aspect-square bg-gray-100 overflow-hidden mb-2">
                    {item.image ? (
                      <img
                        src={item.image?.includes('cloudinary')
                          ? item.image.replace('/upload/', '/upload/c_fill,g_auto,w_600,h_600/')
                          : item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-300 text-4xl">◻</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium" style={{ fontFamily: 'Lora, serif' }}>{item.name}</p>
                  {owner && (
                    <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {owner.label}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
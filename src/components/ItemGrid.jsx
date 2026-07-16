import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import { fetchItems, fetchPeople, invalidateCache } from '../services/airtable';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const ItemGrid = () => {
  const { personId } = useParams();
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasSeekers, setHasSeekers] = useState(false);
  
  const { keeperSlug, keeperId } = useAuth();
  const navigate = useNavigate();

  const loadItems = async () => {
    const [itemsData, peopleData, { data: accessRows }] = await Promise.all([
      fetchItems(keeperId),
      fetchPeople(keeperId),
      supabase.from('access').select('id').eq('keeper_slug', keeperSlug).limit(1),
    ]);
    setItems(itemsData);
    setPeople(peopleData);
    setHasSeekers(!!(accessRows && accessRows.length > 0));
    setLoading(false);
  };

  useEffect(() => {
    if (keeperId) loadItems();
  }, [keeperId]);

  const displayItems = (personId
    ? items.filter(item => item.ownerId === personId)
    : [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

  const draftCount = items.filter(item => item.status === 'draft').length;

  const handleNotifySeekers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/notify-seekers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ keeperSlug }),
      });
      if (!res.ok) throw new Error();
      invalidateCache(`items-${keeperId}`);
      const fresh = await fetchItems(keeperId);
      setItems(fresh);
    } catch (err) {
      alert('Something went wrong. Please try again.');
    }
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

  return (
    <div className="bg-white min-h-screen">
      <SiteHeader />

      {hasSeekers && draftCount > 0 && (
        <div className="px-4 md:px-8 pt-6">
          <div className="flex items-center justify-between px-5 py-4 bg-[#faf9f7] border border-[#B8A888]">
            <p className="text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
              {draftCount} {draftCount === 1 ? 'item has' : 'items have'} not been shared with your seekers yet
            </p>
            <button
              onClick={handleNotifySeekers}
              className="px-5 py-2 bg-black text-white text-sm ml-4 flex-shrink-0"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Share with Seekers
            </button>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="px-4 md:px-8 pt-20 flex items-center justify-between">
        <div className="w-24" />
        <h1 className="text-4xl font-heading italic tracking-[0.05em]">Gallery</h1>
        <Link
          to="/add"
          className="px-5 py-2 bg-black text-white text-sm w-24 text-center"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          + Add Item
        </Link>
      </div>

      {/* Square Grid */}
      <div className="px-4 md:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-2">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="block group cursor-pointer"
              onClick={() => navigate(`/item/${item.id}`)}
            >
              {/* Square container */}
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <div className="absolute inset-0 bg-white overflow-hidden rounded-sm">
                  <img
                    src={item.image?.includes('cloudinary')
                      ? item.image.replace('/upload/', '/upload/c_fill,g_auto,w_600,h_600/')
                      : item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
                {hasSeekers && item.status === 'draft' && (
                  <div className="absolute bottom-0 right-0 w-0 h-0"
                    style={{
                      borderStyle: 'solid',
                      borderWidth: '0 0 20px 20px',
                      borderColor: 'transparent transparent #000000 transparent',
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm('Delete this keepsake? This cannot be undone.')) return;
                    try {
                      const { deleteItemAndOrphanCheck } = await import('../services/airtable');
                      await deleteItemAndOrphanCheck(item.id, keeperId);
                      await loadItems();
                    } catch (err) {
                      alert('Error deleting item. Please try again.');
                    }
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black text-white rounded-full items-center justify-center hidden group-hover:flex transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {displayItems.length === 0 && (
          <div className="text-center py-28 px-4">
            <h2 className="text-2xl font-heading italic tracking-[0.05em] mb-3">Your collection starts here</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed" style={{ fontFamily: 'Lora, serif' }}>
              Add the first thing worth remembering — a photo, and the story behind it.
            </p>
            <Link
              to="/add"
              className="inline-block px-8 py-3 bg-black text-white text-sm"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              + Add your first keepsake
            </Link>
          </div>
        )}
      </div>

      
    </div>
  );
};

export default ItemGrid;
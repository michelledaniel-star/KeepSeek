import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchItems } from '../services/airtable';
import SeekerHeader from './SeekerHeader';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Jewelry',
  'Art & Photographs',
  'Furniture',
  'Clothing & Textiles',
  'Books & Documents',
  'Decorative',
  'Dinnerware',
  'Tools & Equipment',
  'Toys & Games',
  'Other',
  'Uncategorized',
];

export default function SeekerCategories() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user, seekerName, connections } = useAuth();

  useEffect(() => {
    if (!user) { navigate(`/s/${slug}`); return; }
    if (!connections[slug]) { navigate(`/s/${slug}`); return; }
    loadData();
  }, [user, connections, slug]);

  const loadData = async () => {
    const keeperId = connections[slug]?.keeperId;
    const data = await fetchItems(keeperId);
    setItems(data.filter(item => item.status === 'public'));
    setLoading(false);
  };

  const grouped = {};
  items.forEach(item => {
    const cat = item.category || 'Uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const sortedCategories = CATEGORIES.filter(cat => grouped[cat]?.length > 0);

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

      <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-16">
        <div className="flex items-center justify-between mb-12">
          <button onClick={() => navigate(`/s/${slug}/gallery`)} className="text-sm text-gray-400 hover:text-black transition-colors w-24" style={{ fontFamily: 'Roboto, sans-serif' }}>← Back</button>
          <h1 className="text-4xl font-heading italic tracking-[0.05em]">Collections</h1>
          <div className="w-24" />
        </div>

        {sortedCategories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>No items yet.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {sortedCategories.map(category => (
              <div key={category}>
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-xs uppercase tracking-widest text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {category}
                  </h2>
                  <span className="text-xs text-gray-300" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {grouped[category].length}
                  </span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {grouped[category].map(item => (
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
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
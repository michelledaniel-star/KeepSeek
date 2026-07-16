import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchItems, fetchPeople, updateItem, deleteItem } from '../services/airtable';
import { useAuth } from '../context/AuthContext';
import EditItemForm from './EditItemForm';
import SiteHeader from './SiteHeader';

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

export default function Collections({ onDataChange }) {
  const { keeperId } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  const loadData = async () => {
    const [itemsData, peopleData] = await Promise.all([fetchItems(keeperId), fetchPeople(keeperId)]);
    setItems(itemsData);
    setPeople(peopleData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPersonName = (ownerId) => {
    const person = people.find(p => p.id === ownerId);
    return person ? person.name : null;
  };

  const getPersonId = (ownerId) => {
    const person = people.find(p => p.id === ownerId);
    return person ? person.id : null;
  };

  const handlePublish = async (item) => {
    const newStatus = item.status === 'public' ? 'draft' : 'public';
    await updateItem(item.id, { status: newStatus }, keeperId);
    onDataChange?.();
    loadData();
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Delete this item? This cannot be undone.')) {
      await deleteItem(itemId, keeperId);
      onDataChange?.();
      loadData();
    }
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

      {editingItem && (
        <EditItemForm
          item={editingItem}
          people={people}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            onDataChange?.();
            loadData();
          }}
        />
      )}

      <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-16">

        <div className="flex items-center justify-between mb-12">
          <button onClick={() => navigate('/viewer')} className="text-sm text-gray-400 hover:text-black transition-colors w-24" style={{ fontFamily: 'Roboto, sans-serif' }}>← Back</button>
          <h1 className="text-4xl font-heading italic tracking-[0.05em]">Collections</h1>
          <Link to="/add" className="px-5 py-2 bg-black text-white text-sm w-24 text-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
            + Add Item
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4" style={{ fontFamily: 'Lora, serif' }}>No items yet.</p>
            <Link to="/add" className="px-6 py-3 bg-black text-white text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Add Your First Item
            </Link>
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

                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-2 border-b border-gray-100">
                  <div className="col-span-1" />
                  <div className="col-span-4">
                    <span className="text-xs uppercase tracking-widest text-gray-300" style={{ fontFamily: 'Roboto, sans-serif' }}>Name</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs uppercase tracking-widest text-gray-300" style={{ fontFamily: 'Roboto, sans-serif' }}>From</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs uppercase tracking-widest text-gray-300" style={{ fontFamily: 'Roboto, sans-serif' }}>Status</span>
                  </div>
                  <div className="col-span-2" />
                </div>

                {grouped[category].map(item => {
                  const personName = getPersonName(item.ownerId);
                  const personId = getPersonId(item.ownerId);

                  return (
                    <div key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">

                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-3 items-center">
                        <div className="col-span-1">
                          <Link to={`/item/${item.id}`}>
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-10 h-10 object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100" />
                            )}
                          </Link>
                        </div>
                        <div className="col-span-4">
                          <Link to={`/item/${item.id}`} className="text-sm hover:underline" style={{ fontFamily: 'Lora, serif' }}>
                            {item.name}
                          </Link>
                        </div>
                        <div className="col-span-3">
                          {personName && personId ? (
                            <Link to={`/person/${personId}`} className="text-sm text-gray-500 hover:underline" style={{ fontFamily: 'Roboto, sans-serif' }}>
                              {personName}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-300" style={{ fontFamily: 'Roboto, sans-serif' }}>—</span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <button
                            onClick={() => handlePublish(item)}
                            className={`text-xs px-2 py-1 transition-colors ${item.status === 'public' ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                            style={{ fontFamily: 'Roboto, sans-serif' }}
                          >
                            {item.status === 'public' ? 'Published' : 'Draft'}
                          </button>
                        </div>
                        <div className="col-span-2 flex gap-3 justify-end">
                          <button onClick={() => setEditingItem(item)} className="text-xs text-gray-400 hover:text-black transition-colors" style={{ fontFamily: 'Roboto, sans-serif' }}>Edit</button>
                          <button onClick={() => handleDelete(item.id)} className="text-xs text-gray-300 hover:text-red-500 transition-colors" style={{ fontFamily: 'Roboto, sans-serif' }}>Delete</button>
                        </div>
                      </div>

                      {/* Mobile row */}
                      <div className="flex md:hidden gap-3 px-3 py-3 items-center">
                        <Link to={`/item/${item.id}`} className="flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-12 h-12 object-cover" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100" />
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/item/${item.id}`} className="text-sm block truncate" style={{ fontFamily: 'Lora, serif' }}>{item.name}</Link>
                          {personName && personId && (
                            <Link to={`/person/${personId}`} className="text-xs text-gray-400 block" style={{ fontFamily: 'Roboto, sans-serif' }}>{personName}</Link>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <button
                            onClick={() => handlePublish(item)}
                            className={`text-xs transition-colors ${item.status === 'public' ? 'text-green-600' : 'text-gray-400'}`}
                            style={{ fontFamily: 'Roboto, sans-serif' }}
                          >
                            {item.status === 'public' ? 'Published' : 'Draft'}
                          </button>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem(item)} className="text-xs text-gray-400 hover:text-black" style={{ fontFamily: 'Roboto, sans-serif' }}>Edit</button>
                            <button onClick={() => handleDelete(item.id)} className="text-xs text-gray-300 hover:text-red-500" style={{ fontFamily: 'Roboto, sans-serif' }}>Delete</button>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

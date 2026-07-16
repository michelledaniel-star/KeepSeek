import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function SeekerDashboard() {
  const { user, seekerName, connections, ready } = useAuth();
  const [keeperNames, setKeeperNames] = useState({});
  const navigate = useNavigate();

  const connectionsSettled = ready && Object.keys(connections).length > 0;

  useEffect(() => {
    if (!ready) return;
    if (!user) { navigate('/auth'); return; }
    if (!connectionsSettled) return;
    loadKeeperNames();
  }, [ready, user, connectionsSettled]);

  const loadKeeperNames = async () => {
    const slugs = connectionsSettled ? Object.keys(connections) : [];
    if (slugs.length === 0) return;

    const { data: keepers } = await supabase
      .from('keepers')
      .select('slug, name')
      .in('slug', slugs);

    if (keepers) {
      const nameMap = {};
      keepers.forEach(k => { nameMap[k.slug] = k.name; });
      setKeeperNames(nameMap);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Loading...</p>
      </div>
    );
  }

  const slugs = connectionsSettled ? Object.keys(connections) : [];

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-gray-200 px-4 md:px-12 py-5 flex items-center justify-between">
        <div className="flex items-baseline gap-0">
          <span className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
          <span className="text-2xl italic" style={{ fontFamily: 'Merriweather, serif' }}>seek</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>{seekerName}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-black transition-colors"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-4 md:px-12 py-16">

        <h1 className="text-4xl font-heading italic tracking-[0.05em] mb-12">
          Your Collections
        </h1>

        {slugs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-2" style={{ fontFamily: 'Lora, serif' }}>No collections yet.</p>
            <p className="text-sm text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>You'll be added when someone invites you.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slugs.map(slug => {
              const conn = connections[slug];
              const displayName = keeperNames[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return (
                <Link
                  key={slug}
                  to={`/s/${slug}/gallery`}
                  className="flex items-center justify-between px-6 py-5 border border-gray-200 hover:border-gray-400 transition-colors group"
                >
                  <div>
                    <p className="text-lg font-medium group-hover:underline" style={{ fontFamily: 'Lora, serif' }}>
                      {displayName}'s Collection
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {conn.relationship}
                    </p>
                  </div>
                  <span className="text-gray-400 group-hover:text-black transition-colors">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
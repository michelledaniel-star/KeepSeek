import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import InviteModal from './InviteModal';

export default function SiteHeader() {
  const { userType, keeperSlug, keeperId, keeperName, keeperSelfPersonId, seekerName, connections } = useAuth();
  const [keeperOpen, setKeeperOpen] = useState(false);
  const [seekerOpen, setSeekerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const navigate = useNavigate();

  const seekerSlugFromConnections = Object.keys(connections || {})[0] || '';

  const handleLogout = async () => {
    setKeeperOpen(false);
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const keeperMenu = [
    { label: 'Add New Item', href: '/add' },
    { label: 'Gallery', href: '/viewer' },
    { label: 'Collections', href: '/curator' },
    { label: 'Connections', href: '/connections' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 py-6 flex justify-between items-center">

          {/* Logo */}
          <Link to="/" className="flex items-baseline gap-0 tracking-widest hover:opacity-70 transition-opacity">
            <span className="text-3xl font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
            <span className="text-3xl italic" style={{ fontFamily: 'Merriweather, serif' }}>seek</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-8 items-center">

            {/* Keeper Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setKeeperOpen(!keeperOpen); setSeekerOpen(false); }}
                className="text-base hover:opacity-70 transition-opacity"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                keeper
              </button>
              {keeperOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-black min-w-[200px] shadow-lg z-50">
                  <Link
                    to={`/person/${keeperSelfPersonId}`}
                    onClick={() => setKeeperOpen(false)}
                    className="block px-4 py-3 text-sm hover:bg-[#e2826c] hover:text-white transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    My Profile
                  </Link>
                  {keeperMenu.map((item, i) => (
                    <Link
                      key={i}
                      to={item.href}
                      onClick={() => setKeeperOpen(false)}
                      className="block px-4 py-3 text-sm hover:bg-[#e2826c] hover:text-white transition-colors"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:bg-[#e2826c] hover:text-white transition-colors border-t border-gray-100 mt-2"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    Log Out
                  </button>
                  <button
                    onClick={() => setShowInvite(true)}
                    className="w-full text-left px-4 py-3 text-sm text-[#669999] hover:bg-[#e2826c] hover:text-white transition-colors border-t border-gray-100"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    Send Invitation
                  </button>
                </div>
              )}
            </div>

            {/* Seeker Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setSeekerOpen(!seekerOpen); setKeeperOpen(false); }}
                className="text-base italic hover:opacity-70 transition-opacity"
                style={{ fontFamily: 'Merriweather, serif' }}
              >
                seeker
              </button>
              {seekerOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-black w-[240px] shadow-lg z-50">
                  {userType === 'seeker' ? (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs uppercase tracking-widest text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>Signed in as</p>
                        <p className="text-sm italic mt-0.5" style={{ fontFamily: 'Merriweather, serif' }}>{seekerName}</p>
                      </div>
                      <Link to={`/s/${seekerSlugFromConnections}/gallery`} onClick={() => setSeekerOpen(false)}
                        className="block px-4 py-3 text-sm italic hover:bg-[#e2826c] hover:text-white transition-colors"
                        style={{ fontFamily: 'Merriweather, serif' }}>
                        Gallery
                      </Link>
                      <Link to={`/s/${seekerSlugFromConnections}/origins`} onClick={() => setSeekerOpen(false)}
                        className="block px-4 py-3 text-sm italic hover:bg-[#e2826c] hover:text-white transition-colors"
                        style={{ fontFamily: 'Merriweather, serif' }}>
                        Connections
                      </Link>
                      <div className="px-4 py-3 text-sm italic text-gray-300 cursor-not-allowed border-t border-gray-100"
                        style={{ fontFamily: 'Merriweather, serif' }}>
                        Connect to Keeper <span className="text-xs not-italic" style={{ fontFamily: 'Roboto, sans-serif' }}>— coming soon</span>
                      </div>
                      <div className="px-4 py-3 text-sm italic text-gray-300 cursor-not-allowed"
                        style={{ fontFamily: 'Merriweather, serif' }}>
                        Share <span className="text-xs not-italic" style={{ fontFamily: 'Roboto, sans-serif' }}>— coming soon</span>
                      </div>
                      <button
                        onClick={async () => { await supabase.auth.signOut(); setSeekerOpen(false); navigate('/'); }}
                        className="w-full text-left px-4 py-3 text-sm italic text-gray-400 hover:bg-[#e2826c] hover:text-white transition-colors border-t border-gray-100"
                        style={{ fontFamily: 'Merriweather, serif' }}>
                        Log Out
                      </button>
                    </>
                  ) : userType === 'keeper' ? (
                    <div className="px-4 py-3">
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>Have an invitation?</p>
                      <p className="text-xs text-gray-400 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>Use the link sent to your email to access your family's collection.</p>
                    </div>
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>Have an invitation?</p>
                      <p className="text-xs text-gray-400 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>Use the link sent to your email to access your family's collection.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </nav>

          {/* Mobile Menu Button */}
          <button
            className="flex md:hidden text-2xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>

        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#B8A888] px-4 py-6 flex flex-col gap-6">
            <Link to={`/person/${keeperSelfPersonId}`} style={{ fontFamily: 'Roboto, sans-serif' }} onClick={() => setMobileMenuOpen(false)}>My Profile</Link>
            <Link to="/add" style={{ fontFamily: 'Roboto, sans-serif' }} onClick={() => setMobileMenuOpen(false)}>Add New Item</Link>
            <Link to="/viewer" style={{ fontFamily: 'Roboto, sans-serif' }} onClick={() => setMobileMenuOpen(false)}>Gallery</Link>
            <Link to="/curator" style={{ fontFamily: 'Roboto, sans-serif' }} onClick={() => setMobileMenuOpen(false)}>Collections</Link>
            <Link to="/connections" style={{ fontFamily: 'Roboto, sans-serif' }} onClick={() => setMobileMenuOpen(false)}>Connections</Link>
            <button onClick={handleLogout} className="text-left text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Log Out
            </button>
            <button onClick={() => setShowInvite(true)} className="text-left text-[#669999]" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Send Invitation
            </button>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>Seeker</p>
              {userType === 'seeker' ? (
                <div className="flex flex-col gap-4">
                  <Link to={`/s/${seekerSlugFromConnections}/gallery`} className="text-base italic" style={{ fontFamily: 'Merriweather, serif' }} onClick={() => setMobileMenuOpen(false)}>Gallery</Link>
                  <Link to={`/s/${seekerSlugFromConnections}/connections`} className="text-base italic" style={{ fontFamily: 'Merriweather, serif' }} onClick={() => setMobileMenuOpen(false)}>Connections</Link>
                  <button onClick={async () => { await supabase.auth.signOut(); setMobileMenuOpen(false); navigate('/'); }}
                    className="text-left text-base italic text-gray-400" style={{ fontFamily: 'Merriweather, serif' }}>
                    Log Out
                  </button>
                </div>
              ) : userType === 'keeper' ? (
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>Have a family invitation?</p>
                  <p className="text-xs text-gray-400 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>Use the link in your email to access another collection.</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>Use the link sent to your email to access your family's collection.</p>
              )}
            </div>
          </div>
        )}
      </header>

      {(keeperOpen || seekerOpen) && (
        <div onClick={() => { setKeeperOpen(false); setSeekerOpen(false); }} className="fixed inset-0 z-40" />
      )}

      <div style={{ height: mobileMenuOpen ? '280px' : '40px' }} />

      {showInvite && (
        <InviteModal
          slug={keeperSlug}
          keeperName={keeperName}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}
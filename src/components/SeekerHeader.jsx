import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function SeekerHeader({ slug, seekerName }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { label: 'Gallery', href: `/s/${slug}/gallery` },
    { label: 'Connections', href: `/s/${slug}/connections` },
    { label: 'Collections', href: `/s/${slug}/categories` },
    { label: 'My Collections', href: `/seeker` },
  ];

  return (
    <>
      <header className="border-b border-gray-200 px-4 md:px-12 py-5 flex items-center justify-between bg-white">

        {/* Logo */}
        <Link to={`/s/${slug}/gallery`} className="flex items-baseline gap-0 hover:opacity-70 transition-opacity">
          <span className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
          <span className="text-2xl italic" style={{ fontFamily: 'Merriweather, serif' }}>seek</span>
        </Link>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-6">
          <span className="text-sm text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>
            Welcome, {seekerName}
          </span>

          {/* Seeker dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="text-base italic hover:opacity-70 transition-opacity"
              style={{ fontFamily: 'Merriweather, serif' }}
            >
              seeker
            </button>
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-black min-w-[200px] shadow-lg z-50">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-3 text-sm italic hover:bg-[#e2826c] hover:text-white transition-colors"
                    style={{ fontFamily: 'Merriweather, serif' }}
                  >
                    {item.label}
                  </Link>
                ))}
                
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm italic text-gray-400 hover:bg-[#e2826c] hover:text-white transition-colors border-t border-gray-100"
                  style={{ fontFamily: 'Merriweather, serif' }}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex md:hidden text-2xl"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>

      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#B8A888] px-4 py-6 flex flex-col gap-6">
          <span className="text-sm text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>
            Welcome, {seekerName}
          </span>
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-base italic"
              style={{ fontFamily: 'Merriweather, serif' }}
            >
              {item.label}
            </Link>
          ))}
          
          <button
            onClick={handleLogout}
            className="text-left text-base italic text-gray-400"
            style={{ fontFamily: 'Merriweather, serif' }}
          >
            Log Out
          </button>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div onClick={() => setDropdownOpen(false)} className="fixed inset-0 z-40" />
      )}

      {/* Spacer */}
      <div style={{ height: mobileMenuOpen ? '240px' : '0px' }} />
    </>
  );
}
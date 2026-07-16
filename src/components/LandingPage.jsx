import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showSeekerModal, setShowSeekerModal] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="px-8 py-5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-baseline gap-0">
          <span className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
          <span className="text-2xl italic" style={{ fontFamily: 'Merriweather, serif' }}>seek</span>
        </div>
      </header>

      {/* Split */}
      <div className="flex-1 flex flex-col md:flex-row">

        {/* Keeping — left */}
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-20 border-b md:border-b-0 md:border-r border-gray-200 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-6" style={{ fontFamily: 'Roboto, sans-serif' }}>
            For the Keeper
          </p>
          <h2 className="text-2xl leading-snug mb-6 max-w-xs" style={{ fontFamily: 'Merriweather, serif' }}>
            Begin Preserving Your Family's Stories — One Keepsake at a Time
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>
            You're the one who knows what everything means. KeepSeek gives you a private place to catalog the things, write the stories, and share them with the people who matter.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="px-8 py-3 bg-black text-white text-sm tracking-wide hover:bg-gray-800 transition-colors"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Start Keeping
          </button>
        </div>

        {/* Seeking — right */}
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-20 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-6" style={{ fontFamily: 'Roboto, sans-serif' }}>
            For the Seeker
          </p>
          <h2 className="text-2xl leading-snug mb-6 max-w-xs" style={{ fontFamily: 'Merriweather, serif' }}>
            Explore the Stories That Shaped Your Family
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>
            Someone in your family has put together a collection for you. Use the invitation link they sent to get started.
          </p>
          <button
            onClick={() => setShowSeekerModal(true)}
            className="px-8 py-3 border border-black text-black text-sm tracking-wide hover:bg-gray-50 transition-colors"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Start Seeking
          </button>
        </div>

      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-8 py-4 text-center">
        <p className="text-xs text-gray-300" style={{ fontFamily: 'Roboto, sans-serif' }}>
          © {new Date().getFullYear()} KeepSeek
        </p>
      </div>

      {/* Seeker Modal */}
      {showSeekerModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4"
          onClick={() => setShowSeekerModal(false)}
        >
          <div
            className="bg-white max-w-sm w-full px-10 py-12 text-center"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl mb-4 leading-snug" style={{ fontFamily: 'Merriweather, serif' }}>
              You'll need an invitation
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-8" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Seeking is by invitation only. Check your email for an invitation link from your Keeper — that link is your way in.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed mb-8" style={{ fontFamily: 'Roboto, sans-serif' }}>
              If you've already confirmed your account, you can log in below.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/auth?role=seeker')}
                className="w-full py-3 bg-black text-white text-sm tracking-wide hover:bg-gray-800 transition-colors"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Log In
              </button>
              <button
                onClick={() => setShowSeekerModal(false)}
                className="w-full py-3 border border-gray-200 text-gray-400 text-sm tracking-wide hover:border-gray-300 transition-colors"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
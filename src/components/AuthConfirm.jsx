import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthConfirm() {
  const navigate = useNavigate();
  const { ready, user, userType, profileComplete, connections } = useAuth();

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (userType === 'keeper') {
      navigate(profileComplete === false ? '/profile/setup' : '/viewer', { replace: true });
      return;
    }

    if (userType === 'seeker') {
      const slugs = Object.keys(connections);
      if (slugs.length === 1) {
        navigate(`/s/${slugs[0]}/gallery`, { replace: true });
      } else if (slugs.length > 1) {
        navigate('/seeker', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
      return;
    }

    navigate('/auth', { replace: true });
  }, [ready]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center space-y-4">
      <div className="flex items-baseline gap-0 mb-6">
        <span className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
        <span className="text-2xl font-heading italic tracking-[0.05em]">seek</span>
      </div>
      <p className="text-sm text-gray-400 font-body">Setting up your account...</p>
    </div>
  );
}

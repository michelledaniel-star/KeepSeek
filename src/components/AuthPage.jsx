import React, { useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSeekerMode = searchParams.get('role') === 'seeker';
  const { user, userType, connections, ready, refresh } = useAuth();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    middleName: '',
    maidenName: '',
    lastName: '',
  });

  // Redirect already-logged-in users
  if (ready && user) {
    if (userType === 'keeper') return <Navigate to="/viewer" replace />;
    const slugs = Object.keys(connections);
    if (slugs.length === 1) return <Navigate to={`/s/${slugs[0]}/gallery`} replace />;
    if (slugs.length > 1) return <Navigate to="/seeker" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;

      const userId = signInData.user?.id;
      const { data: keeper } = await supabase
        .from('keepers')
        .select('slug, profile_complete')
        .eq('user_id', userId)
        .maybeSingle();

      if (keeper) {
        navigate(keeper.profile_complete === false ? '/profile/setup' : '/viewer');
        return;
      }

      // No keeper row — seeker or broken account.
      // AuthContext will resolve via onAuthStateChange and the already-logged-in
      // guard at the top of this component will handle seeker routing.
      // If AuthContext finds nothing, fall through to the error below.
      const { data: seekerRow } = await supabase
        .from('seekers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (seekerRow) return; // AuthContext + already-logged-in guard takes it from here

      setError('No account found. Please check your email or sign up.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!signupData.firstName || !signupData.lastName) {
      setError('First and last name are required.');
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (signupData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            first_name: signupData.firstName,
            middle_name: signupData.middleName,
            maiden_name: signupData.maidenName,
            last_name: signupData.lastName,
          }
        }
      });

      if (error) throw error;

      const user = data.user;

if (!user) throw new Error('Signup failed. Please try again.');

      // Safety check — don't create duplicate keeper row
      const { data: existingKeeper } = await supabase
        .from('keepers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingKeeper) {
        const { firstName, middleName, lastName } = signupData;
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

        // Find available slug
        const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        let slug = base;
        let count = 2;
        while (true) {
          const { data: existing } = await supabase
            .from('keepers')
            .select('slug')
            .eq('slug', slug)
            .maybeSingle();
          if (!existing) break;
          slug = `${base}-${count}`;
          count++;
        }

        const keeperResponse = await fetch('/api/create-keeper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            slug,
            name: fullName,
          }),
        });

        if (!keeperResponse.ok) {
          const { error } = await keeperResponse.json();
          throw new Error(error || 'Failed to create keeper account');
        }

    }

      // Make sure AuthContext has picked up the new keeper row before we
      // navigate anywhere — otherwise keeperId stays blank and any page
      // that waits on it (like the gallery) hangs forever.
      await refresh();

      // Email confirmation is off — navigate directly to profile setup
      navigate('/profile/setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm";
  const labelClass = "block text-xs uppercase tracking-widest text-gray-400 mb-1";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
          <span className="text-2xl font-heading italic tracking-[0.05em]">seek</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center pt-16 px-4">
        <div className="w-full max-w-md">

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-8">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 pb-3 text-sm transition-colors ${tab === 'login' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Log In
            </button>
            {!isSeekerMode && (
              <button
                onClick={() => { setTab('signup'); setError(''); }}
                className={`flex-1 pb-3 text-sm transition-colors ${tab === 'signup' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Create Account
              </button>
            )}
          </div>

          {/* Check email confirmation screen */}
          {tab === 'check-email' && (
            <div className="text-center space-y-4 py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-heading italic tracking-[0.05em]">Check your email</h2>
              <p className="text-sm text-gray-500 font-body leading-relaxed">
                We sent a confirmation link to <strong>{signupData.email}</strong>. Click it to activate your account and get started.
              </p>
              <p className="text-xs text-gray-400 font-body">
                Didn't get it? Check your spam folder.
              </p>
            </div>
          )}

          {tab !== 'check-email' && error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
              {error}
            </div>
          )}

          {/* Login Form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: 'Lora, serif' }}
                  required
                />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: 'Lora, serif' }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-black text-white text-sm disabled:bg-gray-300 mt-2"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
              {!isSeekerMode && (
                <p className="text-center text-xs text-gray-400 mt-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setTab('signup')} className="underline text-gray-600">
                    Create one
                  </button>
                </p>
              )}
            </form>
          )}

          {/* Sign Up Form */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif', textTransform: 'capitalize' }}>First Name *</label>
                  <input
                    type="text"
                    value={signupData.firstName}
                    onChange={e => setSignupData(prev => ({ ...prev, firstName: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) }))}
                    className={inputClass}
                    style={{ fontFamily: 'Lora, serif' }}
                    autoCapitalize="words"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif', textTransform: 'capitalize' }}>Middle Name</label>
                  <input
                    type="text"
                    value={signupData.middleName}
                    onChange={e => setSignupData(prev => ({ ...prev, middleName: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) }))}
                    className={inputClass}
                    style={{ fontFamily: 'Lora, serif' }}
                    autoCapitalize="words"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif', textTransform: 'capitalize' }}>Maiden Name</label>
                  <input
                    type="text"
                    value={signupData.maidenName}
                    onChange={e => setSignupData(prev => ({ ...prev, maidenName: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) }))}
                    className={inputClass}
                    style={{ fontFamily: 'Lora, serif' }}
                    autoCapitalize="words"
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif', textTransform: 'capitalize' }}>Last Name *</label>
                  <input
                    type="text"
                    value={signupData.lastName}
                    onChange={e => setSignupData(prev => ({ ...prev, lastName: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) }))}
                    className={inputClass}
                    style={{ fontFamily: 'Lora, serif' }}
                    autoCapitalize="words"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Email *</label>
                <input
                  type="email"
                  value={signupData.email}
                  onChange={e => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                  className={inputClass}
                  style={{ fontFamily: 'Lora, serif' }}
                  required
                />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Password *</label>
                <input
                  type="password"
                  value={signupData.password}
                  onChange={e => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                  className={inputClass}
                  style={{ fontFamily: 'Lora, serif' }}
                  required
                />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Confirm Password *</label>
                <input
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={e => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={inputClass}
                  style={{ fontFamily: 'Lora, serif' }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-black text-white text-sm disabled:bg-gray-300 mt-2"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => setTab('login')} className="underline text-gray-600">
                  Log in
                </button>
              </p>
              <p className="text-center text-xs text-gray-400 mt-3 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                For the smoothest signup, please use Safari, Chrome, or Firefox.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

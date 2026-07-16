import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const SEEKER_RELATIONSHIPS = [
  { label: 'I am their Child', generation: -1 },
  { label: 'I am their Grandchild', generation: -2 },
  { label: 'I am their Great-Grandchild', generation: -3 },
  { label: 'I am their Great-Great-Grandchild', generation: -4 },
  { label: 'I am their Parent', generation: 1 },
  { label: 'I am their Grandparent', generation: 2 },
  { label: 'I am their Sibling', generation: 0 },
  { label: 'I am their Partner', generation: 0 },
  { label: 'I am their Niece or Nephew', generation: -1 },
  { label: 'I am their Cousin', generation: 0 },
  { label: 'I am their Friend', generation: 0 },
  { label: 'Just browsing', generation: 0 },
];

export default function SeekerAuthPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { refresh } = useAuth();
  const [tab, setTab] = useState(location.state?.tab || 'signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionChecked, setSessionChecked] = useState(false);
  const [keeperName, setKeeperName] = useState('');
  const [keeperPhoto, setKeeperPhoto] = useState(null);

  // Relationship-only screen state
  const [showRelationshipOnly, setShowRelationshipOnly] = useState(false);
  const [relationshipOnlyUser, setRelationshipOnlyUser] = useState(null); // { id, email, name }
  const [selectedRelationship, setSelectedRelationship] = useState('');
  const [relationshipLoading, setRelationshipLoading] = useState(false);

  // Signup fields
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    relationship: '',
  });

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const signingUp = React.useRef(false);

  useEffect(() => {
    loadKeeperName();
    // Check if already logged in on page load — but not mid-signup
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !signingUp.current) {
        checkLoggedInUser(user);
      } else {
        setSessionChecked(true);
      }
    });
  }, [slug]);

  const loadKeeperName = async () => {
    const { data: keeper } = await supabase
      .from('keepers')
      .select('id, name, self_person_id')
      .eq('slug', slug)
      .maybeSingle();

    if (!keeper) {
      setKeeperName(slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      return;
    }
    setKeeperName(keeper.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

    if (keeper.self_person_id) {
      const { data: photos } = await supabase
        .from('images')
        .select('url, order')
        .eq('person_id', keeper.self_person_id)
        .order('order', { ascending: true })
        .limit(1);
      if (photos && photos.length > 0) setKeeperPhoto(photos[0].url);
    }
  };

  // Called when we know the user is logged in — check their access
  const checkLoggedInUser = async (user) => {
    const { data: existing } = await supabase
      .from('access')
      .select('id')
      .eq('seeker_id', user.id)
      .eq('keeper_slug', slug)
      .maybeSingle();

    if (existing) {
      // Already connected to this keeper — go straight to gallery
      navigate(`/s/${slug}/gallery`, { replace: true });
      return;
    }

    // Logged in but not connected to this keeper — show relationship screen
    const { data: seekerRow } = await supabase
      .from('seekers')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle();

    setRelationshipOnlyUser({
      id: user.id,
      email: user.email,
      name: seekerRow?.name || '',
    });
    setShowRelationshipOnly(true);
    setSessionChecked(true);
  };

  // Called after relationship is picked on the relationship-only screen
  const handleRelationshipSubmit = async () => {
    if (!selectedRelationship) {
      setError('Please select your relationship.');
      return;
    }
    setRelationshipLoading(true);
    setError('');
    try {
      const rel = SEEKER_RELATIONSHIPS.find(r => r.label === selectedRelationship);
      const response = await fetch('/api/create-seeker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: relationshipOnlyUser.id,
          email: relationshipOnlyUser.email,
          name: relationshipOnlyUser.name,
          keeperSlug: slug,
          relationship: selectedRelationship,
          generation: rel?.generation ?? 0,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to connect to collection');
      }

      // Check how many collections they now have
      const { data: allAccess } = await supabase
        .from('access')
        .select('keeper_slug')
        .eq('seeker_id', relationshipOnlyUser.id);

      await refresh();

      if (allAccess && allAccess.length > 1) {
        navigate('/seeker');
      } else {
        navigate(`/s/${slug}/gallery`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRelationshipLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!signupData.name.trim()) { setError('Please enter your name.'); return; }
    if (!signupData.relationship) { setError('Please select your relationship.'); return; }
    if (signupData.password !== signupData.confirmPassword) { setError('Passwords do not match.'); return; }
    if (signupData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    signingUp.current = true;
    setSessionChecked(true);
    try {
      const rel = SEEKER_RELATIONSHIPS.find(r => r.label === signupData.relationship);

      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: 'https://mykeepseek.com/auth/confirm',
        },
      });

      const existingUser =
        (error && error.message?.toLowerCase().includes('already registered')) ||
        (data?.user && data.user.identities && data.user.identities.length === 0);

      if (!existingUser && error) throw error;

      if (existingUser) {
        // Try to sign them in with the password they just gave us
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: signupData.email,
          password: signupData.password,
        });

        if (signInError) {
          // Wrong password — send to login tab with email pre-filled
          setError('You already have a KeepSeek account but the password didn\'t match. Please log in.');
          setTab('login');
          setLoginEmail(signupData.email);
          return;
        }

        // Correct password — create access row and route
        await fetch('/api/create-seeker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: signInData.user.id,
            email: signupData.email,
            name: signupData.name.trim(),
            keeperSlug: slug,
            relationship: signupData.relationship,
            generation: rel?.generation ?? 0,
          }),
        });

        const { data: allAccess } = await supabase
          .from('access')
          .select('keeper_slug')
          .eq('seeker_id', signInData.user.id);

        await refresh();

        if (allAccess && allAccess.length > 1) {
          navigate('/seeker');
        } else {
          navigate(`/s/${slug}/gallery`);
        }
        return;
      }

      // Brand new user
      const response = await fetch('/api/create-seeker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          email: signupData.email,
          name: signupData.name.trim(),
          keeperSlug: slug,
          relationship: signupData.relationship,
          generation: rel?.generation ?? 0,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to create account');
      }

      await refresh();

      navigate(`/s/${slug}/gallery`);
    } catch (err) {
      signingUp.current = false;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;

      // Use the same checkLoggedInUser logic — handles both connected and new cases
      await checkLoggedInUser(data.user);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black text-sm";
  const labelClass = "block text-xs uppercase tracking-widest text-gray-400 mb-1";

  const KeeperHeader = () => (
    <div className="text-center mb-8">
      {keeperPhoto ? (
        <img src={keeperPhoto} alt={keeperName} className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />
      ) : (
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-medium mx-auto mb-4"
          style={{ backgroundColor: '#669999', fontFamily: 'Roboto, sans-serif' }}
        >
          {keeperName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
        </div>
      )}
      <h1 className="text-2xl font-heading italic tracking-[0.05em] mb-3">
        {keeperName}'s Collection
      </h1>
      <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto" style={{ fontFamily: 'Lora, serif' }}>
        These are the things {keeperName} loved enough to save — and the stories behind them.
      </p>
    </div>
  );

  if (!sessionChecked && !showRelationshipOnly) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400" style={{ fontFamily: 'Lora, serif' }}>Loading...</p>
      </div>
    );
  }

  // Relationship-only screen — shown when user is logged in but not connected to this keeper
  if (showRelationshipOnly) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="border-b border-gray-200 px-8 py-5">
          <div className="flex items-baseline gap-0">
            <span className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
            <span className="text-2xl italic" style={{ fontFamily: 'Merriweather, serif' }}>seek</span>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center pt-12 px-4">
          <div className="w-full max-w-md">
            <KeeperHeader />
            <p className="text-sm text-gray-500 text-center mb-8" style={{ fontFamily: 'Lora, serif' }}>
              Welcome back, {relationshipOnlyUser?.name || 'there'}. One more thing —
            </p>
            {error && (
              <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Your Relationship to {keeperName} *
                </label>
                <select
                  value={selectedRelationship}
                  onChange={e => setSelectedRelationship(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: 'Lora, serif' }}
                >
                  <option value="">Select...</option>
                  {SEEKER_RELATIONSHIPS.map(r => (
                    <option key={r.label} value={r.label}>{r.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleRelationshipSubmit}
                disabled={relationshipLoading}
                className="w-full py-3 bg-black text-white text-sm disabled:bg-gray-300 mt-2"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {relationshipLoading ? 'Connecting...' : 'View Collection'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200 px-8 py-5">
        <div className="flex items-baseline gap-0">
          <span className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
          <span className="text-2xl italic" style={{ fontFamily: 'Merriweather, serif' }}>seek</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-md">
          <KeeperHeader />

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-8">
            <button
              onClick={() => { setTab('signup'); setError(''); }}
              className={`flex-1 pb-3 text-sm transition-colors ${tab === 'signup' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Create Account
            </button>
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 pb-3 text-sm transition-colors ${tab === 'login' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Log In
            </button>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
              {error}
            </div>
          )}

          {/* Sign Up Form */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Your Name *</label>
                <input
                  type="text"
                  value={signupData.name}
                  onChange={e => setSignupData(prev => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                  style={{ fontFamily: 'Lora, serif', textTransform: 'capitalize' }}
                  required
                />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: 'Roboto, sans-serif' }}>Your Relationship to {keeperName} *</label>
                <select
                  value={signupData.relationship}
                  onChange={e => setSignupData(prev => ({ ...prev, relationship: e.target.value }))}
                  className={inputClass}
                  style={{ fontFamily: 'Lora, serif' }}
                  required
                >
                  <option value="">Select...</option>
                  {SEEKER_RELATIONSHIPS.map(r => (
                    <option key={r.label} value={r.label}>{r.label}</option>
                  ))}
                </select>
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
                <button type="button" onClick={() => setTab('login')} className="underline text-gray-600">Log in</button>
              </p>
            </form>
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
                {loading ? 'Logging in...' : 'Enter Collection'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
                New to this collection?{' '}
                <button type="button" onClick={() => setTab('signup')} className="underline text-gray-600">Create account</button>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
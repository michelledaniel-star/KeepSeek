import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [keeperSlug, setKeeperSlug] = useState('');
  const [keeperId, setKeeperId] = useState('');
  const [keeperName, setKeeperName] = useState('');
  const [keeperSelfPersonId, setKeeperSelfPersonId] = useState('');
  const [seekerName, setSeekerName] = useState('');
  const [connections, setConnections] = useState({});
  const [profileComplete, setProfileComplete] = useState(null);
  const [partnerNames, setPartnerNames] = useState([]);
  const [ready, setReady] = useState(false);
  const resolveVersion = useRef(0);
  const initialized = useRef(false);
  const resolveTimer = useRef(null);

  const resolveUser = async (currentUser) => {
    const version = ++resolveVersion.current;
    console.log('resolveUser called — user:', currentUser?.id ?? 'null', 'version:', version);

    try {
      if (!currentUser) {
        setUser(null);
        setUserType(null);
        setKeeperSlug('');
        setKeeperId('');
        setKeeperName('');
        setKeeperSelfPersonId('');
        setSeekerName('');
        setConnections({});
        setProfileComplete(null);
        setPartnerNames([]);
        return;
      }

      setUser(currentUser);

      // Check keeper first
      const { data: keeper } = await supabase
        .from('keepers')
        .select('id, slug, name, self_person_id, profile_complete, partner_names')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (keeper) {
        setUserType('keeper');
        setKeeperSlug(keeper.slug || '');
        setKeeperId(keeper.id || '');
        setKeeperName(keeper.name || '');
        setKeeperSelfPersonId(keeper.self_person_id || '');
        setProfileComplete(keeper.profile_complete ?? false);
        setPartnerNames(keeper.partner_names || []);
      } else {
        setUserType(null);
        setProfileComplete(null);
        setPartnerNames([]);
      }

      // Always check for seeker connections regardless of keeper status
      const { data: seeker } = await supabase
        .from('seekers')
        .select('name')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (seeker) {
        if (!keeper) setUserType('seeker');
        setSeekerName(seeker.name || '');
        if (!keeper) setProfileComplete(null);

        const { data: conns } = await supabase
          .from('access')
          .select('keeper_slug, generation, relationship, status')
          .eq('seeker_id', currentUser.id);

        if (conns && conns.length > 0) {
          const slugs = conns.map(c => c.keeper_slug);
          const { data: keeperRows } = await supabase
            .from('keepers')
            .select('id, slug')
            .in('slug', slugs);

          const keeperIdMap = {};
          keeperRows?.forEach(k => { keeperIdMap[k.slug] = k.id; });

          const connMap = {};
          conns.forEach(c => {
            connMap[c.keeper_slug] = {
              keeperId: keeperIdMap[c.keeper_slug] || null,
              generation: c.generation ?? 0,
              relationship: c.relationship || '',
              status: c.status || 'active',
            };
          });
          setConnections(connMap);
        }
      }

    } catch (err) {
      console.error('AuthContext resolveUser error:', err);
    } finally {
      if (version === resolveVersion.current) {
        initialized.current = true;
        setReady(true);
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') return;
        if (resolveTimer.current) clearTimeout(resolveTimer.current);
        resolveTimer.current = setTimeout(() => resolveUser(session?.user ?? null), 100);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const markProfileComplete = () => setProfileComplete(true);

  const refresh = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await resolveUser(session?.user ?? null);
  };

  if (!ready) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="flex items-baseline gap-0">
        <span className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
        <span className="text-2xl italic" style={{ fontFamily: 'Merriweather, serif' }}>seek</span>
      </div>
    </div>
  );

  return (
    <AuthContext.Provider value={{
      user,
      userType,
      keeperSlug,
      keeperId,
      keeperName,
      keeperSelfPersonId,
      seekerName,
      connections,
      profileComplete,
      markProfileComplete,
      refresh,
      ready,
      partnerNames,
      setPartnerNames,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
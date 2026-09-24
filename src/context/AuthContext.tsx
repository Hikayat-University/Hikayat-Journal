import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../lib/types';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Admin = role admin/owner dan tidak dinonaktifkan. Sama dengan is_admin() di database. */
function profileIsAdmin(p: Profile | null) {
  return !!p && (p.role === 'admin' || p.role === 'owner') && !p.disabled_at;
}

async function fetchProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  // Profil beserta ID pemiliknya, supaya jelas profil milik sesi yang mana yang sudah dimuat.
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setLoaded(null);
      return;
    }
    fetchProfile(userId).then((profile) => {
      // Akun bukan admin atau sudah dinonaktifkan (tapi tokennya belum kedaluwarsa) langsung dikeluarkan.
      if (!profileIsAdmin(profile)) supabase.auth.signOut();
      setLoaded({ userId, profile });
    });
  }, [userId]);

  async function signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: 'Email atau kata sandi salah.' };

    const profile = await fetchProfile(data.user.id);
    if (!profileIsAdmin(profile)) {
      await supabase.auth.signOut();
      return {
        error: profile?.disabled_at
          ? 'Akun ini sudah dinonaktifkan. Hubungi admin lain untuk mengaktifkannya lagi.'
          : 'Akun ini tidak punya akses admin.',
      };
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const profile = loaded && loaded.userId === userId ? loaded.profile : null;

  const value: AuthContextValue = {
    session,
    profile,
    isAdmin: !!session && profileIsAdmin(profile),
    loading: sessionLoading || (!!userId && loaded?.userId !== userId),
    signInWithPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}

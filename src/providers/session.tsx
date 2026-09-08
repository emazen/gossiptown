import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { Profile } from '@/lib/database.types';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

type SessionState = {
  /** null until we know; false if auth failed entirely */
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  userId: string | null;
  /** Create (or update) the profile row for this anonymous user. */
  saveProfile: (nickname: string, avatarHue: number) => Promise<void>;
  /** Merge fields into the cached profile after a direct update. */
  patchProfile: (patch: Partial<Profile>) => void;
  /** Delete local session. The anonymous auth user becomes orphaned. */
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Restore or create an anonymous session.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('Supabase yapılandırılmamış (.env dosyasını doldur).');
      setLoading(false);
      return;
    }

    let cancelled = false;
    // Refresh timer only starts on an AppState change otherwise; kick it on launch.
    supabase.auth.startAutoRefresh();
    (async () => {
      if (__DEV__) console.log('[session] restoring');
      const { data, error: getErr } = await supabase.auth.getSession();
      if (__DEV__) console.log('[session] getSession', data.session ? 'found' : 'none', getErr?.message ?? '');
      if (data.session) {
        if (!cancelled) setSession(data.session);
        return;
      }
      const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (__DEV__) console.log('[session] anonymous sign-in', anonErr?.message ?? 'ok');
      if (anonErr) setError(anonErr.message);
      else setSession(anon.session);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      if (__DEV__) console.log('[session] event', evt, s ? 'session' : 'null');
      setSession(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2. Load profile for the session user.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) {
      if (!isSupabaseConfigured) return;
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (cancelled) return;
      if (__DEV__) console.log('[session] profile', data ? 'found' : 'none', err?.message ?? '');
      if (err) setError(err.message);
      setProfile(data ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (error) setLoading(false);
  }, [error]);

  const saveProfile = useCallback(
    async (nickname: string, avatarHue: number) => {
      const { data, error: err } = await supabase.rpc('ensure_profile', {
        p_nickname: nickname.trim(),
        p_avatar_hue: avatarHue,
      });
      if (err) throw err;
      setProfile(data as Profile);
    },
    [],
  );

  const patchProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setLoading(true);
    const { data, error: anonErr } = await supabase.auth.signInAnonymously();
    if (anonErr) setError(anonErr.message);
    else setSession(data.session);
  }, []);

  const value = useMemo<SessionState>(
    () => ({ session, profile, loading, error, userId, saveProfile, patchProfile, signOut }),
    [session, profile, loading, error, userId, saveProfile, patchProfile, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

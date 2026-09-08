import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import type { Neighborhood } from '@/lib/database.types';
import { errorMessage } from '@/lib/errors';
import { locate, type ResolvedPlace } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

const CACHE_KEY = 'tp.neighborhood.v2';
/** Re-verify location when the app comes back after this long. */
const STALE_MS = 30 * 60 * 1000;

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unsupported' | 'error';

type NeighborhoodState = {
  status: LocationStatus;
  neighborhood: Neighborhood | null;
  place: ResolvedPlace | null;
  error: string | null;
  lastVerifiedAt: number | null;
  /** Ask for permission, locate, and register with the server. */
  refresh: () => Promise<void>;
};

const Ctx = createContext<NeighborhoodState | null>(null);

export function NeighborhoodProvider({ children }: PropsWithChildren) {
  const { userId } = useSession();
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [place, setPlace] = useState<ResolvedPlace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<number | null>(null);
  const inFlight = useRef(false);

  // Warm from cache so the UI has something instantly; still re-verify.
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const cached = JSON.parse(raw) as { neighborhood: Neighborhood; place: ResolvedPlace; at: number };
        setNeighborhood(cached.neighborhood);
        setPlace(cached.place);
        setLastVerifiedAt(cached.at);
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (!userId || inFlight.current) return;
    inFlight.current = true;
    setStatus('locating');
    setError(null);
    try {
      const res = await locate();
      if (res.status === 'denied') {
        setStatus('denied');
        return;
      }
      if (res.status === 'error') {
        setStatus('error');
        setError(res.message);
        return;
      }
      setPlace(res.place);
      if (!res.place.supported) {
        setStatus('unsupported');
        return;
      }
      const { data, error: rpcErr } = await supabase.rpc('set_location', {
        p_lat: res.place.lat,
        p_lng: res.place.lng,
        p_city: res.place.city,
        p_district: res.place.district,
      });
      if (rpcErr) throw rpcErr;
      const nb = data as Neighborhood;
      const at = Date.now();
      setNeighborhood(nb);
      setLastVerifiedAt(at);
      setStatus('ready');
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ neighborhood: nb, place: res.place, at })).catch(() => {});
    } catch (e) {
      if (__DEV__) console.warn('set_location failed', e);
      setStatus('error');
      setError(errorMessage(e));
    } finally {
      inFlight.current = false;
    }
  }, [userId]);

  // Re-verify when the app returns to foreground after being away a while.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' || status !== 'ready') return;
      if (!lastVerifiedAt || Date.now() - lastVerifiedAt > STALE_MS) refresh();
    });
    return () => sub.remove();
  }, [status, lastVerifiedAt, refresh]);

  const value = useMemo<NeighborhoodState>(
    () => ({ status, neighborhood, place, error, lastVerifiedAt, refresh }),
    [status, neighborhood, place, error, lastVerifiedAt, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNeighborhood(): NeighborhoodState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNeighborhood outside NeighborhoodProvider');
  return v;
}

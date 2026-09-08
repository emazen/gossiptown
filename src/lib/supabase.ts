import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { ENV } from '@/lib/env';
import type { Database } from '@/lib/database.types';

const REQUEST_TIMEOUT_MS = 15_000;
const RETRIES = 2;

/**
 * Mobile networks (and the iOS simulator) drop requests or leave them hanging.
 * Abort anything slower than REQUEST_TIMEOUT_MS and retry transient network
 * failures. Only network-level errors are retried, never HTTP error responses,
 * so non-idempotent inserts are not duplicated by a 4xx/5xx.
 */
async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const upstream = init?.signal;
    const onAbort = () => controller.abort();
    upstream?.addEventListener('abort', onAbort);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (e) {
      lastErr = e;
      if (upstream?.aborted) throw e;
      if (__DEV__) console.warn(`[fetch] attempt ${attempt + 1} failed:`, String(e).slice(0, 140));
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
      upstream?.removeEventListener('abort', onAbort);
    }
  }
  throw lastErr;
}

export const supabase = createClient<Database>(
  ENV.supabaseUrl || 'https://placeholder.supabase.co',
  ENV.supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    global: { fetch: resilientFetch },
  },
);

// Keep tokens fresh while the app is foregrounded; pause when backgrounded.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

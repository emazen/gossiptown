import { useCallback, useRef } from 'react';

import type { Author } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

/**
 * Realtime rows arrive without joins. Resolve author profiles by id with a
 * per-screen cache so we hit the network once per person.
 */
export function useAuthorCache() {
  const cache = useRef(new Map<string, Author>());

  const prime = useCallback((authors: (Author | null | undefined)[]) => {
    for (const a of authors) if (a) cache.current.set(a.id, a);
  }, []);

  const resolve = useCallback(async (ids: string[]): Promise<Map<string, Author>> => {
    const missing = [...new Set(ids)].filter((id) => !cache.current.has(id));
    if (missing.length) {
      const { data } = await supabase.from('profiles').select('id, nickname, avatar_hue, avatar_url').in('id', missing);
      for (const a of data ?? []) cache.current.set(a.id, a);
    }
    return cache.current;
  }, []);

  return { prime, resolve };
}

export const AUTHOR_SELECT = 'author:profiles!user_id(id, nickname, avatar_hue, avatar_url)';

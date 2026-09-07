import { useCallback, useEffect, useState } from 'react';

import { useAuthorCache, AUTHOR_SELECT } from '@/hooks/use-authors';
import type { Thread, ThreadWithAuthor } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

const PAGE = 30;

export function useThreads(neighborhoodId: string | null) {
  const [threads, setThreads] = useState<ThreadWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { prime, resolve } = useAuthorCache();

  const fetchPage = useCallback(
    async (before?: string) => {
      if (!neighborhoodId) return [] as ThreadWithAuthor[];
      let q = supabase
        .from('threads')
        .select(`*, ${AUTHOR_SELECT}`)
        .eq('neighborhood_id', neighborhoodId)
        .order('created_at', { ascending: false })
        .limit(PAGE);
      if (before) q = q.lt('created_at', before);
      const { data, error: err } = await q;
      if (err) throw err;
      const rows = (data ?? []) as unknown as ThreadWithAuthor[];
      prime(rows.map((r) => r.author));
      setHasMore(rows.length === PAGE);
      return rows;
    },
    [neighborhoodId, prime],
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      setThreads(await fetchPage());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || threads.length === 0) return;
    const last = threads[threads.length - 1];
    try {
      const more = await fetchPage(last.created_at);
      setThreads((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...more.filter((t) => !seen.has(t.id))];
      });
    } catch {
      // keep what we have
    }
  }, [fetchPage, hasMore, loading, threads]);

  // Realtime: new threads land at the top; reply_count bumps update in place.
  useEffect(() => {
    if (!neighborhoodId) return;
    const channel = supabase
      .channel(`threads:${neighborhoodId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'threads', filter: `neighborhood_id=eq.${neighborhoodId}` },
        async (payload) => {
          const row = payload.new as Thread;
          const authors = await resolve([row.user_id]);
          setThreads((prev) =>
            prev.some((t) => t.id === row.id) ? prev : [{ ...row, author: authors.get(row.user_id) ?? null }, ...prev],
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'threads', filter: `neighborhood_id=eq.${neighborhoodId}` },
        (payload) => {
          const row = payload.new as Thread;
          setThreads((prev) =>
            row.deleted_at
              ? prev.filter((t) => t.id !== row.id)
              : prev.map((t) => (t.id === row.id ? { ...t, ...row, author: t.author } : t)),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [neighborhoodId, resolve]);

  const remove = useCallback(async (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('threads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }, []);

  const hideAuthor = useCallback((authorId: string) => {
    setThreads((prev) => prev.filter((t) => t.user_id !== authorId));
  }, []);

  return { threads, loading, refreshing, hasMore, error, refresh, loadMore, remove, hideAuthor };
}

export async function createThread(neighborhoodId: string, userId: string, title: string, body: string | null) {
  const { data, error } = await supabase
    .from('threads')
    .insert({ neighborhood_id: neighborhoodId, user_id: userId, title, body })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

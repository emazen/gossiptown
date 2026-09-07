import { useCallback, useEffect, useState } from 'react';

import { useAuthorCache, AUTHOR_SELECT } from '@/hooks/use-authors';
import type { Message, MessageWithAuthor } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

const PAGE = 80;

export function useMessages(neighborhoodId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<MessageWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { prime, resolve } = useAuthorCache();

  // Initial load (newest first; list is inverted).
  useEffect(() => {
    if (!neighborhoodId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error: err } = await supabase
        .from('messages')
        .select(`*, ${AUTHOR_SELECT}`)
        .eq('neighborhood_id', neighborhoodId)
        .order('created_at', { ascending: false })
        .limit(PAGE);
      if (cancelled) return;
      if (err) setError(err.message);
      else {
        const rows = (data ?? []) as unknown as MessageWithAuthor[];
        prime(rows.map((r) => r.author));
        setMessages(rows);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId, prime]);

  // Realtime: new messages + soft deletes.
  useEffect(() => {
    if (!neighborhoodId) return;
    const channel = supabase
      .channel(`messages:${neighborhoodId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `neighborhood_id=eq.${neighborhoodId}` },
        async (payload) => {
          const row = payload.new as Message;
          const authors = await resolve([row.user_id]);
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [{ ...row, author: authors.get(row.user_id) ?? null }, ...prev],
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `neighborhood_id=eq.${neighborhoodId}` },
        (payload) => {
          const row = payload.new as Message;
          if (row.deleted_at) setMessages((prev) => prev.filter((m) => m.id !== row.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [neighborhoodId, resolve]);

  const send = useCallback(
    async (body: string) => {
      if (!neighborhoodId || !userId) throw new Error('no neighborhood');
      const { data, error: err } = await supabase
        .from('messages')
        .insert({ neighborhood_id: neighborhoodId, user_id: userId, body })
        .select(`*, ${AUTHOR_SELECT}`)
        .single();
      if (err) throw err;
      const row = data as unknown as MessageWithAuthor;
      // Optimistic-ish: realtime may also deliver it; dedupe by id.
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [row, ...prev]));
    },
    [neighborhoodId, userId],
  );

  const remove = useCallback(async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }, []);

  const hideAuthor = useCallback((authorId: string) => {
    setMessages((prev) => prev.filter((m) => m.user_id !== authorId));
  }, []);

  return { messages, loading, error, send, remove, hideAuthor };
}

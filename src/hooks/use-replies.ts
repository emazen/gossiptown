import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuthorCache, AUTHOR_SELECT } from '@/hooks/use-authors';
import type { Reply, ReplyWithAuthor, ThreadWithAuthor } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export function useThreadDetail(threadId: string, userId: string | null) {
  const [thread, setThread] = useState<ThreadWithAuthor | null>(null);
  const [replies, setReplies] = useState<ReplyWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { prime, resolve } = useAuthorCache();
  const deletedEarly = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, r] = await Promise.all([
        supabase.from('threads').select(`*, ${AUTHOR_SELECT}`).eq('id', threadId).is('deleted_at', null).maybeSingle(),
        supabase.from('replies').select(`*, ${AUTHOR_SELECT}`).eq('thread_id', threadId).is('deleted_at', null).order('created_at'),
      ]);
      if (cancelled) return;
      if (t.error || r.error) setError((t.error ?? r.error)!.message);
      const th = (t.data as unknown as ThreadWithAuthor | null) ?? null;
      const rs = (r.data ?? []) as unknown as ReplyWithAuthor[];
      prime([th?.author, ...rs.map((x) => x.author)]);
      setThread(th);
      setReplies(rs);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, prime]);

  useEffect(() => {
    const channel = supabase
      .channel(`replies:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'replies', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const row = payload.new as Reply;
          const authors = await resolve([row.user_id]);
          if (deletedEarly.current.has(row.id)) return;
          setReplies((prev) =>
            prev.some((x) => x.id === row.id) ? prev : [...prev, { ...row, author: authors.get(row.user_id) ?? null }],
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'replies', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const row = payload.new as Reply;
          if (row.deleted_at) {
            deletedEarly.current.add(row.id);
            setReplies((prev) => prev.filter((x) => x.id !== row.id));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, resolve]);

  const reply = useCallback(
    async (body: string) => {
      if (!userId) throw new Error('no user');
      const { data, error: err } = await supabase
        .from('replies')
        .insert({ thread_id: threadId, user_id: userId, body })
        .select(`*, ${AUTHOR_SELECT}`)
        .single();
      if (err) throw err;
      const row = data as unknown as ReplyWithAuthor;
      setReplies((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
      setThread((prev) => (prev ? { ...prev, reply_count: prev.reply_count + 1 } : prev));
    },
    [threadId, userId],
  );

  const removeReply = useCallback(async (id: string) => {
    setReplies((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('replies').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }, []);

  const hideAuthor = useCallback((authorId: string) => {
    setReplies((prev) => prev.filter((x) => x.user_id !== authorId));
  }, []);

  return { thread, replies, loading, error, reply, removeReply, hideAuthor };
}

import { useCallback, useEffect, useState } from 'react';

import type { Author, Conversation, DmMessage, MessageWithAuthor } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

const PAGE = 80;

/** Messages in one conversation, shaped like chat messages so MessageRow can render them. */
export function useDm(conversationId: string, userId: string | null) {
  const [peer, setPeer] = useState<Author | null>(null);
  const [messages, setMessages] = useState<MessageWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shape = useCallback(
    (m: DmMessage, me: Author | null, other: Author | null): MessageWithAuthor => ({
      id: m.id,
      neighborhood_id: m.conversation_id,
      user_id: m.sender_id,
      body: m.body,
      created_at: m.created_at,
      deleted_at: m.deleted_at,
      author: m.sender_id === userId ? me : other,
    }),
    [userId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [conv, msgs] = await Promise.all([
        supabase
          .from('conversations')
          .select('*, a:profiles!user_a(id, nickname, avatar_hue), b:profiles!user_b(id, nickname, avatar_hue)')
          .eq('id', conversationId)
          .maybeSingle(),
        supabase
          .from('dm_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(PAGE),
      ]);
      if (cancelled) return;
      if (conv.error || msgs.error) setError((conv.error ?? msgs.error)!.message);
      const c = conv.data as unknown as (Conversation & { a: Author | null; b: Author | null }) | null;
      const other = c ? (c.user_a === userId ? c.b : c.a) : null;
      const me = c ? (c.user_a === userId ? c.a : c.b) : null;
      setPeer(other);
      setMessages(((msgs.data ?? []) as DmMessage[]).map((m) => shape(m, me, other)));
      setLoading(false);
      supabase.rpc('mark_read', { p_conversation: conversationId }).then(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, userId, shape]);

  useEffect(() => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as DmMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const mine = prev.find((m) => m.user_id === userId)?.author ?? null;
            return [shape(row, mine, peer), ...prev];
          });
          if (row.sender_id !== userId) supabase.rpc('mark_read', { p_conversation: conversationId }).then(() => {});
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as DmMessage;
          if (row.deleted_at) setMessages((prev) => prev.filter((m) => m.id !== row.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, peer, shape]);

  const send = useCallback(
    async (body: string) => {
      if (!userId) throw new Error('no user');
      const { data, error: err } = await supabase
        .from('dm_messages')
        .insert({ conversation_id: conversationId, sender_id: userId, body })
        .select('*')
        .single();
      if (err) throw err;
      const row = data as DmMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev;
        const mine = prev.find((m) => m.user_id === userId)?.author ?? null;
        return [shape(row, mine, peer), ...prev];
      });
    },
    [conversationId, userId, peer, shape],
  );

  const remove = useCallback(async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await supabase.from('dm_messages').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }, []);

  return { peer, messages, loading, error, send, remove };
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { Author, Conversation, ConversationWithPeer } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

type Row = Conversation & {
  a: Author | null;
  b: Author | null;
  reads: { user_id: string; last_read_at: string }[];
};

const SELECT = `*, a:profiles!user_a(id, nickname, avatar_hue, avatar_url), b:profiles!user_b(id, nickname, avatar_hue, avatar_url), reads:conversation_reads(user_id, last_read_at)`;

function toView(row: Row, me: string): ConversationWithPeer | null {
  const peer = row.user_a === me ? row.b : row.a;
  if (!peer) return null;
  const myRead = row.reads.find((r) => r.user_id === me)?.last_read_at;
  const unread =
    !!row.last_message_at &&
    row.last_sender_id !== me &&
    (!myRead || new Date(myRead).getTime() < new Date(row.last_message_at).getTime());
  return { ...row, peer, unread };
}

type State = {
  conversations: ConversationWithPeer[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);

/**
 * Single source of truth for the DM inbox. One realtime subscription feeds
 * both the tab badge and the Mesajlar screen (two subscriptions to the same
 * channel name would throw in supabase-js).
 */
export function ConversationsProvider({ children }: PropsWithChildren) {
  const { userId } = useSession();
  const [items, setItems] = useState<ConversationWithPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await supabase
      .from('conversations')
      .select(SELECT)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (err) setError(err.message);
    else {
      const rows = (data ?? []) as unknown as Row[];
      setItems(rows.map((r) => toView(r, userId)).filter((x): x is ConversationWithPeer => x !== null));
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_reads' }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, reload]);

  const value = useMemo<State>(
    () => ({
      conversations: items,
      unreadCount: items.filter((c) => c.unread).length,
      loading,
      error,
      reload,
    }),
    [items, loading, error, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConversations(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error('useConversations outside ConversationsProvider');
  return v;
}

import { useCallback, useEffect, useState } from 'react';

import type { Author, Conversation, ConversationWithPeer } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

type Row = Conversation & {
  a: Author | null;
  b: Author | null;
  reads: { user_id: string; last_read_at: string }[];
};

const SELECT = `*, a:profiles!user_a(id, nickname, avatar_hue), b:profiles!user_b(id, nickname, avatar_hue), reads:conversation_reads(user_id, last_read_at)`;

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

/** All conversations for the current user, newest activity first, with unread flags. */
export function useConversations() {
  const { userId } = useSession();
  const [items, setItems] = useState<ConversationWithPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await supabase
      .from('conversations')
      .select(SELECT)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (err) setError(err.message);
    else {
      const rows = (data ?? []) as unknown as Row[];
      setItems(rows.map((r) => toView(r, userId)).filter((x): x is ConversationWithPeer => x !== null));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Any change to my conversations (new message preview, new conversation) → reload.
  // Filtered server-side by RLS; cheap because the list is small.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return { conversations: items, loading, error, reload: load };
}

/** Number of conversations with unread messages, for the tab badge. */
export function useUnreadCount(): number {
  const { conversations } = useConversations();
  return conversations.filter((c) => c.unread).length;
}

export async function startConversation(otherId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { p_other: otherId });
  if (error) throw error;
  return data as string;
}

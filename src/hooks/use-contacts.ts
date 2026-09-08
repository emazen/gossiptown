import { useCallback, useEffect, useState } from 'react';

import type { Author } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

export function useContacts() {
  const { userId } = useSession();
  const [contacts, setContacts] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('contacts')
      .select('created_at, person:profiles!contact_id(id, nickname, avatar_hue, avatar_url)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    setContacts(((data ?? []) as unknown as { person: Author | null }[]).map((r) => r.person).filter((p): p is Author => !!p));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return;
      setContacts((prev) => prev.filter((c) => c.id !== id));
      await supabase.from('contacts').delete().eq('owner_id', userId).eq('contact_id', id);
    },
    [userId],
  );

  return { contacts, loading, remove, reload: load };
}

export async function addContact(otherId: string): Promise<void> {
  const { error } = await supabase.rpc('add_contact', { p_other: otherId });
  if (error) throw error;
}

import { supabase } from '@/lib/supabase';

export { useConversations } from '@/providers/conversations';

export async function startConversation(otherId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { p_other: otherId });
  if (error) throw error;
  return data as string;
}

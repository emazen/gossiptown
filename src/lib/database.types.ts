/**
 * Hand-written to match supabase/migrations/0001_init.sql.
 * Regenerate later with: npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          avatar_hue: number;
          avatar_url: string | null;
          created_at: string;
          banned_at: string | null;
        };
        Insert: {
          id: string;
          nickname: string;
          avatar_hue?: number;
          avatar_url?: string | null;
          created_at?: string;
          banned_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      neighborhoods: {
        Row: {
          id: string;
          city: string;
          district: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          city: string;
          district: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['neighborhoods']['Insert']>;
        Relationships: [];
      };
      user_locations: {
        Row: {
          user_id: string;
          neighborhood_id: string;
          lat: number;
          lng: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          neighborhood_id: string;
          lat: number;
          lng: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_locations']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          neighborhood_id: string;
          user_id: string;
          body: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          neighborhood_id: string;
          user_id: string;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      threads: {
        Row: {
          id: string;
          neighborhood_id: string;
          user_id: string;
          title: string;
          body: string | null;
          reply_count: number;
          last_activity_at: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          neighborhood_id: string;
          user_id: string;
          title: string;
          body?: string | null;
          reply_count?: number;
          last_activity_at?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['threads']['Insert']>;
        Relationships: [];
      };
      replies: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string;
          body: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          thread_id: string;
          user_id: string;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['replies']['Insert']>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: 'message' | 'thread' | 'reply';
          target_id: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: 'message' | 'thread' | 'reply';
          target_id: string;
          reason: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [];
      };
      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['blocks']['Insert']>;
        Relationships: [];
      };
      contacts: {
        Row: { owner_id: string; contact_id: string; created_at: string };
        Insert: { owner_id: string; contact_id: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          created_at: string;
          last_message_at: string | null;
          last_message: string | null;
          last_sender_id: string | null;
        };
        Insert: {
          id?: string;
          user_a: string;
          user_b: string;
          created_at?: string;
          last_message_at?: string | null;
          last_message?: string | null;
          last_sender_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
        Relationships: [];
      };
      conversation_reads: {
        Row: { conversation_id: string; user_id: string; last_read_at: string };
        Insert: { conversation_id: string; user_id: string; last_read_at?: string };
        Update: Partial<Database['public']['Tables']['conversation_reads']['Insert']>;
        Relationships: [];
      };
      dm_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['dm_messages']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_location: {
        Args: { p_lat: number; p_lng: number; p_city: string; p_district: string };
        Returns: Database['public']['Tables']['neighborhoods']['Row'];
      };
      ensure_profile: {
        Args: { p_nickname: string; p_avatar_hue: number };
        Returns: Database['public']['Tables']['profiles']['Row'];
      };
      add_contact: { Args: { p_other: string }; Returns: undefined };
      start_conversation: { Args: { p_other: string }; Returns: string };
      mark_read: { Args: { p_conversation: string }; Returns: undefined };
      can_reach: { Args: { other: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Profile = Tables<'profiles'>;
export type Neighborhood = Tables<'neighborhoods'>;
export type Message = Tables<'messages'>;
export type Thread = Tables<'threads'>;
export type Reply = Tables<'replies'>;
export type Block = Tables<'blocks'>;
export type Conversation = Tables<'conversations'>;
export type DmMessage = Tables<'dm_messages'>;

export type ConversationWithPeer = Conversation & {
  peer: Author;
  unread: boolean;
};

/** Public shape of an author, joined onto content rows. */
export type Author = Pick<Profile, 'id' | 'nickname' | 'avatar_hue' | 'avatar_url'>;

export type MessageWithAuthor = Message & { author: Author | null };
export type ThreadWithAuthor = Thread & { author: Author | null };
export type ReplyWithAuthor = Reply & { author: Author | null };

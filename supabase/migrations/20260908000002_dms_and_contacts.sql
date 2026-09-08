-- Direct messages and contacts.
--
-- Contacts are one-directional "saved people": you can add anyone whose
-- content you can currently see (same neighborhood). Once saved, you can DM
-- them from anywhere. DMs otherwise require being in the same neighborhood.
-- Blocking someone also stops them from starting or continuing a DM with you.

create table public.contacts (
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  check (owner_id <> contact_id)
);

create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  user_a           uuid not null references public.profiles(id) on delete cascade,
  user_b           uuid not null references public.profiles(id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz,
  last_message     text,
  last_sender_id   uuid,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_a on public.conversations (user_a, last_message_at desc);
create index conversations_b on public.conversations (user_b, last_message_at desc);

-- Per-member read marker.
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.dm_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index dm_messages_conv_created on public.dm_messages (conversation_id, created_at desc);

-- ----------------------------------------------------------------- helpers
create or replace function public.is_member(conv uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
$$;

create or replace function public.other_member(conv uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select case when c.user_a = auth.uid() then c.user_b else c.user_a end
  from public.conversations c where c.id = conv
$$;

-- Can the caller reach `other`? Same neighborhood now, or saved as a contact.
create or replace function public.can_reach(other uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select other <> auth.uid()
    and not exists (select 1 from public.blocks where blocker_id = other and blocked_id = auth.uid())
    and not exists (select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = other)
    and (
      exists (select 1 from public.contacts where owner_id = auth.uid() and contact_id = other)
      or exists (select 1 from public.user_locations ul
                 where ul.user_id = other
                   and ul.neighborhood_id = public.my_neighborhood_id()
                   and ul.updated_at > now() - interval '24 hours')
    )
$$;

create or replace function public.add_contact(p_other uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_reach(p_other) then
    raise exception 'cannot add this user' using errcode = 'P0003';
  end if;
  insert into public.contacts (owner_id, contact_id) values (auth.uid(), p_other)
  on conflict do nothing;
end $$;

create or replace function public.start_conversation(p_other uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a uuid; b uuid; cid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_reach(p_other) then
    raise exception 'cannot message this user' using errcode = 'P0003';
  end if;
  a := least(auth.uid(), p_other); b := greatest(auth.uid(), p_other);
  insert into public.conversations (user_a, user_b) values (a, b)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into cid;
  insert into public.conversation_reads (conversation_id, user_id) values (cid, auth.uid())
  on conflict (conversation_id, user_id) do nothing;
  return cid;
end $$;

create or replace function public.mark_read(p_conversation uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_conversation) then raise exception 'not a member'; end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
end $$;

-- Keep conversation preview fresh, block check on every send.
create or replace function public.on_dm_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare other uuid;
begin
  if public.is_banned() then raise exception 'account suspended' using errcode = 'P0001'; end if;
  select public.other_member(new.conversation_id) into other;
  if exists (select 1 from public.blocks where blocker_id = other and blocked_id = new.sender_id) then
    raise exception 'cannot message this user' using errcode = 'P0003';
  end if;
  if (select count(*) from public.dm_messages
      where sender_id = new.sender_id and created_at > now() - interval '10 seconds') >= 8 then
    raise exception 'rate limited' using errcode = 'P0002';
  end if;
  return new;
end $$;
create trigger dm_messages_before before insert on public.dm_messages
  for each row execute function public.on_dm_insert();

create or replace function public.after_dm_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        last_message = left(new.body, 120),
        last_sender_id = new.sender_id
    where id = new.conversation_id;
  -- sender has read their own message
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (new.conversation_id, new.sender_id, new.created_at)
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
  return new;
end $$;
create trigger dm_messages_after after insert on public.dm_messages
  for each row execute function public.after_dm_insert();

-- --------------------------------------------------------------------- RLS
alter table public.contacts           enable row level security;
alter table public.conversations      enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.dm_messages        enable row level security;

create policy contacts_own_read   on public.contacts for select to authenticated using (owner_id = auth.uid());
create policy contacts_own_delete on public.contacts for delete to authenticated using (owner_id = auth.uid());
-- inserts go through add_contact()

create policy conversations_member on public.conversations for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

create policy reads_member on public.conversation_reads for select to authenticated
  using (public.is_member(conversation_id));

create policy dm_read on public.dm_messages for select to authenticated
  using (public.is_member(conversation_id) and (deleted_at is null or sender_id = auth.uid()));
create policy dm_insert on public.dm_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_member(conversation_id));
create policy dm_soft_delete on public.dm_messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

alter publication supabase_realtime add table public.dm_messages;
alter publication supabase_realtime add table public.conversations;

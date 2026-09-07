-- Third Place: hyperlocal gossip. Schema v1.
-- Run in Supabase SQL editor or via `supabase db push`.
--
-- Access model:
--   * Every user is an anonymous Supabase auth user.
--   * A user "is in" exactly one neighborhood: their row in user_locations,
--     verified within the last 24h. All reads/writes are scoped to it via RLS.
--   * Blocks hide the blocked user's content from the blocker.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 3 and 20),
  avatar_hue  int  not null default 0 check (avatar_hue between 0 and 9),
  created_at  timestamptz not null default now(),
  banned_at   timestamptz
);
create unique index profiles_nickname_ci on public.profiles (lower(nickname));

-- ----------------------------------------------------------- neighborhoods
-- Created lazily the first time someone is located in one.
create table public.neighborhoods (
  id          uuid primary key default gen_random_uuid(),
  city        text not null,
  district    text not null,
  name        text not null,
  slug        text not null unique,   -- e.g. istanbul/kadikoy/caferaga
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------- user_locations
create table public.user_locations (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id),
  lat             double precision not null,
  lng             double precision not null,
  updated_at      timestamptz not null default now()
);
create index user_locations_nb on public.user_locations (neighborhood_id);

-- ----------------------------------------------------------------- content
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references public.neighborhoods(id),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 500),
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index messages_nb_created on public.messages (neighborhood_id, created_at desc);

create table public.threads (
  id               uuid primary key default gen_random_uuid(),
  neighborhood_id  uuid not null references public.neighborhoods(id),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  title            text not null check (char_length(title) between 3 and 120),
  body             text check (body is null or char_length(body) <= 2000),
  reply_count      int  not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index threads_nb_created on public.threads (neighborhood_id, created_at desc);

create table public.replies (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.threads(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index replies_thread_created on public.replies (thread_id, created_at);

-- -------------------------------------------------------------- moderation
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('message','thread','reply')),
  target_id   uuid not null,
  reason      text not null,
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ----------------------------------------------------------------- helpers
-- The caller's current neighborhood, or null if unknown/stale.
create or replace function public.my_neighborhood_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select neighborhood_id
  from public.user_locations
  where user_id = auth.uid()
    and updated_at > now() - interval '24 hours'
$$;

create or replace function public.is_blocked(author uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where blocker_id = auth.uid() and blocked_id = author
  )
$$;

create or replace function public.is_banned()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select banned_at is not null from public.profiles where id = auth.uid()), false)
$$;

-- Upsert the caller's profile. Nickname uniqueness is case-insensitive.
create or replace function public.ensure_profile(p_nickname text, p_avatar_hue int)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  r public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.profiles (id, nickname, avatar_hue)
  values (auth.uid(), p_nickname, p_avatar_hue)
  on conflict (id) do update
    set nickname = excluded.nickname,
        avatar_hue = excluded.avatar_hue
  returning * into r;
  return r;
end $$;

create or replace function public.slugify_tr(t text)
returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(translate(t, 'İIıŞşĞğÜüÖöÇç', 'iiissgguuoocc')),
    '[^a-z0-9]+', '-', 'g'))
$$;

-- Register the caller's position. Creates the neighborhood if new.
-- TODO(server-side geocode): today the client sends the resolved names.
-- Move reverse geocoding into an Edge Function so a spoofed client can't
-- pick an arbitrary neighborhood; keep lat/lng here for that check.
create or replace function public.set_location(
  p_lat double precision, p_lng double precision,
  p_city text, p_district text, p_name text
)
returns public.neighborhoods
language plpgsql security definer set search_path = public as $$
declare
  v_slug text;
  nb public.neighborhoods;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile required';
  end if;
  if public.slugify_tr(p_city) not in ('istanbul','ankara','izmir') then
    raise exception 'unsupported city: %', p_city;
  end if;

  v_slug := public.slugify_tr(p_city) || '/' || public.slugify_tr(p_district) || '/' || public.slugify_tr(p_name);

  insert into public.neighborhoods (city, district, name, slug)
  values (p_city, p_district, p_name, v_slug)
  on conflict (slug) do update set city = excluded.city  -- no-op to return row
  returning * into nb;

  insert into public.user_locations (user_id, neighborhood_id, lat, lng, updated_at)
  values (auth.uid(), nb.id, p_lat, p_lng, now())
  on conflict (user_id) do update
    set neighborhood_id = excluded.neighborhood_id,
        lat = excluded.lat, lng = excluded.lng, updated_at = now();

  return nb;
end $$;


-- ------------------------------------------------------------ rate limits
create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
  win interval;
  max_n int;
begin
  if public.is_banned() then
    raise exception 'account suspended' using errcode = 'P0001';
  end if;
  if tg_table_name = 'messages' then win := interval '10 seconds'; max_n := 5;
  elsif tg_table_name = 'replies' then win := interval '30 seconds'; max_n := 5;
  else win := interval '10 minutes'; max_n := 3; end if;

  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - $2', tg_table_name)
    into n using new.user_id, win;
  if n >= max_n then
    raise exception 'rate limited' using errcode = 'P0002';
  end if;
  return new;
end $$;

create trigger messages_rate before insert on public.messages
  for each row execute function public.enforce_rate_limit();
create trigger threads_rate before insert on public.threads
  for each row execute function public.enforce_rate_limit();
create trigger replies_rate before insert on public.replies
  for each row execute function public.enforce_rate_limit();

-- Keep thread counters fresh.
create or replace function public.bump_thread()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.threads
    set reply_count = reply_count + 1, last_activity_at = new.created_at
    where id = new.thread_id;
  return new;
end $$;
create trigger replies_bump after insert on public.replies
  for each row execute function public.bump_thread();

-- --------------------------------------------------------------------- RLS
alter table public.profiles       enable row level security;
alter table public.neighborhoods  enable row level security;
alter table public.user_locations enable row level security;
alter table public.messages       enable row level security;
alter table public.threads        enable row level security;
alter table public.replies        enable row level security;
alter table public.reports        enable row level security;
alter table public.blocks         enable row level security;

-- profiles: anyone signed in can read public fields; only owner writes (via rpc).
create policy profiles_read on public.profiles for select to authenticated using (true);

-- neighborhoods: readable; written only by set_location().
create policy neighborhoods_read on public.neighborhoods for select to authenticated using (true);

-- user_locations: owner only.
create policy user_locations_own on public.user_locations for select to authenticated
  using (user_id = auth.uid());

-- messages
create policy messages_read on public.messages for select to authenticated
  using (neighborhood_id = public.my_neighborhood_id()
         and deleted_at is null
         and not public.is_blocked(user_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (user_id = auth.uid() and neighborhood_id = public.my_neighborhood_id());
create policy messages_soft_delete on public.messages for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- threads
create policy threads_read on public.threads for select to authenticated
  using (neighborhood_id = public.my_neighborhood_id()
         and deleted_at is null
         and not public.is_blocked(user_id));
create policy threads_insert on public.threads for insert to authenticated
  with check (user_id = auth.uid() and neighborhood_id = public.my_neighborhood_id());
create policy threads_soft_delete on public.threads for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- replies: visible if the parent thread is visible.
create policy replies_read on public.replies for select to authenticated
  using (deleted_at is null
         and not public.is_blocked(user_id)
         and exists (select 1 from public.threads t
                     where t.id = thread_id and t.neighborhood_id = public.my_neighborhood_id()
                       and t.deleted_at is null));
create policy replies_insert on public.replies for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.threads t
                          where t.id = thread_id and t.neighborhood_id = public.my_neighborhood_id()
                            and t.deleted_at is null));
create policy replies_soft_delete on public.replies for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: write-only for users.
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- blocks: owner manages own list.
create policy blocks_own_read on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy blocks_own_insert on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_own_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.threads;
alter publication supabase_realtime add table public.replies;

-- Enable anonymous sign-ins in Dashboard → Authentication → Providers → Anonymous.

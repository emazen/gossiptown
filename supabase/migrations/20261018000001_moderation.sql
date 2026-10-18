-- Known gap 2: moderation tooling.
--
-- * moderators: who may review reports. Grant by hand in the SQL editor:
--     insert into public.moderators (user_id) values ('<profile id>');
-- * Reports get a status, and DMs can be reported too.
-- * Auto-hide: content reported by AUTO_HIDE_REPORTS distinct people is hidden
--   from everyone but its author until a moderator decides. This keeps the
--   "we act within 24h" promise honest at night.
-- * moderation_queue() / moderate(): security definer RPCs, moderators only.

-- ------------------------------------------------------------- moderators
create table public.moderators (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.moderators enable row level security;
-- No policies: only security definer functions read it.

create or replace function public.is_moderator()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderators where user_id = auth.uid())
$$;

-- ---------------------------------------------------------------- reports
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('message','thread','reply','dm'));
alter table public.reports
  add column status      text not null default 'open'
                         check (status in ('open','actioned','dismissed')),
  add column resolved_at timestamptz,
  add column resolved_by uuid references public.profiles(id) on delete set null;
create index reports_open on public.reports (target_type, target_id) where status = 'open';

-- Only report what you can see: content in your room, or a DM you are in.
drop policy reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'open'
    and case target_type
      when 'message' then exists (select 1 from public.messages m where m.id = target_id)
      when 'thread'  then exists (select 1 from public.threads t where t.id = target_id)
      when 'reply'   then exists (select 1 from public.replies r where r.id = target_id)
      when 'dm'      then exists (select 1 from public.dm_messages d where d.id = target_id)
    end
  );

-- ------------------------------------------------------------ hidden_at
alter table public.messages    add column hidden_at timestamptz;
alter table public.threads     add column hidden_at timestamptz;
alter table public.replies     add column hidden_at timestamptz;
alter table public.dm_messages add column hidden_at timestamptz;

-- Hidden rows stay visible to their author (they are not told), like deleted ones.
drop policy messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (neighborhood_id = public.my_neighborhood_id()
         and ((deleted_at is null and hidden_at is null) or user_id = auth.uid())
         and not public.is_blocked(user_id));

drop policy threads_read on public.threads;
create policy threads_read on public.threads for select to authenticated
  using (neighborhood_id = public.my_neighborhood_id()
         and ((deleted_at is null and hidden_at is null) or user_id = auth.uid())
         and not public.is_blocked(user_id));

drop policy replies_read on public.replies;
create policy replies_read on public.replies for select to authenticated
  using (((deleted_at is null and hidden_at is null) or user_id = auth.uid())
         and not public.is_blocked(user_id)
         and exists (select 1 from public.threads t
                     where t.id = thread_id and t.neighborhood_id = public.my_neighborhood_id()
                       and t.deleted_at is null
                       and (t.hidden_at is null or t.user_id = auth.uid())));

drop policy dm_read on public.dm_messages;
create policy dm_read on public.dm_messages for select to authenticated
  using (public.is_member(conversation_id)
         and ((deleted_at is null and hidden_at is null) or sender_id = auth.uid()));

-- ------------------------------------------------------------- auto-hide
create or replace function public.auto_hide_reported()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  auto_hide_reports constant int := 3;
  n int;
begin
  select count(distinct reporter_id) into n from public.reports
    where target_type = new.target_type and target_id = new.target_id and status = 'open';
  if n < auto_hide_reports then return new; end if;

  case new.target_type
    when 'message' then update public.messages    set hidden_at = now() where id = new.target_id and hidden_at is null;
    when 'thread'  then update public.threads     set hidden_at = now() where id = new.target_id and hidden_at is null;
    when 'reply'   then update public.replies     set hidden_at = now() where id = new.target_id and hidden_at is null;
    when 'dm'      then update public.dm_messages set hidden_at = now() where id = new.target_id and hidden_at is null;
  end case;
  return new;
end $$;

create trigger reports_auto_hide after insert on public.reports
  for each row execute function public.auto_hide_reported();

-- ------------------------------------------------------- moderation_queue
-- One row per reported item with open reports, oldest first (the 24h clock).
create or replace function public.moderation_queue()
returns table (
  target_type      text,
  target_id        uuid,
  report_count     int,
  reasons          text[],
  first_reported_at timestamptz,
  author_id        uuid,
  author_nickname  text,
  author_avatar_hue int,
  author_avatar_url text,
  author_banned    boolean,
  room             text,
  title            text,
  body             text,
  created_at       timestamptz,
  hidden           boolean,
  deleted          boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_moderator() then
    raise exception 'moderators only' using errcode = '42501';
  end if;

  return query
  with open_reports as (
    select r.target_type, r.target_id,
           count(*)::int as report_count,
           array_agg(distinct r.reason order by r.reason) as reasons,
           min(r.created_at) as first_reported_at
    from public.reports r
    where r.status = 'open'
    group by r.target_type, r.target_id
  ),
  content as (
    select 'message'::text as target_type, m.id, m.user_id, m.neighborhood_id, null::text as title,
           m.body, m.created_at, m.hidden_at, m.deleted_at
      from public.messages m join open_reports o on o.target_type = 'message' and o.target_id = m.id
    union all
    select 'thread', t.id, t.user_id, t.neighborhood_id, t.title, t.body, t.created_at, t.hidden_at, t.deleted_at
      from public.threads t join open_reports o on o.target_type = 'thread' and o.target_id = t.id
    union all
    select 'reply', r.id, r.user_id, t.neighborhood_id, t.title, r.body, r.created_at, r.hidden_at, r.deleted_at
      from public.replies r join public.threads t on t.id = r.thread_id
      join open_reports o on o.target_type = 'reply' and o.target_id = r.id
    union all
    select 'dm', d.id, d.sender_id, null::uuid, null::text, d.body, d.created_at, d.hidden_at, d.deleted_at
      from public.dm_messages d join open_reports o on o.target_type = 'dm' and o.target_id = d.id
  )
  select o.target_type, o.target_id, o.report_count, o.reasons, o.first_reported_at,
         p.id, p.nickname, p.avatar_hue, p.avatar_url, p.banned_at is not null,
         nb.name, c.title, c.body, c.created_at,
         c.hidden_at is not null, c.deleted_at is not null
  from open_reports o
  join content c on c.target_type = o.target_type and c.id = o.target_id
  join public.profiles p on p.id = c.user_id
  left join public.neighborhoods nb on nb.id = c.neighborhood_id
  order by o.first_reported_at;
end $$;

-- --------------------------------------------------------------- moderate
-- p_action:
--   remove        delete the content (soft delete), close its reports
--   ban           remove + suspend the author (inserts fail with P0001)
--   remove_avatar clear the author's photo, close the reports, keep content
--   dismiss       unhide the content, close its reports as dismissed
create or replace function public.moderate(p_target_type text, p_target_id uuid, p_action text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  if not public.is_moderator() then
    raise exception 'moderators only' using errcode = '42501';
  end if;
  if p_action not in ('remove','ban','remove_avatar','dismiss') then
    raise exception 'unknown action: %', p_action using errcode = '22023';
  end if;

  case p_target_type
    when 'message' then select user_id   into v_author from public.messages    where id = p_target_id;
    when 'thread'  then select user_id   into v_author from public.threads     where id = p_target_id;
    when 'reply'   then select user_id   into v_author from public.replies     where id = p_target_id;
    when 'dm'      then select sender_id into v_author from public.dm_messages where id = p_target_id;
    else raise exception 'unknown target type: %', p_target_type using errcode = '22023';
  end case;
  if v_author is null then
    raise exception 'content not found' using errcode = 'P0005';
  end if;

  if p_action in ('remove','ban') then
    case p_target_type
      when 'message' then update public.messages    set deleted_at = coalesce(deleted_at, now()) where id = p_target_id;
      when 'thread'  then update public.threads     set deleted_at = coalesce(deleted_at, now()) where id = p_target_id;
      when 'reply'   then update public.replies     set deleted_at = coalesce(deleted_at, now()) where id = p_target_id;
      when 'dm'      then update public.dm_messages set deleted_at = coalesce(deleted_at, now()) where id = p_target_id;
    end case;
  elsif p_action = 'dismiss' then
    case p_target_type
      when 'message' then update public.messages    set hidden_at = null where id = p_target_id;
      when 'thread'  then update public.threads     set hidden_at = null where id = p_target_id;
      when 'reply'   then update public.replies     set hidden_at = null where id = p_target_id;
      when 'dm'      then update public.dm_messages set hidden_at = null where id = p_target_id;
    end case;
  end if;

  if p_action = 'ban' then
    update public.profiles set banned_at = coalesce(banned_at, now()) where id = v_author;
  elsif p_action = 'remove_avatar' then
    -- The file stays in storage at a guessable path until the user uploads a new one.
    update public.profiles set avatar_url = null where id = v_author;
  end if;

  update public.reports
    set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end,
        resolved_at = now(),
        resolved_by = auth.uid()
    where target_type = p_target_type and target_id = p_target_id and status = 'open';
end $$;

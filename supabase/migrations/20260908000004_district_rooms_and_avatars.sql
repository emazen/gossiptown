-- 1) Rooms are now ilçe (district), not mahalle. Geocoders disagree on
--    neighborhood names across platforms; districts are stable, and bigger
--    rooms beat the cold-start problem. The table keeps its name; `name`
--    now holds the canonical district name and `district` mirrors it.
-- 2) Canonical district list for the three launch cities. set_location only
--    accepts real districts, so a spoofed client cannot invent rooms.
-- 3) Profile pictures: profiles.avatar_url + a public `avatars` bucket.

-- ------------------------------------------------------------ districts
create table public.districts (
  city_slug text not null,
  slug      text not null,
  city      text not null,
  name      text not null,
  primary key (city_slug, slug)
);
alter table public.districts enable row level security;
create policy districts_read on public.districts for select to authenticated using (true);

insert into public.districts (city_slug, city, slug, name)
select 'istanbul', 'İstanbul', public.slugify_tr(n), n from unnest(array[
  'Adalar','Arnavutköy','Ataşehir','Avcılar','Bağcılar','Bahçelievler','Bakırköy','Başakşehir',
  'Bayrampaşa','Beşiktaş','Beykoz','Beylikdüzü','Beyoğlu','Büyükçekmece','Çatalca','Çekmeköy',
  'Esenler','Esenyurt','Eyüpsultan','Fatih','Gaziosmanpaşa','Güngören','Kadıköy','Kağıthane',
  'Kartal','Küçükçekmece','Maltepe','Pendik','Sancaktepe','Sarıyer','Silivri','Sultanbeyli',
  'Sultangazi','Şile','Şişli','Tuzla','Ümraniye','Üsküdar','Zeytinburnu']) as n
union all
select 'ankara', 'Ankara', public.slugify_tr(n), n from unnest(array[
  'Akyurt','Altındağ','Ayaş','Bala','Beypazarı','Çamlıdere','Çankaya','Çubuk','Elmadağ',
  'Etimesgut','Evren','Gölbaşı','Güdül','Haymana','Kahramankazan','Kalecik','Keçiören',
  'Kızılcahamam','Mamak','Nallıhan','Polatlı','Pursaklar','Sincan','Şereflikoçhisar','Yenimahalle']) as n
union all
select 'izmir', 'İzmir', public.slugify_tr(n), n from unnest(array[
  'Aliağa','Balçova','Bayındır','Bayraklı','Bergama','Beydağ','Bornova','Buca','Çeşme','Çiğli',
  'Dikili','Foça','Gaziemir','Güzelbahçe','Karabağlar','Karaburun','Karşıyaka','Kemalpaşa','Kınık',
  'Kiraz','Konak','Menderes','Menemen','Narlıdere','Ödemiş','Seferihisar','Selçuk','Tire','Torbalı','Urla']) as n;

-- Geocoders sometimes return older names.
create table public.district_aliases (
  city_slug text not null,
  alias     text not null,
  slug      text not null,
  primary key (city_slug, alias)
);
alter table public.district_aliases enable row level security;
insert into public.district_aliases values
  ('istanbul', 'eyup', 'eyupsultan'),
  ('ankara', 'kazan', 'kahramankazan');

-- ------------------------------------------------------- set_location v2
drop function public.set_location(double precision, double precision, text, text, text);

create or replace function public.set_location(
  p_lat double precision, p_lng double precision,
  p_city text, p_district text
)
returns public.neighborhoods
language plpgsql security definer set search_path = public as $$
declare
  v_city_slug text;
  v_dist_slug text;
  d public.districts;
  nb public.neighborhoods;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile required';
  end if;

  v_city_slug := public.slugify_tr(p_city);
  if v_city_slug not in ('istanbul','ankara','izmir') then
    raise exception 'unsupported city: %', p_city using errcode = 'P0004';
  end if;

  v_dist_slug := public.slugify_tr(p_district);
  select a.slug into v_dist_slug from public.district_aliases a
    where a.city_slug = v_city_slug and a.alias = v_dist_slug;
  if not found then v_dist_slug := public.slugify_tr(p_district); end if;

  select * into d from public.districts where city_slug = v_city_slug and slug = v_dist_slug;
  if not found then
    raise exception 'unknown district: %', p_district using errcode = 'P0004';
  end if;

  insert into public.neighborhoods (city, district, name, slug)
  values (d.city, d.name, d.name, d.city_slug || '/' || d.slug)
  on conflict (slug) do update set city = excluded.city
  returning * into nb;

  insert into public.user_locations (user_id, neighborhood_id, lat, lng, updated_at)
  values (auth.uid(), nb.id, p_lat, p_lng, now())
  on conflict (user_id) do update
    set neighborhood_id = excluded.neighborhood_id,
        lat = excluded.lat, lng = excluded.lng, updated_at = now();

  return nb;
end $$;

-- ------------------------------------- migrate existing mahalle rooms → ilçe
do $$
declare
  old record;
  d public.districts;
  new_id uuid;
begin
  for old in select * from public.neighborhoods where slug like '%/%/%' loop
    select * into d from public.districts
      where city_slug = split_part(old.slug, '/', 1) and slug = split_part(old.slug, '/', 2);
    if not found then continue; end if;
    insert into public.neighborhoods (city, district, name, slug)
      values (d.city, d.name, d.name, d.city_slug || '/' || d.slug)
      on conflict (slug) do update set city = excluded.city
      returning id into new_id;
    update public.threads        set neighborhood_id = new_id where neighborhood_id = old.id;
    update public.messages       set neighborhood_id = new_id where neighborhood_id = old.id;
    update public.user_locations set neighborhood_id = new_id where neighborhood_id = old.id;
    delete from public.neighborhoods where id = old.id;
  end loop;
end $$;

-- ---------------------------------------------------------------- avatars
alter table public.profiles add column avatar_url text;

create policy profiles_own_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Each user owns the folder avatars/<uid>/.
create policy avatars_public_read on storage.objects for select to public
  using (bucket_id = 'avatars');
create policy avatars_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

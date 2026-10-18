# Gossiptown

Hyperlocal anonymous gossip app for Turkey (formerly named "Third Place"; renamed 2026-10-18 because Emre's unrelated Swift meeting app in `~/Desktop/thirdplace` uses that name. Never touch that folder from here). Users only see the room for the **ilçe (district)** they are physically in. Launch cities: İstanbul, Ankara, İzmir. UI is Turkish. Owner: Emre (emre.e@playablefactory.com). Repo: https://github.com/emazen/gossiptown (push straight to `main`; no `gh` CLI on this Mac, no Homebrew).

## Stack

- **Expo 57** + **expo-router** (native tabs via `expo-router/unstable-native-tabs`), React Native 0.86, TypeScript strict. Read https://docs.expo.dev/versions/v57.0.0/ before using unfamiliar Expo APIs; the SDK has changed a lot.
- **Supabase**: anonymous auth, Postgres with RLS, Realtime (postgres_changes), Storage. No custom server. **RLS is the security boundary, not the client.**
- Runs in **Expo Go** (no native build needed yet). All native modules used are in Expo Go.

## Commands

```bash
npm run typecheck                      # tsc --noEmit — run before finishing any change
npx expo start                         # Metro; press i for iOS simulator
npx supabase db push --yes             # apply new files in supabase/migrations/ to the live project
npx supabase config push --yes         # push supabase/config.toml (auth settings) to the live project
```

`db push` needs the DB password: `export SUPABASE_DB_PASSWORD=$(cat supabase/.db-password)` (file is gitignored). The CLI is already logged in and linked to project ref `dkawopxnggmfgonderbz` (org "Third Place", project "third-place": old names, left as they are; region eu-central-1, free plan). Dashboard: https://supabase.com/dashboard/project/dkawopxnggmfgonderbz

`.env` (gitignored, already filled) holds `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (a `sb_publishable_…` key), and `EXPO_PUBLIC_MOCK_LOCATION=40.9906,29.0270` (Kadıköy) because simulators sit in Cupertino. Only `EXPO_PUBLIC_*` vars are bundled.

## Layout

```
src/app/                 expo-router routes
  _layout.tsx            providers + Gate: onboarding vs app (Stack.Protected)
  onboarding.tsx         step 1 nickname (creates profile), step 2 location (registers room)
  (tabs)/_layout.tsx     NativeTabs: index (Konular), chat (Canlı), dms (Mesajlar), me (Ben)
  (tabs)/index.tsx       thread feed, newest first, FAB → /thread/new
  (tabs)/chat.tsx        live chat (inverted FlatList)
  (tabs)/dms.tsx         DM inbox
  (tabs)/me.tsx          profile: avatar upload, room, blocked list, sign out
  thread/[id].tsx        thread + replies      thread/new.tsx  compose modal
  dm/[id].tsx            1:1 chat              contacts.tsx    saved people
  moderation.tsx         moderator queue (entry card on the Ben tab, shown only to moderators)
src/providers/           session (anon auth + profile), neighborhood (location → room), conversations (DM inbox, single realtime sub)
src/hooks/               use-messages / use-threads / use-replies / use-dm / use-contacts / use-content-actions (long-press menu) / use-authors (profile cache)
src/lib/                 supabase client, database.types (hand-written), geo (GPS coords; geocode only for the "not here yet" city name), avatar (upload), profanity (doxxing filter), errors, nickname, time
src/constants/           theme.ts (colors, Display fonts, Type scale, spacing), strings.ts (ALL user-facing copy)
src/components/          Screen, ScreenHeader (display masthead), NeighborhoodHeader, Avatar, Composer, MessageRow, ThreadCard (feed row), Button, EmptyState
supabase/migrations/     schema history, applied in order; never edit an applied file, add a new one
supabase/config.toml     local Supabase config (anonymous sign-ins enabled)
```

## Conventions

- **Design: tabloid energy on a premium base.** Warm cream paper and ink for the layout; Bricolage Grotesque (loaded in `_layout.tsx`) for display text via `Type.display/headline/title/name/aside`, system font for body/UI. `accent` is lipstick red: primary buttons, the Yeni konu button, my chat bubbles, reply counts, the selected tab. `highlight` is highlighter yellow for things worth a look: the place chip, the "Gündemde" tag (2+ replies, last one within 24h), the onboarding wordmark. Avatars use candy tones. Feeds are hairline-separated rows, not cards; settings-style screens use inset grouped lists. No uppercase tracked labels, no green checkmarks. Display text styles must not set `fontWeight` (the weight is the font file).
- **Copy lives in `src/constants/strings.ts`.** Never inline Turkish strings in screens. Tone is casual and a bit cheeky.
- **Every new table gets RLS + policies in the same migration.** Reads/writes on room content must check `public.my_neighborhood_id()` (null if the user's location is older than 24h). Blocked authors are filtered in RLS via `public.is_blocked()`.
- **Writes that need cross-row checks go through `security definer` RPCs** (`ensure_profile`, `set_location`, `start_conversation`, `add_contact`, `mark_read`, `moderate`). Plain inserts are fine when RLS `with check` suffices.
- **Soft delete** = set `deleted_at`. Owners can read their own deleted rows (PostgREST RETURNs the updated row, so it must pass SELECT). Queries therefore filter `.is('deleted_at', null)` explicitly.
- **Realtime handlers**: an INSERT handler awaits an author lookup; an UPDATE for the same row can arrive in that window. Keep the newest payload per id (see `latest` ref in `use-threads.ts`) or the list goes stale. Never open two channels with the same topic name in the same client (supabase-js throws); share via a provider instead.
- **Author joins** use `AUTHOR_SELECT` from `use-authors.ts`. When adding a profile field, add it there and in every `profiles!…(id, nickname, avatar_hue, avatar_url)` select (grep for `avatar_hue`).
- **`database.types.ts` is hand-written.** Update it with every migration. (Or regenerate: `npx supabase gen types typescript --linked > src/lib/database.types.ts` and re-add the helper types at the bottom.)
- Tab screens render inside `<Screen>` which pads top AND bottom safe areas; on iOS the bottom inset already includes the native tab bar. Absolutely-positioned things (FAB) use `useSafeAreaInsets().bottom`.
- Errors from Supabase are objects, not `Error` instances. Use `friendlyError()` for UI and `errorMessage()` for logs. Custom Postgres errcodes: `P0001` banned, `P0002` rate limited, `P0003` cannot reach user (DM/contact), `P0004` unsupported city/district, `P0005` moderation target not found.

## Domain rules (as implemented)

- Rooms are districts. `set_location(p_lat, p_lng)` picks the district **server-side** with PostGIS: `ST_Covers` against `public.districts.geom` (OSM boundaries of all 94 districts, simplified ~10 m), else the nearest district within 1 km (coastline jitter), else `P0004` → client shows "not here yet". The client never sends a district name. `districts.geom` is not granted to clients (column grant). The `neighborhoods` table kept its name; `name` and `district` both hold the district.
- To refresh boundaries: Overpass `rel(area)["boundary"="administrative"]["admin_level"="6"]` inside the three admin_level=4 provinces, `osmtogeojson`, `mapshaper -simplify interval=10 keep-shapes -clean`, then a new migration that updates `districts.geom` (see `20261018000000_server_side_district.sql`). PostGIS lives in the `extensions` schema.
- Location is re-verified on foreground after 30 min (`STALE_MS`). Server treats locations older than 24h as unknown.
- Rate limits are Postgres triggers: messages 5/10s, replies 5/30s, threads 3/10min, DMs 8/10s.
- DMs: allowed when the two users are in the same room now, or the sender saved the recipient as a contact. Blocks stop DMs both ways. Contacts are one-directional (a saved list, not friend requests).
- Moderation: anyone can report content they can see (room content and DMs they are in); reasons live in `S.report.reasons`. Content reported by **3 distinct users** gets `hidden_at` set by a trigger: hidden from everyone except its author (shadow-hide) until reviewed. Moderators (rows in `public.moderators`, granted by hand in the SQL editor) see the Moderasyon card on the Ben tab; `moderation_queue()` lists items with open reports oldest-first (red border after 24h) and `moderate(type, id, action)` does `remove` / `ban` (remove + `profiles.banned_at`) / `remove_avatar` / `dismiss` (unhide). Every read policy on content checks `hidden_at is null` alongside `deleted_at is null`.
- Moderators today: `EfsaneMuhtar40` (`bd55c4c3-8ecd-44a3-af53-8c50dcd54a59`, the simulator account). Add Emre's phone account the same way. Support contact is `SUPPORT_EMAIL` in `src/lib/env.ts`.
- Avatars: bucket `avatars`, public read, each user writes only `avatars/<uid>/…`, 2 MB, jpeg/png/webp. Path is `<uid>/avatar.jpg`, URL cache-busted with `?v=`.

## Verifying changes

- Backend: curl the REST API with a user JWT. Get one with `POST /auth/v1/signup` body `{"data":{}}` (anonymous). Test accounts already in the Kadıköy room: `SmokeTestKedi01` (id `3565cc80-5a53-43a7-b280-56eeb5fa4c57`) and `MeraklıMartı77` (id `9b3bc2b1-79b1-4994-8b59-4d47fdac4590`). Their tokens expire hourly; sign in fresh ones as needed.
- Realtime: a node script with `@supabase/supabase-js` subscribing with a user token is the fastest way to prove delivery (see git history of the race fix).
- App: run it on the **iPhone 16** simulator (`01AE657D-3993-4643-ABBD-D3BC890130D0`); the iPhone 16 Pro belongs to the other app. If requests from the simulator keep failing with "network connection was lost", Tailscale is probably on. Metro is started via `.claude/launch.json` (`expo-ios`). If the Claude simulator panel is not granted, `xcrun simctl io booted screenshot x.png` works for looking, and `xcrun simctl terminate booted host.exp.Exponent && xcrun simctl openurl booted exp://<lan-ip>:8081` forces a full reload. Grant Expo Go location with `xcrun simctl privacy booted grant location host.exp.Exponent`.
- Web (`localhost:8081`) renders but cannot reverse-geocode, so it stops at the location step.

## Decisions log

- 2026-09-07: Expo + Supabase, no custom backend; anonymous auth to kill onboarding friction; persistent pseudonyms (not per-thread anon) so blocking and DMs work.
- 2026-09-08: DMs + contacts added at Emre's request. Rooms switched from mahalle to ilçe (Emre's call, "option 1") because Apple/Google disagree on mahalle names and bigger rooms fix cold start. Profile pictures added.
- 2026-10-18: Renamed Third Place → Gossiptown and redesigned the UI away from the generic pink-card look: first as an editorial serif "mahalle gazetesi", then (Emre: needs more color, it's a gossip app) to Bricolage Grotesque with lipstick red and highlighter yellow on the same paper base.
- 2026-10-18: Moderation lives in the app for moderators (not a separate dashboard) and auto-hides at 3 reports, so one person can keep the 24h promise from a phone.
- 2026-10-18: Server-side district lookup with PostGIS polygons in Postgres instead of an Edge Function: no extra service, no geocoding API key or quota, and the check runs inside `set_location`'s transaction.

## Not done yet / known gaps

1. ~~Location spoofing~~ fixed 2026-10-18: the server derives the district from lat/lng. Remaining: a client can still send fake coordinates (GPS spoofing); needs App Attest / Play Integrity, not urgent pre-launch.
2. **Moderation** (in-app queue, auto-hide, bans, 24h promise and contact on the Ben tab) done 2026-10-18. Remaining: nobody is notified when a report comes in (open the app to check; a Slack/email alert via a DB webhook would make the 24h promise safe); `remove_avatar` clears `avatar_url` but the file stays at its public path until the user uploads another; avatars are not scanned on upload; no full terms page to link from onboarding.
3. **No push notifications** (DM replies, thread replies). Expo Notifications + a DB webhook/Edge Function.
4. **No account linking**: anonymous accounts die with the app install. Add Apple/Google sign-in linking before launch.
5. **Realtime soft-deletes by others** don't propagate (the deleted row fails their SELECT policy); they see it on next load. Acceptable for now.
6. Placeholder icon/splash. Bundle id `com.gossiptown.app` is a placeholder too.
7. Unread badge on the Mesajlar tab uses `NativeTabs.Trigger.Badge`; verify it renders on Android.

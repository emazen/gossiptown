# Third Place

Hyperlocal anonymous gossip app for Turkey. Users only see the room for the **ilçe (district)** they are physically in. Launch cities: İstanbul, Ankara, İzmir. UI is Turkish. Owner: Emre (emre.e@playablefactory.com). Repo: https://github.com/emazen/gossiptown (push straight to `main`; no `gh` CLI on this Mac, no Homebrew).

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

`db push` needs the DB password: `export SUPABASE_DB_PASSWORD=$(cat supabase/.db-password)` (file is gitignored). The CLI is already logged in and linked to project ref `dkawopxnggmfgonderbz` (org "Third Place", region eu-central-1, free plan). Dashboard: https://supabase.com/dashboard/project/dkawopxnggmfgonderbz

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
src/providers/           session (anon auth + profile), neighborhood (location → room), conversations (DM inbox, single realtime sub)
src/hooks/               use-messages / use-threads / use-replies / use-dm / use-contacts / use-content-actions (long-press menu) / use-authors (profile cache)
src/lib/                 supabase client, database.types (hand-written), geo (geocode → il/ilçe), avatar (upload), profanity (doxxing filter), errors, nickname, time
src/constants/           theme.ts (tokens, dark-first), strings.ts (ALL user-facing copy)
src/components/          Screen, Avatar, Composer, MessageRow, ThreadCard, Button, EmptyState, NeighborhoodHeader
supabase/migrations/     schema history, applied in order; never edit an applied file, add a new one
supabase/config.toml     local Supabase config (anonymous sign-ins enabled)
```

## Conventions

- **Copy lives in `src/constants/strings.ts`.** Never inline Turkish strings in screens. Tone is casual and a bit cheeky.
- **Every new table gets RLS + policies in the same migration.** Reads/writes on room content must check `public.my_neighborhood_id()` (null if the user's location is older than 24h). Blocked authors are filtered in RLS via `public.is_blocked()`.
- **Writes that need cross-row checks go through `security definer` RPCs** (`ensure_profile`, `set_location`, `start_conversation`, `add_contact`, `mark_read`). Plain inserts are fine when RLS `with check` suffices.
- **Soft delete** = set `deleted_at`. Owners can read their own deleted rows (PostgREST RETURNs the updated row, so it must pass SELECT). Queries therefore filter `.is('deleted_at', null)` explicitly.
- **Realtime handlers**: an INSERT handler awaits an author lookup; an UPDATE for the same row can arrive in that window. Keep the newest payload per id (see `latest` ref in `use-threads.ts`) or the list goes stale. Never open two channels with the same topic name in the same client (supabase-js throws); share via a provider instead.
- **Author joins** use `AUTHOR_SELECT` from `use-authors.ts`. When adding a profile field, add it there and in every `profiles!…(id, nickname, avatar_hue, avatar_url)` select (grep for `avatar_hue`).
- **`database.types.ts` is hand-written.** Update it with every migration. (Or regenerate: `npx supabase gen types typescript --linked > src/lib/database.types.ts` and re-add the helper types at the bottom.)
- Tab screens render inside `<Screen>` which pads top AND bottom safe areas; on iOS the bottom inset already includes the native tab bar. Absolutely-positioned things (FAB) use `useSafeAreaInsets().bottom`.
- Errors from Supabase are objects, not `Error` instances. Use `friendlyError()` for UI and `errorMessage()` for logs. Custom Postgres errcodes: `P0001` banned, `P0002` rate limited, `P0003` cannot reach user (DM/contact), `P0004` unsupported city/district.

## Domain rules (as implemented)

- Rooms are districts. `set_location(p_lat, p_lng, p_city, p_district)` canonicalizes the district against `public.districts` (all 94 districts of the 3 cities seeded) + `district_aliases` (Eyüp→Eyüpsultan, Kazan→Kahramankazan). Unknown → `P0004`. The `neighborhoods` table kept its name; `name` and `district` both hold the district.
- Location is re-verified on foreground after 30 min (`STALE_MS`). Server treats locations older than 24h as unknown.
- Rate limits are Postgres triggers: messages 5/10s, replies 5/30s, threads 3/10min, DMs 8/10s.
- DMs: allowed when the two users are in the same room now, or the sender saved the recipient as a contact. Blocks stop DMs both ways. Contacts are one-directional (a saved list, not friend requests).
- Reports go to `public.reports` (write-only for users). No moderation UI yet; read the table in the dashboard.
- Avatars: bucket `avatars`, public read, each user writes only `avatars/<uid>/…`, 2 MB, jpeg/png/webp. Path is `<uid>/avatar.jpg`, URL cache-busted with `?v=`.

## Verifying changes

- Backend: curl the REST API with a user JWT. Get one with `POST /auth/v1/signup` body `{"data":{}}` (anonymous). Test accounts already in the Kadıköy room: `SmokeTestKedi01` (id `3565cc80-5a53-43a7-b280-56eeb5fa4c57`) and `MeraklıMartı77` (id `9b3bc2b1-79b1-4994-8b59-4d47fdac4590`). Their tokens expire hourly; sign in fresh ones as needed.
- Realtime: a node script with `@supabase/supabase-js` subscribing with a user token is the fastest way to prove delivery (see git history of the race fix).
- App: Metro is started via `.claude/launch.json` (`expo-ios`). If the Claude simulator panel is not granted, `xcrun simctl io booted screenshot x.png` works for looking, and `xcrun simctl terminate booted host.exp.Exponent && xcrun simctl openurl booted exp://<lan-ip>:8081` forces a full reload. Grant Expo Go location with `xcrun simctl privacy booted grant location host.exp.Exponent`.
- Web (`localhost:8081`) renders but cannot reverse-geocode, so it stops at the location step.

## Decisions log

- 2026-09-07: Expo + Supabase, no custom backend; anonymous auth to kill onboarding friction; persistent pseudonyms (not per-thread anon) so blocking and DMs work.
- 2026-09-08: DMs + contacts added at Emre's request. Rooms switched from mahalle to ilçe (Emre's call, "option 1") because Apple/Google disagree on mahalle names and bigger rooms fix cold start. Profile pictures added.

## Not done yet / known gaps

1. **Location spoofing**: the client sends the geocoded district. Fix: Edge Function reverse-geocodes lat/lng server-side (points in district polygons). Lat/lng are already stored.
2. **No moderation tooling** beyond the `reports` table. Apple review will want a visible "we act on reports within 24h" statement and a way to contact. Avatars are unmoderated (nudity risk).
3. **No push notifications** (DM replies, thread replies). Expo Notifications + a DB webhook/Edge Function.
4. **No account linking**: anonymous accounts die with the app install. Add Apple/Google sign-in linking before launch.
5. **Realtime soft-deletes by others** don't propagate (the deleted row fails their SELECT policy); they see it on next load. Acceptable for now.
6. Placeholder icon/splash. Bundle id `com.thirdplace.app` is a placeholder too.
7. Unread badge on the Mesajlar tab uses `NativeTabs.Trigger.Badge`; verify it renders on Android.

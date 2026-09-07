# Third Place

Hyperlocal, anonymous gossip for Turkish neighborhoods. You only see the chat for the mahalle you are physically standing in.

Two surfaces per neighborhood:

- **Canlı** – a live chat room.
- **Konular** – threads. One headline, everyone replies underneath. Newest at the top.

Launch cities: İstanbul, Ankara, İzmir.

## Stack

- [Expo 57](https://docs.expo.dev/versions/v57.0.0/) + expo-router (iOS and Android from one codebase)
- Supabase: anonymous auth, Postgres, Realtime, Row Level Security
- No custom server. The database enforces who can see what.

## Run it

1. Create a Supabase project at https://supabase.com.
2. In the Dashboard: **Authentication → Providers → Anonymous** → enable.
3. Open **SQL Editor**, paste `supabase/migrations/0001_init.sql`, run it.
4. Copy `.env.example` to `.env` and fill in the URL and anon key from **Project Settings → API**.
5. Install and start:

```bash
npm install
npx expo start
```

Press `i` for the iOS simulator or `a` for Android. Simulators sit in Cupertino, so `.env` ships with `EXPO_PUBLIC_MOCK_LOCATION` pointing at Kadıköy. Remove it to use the real GPS.

## How location gating works

1. Client asks for foreground location, reverse-geocodes to (il, ilçe, mahalle).
2. Calls the `set_location` RPC, which creates the neighborhood row if it is new and stores the user's position.
3. Every read and write policy checks `my_neighborhood_id()`, which only returns a value if the location was verified in the last 24 hours.
4. The app re-verifies on foreground after 30 minutes.

Known gap: the client sends the geocoded names, so a modified client could claim any neighborhood. Fix before public launch by moving reverse geocoding into a Supabase Edge Function. The lat/lng are already stored for that.

## Moderation

- Long-press any message, thread, or reply: report (with reason), block the author, or delete your own.
- Blocks are enforced in RLS, so blocked users disappear from every query.
- Rate limits are Postgres triggers: 5 messages / 10s, 5 replies / 30s, 3 threads / 10min.
- A client-side filter catches phone numbers and TC kimlik numbers before they are sent.
- `reports` table is write-only for users. Review it from the Supabase dashboard for now.

## Structure

```
src/
  app/            expo-router screens
    onboarding    nickname + location permission
    (tabs)/       index = threads, chat = live, me = profile
    thread/       [id] detail, new = compose modal
  components/     shared UI
  hooks/          data hooks with realtime subscriptions
  lib/            supabase client, geocoding, validation
  providers/      session (anon auth) and neighborhood (location) context
  constants/      theme tokens, all Turkish UI strings
supabase/
  migrations/     schema, RLS, triggers, RPCs
```

## Before store submission

- [ ] Server-side geocoding (see above)
- [ ] Moderation dashboard or at least an email digest of reports
- [ ] Apple: EULA acceptance is in onboarding; add a link to full terms
- [ ] Push notifications for thread replies
- [ ] Real app icon and splash

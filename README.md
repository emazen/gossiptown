# Gossiptown

Hyperlocal, anonymous gossip for Turkey. You only see the room for the ilçe (district) you are physically standing in.

Two surfaces per district, plus private messages:

- **Canlı** – a live chat room.
- **Konular** – threads. One headline, everyone replies underneath. Newest at the top.
- **Mesajlar** – 1:1 direct messages. Long-press anyone's post to message them or save them to your contacts. You can DM someone while you share a neighborhood, or any time if they are in your contacts. Blocking stops DMs both ways.

Launch cities: İstanbul, Ankara, İzmir.

## Stack

- [Expo 57](https://docs.expo.dev/versions/v57.0.0/) + expo-router (iOS and Android from one codebase)
- Supabase: anonymous auth, Postgres, Realtime, Row Level Security
- No custom server. The database enforces who can see what.

## Run it

1. Create a Supabase project at https://supabase.com.
2. In the Dashboard: **Authentication → Providers → Anonymous** → enable.
3. Open **SQL Editor**, paste `supabase/migrations/20260908000000_init.sql`, run it.
4. Copy `.env.example` to `.env` and fill in the URL and anon key from **Project Settings → API**.
5. Install and start:

```bash
npm install
npx expo start
```

Press `i` for the iOS simulator or `a` for Android. Simulators sit in Cupertino, so `.env` ships with `EXPO_PUBLIC_MOCK_LOCATION` pointing at Kadıköy. Remove it to use the real GPS.

## How location gating works

1. Client asks for foreground location and sends only lat/lng.
2. The `set_location` RPC finds the district with a PostGIS point-in-polygon lookup against the boundaries of all 94 districts in the three cities (OpenStreetMap, © OpenStreetMap contributors, ODbL). Points up to 1 km outside a boundary (shoreline GPS jitter) snap to the nearest district; anything else is rejected and the app shows "not here yet". It creates the room row if it is new and stores the user's position.
3. Every read and write policy checks `my_neighborhood_id()`, which only returns a value if the location was verified in the last 24 hours.
4. The app re-verifies on foreground after 30 minutes.

Rooms are districts rather than mahalle on purpose: Apple and Google disagree on neighborhood names (the iOS simulator says "Moda" where the official mahalle is "Caferağa"), and district-sized rooms fill up faster. Mahalle rooms can come back later by loading mahalle polygons the same way.

The client never names its district, so a modified client can no longer join a room that disagrees with its coordinates. It can still send fake coordinates (GPS spoofing); that needs device attestation and is out of scope for now.

## Moderation

- Long-press any message, thread, reply, or DM: report (with reason), block, or delete your own. Room content also offers message the author and save as contact.
- Profile photos: tap your avatar on the Ben tab. Stored in a public `avatars` bucket, one folder per user, 2 MB cap. Unmoderated for now.
- Blocks are enforced in RLS, so blocked users disappear from every query.
- Rate limits are Postgres triggers: 5 messages / 10s, 5 replies / 30s, 3 threads / 10min.
- A client-side filter catches phone numbers and TC kimlik numbers before they are sent.
- Anything reported by 3 different people is hidden automatically (its author still sees it) until a moderator decides.
- Moderators get a Moderasyon card on the Ben tab: the queue of reported items, oldest first, with remove / ban / remove photo / dismiss. Make someone a moderator in the SQL editor: `insert into public.moderators (user_id) values ('<profile id>');`
- The Ben tab states the 24-hour review promise and has a "Bize yaz" contact link (`SUPPORT_EMAIL` in `src/lib/env.ts`).

## Structure

```
src/
  app/            expo-router screens
    onboarding    nickname + location permission
    (tabs)/       index = threads, chat = live, dms = inbox, me = profile
    thread/       [id] detail, new = compose modal
    dm/[id]       1:1 conversation
    contacts      saved people
  components/     shared UI
  hooks/          data hooks with realtime subscriptions
  lib/            supabase client, location, validation
  providers/      session (anon auth), neighborhood (location), conversations (DM inbox)
  constants/      theme tokens, all Turkish UI strings
supabase/
  migrations/     schema, RLS, triggers, RPCs
```

## Before store submission

- [x] Server-side district lookup (see above)
- [x] Moderation queue in the app (still to do: alert moderators when a report arrives)
- [ ] Apple: EULA acceptance is in onboarding; add a link to full terms
- [ ] Push notifications for thread replies
- [ ] Real app icon and splash
- [ ] Apple/Google sign-in linking so accounts survive reinstalls
- [ ] Avatar moderation

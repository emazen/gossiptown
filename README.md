# Third Place

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

1. Client asks for foreground location, reverse-geocodes to (il, ilçe).
2. Calls the `set_location` RPC, which canonicalizes the district against a seeded list of all 94 districts in the three cities, creates the room row if it is new, and stores the user's position. Unknown districts are rejected.
3. Every read and write policy checks `my_neighborhood_id()`, which only returns a value if the location was verified in the last 24 hours.
4. The app re-verifies on foreground after 30 minutes.

Rooms are districts rather than mahalle on purpose: Apple and Google disagree on neighborhood names (the iOS simulator says "Moda" where the official mahalle is "Caferağa"), and district-sized rooms fill up faster. Mahalle rooms can come back later with a server-side polygon lookup.

Known gap: the client sends the geocoded district name, so a modified client could claim any district. Fix before public launch by reverse geocoding lat/lng in a Supabase Edge Function. The lat/lng are already stored.

## Moderation

- Long-press any message, thread, or reply: message the author, save them as a contact, report (with reason), block, or delete your own.
- Profile photos: tap your avatar on the Ben tab. Stored in a public `avatars` bucket, one folder per user, 2 MB cap. Unmoderated for now.
- Blocks are enforced in RLS, so blocked users disappear from every query.
- Rate limits are Postgres triggers: 5 messages / 10s, 5 replies / 30s, 3 threads / 10min.
- A client-side filter catches phone numbers and TC kimlik numbers before they are sent.
- `reports` table is write-only for users. Review it from the Supabase dashboard for now.

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
  lib/            supabase client, geocoding, validation
  providers/      session (anon auth), neighborhood (location), conversations (DM inbox)
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
- [ ] Apple/Google sign-in linking so accounts survive reinstalls
- [ ] Avatar moderation

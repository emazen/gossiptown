# Third Place

Hyperlocal anonymous gossip app for Turkish neighborhoods (mahalle). Expo 57 + expo-router + Supabase.

- Read the versioned Expo docs before using unfamiliar APIs: https://docs.expo.dev/versions/v57.0.0/
- UI copy is Turkish and lives in `src/constants/strings.ts`. Don't inline strings in screens.
- All DB access goes through `src/lib/supabase.ts`; schema is `supabase/migrations/`. RLS is the security boundary, not the client.
- Run `npm run typecheck` before finishing any change.

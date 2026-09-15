# Pod Tracker

A React Native (Expo) app for logging Magic: The Gathering games across a group
of friends — a "pod" — with shareable pods so multiple people can log games from
their own phones. Backed by Supabase (Postgres + Auth + Row-Level Security).

See [`PLAN.md`](./PLAN.md) for the full design. This repo implements **Phase 1**:
auth, create/join pods, manage players, log games (today or a past date), view
games grouped by date, and a wins-per-player leaderboard.

## Stack

- **Expo** (managed) with **expo-router** for navigation
- **React Native Paper** (Material Design 3) for the component library and
  theming — see `src/theme.ts` for the custom dark theme
- **Supabase** — hosted Postgres with Auth, Row-Level Security, and the
  `supabase-js` client
- **TanStack Query** for caching, loading, and mutation states
- **TypeScript** throughout

## Project layout

```
app/                     expo-router screens
  _layout.tsx            providers + auth-gated navigator
  sign-in.tsx            email/password auth
  index.tsx              pods list (home)
  pod/[id]/index.tsx     pod detail — games grouped by date
  pod/[id]/add-game.tsx  log / edit a game (the core flow)
  pod/[id]/players.tsx   manage the pod's players
  pod/[id]/stats.tsx     wins-per-player leaderboard (filterable by season)
  pod/[id]/seasons/      seasons: the list, and one season's standings
src/
  api/                   thin Supabase data functions
  hooks/                 TanStack Query hooks
  components/            shared UI (Button, TextField, modal, etc.)
  lib/                   supabase client + pure helpers (dates, stats)
  providers/             Auth + Query providers
  types/                 database types
supabase/
  migrations/            schema, functions/RPCs, and RLS policies
```

## Backend setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migrations in `supabase/migrations/` **in order**. Either:
   - Paste each file into the SQL Editor and run it, or
   - Use the Supabase CLI: `supabase db push` (with the project linked).
3. **Auth settings:** Authentication → Providers → Email is enabled by default.
   For the fastest local testing you can turn *off* "Confirm email" so new
   accounts sign in immediately; leave it on for anything real.

The migrations:

| File | What it does |
|------|--------------|
| `0001_initial_schema.sql` | The six tables: `pods`, `pod_members`, `players`, `games`, `game_players` (+ indexes). |
| `0002_functions.sql` | Access-check helpers and the `create_pod` / `join_pod` / `log_game` / `update_game` RPCs that keep multi-row writes atomic. |
| `0003_rls_policies.sql` | Row-level security: a row is visible/editable only to members of its pod; **owner-only delete** for pods and games. |
| `0014_seasons.sql` | `seasons` + the `games.season_id` assignment, and `log_game` / `update_game` redefined to carry it. |
| `0015_pod_seasons_enabled.sql` | `pods.seasons_enabled` — seasons become opt-in per pod; the RPCs honour the setting. |

## App setup

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key
npx expo start
```

Open the project in **Expo Go** (iOS/Android) or a simulator. The anon key is
meant to ship in the client — RLS is what protects the data.

> If you see Expo/React Native version warnings, run `npx expo install --fix`
> to align native package versions with your installed SDK.

## Web deployment (Vercel)

The app is mobile-first, but Expo Router can export a React-Native-Web build —
a static single-page app — which deploys to Vercel for quick demos and sharing a
URL with people who won't install the mobile app.

`vercel.json` is already configured (build command, output dir, and a catch-all
rewrite so client-side routes survive a refresh). To deploy:

1. Import the repo into Vercel (or run `vercel`).
2. Add the env vars in **Vercel → Project → Settings → Environment Variables**:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

   These are inlined at **build** time, so they must be set in Vercel — a local
   `.env` is not enough for the deployed build.
3. Deploy. Vercel runs `npx expo export -p web` and serves `dist/`.

To preview the production web build locally:

```bash
npx expo export -p web        # outputs ./dist
npx serve dist                # or any static file server
```

Notes:
- The date picker is platform-split: native uses `@react-native-community/datetimepicker`;
  web uses a native `<input type="date">` (see `src/components/DateField*.tsx`).
- Web is a convenience target. The native iOS/Android apps still ship via Expo
  Go / EAS Build / the app stores, **not** Vercel.

## Permissions model (Phase 1)

- Any pod member can **log and edit** any game in the pod.
- Only the pod **owner** can **delete** games or the pod itself, and manage the
  member roster.
- A **player** is just a name and doesn't need an account; the optional
  `user_id` link (for "see your own stats") is wired in the schema for later
  phases.

## Seasons

A **season** is a named collection of the pod's games — "Summer 2026", "the
Foundations season" — so the pod can ask *who won the most this season?* without
the answer being diluted by every game ever logged.

Seasons are **off by default**. The owner turns them on in **Pod → Settings →
Seasons**; until then nothing about the feature appears anywhere.

- The owner creates seasons from **Pod → Seasons**.
- Once a season exists, the log-game form grows a season picker. A new game
  defaults to the newest season (the one the pod is presumably running) and can
  be moved off it with the **No season** chip; editing a game can re-file it.
- A season's screen shows its standings — the same wins-per-player table,
  counted over that season's games alone — plus the games in it.
- The stats screen gains **All time / ‹season›** chips for the same cut.

A season's games are ordinary games: they sit in the pod's main log alongside
everything else, just carrying a season badge. A season is a lens on the log,
not a separate one.

Turning the setting back **off** hides the feature without erasing it. Games
keep the `season_id` they were filed under and show as ordinary games with no
season context; `log_game` won't file a new game into a season while it's off,
and `update_game` leaves an existing assignment alone rather than clearing it —
so flipping seasons back on restores every standing intact.

Membership is explicit rather than date-derived: a game is in a season because
someone put it there, so a game logged late still lands where the pod says it
belongs, and two seasons can overlap. Deleting a season keeps its games and
simply unfiles them.

Seasons group the pod's normal games; a **series** (a separate feature) is its
own 1 v 1 game log with its own tables and doesn't feed season standings.

## What's next (see `PLAN.md`)

- **Phase 2 — stats:** win rate over time, most-played commanders, head-to-head,
  date-range filters.
- **Phase 3 — polish & scale:** Scryfall commander autocomplete, realtime
  updates across members, refined permissions, optional offline cache.

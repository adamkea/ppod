# MTG Pod Tracker — Build Plan

A React Native app for logging Magic: The Gathering games across a group of friends (“pods”), with shareable pods so multiple people can access and log games.

## Goal

Make logging a game fast — for today or for a past date — and store the data so that wins-per-player and commanders-played fall out as simple queries, with room to grow more stats later.

## Architecture decision

The app needs to support **shared pods**: a pod owner can invite friends, and those friends open the same pod from their own phones. That requires a shared source of truth with accounts and access control, so the app is **backend-backed rather than local-only**.

**Stack: Expo + Supabase.**

- **Expo (managed)** with **expo-router** for navigation.
- **Supabase** for the backend — it’s hosted Postgres, so the relational model below drops in directly. It provides the three things sharing requires: **auth** (accounts), **realtime** (a game logged on one phone appears on others), and **row-level security** (the rule “you can only see pods you belong to” enforced in the database, not in trusted app code).
- **supabase-js** client in the app; optional **TanStack Query** for caching and loading states.

Deliberately *not* in v1: full offline-first sync (PowerSync / WatermelonDB). It’s nicer for logging on bad wifi but adds real complexity. Start with direct Supabase queries and add an offline cache later if the pain shows up.

## The core modeling principle

**A player is not the same thing as a user.** This distinction is painful to retrofit, so it’s built in from the start.

- A **user** is an account that can log in and open a pod.
- A **player** is a name in a game record that has commanders and wins.

You will want to log a game for a friend who doesn’t have the app — he’s just a name in the pod. Separately, you want accounts that can access the pod. So `Player` is its own table with an **optional** `user_id` (null = “just a name”; set = “linked to an account, so this person can see their own stats”). Access is controlled by a separate membership table.

## Data model

Six tables. Names are illustrative; adjust casing to your convention (snake_case shown for Postgres).

### `pods`

|column    |type       |notes         |
|----------|-----------|--------------|
|id        |uuid (pk)  |              |
|name      |text       |              |
|owner_id  |uuid       |→ `auth.users`|
|created_at|timestamptz|              |

### `pod_members` — who can *open* the pod

|column    |type       |notes             |
|----------|-----------|------------------|
|id        |uuid (pk)  |                  |
|pod_id    |uuid       |→ pods            |
|user_id   |uuid       |→ `auth.users`    |
|role      |text       |`owner` / `member`|
|created_at|timestamptz|                  |

Unique constraint on `(pod_id, user_id)`.

### `players` — who can *appear in games*

|column    |type           |notes                               |
|----------|---------------|------------------------------------|
|id        |uuid (pk)      |                                    |
|pod_id    |uuid           |→ pods                              |
|name      |text           |display name within the pod         |
|user_id   |uuid (nullable)|→ `auth.users`; null = unlinked name|
|created_at|timestamptz    |                                    |

### `games`

|column           |type       |notes                                     |
|-----------------|-----------|------------------------------------------|
|id               |uuid (pk)  |                                          |
|pod_id           |uuid       |→ pods                                    |
|played_at        |date       |defaults to today, editable for past games|
|game_type        |text       |default `'commander'`                     |
|logged_by_user_id|uuid       |→ `auth.users`; who recorded it           |
|created_at       |timestamptz|                                          |

### `game_players` — the heart of it

|column           |type           |notes                                                      |
|-----------------|---------------|-----------------------------------------------------------|
|id               |uuid (pk)      |                                                           |
|game_id          |uuid           |→ games                                                    |
|player_id        |uuid           |→ players                                                  |
|commander        |text (nullable)|null for non-commander game types                          |
|partner_commander|text (nullable)|Commander partners are common                              |
|is_winner        |boolean        |flag rather than a single winner_id, so draws/multiple work|

“Wins per player” and “commanders played” are queries over `game_players` joined to `players` — no extra tables needed.

## Access control (Supabase RLS)

Row-level security is what makes sharing safe. The core policy across `pods`, `players`, `games`, and `game_players`:

> A row is visible/editable only if the requesting user has a `pod_members` row for that pod.

Pod creation inserts both the `pods` row and an `owner` `pod_members` row (do this in a transaction or an RPC so they can’t drift apart). For v1, permissions are simple: **any member can log any game in the pod**. Tighten to “only owner can delete” or per-action rules later if it gets contentious.

## Joining a pod

Owner generates an **invite code or link**; a friend enters it and a `pod_members` row is created for them. Implementation options:

- Simplest: a short random `invite_code` on the pod; “join” looks it up and inserts membership.
- Cleaner later: a dedicated `invites` table with expiry and single-use codes.

## Screens (MVP)

1. **Auth** — sign in / sign up (Supabase email or OAuth).
1. **Pods list (home)** — pods you belong to; create a pod; enter an invite code.
1. **Pod detail** — games grouped by date; “Log game” button; manage players/invite.
1. **Add game** — the core flow below.
1. **Stats (basic)** — wins per player; expand later.

## The add-game flow (optimize for speed)

This is the loop that matters most, so minimize taps:

1. **Date** defaults to **today** but is editable — logging a past game is just changing the date.
1. **Game type** defaults to Commander.
1. **Participants** — pre-select all pod members (usually the whole pod plays), with the option to remove anyone who sat out.
1. **Commanders** — a free-text field per player for v1.
1. **Winner** — tap to mark `is_winner`.
1. **Save.**

Later, replace the free-text commander field with **Scryfall API autocomplete** so names are consistent — that’s what keeps “commanders played” stats clean.

## Roadmap

**Phase 1 — core loop (your ask).** Auth, create/join pod, manage players, log a game (today or past), view games grouped by date, wins-per-player count.

**Phase 2 — stats.** Win rate, most-played commanders, head-to-head records, filters by date range.

**Phase 3 — polish & scale.** Scryfall autocomplete; realtime updates across members; refined permissions; optional offline cache if logging on poor connections becomes a pain point.

## Open decisions to settle before coding

- **Auth method** — email/password vs. a social provider (Google/Apple). Apple sign-in is required if you ship to the App Store with other social logins.
- **Player linking UX** — how an unlinked player name gets connected to an account when that friend later joins.
- **Permissions** — confirm “any member can log/edit any game” is acceptable for v1.

-- MTG Pod Tracker — Phase 1 schema
--
-- Core modeling principle: a *user* is an account that can log in and open a
-- pod; a *player* is a name that appears in game records. They are separate
-- tables so you can log a game for a friend who doesn't have the app.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- pods
-- ---------------------------------------------------------------------------
create table if not exists public.pods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create index if not exists pods_owner_id_idx on public.pods (owner_id);

-- ---------------------------------------------------------------------------
-- pod_members — who can *open* the pod
-- ---------------------------------------------------------------------------
create table if not exists public.pod_members (
  id         uuid primary key default gen_random_uuid(),
  pod_id     uuid not null references public.pods (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (pod_id, user_id)
);

create index if not exists pod_members_user_id_idx on public.pod_members (user_id);
create index if not exists pod_members_pod_id_idx on public.pod_members (pod_id);

-- ---------------------------------------------------------------------------
-- players — who can *appear in games*
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  pod_id     uuid not null references public.pods (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  -- null = "just a name"; set = linked to an account so that person can see
  -- their own stats later.
  user_id    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists players_pod_id_idx on public.players (pod_id);

-- ---------------------------------------------------------------------------
-- games
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id                uuid primary key default gen_random_uuid(),
  pod_id            uuid not null references public.pods (id) on delete cascade,
  played_at         date not null default current_date,
  game_type         text not null default 'commander',
  logged_by_user_id uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists games_pod_id_played_at_idx
  on public.games (pod_id, played_at desc);

-- ---------------------------------------------------------------------------
-- game_players — the heart of it
-- ---------------------------------------------------------------------------
create table if not exists public.game_players (
  id                uuid primary key default gen_random_uuid(),
  game_id           uuid not null references public.games (id) on delete cascade,
  player_id         uuid not null references public.players (id) on delete cascade,
  commander         text,
  partner_commander text,
  -- flag rather than a single winner_id, so draws / multiple winners work.
  is_winner         boolean not null default false,
  unique (game_id, player_id)
);

create index if not exists game_players_game_id_idx on public.game_players (game_id);
create index if not exists game_players_player_id_idx on public.game_players (player_id);

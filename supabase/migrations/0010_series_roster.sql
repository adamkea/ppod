-- Series: support a roster of more than two players.
--
-- 0009 modelled a series as a fixed head-to-head between exactly two players
-- (series.player_one_id / player_two_id). A series should instead hold a roster
-- of N players, with each individual game being 1v1 between two of them. This
-- migration introduces:
--   * series_players — the roster (N players per series)
--   * series_games.player_one_id / player_two_id — the two players in that game
-- and removes the two fixed player columns from `series`.
--
-- 0009 is already applied, so this migration backfills existing data: each
-- series' two players become its roster, and each existing game's participants
-- become the series' (former) two players.

-- ---------------------------------------------------------------------------
-- series_players — the roster
-- ---------------------------------------------------------------------------
create table if not exists public.series_players (
  id         uuid primary key default gen_random_uuid(),
  series_id  uuid not null references public.series (id) on delete cascade,
  player_id  uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (series_id, player_id)
);

create index if not exists series_players_series_id_idx
  on public.series_players (series_id);

-- Backfill the roster from the old two-player columns (no-op if there are none).
insert into public.series_players (series_id, player_id)
select id, player_one_id from public.series
union
select id, player_two_id from public.series
on conflict (series_id, player_id) do nothing;

-- ---------------------------------------------------------------------------
-- series_games — record the two players in each 1v1 game
-- ---------------------------------------------------------------------------
alter table public.series_games
  add column if not exists player_one_id uuid references public.players (id) on delete cascade,
  add column if not exists player_two_id uuid references public.players (id) on delete cascade;

-- Backfill existing games: their participants were the series' two players.
update public.series_games sg
set player_one_id = s.player_one_id,
    player_two_id = s.player_two_id
from public.series s
where sg.series_id = s.id
  and (sg.player_one_id is null or sg.player_two_id is null);

alter table public.series_games
  alter column player_one_id set not null,
  alter column player_two_id set not null;

alter table public.series_games
  drop constraint if exists series_games_distinct_players,
  add constraint series_games_distinct_players check (player_one_id <> player_two_id);

-- ---------------------------------------------------------------------------
-- Drop the fixed two-player columns from series (roster lives in series_players)
-- ---------------------------------------------------------------------------
alter table public.series drop constraint if exists series_distinct_players;
alter table public.series drop column if exists player_one_id;
alter table public.series drop column if exists player_two_id;

-- ---------------------------------------------------------------------------
-- RLS for series_players — members read, owner writes (matches series_games).
-- ---------------------------------------------------------------------------
alter table public.series_players enable row level security;

create policy "series_players: members can read"
  on public.series_players for select
  using (can_access_series(series_id));

create policy "series_players: owner can insert"
  on public.series_players for insert
  with check (can_edit_series(series_id));

create policy "series_players: owner can edit"
  on public.series_players for update
  using (can_edit_series(series_id))
  with check (can_edit_series(series_id));

create policy "series_players: owner can delete"
  on public.series_players for delete
  using (can_edit_series(series_id));

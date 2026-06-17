-- Series — a head-to-head run of standard 1v1 games between two players.
--
-- The pod plays "drafts of standard sets and play each other a certain amount
-- of times". A *series* captures one of those runs: two players, an optional
-- name (e.g. the set drafted), and an open-ended list of standard games, each
-- recording who won. There are no commanders here — that's what sets a series
-- apart from a logged commander game.
--
-- Series are deliberately separate from the `games` / `game_players` tables:
-- they don't feed the pod's win/games-played stats, and they have their own
-- two-player shape. Writes are owner-only, mirroring 0008.

-- ---------------------------------------------------------------------------
-- series
-- ---------------------------------------------------------------------------
create table if not exists public.series (
  id             uuid primary key default gen_random_uuid(),
  pod_id         uuid not null references public.pods (id) on delete cascade,
  -- Optional label, typically the standard set drafted (e.g. "Bloomburrow").
  name           text check (name is null or char_length(name) between 1 and 80),
  player_one_id  uuid not null references public.players (id) on delete cascade,
  player_two_id  uuid not null references public.players (id) on delete cascade,
  -- Optional soft goal ("we'll play 10 games"); a series never auto-ends.
  target_games   int check (target_games is null or target_games between 1 and 999),
  created_at     timestamptz not null default now(),
  constraint series_distinct_players check (player_one_id <> player_two_id)
);

create index if not exists series_pod_id_idx on public.series (pod_id);

-- ---------------------------------------------------------------------------
-- series_games — one standard game within a series
-- ---------------------------------------------------------------------------
create table if not exists public.series_games (
  id               uuid not null primary key default gen_random_uuid(),
  series_id        uuid not null references public.series (id) on delete cascade,
  -- null = a draw; otherwise must be one of the series' two players (enforced
  -- in the app, since the two valid ids live on the parent row).
  winner_player_id uuid references public.players (id) on delete set null,
  played_at        date not null default current_date,
  note             text,
  created_at       timestamptz not null default now()
);

create index if not exists series_games_series_id_idx
  on public.series_games (series_id, created_at);

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER, same pattern as can_access_game /
-- can_edit_game so policies don't recurse through RLS).
-- ---------------------------------------------------------------------------
create or replace function public.can_access_series(_series_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from series s
    join pod_members m on m.pod_id = s.pod_id
    where s.id = _series_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_series(_series_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from series s
    join pods p on p.id = s.pod_id
    where s.id = _series_id and p.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS — members read, owner writes.
-- ---------------------------------------------------------------------------
alter table public.series       enable row level security;
alter table public.series_games enable row level security;

create policy "series: members can read"
  on public.series for select
  using (is_pod_member(pod_id));

create policy "series: owner can insert"
  on public.series for insert
  with check (is_pod_owner(pod_id));

create policy "series: owner can edit"
  on public.series for update
  using (is_pod_owner(pod_id))
  with check (is_pod_owner(pod_id));

create policy "series: owner can delete"
  on public.series for delete
  using (is_pod_owner(pod_id));

create policy "series_games: members can read"
  on public.series_games for select
  using (can_access_series(series_id));

create policy "series_games: owner can insert"
  on public.series_games for insert
  with check (can_edit_series(series_id));

create policy "series_games: owner can edit"
  on public.series_games for update
  using (can_edit_series(series_id))
  with check (can_edit_series(series_id));

create policy "series_games: owner can delete"
  on public.series_games for delete
  using (can_edit_series(series_id));

-- Seasons — a named collection of the pod's games.
--
-- A pod plays in runs: "Summer 2026", "the Foundations season". A *season* is
-- a label a game can be filed under, so the pod can ask "who won the most this
-- season?" without the answer being diluted by every game ever logged.
--
-- Deliberately different from `series` (0009): a series is its own two-player
-- game log with its own tables, whereas a season is just a grouping of the
-- normal `games` rows. That means a season needs no games table of its own —
-- one nullable `games.season_id` is the whole feature, and every existing stat
-- becomes a season stat by filtering on it.
--
-- Membership is explicit rather than date-derived: a season has no start/end
-- date, and a game belongs to one only because someone assigned it. That keeps
-- a late-logged game from silently landing in the wrong season, and lets two
-- seasons overlap.
--
-- Writes are owner-only, mirroring 0008.

-- ---------------------------------------------------------------------------
-- seasons
-- ---------------------------------------------------------------------------
create table if not exists public.seasons (
  id         uuid primary key default gen_random_uuid(),
  pod_id     uuid not null references public.pods (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create index if not exists seasons_pod_id_idx on public.seasons (pod_id, created_at desc);

-- ---------------------------------------------------------------------------
-- games.season_id — the assignment. `on delete set null` so deleting a season
-- unfiles its games rather than destroying them.
-- ---------------------------------------------------------------------------
alter table public.games
  add column if not exists season_id uuid references public.seasons (id) on delete set null;

create index if not exists games_season_id_idx on public.games (season_id);

-- ---------------------------------------------------------------------------
-- RLS — members read, owner writes (same shape as series in 0009).
-- ---------------------------------------------------------------------------
alter table public.seasons enable row level security;

create policy "seasons: members can read"
  on public.seasons for select
  using (is_pod_member(pod_id));

create policy "seasons: owner can insert"
  on public.seasons for insert
  with check (is_pod_owner(pod_id));

create policy "seasons: owner can edit"
  on public.seasons for update
  using (is_pod_owner(pod_id))
  with check (is_pod_owner(pod_id));

create policy "seasons: owner can delete"
  on public.seasons for delete
  using (is_pod_owner(pod_id));

-- ---------------------------------------------------------------------------
-- log_game / update_game — carry the season through. Last redefined in 0008;
-- adding a parameter changes the signature, so drop the old definitions first
-- to avoid leaving an ambiguous overload behind (same dance as 0007).
--
-- `_season_id` is a text uuid or null/'' for "no season". Both RPCs verify the
-- season belongs to the same pod as the game, since they are SECURITY DEFINER
-- and so bypass the policies above.
-- ---------------------------------------------------------------------------
drop function if exists public.log_game(text, date, text, jsonb, text);
drop function if exists public.update_game(text, date, text, jsonb, text);

create or replace function public.log_game(
  _pod_id text,
  _played_at date,
  _game_type text,
  _participants jsonb,
  _note text default null,
  _season_id text default null
)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  new_game public.games;
  participant jsonb;
  pod_uuid uuid := _pod_id::uuid;
  season_uuid uuid := nullif(trim(coalesce(_season_id, '')), '')::uuid;
begin
  if not is_pod_owner(pod_uuid) then
    raise exception 'Only the pod owner can log games';
  end if;

  if season_uuid is not null
     and not exists (
       select 1 from seasons where id = season_uuid and pod_id = pod_uuid
     ) then
    raise exception 'That season belongs to a different pod';
  end if;

  insert into games (pod_id, played_at, game_type, note, season_id, logged_by_user_id)
  values (
    pod_uuid,
    coalesce(_played_at, current_date),
    coalesce(nullif(trim(_game_type), ''), 'commander'),
    nullif(trim(_note), ''),
    season_uuid,
    auth.uid()
  )
  returning * into new_game;

  for participant in select * from jsonb_array_elements(_participants)
  loop
    insert into game_players (
      game_id, player_id, commander, partner_commander,
      commander_scryfall_id, partner_scryfall_id, is_winner
    )
    values (
      new_game.id,
      (participant->>'player_id')::uuid,
      nullif(trim(participant->>'commander'), ''),
      nullif(trim(participant->>'partner_commander'), ''),
      nullif(trim(participant->>'commander_scryfall_id'), ''),
      nullif(trim(participant->>'partner_scryfall_id'), ''),
      coalesce((participant->>'is_winner')::boolean, false)
    );
  end loop;

  return new_game;
end;
$$;

create or replace function public.update_game(
  _game_id text,
  _played_at date,
  _game_type text,
  _participants jsonb,
  _note text default null,
  _season_id text default null
)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  edited_game public.games;
  participant jsonb;
  game_uuid uuid := _game_id::uuid;
  season_uuid uuid := nullif(trim(coalesce(_season_id, '')), '')::uuid;
begin
  if not can_edit_game(game_uuid) then
    raise exception 'Only the pod owner can edit games';
  end if;

  if season_uuid is not null
     and not exists (
       select 1
       from seasons s
       join games g on g.pod_id = s.pod_id
       where s.id = season_uuid and g.id = game_uuid
     ) then
    raise exception 'That season belongs to a different pod';
  end if;

  update games
  set played_at = coalesce(_played_at, played_at),
      game_type = coalesce(nullif(trim(_game_type), ''), game_type),
      note = nullif(trim(_note), ''),
      season_id = season_uuid
  where id = game_uuid
  returning * into edited_game;

  delete from game_players where game_id = game_uuid;

  for participant in select * from jsonb_array_elements(_participants)
  loop
    insert into game_players (
      game_id, player_id, commander, partner_commander,
      commander_scryfall_id, partner_scryfall_id, is_winner
    )
    values (
      game_uuid,
      (participant->>'player_id')::uuid,
      nullif(trim(participant->>'commander'), ''),
      nullif(trim(participant->>'partner_commander'), ''),
      nullif(trim(participant->>'commander_scryfall_id'), ''),
      nullif(trim(participant->>'partner_scryfall_id'), ''),
      coalesce((participant->>'is_winner')::boolean, false)
    );
  end loop;

  return edited_game;
end;
$$;

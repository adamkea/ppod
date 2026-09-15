-- Season formats — how a season ends.
--
-- 0014 gave a season a name and nothing else: games go in, wins add up, and it
-- runs until the pod loses interest. That's still the default, but pods also
-- play seasons with a finish line:
--
--   * `open`     — the default. Log as many games as you like; never ends.
--   * `first_to` — first player to `target` wins takes the season.
--   * `best_of`  — the season runs `target` games; most wins takes it.
--
-- A `best_of` season is decided as soon as the leader can no longer be caught
-- by the games still to play, which is the same rule sports use to end a
-- best-of-seven early. If the games run out with the top of the table level,
-- the season is *not* over: it goes to sudden death, accepting games past the
-- target until one player leads outright. That's what `leaders <> 1` guards
-- below, and it's why a season can hold more games than its target.
--
-- Nothing here is stored: a season's state is derived from its games, so
-- fixing a mis-logged winner re-decides the season instead of leaving a stale
-- champion behind. The app computes the same thing in `src/lib/seasons.ts`;
-- this function exists so the rule is enforced, not merely displayed.

alter table public.seasons
  add column if not exists format text not null default 'open',
  add column if not exists target int;

-- Constraints get dropped first so re-running the migration is safe (Postgres
-- has no `add constraint if not exists`).
alter table public.seasons drop constraint if exists seasons_format_check;
alter table public.seasons
  add constraint seasons_format_check check (format in ('open', 'first_to', 'best_of'));

-- A target is meaningless for an open season and required for the other two.
-- Spelled out rather than leaning on `between`, since a null there would make
-- the whole check null — and a null check passes.
alter table public.seasons drop constraint if exists seasons_target_check;
alter table public.seasons
  add constraint seasons_target_check check (
    case
      when format = 'open' then target is null
      else target is not null and target between 1 and 999
    end
  );

-- ---------------------------------------------------------------------------
-- season_is_decided — has this season produced a champion?
--
-- SECURITY DEFINER so the RPCs below (themselves definer) can call it without
-- tripping over RLS on games/game_players.
-- ---------------------------------------------------------------------------
create or replace function public.season_is_decided(_season_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  s_format        text;
  s_target        int;
  games_played    int;
  top_wins        int;
  leaders         int;
  runner_up       int;
  games_remaining int;
begin
  select format, target into s_format, s_target from seasons where id = _season_id;
  if not found or s_format = 'open' or s_target is null then
    return false;
  end if;

  select count(*) into games_played from games where season_id = _season_id;

  with w as (
    select gp.player_id, count(*) filter (where gp.is_winner) as win_count
    from games g
    join game_players gp on gp.game_id = g.id
    where g.season_id = _season_id
    group by gp.player_id
  )
  select
    coalesce((select max(win_count) from w), 0),
    (select count(*) from w
      where win_count > 0 and win_count = (select max(win_count) from w)),
    coalesce(
      (select max(win_count) from w
        where win_count < (select max(win_count) from w)),
      0)
  into top_wins, leaders, runner_up;

  -- Nobody has won a game yet, or the top of the table is level: sudden death.
  if leaders <> 1 then
    return false;
  end if;

  if s_format = 'first_to' then
    return top_wins >= s_target;
  end if;

  -- best_of. Once the target is reached `games_remaining` is 0, so this also
  -- covers the ordinary "all the games are played, one player leads" ending.
  games_remaining := greatest(s_target - games_played, 0);
  return top_wins > runner_up + games_remaining;
end;
$$;

-- ---------------------------------------------------------------------------
-- log_game / update_game — a decided season is closed for business.
--
-- Same signatures as 0015, so `create or replace` is enough. New games can't
-- be filed into a season that already has a champion, and an existing game
-- can't be moved into one; editing a game that is *already* in a decided
-- season stays allowed, so a mis-recorded winner can still be corrected (and
-- may well hand the season to someone else).
-- ---------------------------------------------------------------------------
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

  if not (select seasons_enabled from pods where id = pod_uuid) then
    season_uuid := null;
  end if;

  if season_uuid is not null
     and not exists (
       select 1 from seasons where id = season_uuid and pod_id = pod_uuid
     ) then
    raise exception 'That season belongs to a different pod';
  end if;

  if season_uuid is not null and season_is_decided(season_uuid) then
    raise exception 'That season is already decided — start a new one, or raise its target to keep playing';
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
  current_season uuid;
  seasons_on boolean;
begin
  if not can_edit_game(game_uuid) then
    raise exception 'Only the pod owner can edit games';
  end if;

  select p.seasons_enabled, g.season_id into seasons_on, current_season
  from games g
  join pods p on p.id = g.pod_id
  where g.id = game_uuid;

  if seasons_on and season_uuid is not null
     and season_uuid is distinct from current_season then
    if not exists (
      select 1
      from seasons s
      join games g on g.pod_id = s.pod_id
      where s.id = season_uuid and g.id = game_uuid
    ) then
      raise exception 'That season belongs to a different pod';
    end if;

    if season_is_decided(season_uuid) then
      raise exception 'That season is already decided — start a new one, or raise its target to keep playing';
    end if;
  end if;

  update games
  set played_at = coalesce(_played_at, played_at),
      game_type = coalesce(nullif(trim(_game_type), ''), game_type),
      note = nullif(trim(_note), ''),
      -- Off: keep whatever season the game already had.
      season_id = case when seasons_on then season_uuid else season_id end
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

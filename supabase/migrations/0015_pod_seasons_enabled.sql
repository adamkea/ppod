-- Seasons, opt-in per pod.
--
-- 0014 gave every pod seasons whether it wanted them or not. Most pods just log
-- games; the season picker, the Seasons screen and the season badge are noise
-- to them. So seasons become a pod setting the owner turns on, exactly like
-- match comments in 0011.
--
-- Turning seasons *off* hides the feature, it does not erase it: games keep
-- their `season_id`, they simply show as ordinary games with no season context
-- until the setting comes back on. That means a pod can toggle it off and on
-- without losing a season's history — which is also why update_game below
-- leaves an existing assignment alone rather than nulling it while off.

alter table public.pods
  add column if not exists seasons_enabled boolean not null default false;

-- ---------------------------------------------------------------------------
-- log_game / update_game — honour the setting. Same signatures as 0014, so
-- `create or replace` is enough; only the season handling changes.
--
-- While seasons are off: a new game can't be filed into one (log_game drops
-- the season), and editing a game leaves whatever season it already has
-- untouched (update_game ignores the parameter) so nothing is lost.
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
  seasons_on boolean;
begin
  if not can_edit_game(game_uuid) then
    raise exception 'Only the pod owner can edit games';
  end if;

  select p.seasons_enabled into seasons_on
  from games g
  join pods p on p.id = g.pod_id
  where g.id = game_uuid;

  if seasons_on and season_uuid is not null
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

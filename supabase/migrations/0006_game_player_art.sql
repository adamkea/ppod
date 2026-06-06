-- Alternate art for commanders in logged games.
--
-- Mirrors 0005 (saved commanders) but for the per-game participants shown in the
-- game grid. NULL means "fall back to the default art for the name".

alter table public.game_players
  add column if not exists commander_scryfall_id text,
  add column if not exists partner_scryfall_id   text;

-- The log_game / update_game RPCs (originally in 0002) insert game_players rows,
-- so they must be redefined to carry the new ids through the participant jsonb:
--   { player_id, commander?, partner_commander?,
--     commander_scryfall_id?, partner_scryfall_id?, is_winner? }

create or replace function public.log_game(
  _pod_id text,
  _played_at date,
  _game_type text,
  _participants jsonb
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
begin
  if not is_pod_member(pod_uuid) then
    raise exception 'Not a member of this pod';
  end if;

  insert into games (pod_id, played_at, game_type, logged_by_user_id)
  values (
    pod_uuid,
    coalesce(_played_at, current_date),
    coalesce(nullif(trim(_game_type), ''), 'commander'),
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
  _participants jsonb
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
begin
  if not can_access_game(game_uuid) then
    raise exception 'Not allowed to edit this game';
  end if;

  update games
  set played_at = coalesce(_played_at, played_at),
      game_type = coalesce(nullif(trim(_game_type), ''), game_type)
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

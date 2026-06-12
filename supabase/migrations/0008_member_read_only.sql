-- Invited members are read-only.
--
-- pod_members.role has existed since 0001 ('owner' | 'member') but was never
-- enforced: any member could log/edit games, manage players, and edit saved
-- commanders. This migration restricts every write to the pod owner, so people
-- who join via an invite code can browse the game log and stats but cannot
-- change anything.
--
-- Reads are untouched. Members can still leave a pod (self-delete from
-- pod_members, policy from 0003).

-- ---------------------------------------------------------------------------
-- Helper: can the current user edit this game's pod (i.e. owns it)?
-- Mirrors can_access_game from 0002 but checks ownership instead of membership.
-- ---------------------------------------------------------------------------
create or replace function public.can_edit_game(_game_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from games g
    join pods p on p.id = g.pod_id
    where g.id = _game_id and p.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- players — owner-only writes
-- ---------------------------------------------------------------------------
drop policy if exists "players: members can add"    on public.players;
drop policy if exists "players: members can edit"   on public.players;
drop policy if exists "players: members can delete" on public.players;

create policy "players: owner can add"
  on public.players for insert
  with check (is_pod_owner(pod_id));

create policy "players: owner can edit"
  on public.players for update
  using (is_pod_owner(pod_id))
  with check (is_pod_owner(pod_id));

create policy "players: owner can delete"
  on public.players for delete
  using (is_pod_owner(pod_id));

-- ---------------------------------------------------------------------------
-- games — owner-only insert/update (delete was already owner-only in 0003)
-- ---------------------------------------------------------------------------
drop policy if exists "games: members can insert" on public.games;
drop policy if exists "games: members can edit"   on public.games;

create policy "games: owner can insert"
  on public.games for insert
  with check (is_pod_owner(pod_id));

create policy "games: owner can edit"
  on public.games for update
  using (is_pod_owner(pod_id))
  with check (is_pod_owner(pod_id));

-- ---------------------------------------------------------------------------
-- game_players — owner-only writes
-- ---------------------------------------------------------------------------
drop policy if exists "game_players: members can insert" on public.game_players;
drop policy if exists "game_players: members can edit"   on public.game_players;
drop policy if exists "game_players: members can delete" on public.game_players;

create policy "game_players: owner can insert"
  on public.game_players for insert
  with check (can_edit_game(game_id));

create policy "game_players: owner can edit"
  on public.game_players for update
  using (can_edit_game(game_id))
  with check (can_edit_game(game_id));

create policy "game_players: owner can delete"
  on public.game_players for delete
  using (can_edit_game(game_id));

-- ---------------------------------------------------------------------------
-- player_commanders — owner-only writes (read policy from 0004 stays)
-- ---------------------------------------------------------------------------
drop policy if exists "pod members can insert player commanders" on public.player_commanders;
drop policy if exists "pod members can update player commanders" on public.player_commanders;
drop policy if exists "pod members can delete player commanders" on public.player_commanders;

create policy "pod owner can insert player commanders"
  on public.player_commanders for insert
  with check (
    exists (
      select 1 from public.players pl
      where pl.id = player_commanders.player_id
        and is_pod_owner(pl.pod_id)
    )
  );

create policy "pod owner can update player commanders"
  on public.player_commanders for update
  using (
    exists (
      select 1 from public.players pl
      where pl.id = player_commanders.player_id
        and is_pod_owner(pl.pod_id)
    )
  )
  with check (
    exists (
      select 1 from public.players pl
      where pl.id = player_commanders.player_id
        and is_pod_owner(pl.pod_id)
    )
  );

create policy "pod owner can delete player commanders"
  on public.player_commanders for delete
  using (
    exists (
      select 1 from public.players pl
      where pl.id = player_commanders.player_id
        and is_pod_owner(pl.pod_id)
    )
  );

-- ---------------------------------------------------------------------------
-- log_game / update_game — these RPCs are SECURITY DEFINER, so they bypass the
-- policies above and must enforce ownership themselves. Redefined from 0007
-- with only the access check changed (member -> owner).
-- ---------------------------------------------------------------------------
create or replace function public.log_game(
  _pod_id text,
  _played_at date,
  _game_type text,
  _participants jsonb,
  _note text default null
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
  if not is_pod_owner(pod_uuid) then
    raise exception 'Only the pod owner can log games';
  end if;

  insert into games (pod_id, played_at, game_type, note, logged_by_user_id)
  values (
    pod_uuid,
    coalesce(_played_at, current_date),
    coalesce(nullif(trim(_game_type), ''), 'commander'),
    nullif(trim(_note), ''),
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
  _note text default null
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
  if not can_edit_game(game_uuid) then
    raise exception 'Only the pod owner can edit games';
  end if;

  update games
  set played_at = coalesce(_played_at, played_at),
      game_type = coalesce(nullif(trim(_game_type), ''), game_type),
      note = nullif(trim(_note), '')
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

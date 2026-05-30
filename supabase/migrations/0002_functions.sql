-- Helper functions and RPCs.
--
-- The membership/ownership checks are SECURITY DEFINER so they can read
-- pod_members / pods without tripping over the very RLS policies that call
-- them — this is the standard way to avoid infinite recursion in policies.

-- ---------------------------------------------------------------------------
-- Access-check helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_pod_member(_pod_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from pod_members
    where pod_id = _pod_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_pod_owner(_pod_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from pods
    where id = _pod_id and owner_id = auth.uid()
  );
$$;

-- Can the current user see/touch rows belonging to this game's pod?
create or replace function public.can_access_game(_game_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from games g
    join pod_members m on m.pod_id = g.pod_id
    where g.id = _game_id and m.user_id = auth.uid()
  );
$$;

-- Short, human-friendly invite code (avoids ambiguous chars like 0/O, 1/I).
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_pod — insert the pod + the owner's membership atomically.
-- ---------------------------------------------------------------------------
create or replace function public.create_pod(_name text)
returns public.pods
language plpgsql
security definer
set search_path = public
as $$
declare
  new_pod public.pods;
  code text;
  attempts int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Retry a few times in the (very unlikely) event of a code collision.
  loop
    code := generate_invite_code();
    attempts := attempts + 1;
    begin
      insert into pods (name, owner_id, invite_code)
      values (trim(_name), auth.uid(), code)
      returning * into new_pod;
      exit;
    exception when unique_violation then
      if attempts >= 5 then raise; end if;
    end;
  end loop;

  insert into pod_members (pod_id, user_id, role)
  values (new_pod.id, auth.uid(), 'owner');

  return new_pod;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_pod — look up an invite code and add the caller as a member.
-- ---------------------------------------------------------------------------
create or replace function public.join_pod(_invite_code text)
returns public.pods
language plpgsql
security definer
set search_path = public
as $$
declare
  target_pod public.pods;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into target_pod
  from pods
  where invite_code = upper(trim(_invite_code));

  if target_pod.id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into pod_members (pod_id, user_id, role)
  values (target_pod.id, auth.uid(), 'member')
  on conflict (pod_id, user_id) do nothing;

  return target_pod;
end;
$$;

-- ---------------------------------------------------------------------------
-- log_game — insert a game and its participants atomically.
-- _participants is a jsonb array of:
--   { player_id, commander?, partner_commander?, is_winner? }
-- ---------------------------------------------------------------------------
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
    insert into game_players (game_id, player_id, commander, partner_commander, is_winner)
    values (
      new_game.id,
      (participant->>'player_id')::uuid,
      nullif(trim(participant->>'commander'), ''),
      nullif(trim(participant->>'partner_commander'), ''),
      coalesce((participant->>'is_winner')::boolean, false)
    );
  end loop;

  return new_game;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_game — edit a game's metadata and replace its participants.
-- Any member can edit (owner-only restriction applies to *deletes*).
-- ---------------------------------------------------------------------------
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
    insert into game_players (game_id, player_id, commander, partner_commander, is_winner)
    values (
      game_uuid,
      (participant->>'player_id')::uuid,
      nullif(trim(participant->>'commander'), ''),
      nullif(trim(participant->>'partner_commander'), ''),
      coalesce((participant->>'is_winner')::boolean, false)
    );
  end loop;

  return edited_game;
end;
$$;

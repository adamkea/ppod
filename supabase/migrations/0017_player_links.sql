-- Player ↔ account links.
--
-- players.user_id has existed since 0001 ("null = just a name; set = linked to
-- an account") but nothing ever set it. This migration makes the link real:
--
--   * A player has at most one account, and an account at most one player per
--     pod (partial unique index below).
--   * Only a member of the pod can be linked to one of its players.
--   * A member *claims* an unlinked player ("this is me") — it applies at once,
--     no approval step; pods are small and the owner can undo it.
--   * The owner can link any member to any player, or unlink anyone.
--   * The owner or the linked user can unlink; leaving the pod unlinks too.
--
-- Games and stats are keyed by player_id, so linking never touches game data.
-- Since 0008 only the owner may write `players` directly, so the member-facing
-- operations go through security-definer RPCs that do their own checks.

-- ---------------------------------------------------------------------------
-- Clean up anything the owner may have hand-set before the rules existed, so
-- the unique index can be built: keep the oldest link per (pod, user), and
-- drop links to accounts that aren't members of the pod.
-- ---------------------------------------------------------------------------
update public.players p
set user_id = null
where p.user_id is not null
  and exists (
    select 1 from public.players q
    where q.pod_id = p.pod_id
      and q.user_id = p.user_id
      and (q.created_at, q.id) < (p.created_at, p.id)
  );

update public.players p
set user_id = null
where p.user_id is not null
  and not exists (
    select 1 from public.pod_members m
    where m.pod_id = p.pod_id and m.user_id = p.user_id
  );

create unique index if not exists players_pod_id_user_id_key
  on public.players (pod_id, user_id)
  where user_id is not null;

-- ---------------------------------------------------------------------------
-- claim_player — a member links themselves to an unlinked player.
-- ---------------------------------------------------------------------------
create or replace function public.claim_player(_player_id text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.players;
  existing_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into target
  from players
  where id = _player_id::uuid
  for update;

  if target.id is null then
    raise exception 'Player not found';
  end if;

  if not is_pod_member(target.pod_id) then
    raise exception 'Not a member of this pod';
  end if;

  -- Claiming yourself again is a no-op rather than an error.
  if target.user_id = auth.uid() then
    return target;
  end if;

  if target.user_id is not null then
    raise exception 'That player is already linked to another account';
  end if;

  select name into existing_name
  from players
  where pod_id = target.pod_id and user_id = auth.uid();

  if existing_name is not null then
    raise exception 'You''re already linked to % in this pod — unlink first', existing_name;
  end if;

  update players set user_id = auth.uid()
  where id = target.id
  returning * into target;

  return target;
end;
$$;

-- ---------------------------------------------------------------------------
-- link_player — the owner links a member to a player. Overrides an existing
-- link on the player, and moves the member off any other player in the pod,
-- so the owner never has to unlink first.
-- ---------------------------------------------------------------------------
create or replace function public.link_player(_player_id text, _user_id uuid)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.players;
begin
  select * into target
  from players
  where id = _player_id::uuid
  for update;

  if target.id is null then
    raise exception 'Player not found';
  end if;

  if not is_pod_owner(target.pod_id) then
    raise exception 'Only the pod owner can link accounts';
  end if;

  if not exists (
    select 1 from pod_members
    where pod_id = target.pod_id and user_id = _user_id
  ) then
    raise exception 'That account isn''t a member of this pod';
  end if;

  update players set user_id = null
  where pod_id = target.pod_id and user_id = _user_id and id <> target.id;

  update players set user_id = _user_id
  where id = target.id
  returning * into target;

  return target;
end;
$$;

-- ---------------------------------------------------------------------------
-- unlink_player — the owner, or the linked user themselves.
-- ---------------------------------------------------------------------------
create or replace function public.unlink_player(_player_id text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.players;
begin
  select * into target
  from players
  where id = _player_id::uuid
  for update;

  if target.id is null then
    raise exception 'Player not found';
  end if;

  if not (is_pod_owner(target.pod_id) or target.user_id = auth.uid()) then
    raise exception 'Only the pod owner or the linked account can unlink a player';
  end if;

  update players set user_id = null
  where id = target.id
  returning * into target;

  return target;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaving (or being removed from) a pod drops your link in it.
-- ---------------------------------------------------------------------------
create or replace function public.unlink_player_on_member_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update players set user_id = null
  where pod_id = old.pod_id and user_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists pod_members_unlink_player on public.pod_members;
create trigger pod_members_unlink_player
  after delete on public.pod_members
  for each row execute function public.unlink_player_on_member_delete();

-- ---------------------------------------------------------------------------
-- list_pod_members — the roster with a display name per member, for the
-- owner's "link an account" picker. Members can't read auth.users, so the
-- name is resolved here the same way add_game_comment does it: nickname, else
-- the part of the email before the @.
-- ---------------------------------------------------------------------------
create or replace function public.list_pod_members(_pod_id text)
returns table (
  user_id      uuid,
  role         text,
  display_name text,
  created_at   timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not is_pod_member(_pod_id::uuid) then
    raise exception 'Not a member of this pod';
  end if;

  return query
  select
    m.user_id,
    m.role,
    coalesce(
      nullif(trim(up.nickname), ''),
      split_part(u.email, '@', 1),
      'Member'
    ) as display_name,
    m.created_at
  from pod_members m
  left join user_profiles up on up.user_id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.pod_id = _pod_id::uuid
  order by m.created_at;
end;
$$;

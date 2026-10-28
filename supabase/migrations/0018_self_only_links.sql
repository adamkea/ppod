-- Player links are self-service only, and email addresses stay private.
--
--   * Only the account itself can link to a player (claim_player). The owner
--     can no longer attach a member to a player of their choosing: that put
--     someone else's games and stats on a member's account without asking.
--     The owner can still unlink anyone (unlink_player, unchanged).
--   * Display names no longer fall back to the part of the email before the
--     @, which pod-mates could see on comments and the Members roster. The
--     fallback is now the member's linked player name in the pod, then
--     "Member".

drop function if exists public.link_player(text, uuid);

-- ---------------------------------------------------------------------------
-- list_pod_members — same shape as 0017, without the email fallback.
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
      pl.name,
      'Member'
    ) as display_name,
    m.created_at
  from pod_members m
  left join user_profiles up on up.user_id = m.user_id
  left join players pl on pl.pod_id = m.pod_id and pl.user_id = m.user_id
  where m.pod_id = _pod_id::uuid
  order by m.created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- add_game_comment — same as 0012, without the email fallback.
-- ---------------------------------------------------------------------------
create or replace function public.add_game_comment(
  _game_id text,
  _body text
)
returns public.game_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  game_uuid uuid := _game_id::uuid;
  target_pod public.pods;
  display_name text;
  new_comment public.game_comments;
begin
  if not can_access_game(game_uuid) then
    raise exception 'Not a member of this pod';
  end if;

  select p.* into target_pod
  from games g
  join pods p on p.id = g.pod_id
  where g.id = game_uuid;

  if not target_pod.comments_enabled then
    raise exception 'Comments are disabled for this pod';
  end if;

  if nullif(trim(_body), '') is null then
    raise exception 'Comment cannot be empty';
  end if;

  -- Prefer the caller's chosen nickname, then their linked player name in this
  -- pod, then "Member".
  select nullif(trim(up.nickname), '') into display_name
  from user_profiles up
  where up.user_id = auth.uid();

  if display_name is null then
    select pl.name into display_name
    from players pl
    where pl.pod_id = target_pod.id and pl.user_id = auth.uid()
    limit 1;
  end if;

  insert into game_comments (game_id, user_id, author_name, body)
  values (game_uuid, auth.uid(), coalesce(display_name, 'Member'), trim(_body))
  returning * into new_comment;

  return new_comment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scrub email prefixes already captured as comment author names: use the
-- author's linked player in that pod if they have one, else "Member".
-- ---------------------------------------------------------------------------
update public.game_comments c
set author_name = coalesce(
  (
    select pl.name
    from public.games g
    join public.players pl on pl.pod_id = g.pod_id and pl.user_id = c.user_id
    where g.id = c.game_id
    limit 1
  ),
  'Member'
)
from auth.users u
where u.id = c.user_id
  and c.author_name = split_part(u.email, '@', 1);

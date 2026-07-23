-- User profiles: a per-account nickname and avatar, both editable any time
-- from the profile settings screen.
--
-- The avatar is a Scryfall card artwork — the same art library used for
-- commander art elsewhere in the app — stored as a commander name plus a
-- pinned print id, mirroring the art columns on game_players and
-- player_commanders.

create table if not exists public.user_profiles (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  nickname              text check (nickname is null or char_length(nickname) between 1 and 40),
  avatar_commander_name text,
  avatar_scryfall_id    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- Nickname and avatar are display data shown to pod-mates (comments, rosters),
-- so any signed-in user may read them.
create policy "user_profiles: authenticated can read"
  on public.user_profiles for select
  using (auth.uid() is not null);

create policy "user_profiles: owner can insert"
  on public.user_profiles for insert
  with check (user_id = auth.uid());

create policy "user_profiles: owner can update"
  on public.user_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- add_game_comment — prefer the caller's nickname when capturing the author
-- name. (The app also resolves the live nickname at read time; the stored name
-- is the fallback for users with no profile row.)
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
  -- pod, then the part of their email before the @.
  select nullif(trim(up.nickname), '') into display_name
  from user_profiles up
  where up.user_id = auth.uid();

  if display_name is null then
    select pl.name into display_name
    from players pl
    where pl.pod_id = target_pod.id and pl.user_id = auth.uid()
    limit 1;
  end if;

  if display_name is null then
    select split_part(u.email, '@', 1) into display_name
    from auth.users u
    where u.id = auth.uid();
  end if;

  insert into game_comments (game_id, user_id, author_name, body)
  values (game_uuid, auth.uid(), coalesce(display_name, 'Member'), trim(_body))
  returning * into new_comment;

  return new_comment;
end;
$$;

-- Match comments, opt-in per pod.
--
-- The pod owner can turn comments on from the pod settings screen; when
-- enabled, any pod member can leave comments on a logged game. The author's
-- display name is captured at write time (their linked player name in the pod,
-- else their email prefix) because there is no profiles table to join against.

alter table public.pods
  add column if not exists comments_enabled boolean not null default false;

-- ---------------------------------------------------------------------------
-- game_comments
-- ---------------------------------------------------------------------------
create table if not exists public.game_comments (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index if not exists game_comments_game_id_created_at_idx
  on public.game_comments (game_id, created_at);

alter table public.game_comments enable row level security;

create policy "game_comments: members can read"
  on public.game_comments for select
  using (can_access_game(game_id));

-- Inserts go through add_game_comment() so the comments_enabled check and the
-- author-name capture live in one place; no direct INSERT policy.

create policy "game_comments: author or pod owner can delete"
  on public.game_comments for delete
  using (user_id = auth.uid() or can_edit_game(game_id));

-- ---------------------------------------------------------------------------
-- add_game_comment — insert a comment on a game in a pod the caller belongs
-- to, provided the pod owner has enabled comments.
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

  -- Prefer the caller's linked player name in this pod; fall back to the part
  -- of their email before the @.
  select pl.name into display_name
  from players pl
  where pl.pod_id = target_pod.id and pl.user_id = auth.uid()
  limit 1;

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

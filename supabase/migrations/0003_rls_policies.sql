-- Row-level security. This is what makes shared pods safe: the database, not
-- trusted app code, enforces "you can only see pods you belong to".
--
-- Writes that must stay consistent (creating a pod + its owner membership,
-- joining via invite, logging a game) go through the SECURITY DEFINER RPCs in
-- 0002, so the direct INSERT policies here are intentionally narrow.

alter table public.pods         enable row level security;
alter table public.pod_members  enable row level security;
alter table public.players      enable row level security;
alter table public.games        enable row level security;
alter table public.game_players enable row level security;

-- ---------------------------------------------------------------------------
-- pods
-- ---------------------------------------------------------------------------
create policy "pods: members can read"
  on public.pods for select
  using (is_pod_member(id));

create policy "pods: owner can rename"
  on public.pods for update
  using (is_pod_owner(id))
  with check (is_pod_owner(id));

create policy "pods: owner can delete"
  on public.pods for delete
  using (is_pod_owner(id));
-- (No direct INSERT policy — pods are created via create_pod().)

-- ---------------------------------------------------------------------------
-- pod_members
-- ---------------------------------------------------------------------------
create policy "pod_members: members can read the roster"
  on public.pod_members for select
  using (is_pod_member(pod_id));

create policy "pod_members: owner can update roles"
  on public.pod_members for update
  using (is_pod_owner(pod_id))
  with check (is_pod_owner(pod_id));

-- Owner can remove anyone; a member can remove themselves (leave the pod).
create policy "pod_members: owner removes, or self-leave"
  on public.pod_members for delete
  using (is_pod_owner(pod_id) or user_id = auth.uid());
-- (No direct INSERT policy — membership is created via create_pod()/join_pod().)

-- ---------------------------------------------------------------------------
-- players (any member can manage the name list)
-- ---------------------------------------------------------------------------
create policy "players: members can read"
  on public.players for select
  using (is_pod_member(pod_id));

create policy "players: members can add"
  on public.players for insert
  with check (is_pod_member(pod_id));

create policy "players: members can edit"
  on public.players for update
  using (is_pod_member(pod_id))
  with check (is_pod_member(pod_id));

create policy "players: members can delete"
  on public.players for delete
  using (is_pod_member(pod_id));

-- ---------------------------------------------------------------------------
-- games (members log/edit; owner-only delete)
-- ---------------------------------------------------------------------------
create policy "games: members can read"
  on public.games for select
  using (is_pod_member(pod_id));

create policy "games: members can insert"
  on public.games for insert
  with check (is_pod_member(pod_id));

create policy "games: members can edit"
  on public.games for update
  using (is_pod_member(pod_id))
  with check (is_pod_member(pod_id));

create policy "games: owner can delete"
  on public.games for delete
  using (is_pod_owner(pod_id));

-- ---------------------------------------------------------------------------
-- game_players (follow the parent game's pod membership)
-- ---------------------------------------------------------------------------
create policy "game_players: members can read"
  on public.game_players for select
  using (can_access_game(game_id));

create policy "game_players: members can insert"
  on public.game_players for insert
  with check (can_access_game(game_id));

create policy "game_players: members can edit"
  on public.game_players for update
  using (can_access_game(game_id))
  with check (can_access_game(game_id));

create policy "game_players: members can delete"
  on public.game_players for delete
  using (can_access_game(game_id));

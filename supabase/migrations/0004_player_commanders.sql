-- Player commanders — a saved list of commanders per player profile.
-- Lets players pre-register their decks so game logging can offer a quick-pick
-- instead of typing/searching each time.

create table if not exists public.player_commanders (
  id                uuid primary key default gen_random_uuid(),
  player_id         uuid not null references public.players (id) on delete cascade,
  commander         text not null check (char_length(commander) between 1 and 120),
  partner_commander text     check (partner_commander is null or char_length(partner_commander) between 1 and 120),
  created_at        timestamptz not null default now()
);

create index if not exists player_commanders_player_id_idx on public.player_commanders (player_id);

-- RLS: same pod-membership rules as the players table.
alter table public.player_commanders enable row level security;

create policy "pod members can read player commanders"
  on public.player_commanders for select
  using (
    exists (
      select 1 from public.players pl
      join public.pod_members pm on pm.pod_id = pl.pod_id
      where pl.id = player_commanders.player_id
        and pm.user_id = auth.uid()
    )
  );

create policy "pod members can insert player commanders"
  on public.player_commanders for insert
  with check (
    exists (
      select 1 from public.players pl
      join public.pod_members pm on pm.pod_id = pl.pod_id
      where pl.id = player_commanders.player_id
        and pm.user_id = auth.uid()
    )
  );

create policy "pod members can delete player commanders"
  on public.player_commanders for delete
  using (
    exists (
      select 1 from public.players pl
      join public.pod_members pm on pm.pod_id = pl.pod_id
      where pl.id = player_commanders.player_id
        and pm.user_id = auth.uid()
    )
  );

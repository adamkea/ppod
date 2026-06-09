-- Alternate art for saved commanders.
--
-- Many commanders have multiple printings/artworks. By default the app derives
-- art from the card *name* (Scryfall's default printing). These columns let a
-- player pin a specific Scryfall print id so a chosen alternate artwork is shown
-- instead. NULL means "fall back to the default art for the name".

alter table public.player_commanders
  add column if not exists commander_scryfall_id text,
  add column if not exists partner_scryfall_id   text;

-- Changing the chosen art is an UPDATE, which the original policies (select /
-- insert / delete only) didn't cover. Allow it for pod members, same as the
-- other player_commanders policies.
create policy "pod members can update player commanders"
  on public.player_commanders for update
  using (
    exists (
      select 1 from public.players pl
      join public.pod_members pm on pm.pod_id = pl.pod_id
      where pl.id = player_commanders.player_id
        and pm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.players pl
      join public.pod_members pm on pm.pod_id = pl.pod_id
      where pl.id = player_commanders.player_id
        and pm.user_id = auth.uid()
    )
  );

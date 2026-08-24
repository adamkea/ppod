-- Series: record the Magic set the series is played in.
--
-- A series is usually a draft of one standard set, so the set is the series'
-- identity as much as its name is. Storing the set lets the app show that
-- set's symbol beside the series wherever a series is listed.
--
-- Three columns rather than a foreign key to a sets table: Scryfall is the
-- source of truth for sets, and denormalising the name and icon uri here keeps
-- a series row self-describing (a series still renders if Scryfall is down or
-- a set is later renamed). `set_code` is the stable Scryfall set code.

alter table public.series
  add column if not exists set_code text
    check (set_code is null or char_length(set_code) between 1 and 10),
  add column if not exists set_name text
    check (set_name is null or char_length(set_name) between 1 and 120),
  add column if not exists set_icon_uri text;

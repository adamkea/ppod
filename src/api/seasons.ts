import { supabase } from '@/lib/supabase';
import type { Season, SeasonFormat } from '@/types/database';

export async function listSeasons(podId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('pod_id', podId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Season[];
}

export async function getSeason(seasonId: string): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', seasonId)
    .single();
  if (error) throw error;
  return data as Season;
}

// The name and format fields a season is created or edited with. `target` is
// ignored for an open season — the database rejects a target on one.
export interface SeasonInput {
  name: string;
  format: SeasonFormat;
  target: number | null;
}

function toRow(input: SeasonInput) {
  return {
    name: input.name.trim(),
    format: input.format,
    target: input.format === 'open' ? null : input.target,
  };
}

export async function createSeason(podId: string, input: SeasonInput): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .insert({ pod_id: podId, ...toRow(input) })
    .select()
    .single();
  if (error) throw error;
  return data as Season;
}

// Owner-only at the RLS layer. Changing the format re-derives the season's
// state from the games it already holds: raising a target can reopen a season
// that had been decided, which is how a pod keeps playing past a finish line.
export async function updateSeason(seasonId: string, input: SeasonInput): Promise<void> {
  const { error } = await supabase
    .from('seasons')
    .update(toRow(input))
    .eq('id', seasonId);
  if (error) throw error;
}

// Owner-only at the RLS layer. Games in the season are kept — the database
// unassigns them (games.season_id is `on delete set null`).
export async function deleteSeason(seasonId: string): Promise<void> {
  const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
  if (error) throw error;
}

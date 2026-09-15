import { supabase } from '@/lib/supabase';
import type { Season } from '@/types/database';

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

export async function createSeason(podId: string, name: string): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .insert({ pod_id: podId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Season;
}

export async function renameSeason(seasonId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('seasons')
    .update({ name: name.trim() })
    .eq('id', seasonId);
  if (error) throw error;
}

// Owner-only at the RLS layer. Games in the season are kept — the database
// unassigns them (games.season_id is `on delete set null`).
export async function deleteSeason(seasonId: string): Promise<void> {
  const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
  if (error) throw error;
}

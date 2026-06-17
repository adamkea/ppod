import { supabase } from '@/lib/supabase';
import type {
  Series,
  SeriesGame,
  SeriesGameWithSeries,
  SeriesPlayer,
} from '@/types/database';

export async function listSeries(podId: string): Promise<Series[]> {
  const { data, error } = await supabase
    .from('series')
    .select('*')
    .eq('pod_id', podId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Series[];
}

export async function getSeries(seriesId: string): Promise<Series> {
  const { data, error } = await supabase
    .from('series')
    .select('*')
    .eq('id', seriesId)
    .single();
  if (error) throw error;
  return data as Series;
}

export async function listSeriesPlayers(seriesId: string): Promise<SeriesPlayer[]> {
  const { data, error } = await supabase
    .from('series_players')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SeriesPlayer[];
}

interface CreateSeriesInput {
  podId: string;
  name: string;
  playerIds: string[];
  targetGames: number | null;
}

export async function createSeries(input: CreateSeriesInput): Promise<Series> {
  const { data, error } = await supabase
    .from('series')
    .insert({
      pod_id: input.podId,
      name: input.name.trim() || null,
      target_games: input.targetGames,
    })
    .select()
    .single();
  if (error) throw error;
  const series = data as Series;

  const roster = input.playerIds.map((playerId) => ({
    series_id: series.id,
    player_id: playerId,
  }));
  const { error: rosterError } = await supabase.from('series_players').insert(roster);
  if (rosterError) {
    // Roll back the series so we don't leave one with an empty roster.
    await supabase.from('series').delete().eq('id', series.id);
    throw rosterError;
  }

  return series;
}

export async function deleteSeries(seriesId: string): Promise<void> {
  const { error } = await supabase.from('series').delete().eq('id', seriesId);
  if (error) throw error;
}

export async function listSeriesGames(seriesId: string): Promise<SeriesGame[]> {
  const { data, error } = await supabase
    .from('series_games')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SeriesGame[];
}

// All series games across every series in a pod, newest first, joined with the
// parent series' name. Powers the series rows in the pod's main game log.
export async function listPodSeriesGames(
  podId: string,
): Promise<SeriesGameWithSeries[]> {
  const { data, error } = await supabase
    .from('series_games')
    .select('*, series!inner(name, pod_id)')
    .eq('series.pod_id', podId)
    .order('played_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SeriesGameWithSeries[];
}

interface LogSeriesGameInput {
  seriesId: string;
  playerOneId: string;
  playerTwoId: string;
  winnerPlayerId: string | null; // null = draw
  playedAt: string; // YYYY-MM-DD
  note: string;
}

export async function logSeriesGame(input: LogSeriesGameInput): Promise<SeriesGame> {
  const { data, error } = await supabase
    .from('series_games')
    .insert({
      series_id: input.seriesId,
      player_one_id: input.playerOneId,
      player_two_id: input.playerTwoId,
      winner_player_id: input.winnerPlayerId,
      played_at: input.playedAt,
      note: input.note.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SeriesGame;
}

export async function deleteSeriesGame(seriesGameId: string): Promise<void> {
  const { error } = await supabase
    .from('series_games')
    .delete()
    .eq('id', seriesGameId);
  if (error) throw error;
}

import { supabase } from '@/lib/supabase';
import type { Series, SeriesGame } from '@/types/database';

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

interface CreateSeriesInput {
  podId: string;
  name: string;
  playerOneId: string;
  playerTwoId: string;
  targetGames: number | null;
}

export async function createSeries(input: CreateSeriesInput): Promise<Series> {
  const { data, error } = await supabase
    .from('series')
    .insert({
      pod_id: input.podId,
      name: input.name.trim() || null,
      player_one_id: input.playerOneId,
      player_two_id: input.playerTwoId,
      target_games: input.targetGames,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Series;
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

interface LogSeriesGameInput {
  seriesId: string;
  winnerPlayerId: string | null; // null = draw
  playedAt: string; // YYYY-MM-DD
  note: string;
}

export async function logSeriesGame(input: LogSeriesGameInput): Promise<SeriesGame> {
  const { data, error } = await supabase
    .from('series_games')
    .insert({
      series_id: input.seriesId,
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

import { supabase } from '@/lib/supabase';
import type { GameWithPlayers, ParticipantInput } from '@/types/database';

interface SaveGameInput {
  podId: string;
  playedAt: string; // YYYY-MM-DD
  gameType: string;
  participants: ParticipantInput[];
}

const SELECT_WITH_PLAYERS =
  '*, game_players(*, players(id, name))';

export async function listGames(podId: string): Promise<GameWithPlayers[]> {
  const { data, error } = await supabase
    .from('games')
    .select(SELECT_WITH_PLAYERS)
    .eq('pod_id', podId)
    .order('played_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GameWithPlayers[];
}

export async function getGame(gameId: string): Promise<GameWithPlayers> {
  const { data, error } = await supabase
    .from('games')
    .select(SELECT_WITH_PLAYERS)
    .eq('id', gameId)
    .single();
  if (error) throw error;
  return data as GameWithPlayers;
}

function toRpcParticipants(participants: ParticipantInput[]) {
  return participants.map((p) => ({
    player_id: p.player_id,
    commander: p.commander,
    partner_commander: p.partner_commander,
    commander_scryfall_id: p.commander_scryfall_id,
    partner_scryfall_id: p.partner_scryfall_id,
    is_winner: p.is_winner,
  }));
}

export async function logGame(input: SaveGameInput): Promise<void> {
  const { error } = await supabase.rpc('log_game', {
    _pod_id: input.podId,
    _played_at: input.playedAt,
    _game_type: input.gameType,
    _participants: toRpcParticipants(input.participants),
  });
  if (error) throw error;
}

export async function updateGame(
  gameId: string,
  input: Omit<SaveGameInput, 'podId'>,
): Promise<void> {
  const { error } = await supabase.rpc('update_game', {
    _game_id: gameId,
    _played_at: input.playedAt,
    _game_type: input.gameType,
    _participants: toRpcParticipants(input.participants),
  });
  if (error) throw error;
}

export async function deleteGame(gameId: string): Promise<void> {
  // Owner-only at the RLS layer.
  const { error } = await supabase.from('games').delete().eq('id', gameId);
  if (error) throw error;
}

import { supabase } from '@/lib/supabase';
import type { Player } from '@/types/database';

export async function listPlayers(podId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('pod_id', podId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addPlayer(podId: string, name: string): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .insert({ pod_id: podId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renamePlayer(playerId: string, name: string): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .update({ name: name.trim() })
    .eq('id', playerId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlayer(playerId: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) throw error;
}

// Linking goes through RPCs: members can't write `players` directly, and the
// functions enforce one player per account per pod.

/** Link the signed-in user to an unlinked player ("this is me"). */
export async function claimPlayer(playerId: string): Promise<Player> {
  const { data, error } = await supabase.rpc('claim_player', { _player_id: playerId });
  if (error) throw error;
  return data as Player;
}

/** The owner, or the linked user themselves. */
export async function unlinkPlayer(playerId: string): Promise<Player> {
  const { data, error } = await supabase.rpc('unlink_player', { _player_id: playerId });
  if (error) throw error;
  return data as Player;
}

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

import { supabase } from '@/lib/supabase';
import type { PlayerCommander } from '@/types/database';

export async function listPlayerCommanders(playerId: string): Promise<PlayerCommander[]> {
  const { data, error } = await supabase
    .from('player_commanders')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addPlayerCommander(
  playerId: string,
  commander: string,
  partnerCommander?: string,
): Promise<PlayerCommander> {
  const { data, error } = await supabase
    .from('player_commanders')
    .insert({
      player_id: playerId,
      commander: commander.trim(),
      partner_commander: partnerCommander?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlayerCommander(id: string): Promise<void> {
  const { error } = await supabase.from('player_commanders').delete().eq('id', id);
  if (error) throw error;
}

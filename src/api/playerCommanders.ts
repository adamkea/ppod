import { supabase } from '@/lib/supabase';
import type { PlayerCommander } from '@/types/database';

export interface AddCommanderInput {
  commander: string;
  partnerCommander?: string | null;
  /** Chosen alternate-art print ids; null/undefined = use the default printing. */
  commanderScryfallId?: string | null;
  partnerScryfallId?: string | null;
}

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
  input: AddCommanderInput,
): Promise<PlayerCommander> {
  const { data, error } = await supabase
    .from('player_commanders')
    .insert({
      player_id: playerId,
      commander: input.commander.trim(),
      partner_commander: input.partnerCommander?.trim() || null,
      commander_scryfall_id: input.commanderScryfallId ?? null,
      partner_scryfall_id: input.partnerScryfallId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Patch the pinned art for an existing saved commander. Pass only the side(s)
// you're changing.
export async function updatePlayerCommanderArt(
  id: string,
  patch: { commander_scryfall_id?: string | null; partner_scryfall_id?: string | null },
): Promise<PlayerCommander> {
  const { data, error } = await supabase
    .from('player_commanders')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlayerCommander(id: string): Promise<void> {
  const { error } = await supabase.from('player_commanders').delete().eq('id', id);
  if (error) throw error;
}

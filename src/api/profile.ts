import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types/database';

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listProfiles(userIds: string[]): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', userIds);
  if (error) throw error;
  return data ?? [];
}

export interface ProfilePatch {
  nickname?: string | null;
  avatar_commander_name?: string | null;
  avatar_scryfall_id?: string | null;
}

// Upsert so the first save creates the row; on conflict only the patched
// columns are overwritten, so nickname and avatar can be saved independently.
export async function upsertProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

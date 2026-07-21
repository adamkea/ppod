import { supabase } from '@/lib/supabase';
import type { GameComment } from '@/types/database';

export async function listGameComments(gameId: string): Promise<GameComment[]> {
  const { data, error } = await supabase
    .from('game_comments')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GameComment[];
}

// The game_id of every comment in the pod — grouped client-side into per-game
// counts for the feed. One row per comment, but comments are short-lived text
// so the volume stays small for a pod tracker.
export async function listPodCommentGameIds(podId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('game_comments')
    .select('game_id, games!inner(pod_id)')
    .eq('games.pod_id', podId);
  if (error) throw error;
  return (data ?? []).map((row) => row.game_id as string);
}

export async function addGameComment(
  gameId: string,
  body: string,
): Promise<GameComment> {
  const { data, error } = await supabase.rpc('add_game_comment', {
    _game_id: gameId,
    _body: body,
  });
  if (error) throw error;
  return data as GameComment;
}

export async function deleteGameComment(commentId: string): Promise<void> {
  // Author or pod owner at the RLS layer.
  const { error } = await supabase
    .from('game_comments')
    .delete()
    .eq('id', commentId);
  if (error) throw error;
}

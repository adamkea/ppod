import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as commentsApi from '@/api/comments';
import { queryKeys } from './queryKeys';

export function useGameComments(gameId: string) {
  return useQuery({
    queryKey: queryKeys.gameComments(gameId),
    queryFn: () => commentsApi.listGameComments(gameId),
    enabled: !!gameId,
  });
}

/** Per-game comment counts for the pod feed. Skipped while comments are off. */
export function useCommentCounts(podId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.podCommentCounts(podId),
    queryFn: async () => {
      const gameIds = await commentsApi.listPodCommentGameIds(podId);
      const counts = new Map<string, number>();
      for (const id of gameIds) counts.set(id, (counts.get(id) ?? 0) + 1);
      return counts;
    },
    enabled: !!podId && enabled,
  });
}

export function useAddComment(podId: string, gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => commentsApi.addGameComment(gameId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameComments(gameId) });
      qc.invalidateQueries({ queryKey: queryKeys.podCommentCounts(podId) });
    },
  });
}

export function useDeleteComment(podId: string, gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentsApi.deleteGameComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameComments(gameId) });
      qc.invalidateQueries({ queryKey: queryKeys.podCommentCounts(podId) });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as gamesApi from '@/api/games';
import type { ParticipantInput } from '@/types/database';
import { queryKeys } from './queryKeys';

export function useGames(podId: string) {
  return useQuery({
    queryKey: queryKeys.games(podId),
    queryFn: () => gamesApi.listGames(podId),
    enabled: !!podId,
  });
}

export function useGame(gameId: string) {
  return useQuery({
    queryKey: queryKeys.game(gameId),
    queryFn: () => gamesApi.getGame(gameId),
    enabled: !!gameId,
  });
}

interface SaveArgs {
  playedAt: string;
  gameType: string;
  note: string;
  participants: ParticipantInput[];
}

export function useLogGame(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: SaveArgs) => gamesApi.logGame({ podId, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.games(podId) }),
  });
}

export function useUpdateGame(podId: string, gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: SaveArgs) => gamesApi.updateGame(gameId, args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.games(podId) });
      qc.invalidateQueries({ queryKey: queryKeys.game(gameId) });
    },
  });
}

export function useDeleteGame(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => gamesApi.deleteGame(gameId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.games(podId) }),
  });
}

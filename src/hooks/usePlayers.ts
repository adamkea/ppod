import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as playersApi from '@/api/players';
import { queryKeys } from './queryKeys';

export function usePlayers(podId: string) {
  return useQuery({
    queryKey: queryKeys.players(podId),
    queryFn: () => playersApi.listPlayers(podId),
    enabled: !!podId,
  });
}

export function useAddPlayer(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => playersApi.addPlayer(podId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players(podId) }),
  });
}

export function useRenamePlayer(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { playerId: string; name: string }) =>
      playersApi.renamePlayer(args.playerId, args.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players(podId) }),
  });
}

export function useDeletePlayer(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) => playersApi.deletePlayer(playerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.players(podId) });
      // Removing a player can change stats/game rosters.
      qc.invalidateQueries({ queryKey: queryKeys.games(podId) });
    },
  });
}

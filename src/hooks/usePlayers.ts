import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as playersApi from '@/api/players';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from './queryKeys';

export function usePlayers(podId: string) {
  return useQuery({
    queryKey: queryKeys.players(podId),
    queryFn: () => playersApi.listPlayers(podId),
    enabled: !!podId,
  });
}

/** The player in this pod linked to the signed-in user, if any. */
export function useMyPlayer(podId: string) {
  const { session } = useAuth();
  const players = usePlayers(podId);
  const userId = session?.user.id;
  return {
    ...players,
    data: userId ? players.data?.find((p) => p.user_id === userId) ?? null : null,
  };
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

// Linking only changes players.user_id, so the players list is all that needs
// refreshing; screens join it against the member roster themselves.
function useLinkMutation<A>(podId: string, fn: (args: A) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players(podId) }),
  });
}

export function useClaimPlayer(podId: string) {
  return useLinkMutation(podId, (playerId: string) => playersApi.claimPlayer(playerId));
}

export function useLinkPlayer(podId: string) {
  return useLinkMutation(podId, (args: { playerId: string; userId: string }) =>
    playersApi.linkPlayer(args.playerId, args.userId),
  );
}

export function useUnlinkPlayer(podId: string) {
  return useLinkMutation(podId, (playerId: string) => playersApi.unlinkPlayer(playerId));
}

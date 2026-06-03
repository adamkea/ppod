import { useMemo } from 'react';

import { computePlayerProfileStats, computePlayerStats } from '@/lib/stats';
import { useGames } from './useGames';
import { usePlayers } from './usePlayers';

/** Wins-per-player for a pod, derived from games + players. */
export function usePlayerStats(podId: string) {
  const playersQuery = usePlayers(podId);
  const gamesQuery = useGames(podId);

  const stats = useMemo(
    () => computePlayerStats(playersQuery.data ?? [], gamesQuery.data ?? []),
    [playersQuery.data, gamesQuery.data],
  );

  return {
    stats,
    isLoading: playersQuery.isLoading || gamesQuery.isLoading,
    isError: playersQuery.isError || gamesQuery.isError,
    refetch: () => {
      playersQuery.refetch();
      gamesQuery.refetch();
    },
  };
}

/** One player's overall record plus a per-commander breakdown for charts. */
export function usePlayerProfileStats(podId: string, playerId: string) {
  const gamesQuery = useGames(podId);

  const stats = useMemo(
    () => computePlayerProfileStats(playerId, gamesQuery.data ?? []),
    [playerId, gamesQuery.data],
  );

  return {
    stats,
    isLoading: gamesQuery.isLoading,
    isError: gamesQuery.isError,
  };
}

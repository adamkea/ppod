import { useMemo } from 'react';

import { computePlayerStats } from '@/lib/stats';
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

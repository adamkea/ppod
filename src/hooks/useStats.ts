import { useMemo } from 'react';

import { computeSeasonStats } from '@/lib/seasons';
import { computePlayerStats } from '@/lib/stats';
import { useGames } from './useGames';
import { usePlayers } from './usePlayers';

/**
 * Wins-per-player for a pod, derived from games + players. Pass a `seasonId`
 * to count only the games filed under that season; omit it (or pass null) for
 * the pod's all-time table.
 */
export function usePlayerStats(podId: string, seasonId?: string | null) {
  const playersQuery = usePlayers(podId);
  const gamesQuery = useGames(podId);

  const stats = useMemo(() => {
    const players = playersQuery.data ?? [];
    const games = gamesQuery.data ?? [];
    return seasonId
      ? computeSeasonStats(players, games, seasonId)
      : computePlayerStats(players, games);
  }, [playersQuery.data, gamesQuery.data, seasonId]);

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

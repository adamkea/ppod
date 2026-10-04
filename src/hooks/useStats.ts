import { useMemo } from 'react';

import { computeSeasonStats, gamesInSeason } from '@/lib/seasons';
import { computeCommanderStats, computePlayerStats } from '@/lib/stats';
import { useGames } from './useGames';
import { usePlayers } from './usePlayers';

/**
 * Wins-per-player for a pod, derived from games + players. Pass a `seasonId`
 * to count only the games filed under that season; omit it (or pass null) for
 * the pod's all-time table. `commanderStats` is the same games broken down by
 * commander and the player who piloted it.
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

  const commanderStats = useMemo(() => {
    const games = gamesQuery.data ?? [];
    return computeCommanderStats(seasonId ? gamesInSeason(games, seasonId) : games);
  }, [gamesQuery.data, seasonId]);

  return {
    stats,
    commanderStats,
    isLoading: playersQuery.isLoading || gamesQuery.isLoading,
    isError: playersQuery.isError || gamesQuery.isError,
    refetch: () => {
      playersQuery.refetch();
      gamesQuery.refetch();
    },
  };
}

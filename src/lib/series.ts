import type { Series, SeriesGame, SeriesGameWithSeries } from '@/types/database';

export interface PlayerStanding {
  playerId: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * Per-player standings for a series: games played, wins, losses, draws.
 * Every roster player is included (so someone with no games still shows),
 * sorted by wins desc, then win rate, then games played.
 */
export function computeStandings(
  rosterPlayerIds: string[],
  games: SeriesGame[],
): PlayerStanding[] {
  const standings = new Map<string, PlayerStanding>();
  const ensure = (id: string) => {
    let s = standings.get(id);
    if (!s) {
      s = { playerId: id, played: 0, wins: 0, losses: 0, draws: 0 };
      standings.set(id, s);
    }
    return s;
  };

  for (const id of rosterPlayerIds) ensure(id);

  for (const g of games) {
    const one = ensure(g.player_one_id);
    const two = ensure(g.player_two_id);
    one.played += 1;
    two.played += 1;

    if (g.winner_player_id === null) {
      one.draws += 1;
      two.draws += 1;
    } else if (g.winner_player_id === g.player_one_id) {
      one.wins += 1;
      two.losses += 1;
    } else {
      two.wins += 1;
      one.losses += 1;
    }
  }

  const winRate = (s: PlayerStanding) => (s.played === 0 ? 0 : s.wins / s.played);

  return [...standings.values()].sort(
    (a, b) => b.wins - a.wins || winRate(b) - winRate(a) || b.played - a.played,
  );
}

// A whole series condensed to a single row for the pod's main game log.
export interface SeriesFeedSummary {
  id: string;
  name: string | null;
  playedAt: string; // date the series sits at in the feed (its latest game)
  createdAt: string; // tiebreak for ordering within a day
  gameCount: number;
  leaderPlayerId: string | null;
  leaderWins: number;
}

/**
 * Condense each series into one feed summary: its game count and current
 * leader, anchored to its most recent game's date (or its creation date if no
 * games have been logged yet) so an active series surfaces with its last game.
 */
export function summarizeSeriesForFeed(
  seriesList: Series[],
  seriesGames: SeriesGameWithSeries[],
): SeriesFeedSummary[] {
  const gamesBySeries = new Map<string, SeriesGameWithSeries[]>();
  for (const g of seriesGames) {
    const bucket = gamesBySeries.get(g.series_id);
    if (bucket) bucket.push(g);
    else gamesBySeries.set(g.series_id, [g]);
  }

  return seriesList.map((s) => {
    const games = gamesBySeries.get(s.id) ?? [];
    let playedAt = s.created_at.slice(0, 10);
    let createdAt = s.created_at;
    for (const g of games) {
      if (g.played_at > playedAt) playedAt = g.played_at;
      if (g.created_at > createdAt) createdAt = g.created_at;
    }

    const leader = computeStandings([], games).find((st) => st.wins > 0) ?? null;

    return {
      id: s.id,
      name: s.name,
      playedAt,
      createdAt,
      gameCount: games.length,
      leaderPlayerId: leader?.playerId ?? null,
      leaderWins: leader?.wins ?? 0,
    };
  });
}

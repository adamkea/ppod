import { computePlayerStats } from '@/lib/stats';
import type { GameWithPlayers, Player, PlayerStat, Season } from '@/types/database';

/**
 * The pod's games that are filed under one season, in the order the game log
 * already holds them (newest first).
 */
export function gamesInSeason(
  games: GameWithPlayers[],
  seasonId: string,
): GameWithPlayers[] {
  return games.filter((g) => g.season_id === seasonId);
}

/**
 * Standings for a season: the same wins-per-player table as the pod's overall
 * stats, counted over that season's games alone. Players with no games in the
 * season are dropped, since a season leaderboard listing everyone at zero
 * would bury the people actually playing.
 */
export function computeSeasonStats(
  players: Player[],
  games: GameWithPlayers[],
  seasonId: string,
): PlayerStat[] {
  return computePlayerStats(players, gamesInSeason(games, seasonId)).filter(
    (s) => s.games_played > 0,
  );
}

// A season condensed to one row for the seasons list.
export interface SeasonSummary {
  season: Season;
  gameCount: number;
  lastPlayedAt: string | null; // null until the season has a game
  // Top of the standings, and only when they've actually won something —
  // otherwise there is no leader to crown yet.
  leader: PlayerStat | null;
}

export function summarizeSeasons(
  seasons: Season[],
  games: GameWithPlayers[],
  players: Player[],
): SeasonSummary[] {
  return seasons.map((season) => {
    const seasonGames = gamesInSeason(games, season.id);
    let lastPlayedAt: string | null = null;
    for (const g of seasonGames) {
      if (lastPlayedAt === null || g.played_at > lastPlayedAt) lastPlayedAt = g.played_at;
    }

    const standings = computePlayerStats(players, seasonGames);
    const top = standings[0];

    return {
      season,
      gameCount: seasonGames.length,
      lastPlayedAt,
      leader: top && top.wins > 0 ? top : null,
    };
  });
}

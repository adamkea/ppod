import type { GameWithPlayers, Player, PlayerStat } from '@/types/database';

/** Group games into date sections, newest date first. */
export interface DateSection {
  date: string; // YYYY-MM-DD
  games: GameWithPlayers[];
}

export function groupGamesByDate(games: GameWithPlayers[]): DateSection[] {
  const byDate = new Map<string, GameWithPlayers[]>();
  for (const game of games) {
    const bucket = byDate.get(game.played_at);
    if (bucket) bucket.push(game);
    else byDate.set(game.played_at, [game]);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, gs]) => ({ date, games: gs }));
}

/**
 * Wins and games-played per player, derived from the games list. Includes
 * every player in the pod (so far-listed players with zero games still show),
 * sorted by wins desc then games-played desc then name.
 */
export function computePlayerStats(
  players: Player[],
  games: GameWithPlayers[],
): PlayerStat[] {
  const stats = new Map<string, PlayerStat>();
  for (const p of players) {
    stats.set(p.id, { player_id: p.id, name: p.name, games_played: 0, wins: 0 });
  }

  for (const game of games) {
    for (const gp of game.game_players) {
      let stat = stats.get(gp.player_id);
      if (!stat) {
        // Player appears in a game but isn't in the supplied list (e.g. deleted).
        stat = {
          player_id: gp.player_id,
          name: gp.players?.name ?? 'Unknown',
          games_played: 0,
          wins: 0,
        };
        stats.set(gp.player_id, stat);
      }
      stat.games_played += 1;
      if (gp.is_winner) stat.wins += 1;
    }
  }

  return [...stats.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.games_played - a.games_played ||
      a.name.localeCompare(b.name),
  );
}

/** Comma-separated commander label for a participant. */
export function commanderLabel(
  commander: string | null,
  partner: string | null,
): string {
  return [commander, partner].filter(Boolean).join(' + ');
}

/** Wins and games-played for a single commander (or partner pairing). */
export interface CommanderStat {
  label: string;
  games: number;
  wins: number;
}

/** A single player's record, overall and broken down by commander. */
export interface PlayerProfileStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number; // 0..1
  byCommander: CommanderStat[]; // most wins first, then most games
}

/**
 * Aggregate one player's results across every game they appear in, both
 * overall and per commander. Commander rows are sorted by wins desc, then
 * games desc, then label so the chart reads top-to-bottom by success.
 */
export function computePlayerProfileStats(
  playerId: string,
  games: GameWithPlayers[],
): PlayerProfileStats {
  let gamesPlayed = 0;
  let wins = 0;
  const commanders = new Map<string, CommanderStat>();

  for (const game of games) {
    for (const gp of game.game_players) {
      if (gp.player_id !== playerId) continue;

      gamesPlayed += 1;
      if (gp.is_winner) wins += 1;

      const label = commanderLabel(gp.commander, gp.partner_commander) || 'Unknown';
      let entry = commanders.get(label);
      if (!entry) {
        entry = { label, games: 0, wins: 0 };
        commanders.set(label, entry);
      }
      entry.games += 1;
      if (gp.is_winner) entry.wins += 1;
    }
  }

  const byCommander = [...commanders.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.games - a.games ||
      a.label.localeCompare(b.label),
  );

  return {
    gamesPlayed,
    wins,
    losses: gamesPlayed - wins,
    winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
    byCommander,
  };
}

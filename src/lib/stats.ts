import type { SeriesFeedSummary } from '@/lib/series';
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

// The pod's main log mixes regular games and whole series on one timeline.
export type FeedItem =
  | { kind: 'game'; key: string; played_at: string; created_at: string; game: GameWithPlayers }
  | { kind: 'series'; key: string; played_at: string; created_at: string; series: SeriesFeedSummary };

export interface FeedSection {
  date: string; // YYYY-MM-DD
  items: FeedItem[];
}

/**
 * Merge regular games and series summaries into one date-grouped feed, newest
 * date first and, within a date, newest entry first (by created_at). Each
 * series appears once, not once per game.
 */
export function groupFeedByDate(
  games: GameWithPlayers[],
  series: SeriesFeedSummary[],
): FeedSection[] {
  const items: FeedItem[] = [
    ...games.map((g): FeedItem => ({
      kind: 'game',
      key: `g:${g.id}`,
      played_at: g.played_at,
      created_at: g.created_at,
      game: g,
    })),
    ...series.map((s): FeedItem => ({
      kind: 'series',
      key: `s:${s.id}`,
      played_at: s.playedAt,
      created_at: s.createdAt,
      series: s,
    })),
  ];

  const byDate = new Map<string, FeedItem[]>();
  for (const item of items) {
    const bucket = byDate.get(item.played_at);
    if (bucket) bucket.push(item);
    else byDate.set(item.played_at, [item]);
  }
  for (const bucket of byDate.values()) {
    bucket.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, its]) => ({ date, items: its }));
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

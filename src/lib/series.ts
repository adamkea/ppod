import type { SeriesGame } from '@/types/database';

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

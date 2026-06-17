import type { Series, SeriesGame } from '@/types/database';

export interface SeriesRecord {
  oneWins: number;
  twoWins: number;
  draws: number;
  played: number;
}

/** Tally a series' games into each player's wins (plus draws). */
export function computeSeriesRecord(
  series: Pick<Series, 'player_one_id' | 'player_two_id'>,
  games: SeriesGame[],
): SeriesRecord {
  let oneWins = 0;
  let twoWins = 0;
  let draws = 0;
  for (const g of games) {
    if (g.winner_player_id === series.player_one_id) oneWins += 1;
    else if (g.winner_player_id === series.player_two_id) twoWins += 1;
    else draws += 1;
  }
  return { oneWins, twoWins, draws, played: games.length };
}

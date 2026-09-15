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

/**
 * Where a season stands.
 *
 *   open       — still running, more games to come.
 *   tiebreaker — the finish line has been reached with the top of the table
 *                level, so the season plays on in sudden death until someone
 *                leads outright.
 *   decided    — it has a champion.
 */
export type SeasonStatus = 'open' | 'tiebreaker' | 'decided';

export interface SeasonProgress {
  status: SeasonStatus;
  // Season standings, best first; players with no games in it are left out.
  standings: PlayerStat[];
  gamesPlayed: number;
  // Everyone tied at the top of the table, once anyone has won a game.
  leaders: PlayerStat[];
  // The winner — only once the season is decided.
  champion: PlayerStat | null;
  // best_of: games still to play before the target is reached (0 past it).
  gamesRemaining: number | null;
  // first_to: wins the leader still needs (0 once reached). null otherwise.
  winsRemaining: number | null;
}

/**
 * Work out a season's state from its games.
 *
 * Nothing is stored: correcting a mis-logged winner re-decides the season
 * rather than leaving a stale champion behind. `season_is_decided` in
 * migration 0016 applies exactly this rule in the database, which is what
 * actually stops a game being filed into a finished season.
 *
 * A `best_of` season ends early once the leader can't be caught by the games
 * left — the same reason a best-of-seven stops at 4–0. If the games run out
 * with the top level, nobody has won: the season goes to sudden death and
 * keeps taking games past its target until one player leads alone.
 */
export function computeSeasonProgress(
  season: Season,
  games: GameWithPlayers[],
  players: Player[],
): SeasonProgress {
  const seasonGames = gamesInSeason(games, season.id);
  const standings = computePlayerStats(players, seasonGames).filter(
    (s) => s.games_played > 0,
  );
  const gamesPlayed = seasonGames.length;

  const topWins = standings[0]?.wins ?? 0;
  // A table of players who have all won nothing has no leader to speak of.
  const leaders = topWins > 0 ? standings.filter((s) => s.wins === topWins) : [];
  const runnerUp = standings.find((s) => s.wins < topWins)?.wins ?? 0;
  const soleLeader = leaders.length === 1 ? leaders[0] : null;

  const base = { standings, gamesPlayed, leaders };

  if (season.format === 'open' || season.target === null) {
    return {
      ...base,
      status: 'open',
      champion: null,
      gamesRemaining: null,
      winsRemaining: null,
    };
  }

  if (season.format === 'first_to') {
    const reached = topWins >= season.target;
    // `reached` without a sole leader means two players got there in the same
    // game — vanishingly rare, but it's sudden death like any other tie.
    const status: SeasonStatus = !reached
      ? 'open'
      : soleLeader
        ? 'decided'
        : 'tiebreaker';
    return {
      ...base,
      status,
      champion: status === 'decided' ? soleLeader : null,
      gamesRemaining: null,
      winsRemaining: Math.max(season.target - topWins, 0),
    };
  }

  // best_of
  const gamesRemaining = Math.max(season.target - gamesPlayed, 0);
  // Once the target is reached this is just "one player leads", which is the
  // ordinary ending; before then it's the early clinch.
  const clinched = soleLeader !== null && topWins > runnerUp + gamesRemaining;
  const status: SeasonStatus = clinched
    ? 'decided'
    : gamesPlayed >= season.target
      ? 'tiebreaker'
      : 'open';

  return {
    ...base,
    status,
    champion: clinched ? soleLeader : null,
    gamesRemaining,
    winsRemaining: null,
  };
}

/** "Open-ended" / "First to 10 wins" / "Best of 7 games". */
export function seasonFormatLabel(season: Season): string {
  switch (season.format) {
    case 'first_to':
      return `First to ${season.target} win${season.target === 1 ? '' : 's'}`;
    case 'best_of':
      return `Best of ${season.target} game${season.target === 1 ? '' : 's'}`;
    default:
      return 'Open-ended';
  }
}

/** Short form for a chip or badge: "First to 10", "Best of 7", "Open". */
export function seasonFormatBadge(season: Season): string {
  switch (season.format) {
    case 'first_to':
      return `First to ${season.target}`;
    case 'best_of':
      return `Best of ${season.target}`;
    default:
      return 'Open';
  }
}

/**
 * One line describing how far along a season is — the progress a screen shows
 * under its name. The champion is left out: screens crown the winner
 * themselves so it can carry the winner colour.
 */
export function seasonProgressLabel(
  season: Season,
  progress: SeasonProgress,
): string {
  const { gamesPlayed } = progress;
  const games = `${gamesPlayed} game${gamesPlayed === 1 ? '' : 's'} played`;

  if (progress.status === 'tiebreaker') {
    const names = progress.leaders.map((l) => l.name).join(' & ');
    return names
      ? `Sudden death — ${names} level on ${progress.leaders[0].wins}`
      : 'Sudden death — no wins recorded yet';
  }

  if (season.format === 'first_to' && season.target !== null) {
    const top = progress.standings[0]?.wins ?? 0;
    if (progress.status === 'decided') return games;
    const togo = Math.max(season.target - top, 0);
    return `${top}/${season.target} wins — ${togo} to go`;
  }

  if (season.format === 'best_of' && season.target !== null) {
    if (progress.status === 'decided') {
      return gamesPlayed >= season.target
        ? games
        : `${games}, clinched with ${progress.gamesRemaining} to spare`;
    }
    return `Game ${gamesPlayed} of ${season.target}`;
  }

  return games;
}

// A season condensed to one row for the seasons list.
export interface SeasonSummary {
  season: Season;
  gameCount: number;
  lastPlayedAt: string | null; // null until the season has a game
  progress: SeasonProgress;
  // Top of the standings, and only when they've actually won something —
  // otherwise there is no leader to crown yet. Tied at the top: the first of
  // them, with `progress.leaders` holding the rest.
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

    const progress = computeSeasonProgress(season, games, players);
    const top = progress.standings[0];

    return {
      season,
      gameCount: seasonGames.length,
      lastPlayedAt,
      progress,
      leader: top && top.wins > 0 ? top : null,
    };
  });
}

/**
 * Seasons a game can be filed into: the ones still running. A decided season
 * is closed — the database refuses new games — but the season a game is
 * *already* in stays on the list, so editing an old game doesn't silently
 * unfile it.
 */
export function assignableSeasons(
  seasons: Season[],
  games: GameWithPlayers[],
  players: Player[],
  currentSeasonId: string | null,
): Season[] {
  return seasons.filter(
    (s) =>
      s.id === currentSeasonId ||
      computeSeasonProgress(s, games, players).status !== 'decided',
  );
}

export const queryKeys = {
  pods: ['pods'] as const,
  pod: (podId: string) => ['pod', podId] as const,
  members: (podId: string) => ['pod', podId, 'members'] as const,
  players: (podId: string) => ['pod', podId, 'players'] as const,
  games: (podId: string) => ['pod', podId, 'games'] as const,
  game: (gameId: string) => ['game', gameId] as const,
  playerCommanders: (playerId: string) => ['playerCommanders', playerId] as const,
  seriesList: (podId: string) => ['pod', podId, 'series'] as const,
  podSeriesGames: (podId: string) => ['pod', podId, 'series-games'] as const,
  series: (seriesId: string) => ['series', seriesId] as const,
  seriesPlayers: (seriesId: string) => ['series', seriesId, 'players'] as const,
  seriesGames: (seriesId: string) => ['series', seriesId, 'games'] as const,
};

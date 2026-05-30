export const queryKeys = {
  pods: ['pods'] as const,
  pod: (podId: string) => ['pod', podId] as const,
  members: (podId: string) => ['pod', podId, 'members'] as const,
  players: (podId: string) => ['pod', podId, 'players'] as const,
  games: (podId: string) => ['pod', podId, 'games'] as const,
  game: (gameId: string) => ['game', gameId] as const,
};

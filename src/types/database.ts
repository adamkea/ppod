// Hand-written types for the Phase 1 schema. If you later adopt the Supabase
// CLI you can replace this with `supabase gen types typescript`.

export type Role = 'owner' | 'member';

export interface Pod {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
}

export interface PodMember {
  id: string;
  pod_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Player {
  id: string;
  pod_id: string;
  name: string;
  user_id: string | null;
  created_at: string;
}

export interface Game {
  id: string;
  pod_id: string;
  played_at: string; // YYYY-MM-DD
  game_type: string;
  logged_by_user_id: string | null;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  player_id: string;
  commander: string | null;
  partner_commander: string | null;
  is_winner: boolean;
}

// A game row joined with its participants and each participant's player name —
// the shape returned by the games list query.
export interface GameWithPlayers extends Game {
  game_players: (GamePlayer & { players: Pick<Player, 'id' | 'name'> | null })[];
}

// One participant as the add/edit-game form holds it before saving.
export interface ParticipantInput {
  player_id: string;
  commander: string;
  partner_commander: string;
  is_winner: boolean;
}

// A commander saved to a player's profile for quick-pick during game logging.
export interface PlayerCommander {
  id: string;
  player_id: string;
  commander: string;
  partner_commander: string | null;
  // Pinned Scryfall print ids for chosen alternate art; null = default printing.
  commander_scryfall_id: string | null;
  partner_scryfall_id: string | null;
  created_at: string;
}

// Derived per-player stats.
export interface PlayerStat {
  player_id: string;
  name: string;
  games_played: number;
  wins: number;
}

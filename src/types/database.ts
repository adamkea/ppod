// Hand-written types for the Phase 1 schema. If you later adopt the Supabase
// CLI you can replace this with `supabase gen types typescript`.

export type Role = 'owner' | 'member';

export interface Pod {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  // Owner-controlled toggle: when true, members can comment on games.
  comments_enabled: boolean;
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
  note: string | null;
  logged_by_user_id: string | null;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  player_id: string;
  commander: string | null;
  partner_commander: string | null;
  // Pinned Scryfall print ids for chosen alternate art; null = default printing.
  commander_scryfall_id: string | null;
  partner_scryfall_id: string | null;
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
  commander_scryfall_id: string | null;
  partner_scryfall_id: string | null;
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

// A run of standard 1v1 games (no commanders) among a roster of players.
// Open-ended: games are logged until the pod stops; `target_games` is just a
// soft goal for display. The roster lives in `series_players`.
export interface Series {
  id: string;
  pod_id: string;
  name: string | null;
  target_games: number | null;
  created_at: string;
}

// A player on a series' roster.
export interface SeriesPlayer {
  id: string;
  series_id: string;
  player_id: string;
  created_at: string;
}

// One standard 1v1 game within a series, between two roster players.
// `winner_player_id` is null for a draw, otherwise player_one_id or player_two_id.
export interface SeriesGame {
  id: string;
  series_id: string;
  player_one_id: string;
  player_two_id: string;
  winner_player_id: string | null;
  played_at: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
}

// A series game joined with its parent series' name — used to show series games
// in the pod's main game log alongside regular games.
export interface SeriesGameWithSeries extends SeriesGame {
  series: Pick<Series, 'name'> | null;
}

// A member's comment on a game. `author_name` is captured at write time by
// the add_game_comment RPC (linked player name, else email prefix).
export interface GameComment {
  id: string;
  game_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

// Derived per-player stats.
export interface PlayerStat {
  player_id: string;
  name: string;
  games_played: number;
  wins: number;
}

export type StringRecord = Record<string, string>;

export interface Standing {
  season: string;
  league_id: number | null;
  league_name: string;
  division_id: number | null;
  division_name: string;
  team_id: number | null;
  team_name: string;
  wins: number | null;
  losses: number | null;
  winning_percentage: number | null;
  games_back: string;
  wildcard_games_back: string;
  league_rank: number | null;
  division_rank: number | null;
  sport_rank: number | null;
  runs_scored: number | null;
  runs_allowed: number | null;
  run_differential: number | null;
  home_wins: string;
  home_losses: string;
  away_wins: string;
  away_losses: string;
  last10_wins: string;
  last10_losses: string;
  streak_code: string;
}

export interface PlayerBase {
  player_id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  use_name: string;
  birth_date: string;
  current_age: number | null;
  position_abbr: string;
  bat_side: string;
  pitch_hand: string;
  active: boolean;
}

export interface HittingStats {
  player_id: number;
  season: string;
  team_id: number | null;
  team_name: string;
  age: number | null;
  gamesPlayed: number | null;
  plateAppearances: number | null;
  atBats: number | null;
  hits: number | null;
  runs: number | null;
  doubles: number | null;
  triples: number | null;
  homeRuns: number | null;
  totalBases: number | null;
  rbi: number | null;
  stolenBases: number | null;
  caughtStealing: number | null;
  baseOnBalls: number | null;
  strikeOuts: number | null;
  hitByPitch: number | null;
  sacFlies: number | null;
  babip: string;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
}

export interface PitchingStats {
  player_id: number;
  season: string;
  team_id: number | null;
  team_name: string;
  age: number | null;
  gamesPlayed: number | null;
  gamesStarted: number | null;
  gamesFinished: number | null;
  completeGames: number | null;
  shutouts: number | null;
  wins: number | null;
  losses: number | null;
  saves: number | null;
  saveOpportunities: number | null;
  blownSaves: number | null;
  holds: number | null;
  inningsPitched: string;
  hits: number | null;
  homeRuns: number | null;
  earnedRuns: number | null;
  battersFaced: number | null;
  strikeOuts: number | null;
  baseOnBalls: number | null;
  strikeoutWalkRatio: string;
  strikeoutsPer9Inn: string;
  walksPer9Inn: string;
  hitsPer9Inn: string;
  homeRunsPer9: string;
  era: string;
  whip: string;
}

export interface FieldingStats {
  player_id: number;
  season: string;
  team_id: number | null;
  team_name: string;
  gamesPlayed: number | null;
  position: string;
  assists: number | null;
  putOuts: number | null;
  errors: number | null;
  fielding: string;
}

export interface PlayerSeasonRow extends PlayerBase {
  season: string;
  team_id: number | null;
  team_name: string;
  hitting?: HittingStats;
  pitching?: PitchingStats;
  fielding?: FieldingStats;
}

export interface GameResult {
  game_pk: number;
  game_date: string;
  jst_date: string;
  official_date: string;
  status: string;
  status_code: string;
  day_night: string;
  away_team_id: number | null;
  away_team_name: string;
  away_score: number | null;
  home_team_id: number | null;
  home_team_name: string;
  home_score: number | null;
  venue_name: string;
}

export interface CompareMetrics {
  player_id: number;
  player_name: string;
  team_name: string;
  gamesPlayed: number | null;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
  era: string;
  whip: string;
  strikeOuts: number | null;
}

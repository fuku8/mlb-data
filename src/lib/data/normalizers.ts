import type {
  CompareMetrics,
  FieldingStats,
  GameResult,
  HittingStats,
  PitchingStats,
  PlayerBase,
  PlayerSeasonRow,
  StringRecord,
} from "@/lib/types";
import { parseNumber } from "@/lib/data/loaders";
import { ipToOuts } from "@/lib/utils";
export { ipToOuts };

export function currentSeason(): string {
  return String(new Date().getUTCFullYear());
}

export function seasonOrDefault(value: string | undefined): string {
  return value && value.trim() ? value : currentSeason();
}

function toBool(value: string | undefined): boolean {
  return value === "true";
}

function basePlayer(rec: StringRecord): PlayerBase {
  return {
    player_id: parseNumber(rec.player_id) ?? 0,
    full_name: rec.full_name ?? "",
    first_name: rec.first_name ?? "",
    last_name: rec.last_name ?? "",
    use_name: rec.use_name ?? "",
    birth_date: rec.birth_date ?? "",
    current_age: parseNumber(rec.current_age),
    position_abbr: rec.position_abbr ?? "",
    bat_side: rec.bat_side ?? "",
    pitch_hand: rec.pitch_hand ?? "",
    active: toBool(rec.active),
  };
}

function toHitting(rec: StringRecord): HittingStats {
  return {
    player_id: parseNumber(rec.player_id) ?? 0,
    season: rec.season ?? "",
    team_id: parseNumber(rec.team_id),
    team_name: rec.team_name ?? "",
    age: parseNumber(rec.age),
    gamesPlayed: parseNumber(rec.gamesPlayed),
    plateAppearances: parseNumber(rec.plateAppearances),
    atBats: parseNumber(rec.atBats),
    hits: parseNumber(rec.hits),
    runs: parseNumber(rec.runs),
    doubles: parseNumber(rec.doubles),
    triples: parseNumber(rec.triples),
    homeRuns: parseNumber(rec.homeRuns),
    totalBases: parseNumber(rec.totalBases),
    rbi: parseNumber(rec.rbi),
    stolenBases: parseNumber(rec.stolenBases),
    caughtStealing: parseNumber(rec.caughtStealing),
    baseOnBalls: parseNumber(rec.baseOnBalls),
    strikeOuts: parseNumber(rec.strikeOuts),
    hitByPitch: parseNumber(rec.hitByPitch),
    sacFlies: parseNumber(rec.sacFlies),
    babip: rec.babip ?? "",
    avg: rec.avg ?? "",
    obp: rec.obp ?? "",
    slg: rec.slg ?? "",
    ops: rec.ops ?? "",
  };
}

function toPitching(rec: StringRecord): PitchingStats {
  return {
    player_id: parseNumber(rec.player_id) ?? 0,
    season: rec.season ?? "",
    team_id: parseNumber(rec.team_id),
    team_name: rec.team_name ?? "",
    age: parseNumber(rec.age),
    gamesPlayed: parseNumber(rec.gamesPlayed),
    gamesStarted: parseNumber(rec.gamesStarted),
    gamesFinished: parseNumber(rec.gamesFinished),
    completeGames: parseNumber(rec.completeGames),
    shutouts: parseNumber(rec.shutouts),
    wins: parseNumber(rec.wins),
    losses: parseNumber(rec.losses),
    saves: parseNumber(rec.saves),
    saveOpportunities: parseNumber(rec.saveOpportunities),
    blownSaves: parseNumber(rec.blownSaves),
    holds: parseNumber(rec.holds),
    inningsPitched: rec.inningsPitched ?? "",
    hits: parseNumber(rec.hits),
    homeRuns: parseNumber(rec.homeRuns),
    earnedRuns: parseNumber(rec.earnedRuns),
    battersFaced: parseNumber(rec.battersFaced),
    strikeOuts: parseNumber(rec.strikeOuts),
    baseOnBalls: parseNumber(rec.baseOnBalls),
    strikeoutWalkRatio: rec.strikeoutWalkRatio ?? "",
    strikeoutsPer9Inn: rec.strikeoutsPer9Inn ?? "",
    walksPer9Inn: rec.walksPer9Inn ?? "",
    hitsPer9Inn: rec.hitsPer9Inn ?? "",
    homeRunsPer9: rec.homeRunsPer9 ?? "",
    era: rec.era ?? "",
    whip: rec.whip ?? "",
  };
}

function toFielding(rec: StringRecord): FieldingStats {
  return {
    player_id: parseNumber(rec.player_id) ?? 0,
    season: rec.season ?? "",
    team_id: parseNumber(rec.team_id),
    team_name: rec.team_name ?? "",
    gamesPlayed: parseNumber(rec.gamesPlayed),
    position: rec.position ?? "",
    assists: parseNumber(rec.assists),
    putOuts: parseNumber(rec.putOuts),
    errors: parseNumber(rec.errors),
    fielding: rec.fielding ?? "",
  };
}

function indexByPlayerSeason<T extends { player_id: number; season: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(`${row.player_id}-${row.season}`, row);
  }
  return map;
}

export function filterBySeason<T extends { season: string }>(rows: T[], season?: string): T[] {
  const target = seasonOrDefault(season);
  return rows.filter((r) => r.season === target);
}

export function isQualifiedHitter(pa: number | null): boolean {
  return (pa ?? 0) >= 30;
}

export function isQualifiedPitcher(ip: string | null | undefined): boolean {
  return ipToOuts(ip ?? "") >= 30;
}

export function formatRate(value: string | null | undefined): string {
  if (!value || value === "0" || value === "0.000") return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toFixed(3);
}

export function formatAvg(value: string | null | undefined): string {
  return formatRate(value);
}

export function formatObp(value: string | null | undefined): string {
  return formatRate(value);
}

export function formatSlg(value: string | null | undefined): string {
  return formatRate(value);
}

export function formatOps(value: string | null | undefined): string {
  return formatRate(value);
}

export function formatEra(value: string | null | undefined): string {
  if (!value) return "N/A";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : value;
}

export function formatWhip(value: string | null | undefined): string {
  if (!value) return "N/A";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : value;
}

export function mergePlayerStatsBySeason(params: {
  players: StringRecord[];
  hitting: StringRecord[];
  pitching: StringRecord[];
  fielding: StringRecord[];
  season?: string;
}): PlayerSeasonRow[] {
  const season = seasonOrDefault(params.season);
  const hit = indexByPlayerSeason(filterBySeason(params.hitting.map(toHitting), season));
  const pit = indexByPlayerSeason(filterBySeason(params.pitching.map(toPitching), season));
  const fld = indexByPlayerSeason(filterBySeason(params.fielding.map(toFielding), season));

  return params.players
    .map(basePlayer)
    .map((player) => {
      const key = `${player.player_id}-${season}`;
      const hitting = hit.get(key);
      const pitching = pit.get(key);
      const fielding = fld.get(key);
      const team_id = hitting?.team_id ?? pitching?.team_id ?? fielding?.team_id ?? null;
      const team_name = hitting?.team_name ?? pitching?.team_name ?? fielding?.team_name ?? "";

      return {
        ...player,
        season,
        team_id,
        team_name,
        hitting,
        pitching,
        fielding,
      };
    });
}

function gameUTCToJSTDate(game_date: string): string {
  if (!game_date) return "";
  const d = new Date(game_date);
  if (isNaN(d.getTime())) return "";
  // JST = UTC + 9時間
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export function toGameResult(rec: StringRecord): GameResult {
  const game_date = rec.game_date ?? "";
  return {
    game_pk: parseNumber(rec.game_pk) ?? 0,
    game_date,
    jst_date: gameUTCToJSTDate(game_date),
    official_date: rec.official_date ?? "",
    status: rec.status ?? "",
    status_code: rec.status_code ?? "",
    day_night: rec.day_night ?? "",
    away_team_id: parseNumber(rec.away_team_id),
    away_team_name: rec.away_team_name ?? "",
    away_score: parseNumber(rec.away_score),
    home_team_id: parseNumber(rec.home_team_id),
    home_team_name: rec.home_team_name ?? "",
    home_score: parseNumber(rec.home_score),
    venue_name: rec.venue_name ?? "",
  };
}

export function parseGameResults(records: StringRecord[]): GameResult[] {
  return records.map(toGameResult).filter((g) => g.game_pk !== 0);
}

export function getGameDates(games: GameResult[]): string[] {
  const dates = [...new Set(games.map((g) => g.jst_date).filter(Boolean))];
  return dates.sort().reverse();
}

export function toCompareMetrics(row: PlayerSeasonRow): CompareMetrics {
  return {
    player_id: row.player_id,
    player_name: row.full_name,
    team_name: row.team_name,
    gamesPlayed: row.hitting?.gamesPlayed ?? row.pitching?.gamesPlayed ?? null,
    avg: formatAvg(row.hitting?.avg),
    obp: formatObp(row.hitting?.obp),
    slg: formatSlg(row.hitting?.slg),
    ops: formatOps(row.hitting?.ops),
    era: formatEra(row.pitching?.era),
    whip: formatWhip(row.pitching?.whip),
    strikeOuts: row.pitching?.strikeOuts ?? row.hitting?.strikeOuts ?? null,
  };
}

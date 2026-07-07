// Statcast（Baseball Savant）由来のフィジカル指標。CSVが無ければ空Mapを返す（サイトを壊さない）
import { parseNumber, readCsv } from "@/lib/data/loaders";
import { percentileOf } from "@/lib/percentile";
import type { SaberRow } from "@/lib/metrics";

export interface StatcastHitting {
  playerId: number;
  playerName: string;
  year: number | null;
  xwoba: number | null;
  xba: number | null;
  xslg: number | null;
  exitVelocityAvg: number | null;
  barrelBattedRate: number | null;
  hardHitPercent: number | null;
  sprintSpeed: number | null;
}

export interface StatcastPitching {
  playerId: number;
  playerName: string;
  year: number | null;
  xwoba: number | null;
  exitVelocityAvg: number | null;
  barrelBattedRate: number | null;
  whiffPercent: number | null;
  chasePercent: number | null;
}

export async function getStatcastHitting(): Promise<Map<number, StatcastHitting>> {
  const rows = await readCsv("statcast_hitting.csv");
  const map = new Map<number, StatcastHitting>();
  for (const r of rows) {
    const playerId = parseNumber(r.player_id);
    if (playerId === null) continue;
    map.set(playerId, {
      playerId,
      playerName: r.player_name,
      year: parseNumber(r.year),
      xwoba: parseNumber(r.xwoba),
      xba: parseNumber(r.xba),
      xslg: parseNumber(r.xslg),
      exitVelocityAvg: parseNumber(r.exit_velocity_avg),
      barrelBattedRate: parseNumber(r.barrel_batted_rate),
      hardHitPercent: parseNumber(r.hard_hit_percent),
      sprintSpeed: parseNumber(r.sprint_speed),
    });
  }
  return map;
}

export async function getStatcastPitching(): Promise<Map<number, StatcastPitching>> {
  const rows = await readCsv("statcast_pitching.csv");
  const map = new Map<number, StatcastPitching>();
  for (const r of rows) {
    const playerId = parseNumber(r.player_id);
    if (playerId === null) continue;
    map.set(playerId, {
      playerId,
      playerName: r.player_name,
      year: parseNumber(r.year),
      xwoba: parseNumber(r.xwoba),
      exitVelocityAvg: parseNumber(r.exit_velocity_avg),
      barrelBattedRate: parseNumber(r.barrel_batted_rate),
      whiffPercent: parseNumber(r.whiff_percent),
      chasePercent: parseNumber(r.chase_percent),
    });
  }
  return map;
}

// PhysicalCard行ビルダー: 母集団はStatcast CSV内の全選手（規定到達判定はSavant側のmin=qで既に済んでいるため独立）
function physicalRow<T>(
  label: string,
  desc: string,
  target: T,
  pool: T[],
  accessor: (r: T) => number | null,
  format: (v: number) => string,
  invert = false,
): SaberRow | null {
  const value = accessor(target);
  if (value === null) return null;
  const poolValues = pool.map(accessor).filter((v): v is number => v !== null);
  if (poolValues.length === 0) return null;
  let pct = percentileOf(poolValues, value);
  if (invert) pct = 1 - pct;
  return { label, display: format(value), pct, desc };
}

export function buildHitterPhysical(target: StatcastHitting, pool: StatcastHitting[]): SaberRow[] {
  return [
    physicalRow("平均打球速度", "打球の平均初速。パワーの直接測定値", target, pool, (r) => r.exitVelocityAvg, (v) => `${v.toFixed(1)}mph`),
    physicalRow("Barrel%", "理想的な速度と角度の打球の割合。長打の源泉", target, pool, (r) => r.barrelBattedRate, (v) => `${v.toFixed(1)}%`),
    physicalRow("HardHit%", "95mph以上の強い打球の割合", target, pool, (r) => r.hardHitPercent, (v) => `${v.toFixed(1)}%`),
    physicalRow("スプリントスピード", "全力疾走時の速度(ft/s)。リーグ平均は約27", target, pool, (r) => r.sprintSpeed, (v) => `${v.toFixed(1)}ft/s`),
  ].filter((r): r is SaberRow => r !== null);
}

export function buildPitcherPhysical(target: StatcastPitching, pool: StatcastPitching[]): SaberRow[] {
  return [
    physicalRow("被打球速度", "打たれた打球の平均初速。低いほど良い", target, pool, (r) => r.exitVelocityAvg, (v) => `${v.toFixed(1)}mph`, true),
    physicalRow("被Barrel%", "理想打球を許した割合。低いほど良い", target, pool, (r) => r.barrelBattedRate, (v) => `${v.toFixed(1)}%`, true),
    physicalRow("Whiff%", "スイングのうち空振りさせた割合", target, pool, (r) => r.whiffPercent, (v) => `${v.toFixed(1)}%`),
    physicalRow("Chase%", "ボール球を振らせた割合", target, pool, (r) => r.chasePercent, (v) => `${v.toFixed(1)}%`),
  ].filter((r): r is SaberRow => r !== null);
}

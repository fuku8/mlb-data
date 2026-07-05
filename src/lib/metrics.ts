// 打者/投手の指標定義。League Percentileカードとレーダーで共有し、パーセンタイルは1回だけ計算する
import { formatAvg, formatEra, formatObp, formatOps, formatSlg, formatWhip } from "@/lib/data/normalizers";
import { parseNumber } from "@/lib/data/loaders";
import { percentileOf } from "@/lib/percentile";
import { n } from "@/lib/utils";
import type { PlayerSeasonRow } from "@/lib/types";
import type { PercentileRow } from "@/components/percentile-bars";
import type { RadarAxis } from "@/components/stat-radar";

interface MetricDef {
  key: string;
  label: string;
  formula?: string; // 表記用の補足（例: BB/PA）。/metrics のプロースに補間する
  accessor: (r: PlayerSeasonRow) => number | null;
  display: (r: PlayerSeasonRow) => string;
  invert?: boolean; // 低いほど良い指標はパーセンタイルを反転する
  bars?: boolean; // League Percentileカードに含める（既定true）
  radarLabel?: string; // レーダーにも含める場合のラベル
}

const hAvg = (r: PlayerSeasonRow) => parseNumber(r.hitting?.avg);
const hObp = (r: PlayerSeasonRow) => parseNumber(r.hitting?.obp);
const hSlg = (r: PlayerSeasonRow) => parseNumber(r.hitting?.slg);
const hOps = (r: PlayerSeasonRow) => parseNumber(r.hitting?.ops);
const hHr = (r: PlayerSeasonRow) => r.hitting?.homeRuns ?? null;
const hSb = (r: PlayerSeasonRow) => r.hitting?.stolenBases ?? null;
const hBb = (r: PlayerSeasonRow) => r.hitting?.baseOnBalls ?? null;
const hSo = (r: PlayerSeasonRow) => r.hitting?.strikeOuts ?? null;
const hPa = (r: PlayerSeasonRow) => r.hitting?.plateAppearances ?? null;
const hBbPct = (r: PlayerSeasonRow) => {
  const bb = hBb(r);
  const pa = hPa(r);
  return bb !== null && pa ? bb / pa : null;
};
const hKPct = (r: PlayerSeasonRow) => {
  const so = hSo(r);
  const pa = hPa(r);
  return so !== null && pa ? so / pa : null;
};
const hIso = (r: PlayerSeasonRow) => {
  const slg = hSlg(r);
  const avg = hAvg(r);
  return slg !== null && avg !== null ? slg - avg : null;
};
// 選球: BB/K。SOが0の選手はmax(SO,1)で母集団全体を統一計算する
const hBbK = (r: PlayerSeasonRow) => {
  const bb = hBb(r);
  const so = hSo(r);
  return bb !== null && so !== null ? bb / Math.max(so, 1) : null;
};

export const HITTER_METRICS: MetricDef[] = [
  { key: "avg", label: "AVG", accessor: hAvg, display: (r) => formatAvg(r.hitting?.avg), radarLabel: "ミート" },
  { key: "obp", label: "OBP", accessor: hObp, display: (r) => formatObp(r.hitting?.obp), radarLabel: "出塁" },
  { key: "slg", label: "SLG", accessor: hSlg, display: (r) => formatSlg(r.hitting?.slg) },
  { key: "ops", label: "OPS", accessor: hOps, display: (r) => formatOps(r.hitting?.ops) },
  { key: "hr", label: "HR", accessor: hHr, display: (r) => n(r.hitting?.homeRuns) },
  { key: "sb", label: "SB", accessor: hSb, display: (r) => n(r.hitting?.stolenBases), radarLabel: "走塁" },
  { key: "bbPct", label: "BB%", formula: "BB/PA", accessor: hBbPct, display: (r) => `${((hBbPct(r) ?? 0) * 100).toFixed(1)}%` },
  { key: "kPct", label: "K%", formula: "SO/PA", accessor: hKPct, display: (r) => `${((hKPct(r) ?? 0) * 100).toFixed(1)}%`, invert: true },
  { key: "iso", label: "ISO", formula: "SLG−AVG", accessor: hIso, display: (r) => (hIso(r) ?? 0).toFixed(3), radarLabel: "長打" },
  { key: "bbK", label: "BB/K", accessor: hBbK, display: (r) => (hBbK(r) ?? 0).toFixed(2), bars: false, radarLabel: "選球" },
];
const HITTER_RADAR_ORDER = ["avg", "obp", "iso", "sb", "bbK"];

const pEra = (r: PlayerSeasonRow) => parseNumber(r.pitching?.era);
const pWhip = (r: PlayerSeasonRow) => parseNumber(r.pitching?.whip);
const pBb9 = (r: PlayerSeasonRow) => parseNumber(r.pitching?.walksPer9Inn);
const pHr9 = (r: PlayerSeasonRow) => parseNumber(r.pitching?.homeRunsPer9);
const pOppAvg = (r: PlayerSeasonRow) => parseNumber(r.pitching?.avg);
const pK9 = (r: PlayerSeasonRow) => parseNumber(r.pitching?.strikeoutsPer9Inn);
const pKbb = (r: PlayerSeasonRow) => parseNumber(r.pitching?.strikeoutWalkRatio);

export const PITCHER_METRICS: MetricDef[] = [
  { key: "era", label: "ERA", accessor: pEra, display: (r) => formatEra(r.pitching?.era), invert: true },
  { key: "whip", label: "WHIP", accessor: pWhip, display: (r) => formatWhip(r.pitching?.whip), invert: true, radarLabel: "走者管理" },
  { key: "bb9", label: "BB/9", accessor: pBb9, display: (r) => n(r.pitching?.walksPer9Inn), invert: true, radarLabel: "制球" },
  { key: "hr9", label: "HR/9", accessor: pHr9, display: (r) => n(r.pitching?.homeRunsPer9), invert: true, radarLabel: "一発回避" },
  { key: "oppAvg", label: "被打率", accessor: pOppAvg, display: (r) => formatAvg(r.pitching?.avg), invert: true, radarLabel: "被打抑制" },
  { key: "k9", label: "K/9", accessor: pK9, display: (r) => n(r.pitching?.strikeoutsPer9Inn), radarLabel: "奪三振" },
  { key: "kbb", label: "K/BB", accessor: pKbb, display: (r) => n(r.pitching?.strikeoutWalkRatio) },
];
const PITCHER_RADAR_ORDER = ["k9", "bb9", "oppAvg", "hr9", "whip"];

export const HITTER_BARS_METRICS = HITTER_METRICS.filter((m) => m.bars !== false);
export const PITCHER_BARS_METRICS = PITCHER_METRICS.filter((m) => m.bars !== false);

interface MetricResult {
  label: string;
  display: string;
  pct: number;
}

// 各指標のパーセンタイルを1回だけ計算し、値が欠損している行はnullでスキップする
function computeMetrics(defs: MetricDef[], target: PlayerSeasonRow, pool: PlayerSeasonRow[]): Map<string, MetricResult> {
  const results = new Map<string, MetricResult>();
  for (const def of defs) {
    const value = def.accessor(target);
    if (value === null) continue;
    const poolValues = pool.map(def.accessor).filter((v): v is number => v !== null);
    if (poolValues.length === 0) continue;
    let pct = percentileOf(poolValues, value);
    if (def.invert) pct = 1 - pct;
    results.set(def.key, { label: def.label, display: def.display(target), pct });
  }
  return results;
}

function toBarsRows(defs: MetricDef[], results: Map<string, MetricResult>): PercentileRow[] {
  return defs
    .filter((d) => d.bars !== false)
    .map((d) => results.get(d.key))
    .filter((r): r is MetricResult => r !== undefined)
    .map((r) => ({ label: r.label, display: r.display, pct: r.pct }));
}

function toRadarAxes(defs: MetricDef[], order: string[], results: Map<string, MetricResult>): RadarAxis[] {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  return order
    .map((key): RadarAxis | null => {
      const result = results.get(key);
      const def = byKey.get(key);
      if (!result || !def?.radarLabel) return null;
      return { label: def.radarLabel, display: result.display, pct: result.pct };
    })
    .filter((a): a is RadarAxis => a !== null);
}

export interface PlayerViz {
  bars: PercentileRow[];
  radar: RadarAxis[];
}

// バーとレーダーで computeMetrics（パーセンタイル計算）を1回だけ共有する
export function buildHitterViz(target: PlayerSeasonRow, pool: PlayerSeasonRow[]): PlayerViz {
  const results = computeMetrics(HITTER_METRICS, target, pool);
  return {
    bars: toBarsRows(HITTER_METRICS, results),
    radar: toRadarAxes(HITTER_METRICS, HITTER_RADAR_ORDER, results),
  };
}

export function buildPitcherViz(target: PlayerSeasonRow, pool: PlayerSeasonRow[]): PlayerViz {
  const results = computeMetrics(PITCHER_METRICS, target, pool);
  return {
    bars: toBarsRows(PITCHER_METRICS, results),
    radar: toRadarAxes(PITCHER_METRICS, PITCHER_RADAR_ORDER, results),
  };
}

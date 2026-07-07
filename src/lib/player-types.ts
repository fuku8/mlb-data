// 選手タイプ分類エンジン。nba-data `src/lib/data/player-types.ts` の移植（feel-viz）。
//
// タイプ判定 = スタイル特徴（何をする選手か）のzスコアが1.0以上のタイプを最大3つ付与。
// タイプ評価点 = そのタイプの職務に対応するパーセンタイルの平均（0-1）。
// 「打率は低いが本塁打だけ多い」選手が正直に低評価になるよう、判定と評価は分離している。

import { parseNumber } from "./data/loaders.ts";
import { ipToOuts } from "./utils.ts";
import { percentileOf } from "./percentile.ts";
import { radarScore } from "./radar-score.ts";
import { woba, kbbPct } from "./saber.ts";
import type { PlayerSeasonRow } from "./types.ts";

const mean = (...xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// --- 選抜ロジック（純関数・テスト対象） ---

export interface TypeCandidate {
  name: string;
  z: number;
  score: number;
}

export interface TypeBadge {
  type: string;
  score: number; // 0-1
  fallback: boolean; // true = +1σ以上のタイプがなく、最上位1タイプを参考表示
}

export function pickBadges(cand: TypeCandidate[]): TypeBadge[] {
  const sorted = [...cand].sort((a, b) => b.z - a.z);
  const picked = sorted.filter((c) => c.z >= 1.0).slice(0, 3);
  const isFallback = picked.length === 0;
  return (isFallback ? [sorted[0]] : picked)
    .map((c) => ({ type: c.name, score: c.score, fallback: isFallback }))
    .sort((a, b) => b.score - a.score);
}

// --- 共通パイプライン: 特徴量パーセンタイル化 → z標準化 → pickBadges ---
// 打者/投手で同じ形（欠損行除外→パーセンタイル→派生特徴→z標準化）を辿るため1本化する

type Get = (key: string) => number;

interface FeatDef {
  key: string;
  accessor: (r: PlayerSeasonRow) => number | null;
  invert?: boolean; // 低いほど良い指標は 1-pct を格納する
  raw?: boolean; // パーセンタイル化せず生値のまま格納する（SV/HLDのようなゼロ過多分布のstyle用。z標準化はstyle出力の分布に対して行うためスケール不問＝versatRawと同じ性質）
}

interface TypeDef {
  name: string;
  style: (g: Get) => number;
  score: (g: Get) => number;
}

function classify(
  pool: PlayerSeasonRow[],
  featDefs: FeatDef[],
  typeDefs: TypeDef[],
  derived: Record<string, (g: Get) => number> = {},
): Map<number, TypeBadge[]> {
  // 特徴量が1つでもnullの選手はプールから除外（nba-dataの「全データが揃う選手のみ」方式）
  const raw = new Map<number, Record<string, number>>();
  for (const r of pool) {
    const values: Record<string, number> = {};
    let ok = true;
    for (const f of featDefs) {
      const v = f.accessor(r);
      if (v === null || !Number.isFinite(v)) {
        ok = false;
        break;
      }
      values[f.key] = v;
    }
    if (ok) raw.set(r.player_id, values);
  }

  const ids = [...raw.keys()];
  if (ids.length === 0) return new Map();

  // 各特徴をプール内パーセンタイル化（反転特徴は1-pctを、raw特徴は生値をそのまま格納する）
  const pcts = new Map<number, Record<string, number>>(ids.map((id) => [id, {}]));
  for (const f of featDefs) {
    if (f.raw) {
      for (const id of ids) pcts.get(id)![f.key] = raw.get(id)![f.key];
      continue;
    }
    const vals = ids.map((id) => raw.get(id)![f.key]);
    for (const id of ids) {
      let pct = percentileOf(vals, raw.get(id)![f.key]);
      if (f.invert) pct = 1 - pct;
      pcts.get(id)![f.key] = pct;
    }
  }

  // 派生特徴（versatなど）: 生値を計算後、プール内パーセンタイル化してg()から引けるようにする
  for (const key of Object.keys(derived)) {
    const fn = derived[key];
    const raws = ids.map((id) => fn((k) => pcts.get(id)![k]));
    ids.forEach((id, i) => {
      pcts.get(id)![key] = percentileOf(raws, raws[i]);
    });
  }

  // スタイル点をz標準化 → z>=1.0を最大3タイプ（なければ最上位1つ）
  const styles = typeDefs.map((t) => {
    const vals = new Map(ids.map((id) => [id, t.style((k) => pcts.get(id)![k])]));
    const arr = [...vals.values()];
    const m = mean(...arr);
    const sd = Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length) || 1;
    return { def: t, z: new Map(ids.map((id) => [id, (vals.get(id)! - m) / sd])) };
  });

  const result = new Map<number, TypeBadge[]>();
  for (const id of ids) {
    const g: Get = (k) => pcts.get(id)![k];
    const cand = styles.map((s) => ({ name: s.def.name, z: s.z.get(id)!, score: s.def.score(g) }));
    result.set(id, pickBadges(cand));
  }
  return result;
}

// --- 打者 ---

const ratio = (a: number | null, b: number | null): number | null => (a === null || b === null || b === 0 ? null : a / b);

const hAvg = (r: PlayerSeasonRow) => parseNumber(r.hitting?.avg);
const hObp = (r: PlayerSeasonRow) => parseNumber(r.hitting?.obp);
const hSlg = (r: PlayerSeasonRow) => parseNumber(r.hitting?.slg);
const hPa = (r: PlayerSeasonRow) => r.hitting?.plateAppearances ?? null;
const hHr = (r: PlayerSeasonRow) => r.hitting?.homeRuns ?? null;
const hSb = (r: PlayerSeasonRow) => r.hitting?.stolenBases ?? null;
const hCs = (r: PlayerSeasonRow) => r.hitting?.caughtStealing ?? null;
const hBb = (r: PlayerSeasonRow) => r.hitting?.baseOnBalls ?? null;
const hSo = (r: PlayerSeasonRow) => r.hitting?.strikeOuts ?? null;
const hG = (r: PlayerSeasonRow) => r.hitting?.gamesPlayed ?? null;
const h3b = (r: PlayerSeasonRow) => r.hitting?.triples ?? null;
const hRuns = (r: PlayerSeasonRow) => r.hitting?.runs ?? null;
const hHits = (r: PlayerSeasonRow) => r.hitting?.hits ?? null;
const hRbi = (r: PlayerSeasonRow) => r.hitting?.rbi ?? null;

const hIso = (r: PlayerSeasonRow) => {
  const slg = hSlg(r);
  const avg = hAvg(r);
  return slg === null || avg === null ? null : slg - avg;
};
const hBbPct = (r: PlayerSeasonRow) => ratio(hBb(r), hPa(r));
const hKPct = (r: PlayerSeasonRow) => ratio(hSo(r), hPa(r));
const hBbK = (r: PlayerSeasonRow) => {
  const bb = hBb(r);
  const so = hSo(r);
  return bb === null || so === null ? null : bb / Math.max(so, 1);
};
const hHrRate = (r: PlayerSeasonRow) => ratio(hHr(r), hPa(r));
const hTripleRate = (r: PlayerSeasonRow) => ratio(h3b(r), hPa(r));
const hRbiRate = (r: PlayerSeasonRow) => ratio(hRbi(r), hPa(r));
const hSbAttempt = (r: PlayerSeasonRow) => {
  const sb = hSb(r);
  const cs = hCs(r);
  const g = hG(r);
  return sb === null || cs === null || !g ? null : (sb + cs) / g;
};
const hSbSuccess = (r: PlayerSeasonRow) => {
  const sb = hSb(r);
  const cs = hCs(r);
  return sb === null || cs === null ? null : sb / Math.max(sb + cs, 1);
};
const hWobaVal = (r: PlayerSeasonRow) => {
  const h = r.hitting;
  if (!h) return null;
  const { atBats, baseOnBalls, intentionalWalks, hitByPitch, sacFlies, hits, doubles, triples, homeRuns } = h;
  if (atBats === null || baseOnBalls === null || hits === null || doubles === null || triples === null || homeRuns === null) return null;
  return woba({ ab: atBats, bb: baseOnBalls, ibb: intentionalWalks ?? 0, hbp: hitByPitch ?? 0, sf: sacFlies ?? 0, h: hits, doubles, triples, hr: homeRuns });
};

const HITTER_FEAT_DEFS: FeatDef[] = [
  { key: "iso", accessor: hIso },
  { key: "hrRate", accessor: hHrRate },
  { key: "hr", accessor: hHr }, // 各タイプscoreの生産量評価（hits/rbi/sb等と同じ「raw count」枠）に必要
  { key: "avg", accessor: hAvg },
  { key: "kLow", accessor: hKPct, invert: true },
  { key: "sbAttempt", accessor: hSbAttempt },
  { key: "tripleRate", accessor: hTripleRate },
  { key: "bbPct", accessor: hBbPct },
  { key: "bbK", accessor: hBbK },
  { key: "rbiRate", accessor: hRbiRate },
  { key: "obp", accessor: hObp },
  { key: "slg", accessor: hSlg },
  { key: "woba", accessor: hWobaVal },
  { key: "sb", accessor: hSb },
  { key: "sbSuccess", accessor: hSbSuccess },
  { key: "runs", accessor: hRuns },
  { key: "hits", accessor: hHits },
  { key: "rbi", accessor: hRbi },
];

// オールラウンダーのstyle: 5部門パーセンタイルの水準×均等さ（生値）。
// 判定(z>=1.0)は生値の分布で行い選抜率を保つ。評価点のみパーセンタイル化した g("versat") を使う
const versatRaw = (g: Get) => radarScore([g("avg"), g("obp"), g("iso"), g("sb"), g("bbK")]);

const HITTER_TYPE_DEFS: TypeDef[] = [
  { name: "パワーヒッター", style: (g) => mean(g("iso"), g("hrRate")), score: (g) => mean(g("slg"), g("hr"), g("woba")) },
  { name: "安打製造機", style: (g) => mean(g("avg"), g("kLow")), score: (g) => mean(g("avg"), g("obp"), g("hits")) },
  { name: "スピードスター", style: (g) => mean(g("sbAttempt"), g("tripleRate")), score: (g) => mean(g("sb"), g("sbSuccess"), g("runs")) },
  { name: "選球の達人", style: (g) => mean(g("bbPct"), g("bbK")), score: (g) => mean(g("obp"), g("bbPct"), g("woba")) },
  { name: "ポイントゲッター", style: (g) => g("rbiRate"), score: (g) => mean(g("rbi"), g("slg"), g("woba")) },
  // オールラウンダー: styleは生値（radarScore=5ツールpctの水準×均等さ）、scoreはそのプール内pct
  { name: "オールラウンダー", style: versatRaw, score: (g) => g("versat") },
];

export const HITTER_TYPE_NAMES = HITTER_TYPE_DEFS.map((t) => t.name);

export function classifyHitters(pool: PlayerSeasonRow[]): Map<number, TypeBadge[]> {
  return classify(pool, HITTER_FEAT_DEFS, HITTER_TYPE_DEFS, { versat: versatRaw });
}

// --- 投手 ---

const pK9 = (r: PlayerSeasonRow) => parseNumber(r.pitching?.strikeoutsPer9Inn);
const pBb9 = (r: PlayerSeasonRow) => parseNumber(r.pitching?.walksPer9Inn);
const pEra = (r: PlayerSeasonRow) => parseNumber(r.pitching?.era);
const pWhip = (r: PlayerSeasonRow) => parseNumber(r.pitching?.whip);
const pHr9 = (r: PlayerSeasonRow) => parseNumber(r.pitching?.homeRunsPer9);
const pKbb = (r: PlayerSeasonRow) => parseNumber(r.pitching?.strikeoutWalkRatio);
const pGoAo = (r: PlayerSeasonRow) => parseNumber(r.pitching?.groundOutsToAirouts);
const pOuts = (r: PlayerSeasonRow) => (r.pitching ? ipToOuts(r.pitching.inningsPitched) : null); // ip特徴=アウト数（分数表記の丸め誤差を避ける）
const pGs = (r: PlayerSeasonRow) => r.pitching?.gamesStarted ?? null;
const pCg = (r: PlayerSeasonRow) => r.pitching?.completeGames ?? null;
const pSv = (r: PlayerSeasonRow) => r.pitching?.saves ?? null;
const pHld = (r: PlayerSeasonRow) => r.pitching?.holds ?? null;
const pKbbPct = (r: PlayerSeasonRow) => {
  const p = r.pitching;
  if (!p || p.strikeOuts === null || p.baseOnBalls === null || p.battersFaced === null) return null;
  return kbbPct(p.strikeOuts, p.baseOnBalls, p.battersFaced);
};

const PITCHER_FEAT_DEFS: FeatDef[] = [
  { key: "k9", accessor: pK9 },
  { key: "bb9Low", accessor: pBb9, invert: true },
  { key: "ip", accessor: pOuts },
  { key: "gs", accessor: pGs },
  { key: "cg", accessor: pCg },
  { key: "sv", accessor: pSv },
  { key: "hld", accessor: pHld },
  // SV/HLDはゼロ過多分布のためパーセンタイル化するとSV1-2でもz≥1.0に入る。
  // styleは生カウントのz標準化（真のクローザー/セットアッパーだけが+1σを超える）、scoreはパーセンタイル版sv/hldを使う
  { key: "svRaw", accessor: pSv, raw: true },
  { key: "hldRaw", accessor: pHld, raw: true },
  { key: "eraLow", accessor: pEra, invert: true },
  { key: "whipLow", accessor: pWhip, invert: true },
  { key: "kbbPct", accessor: pKbbPct },
  { key: "kbb", accessor: pKbb },
  { key: "hr9Low", accessor: pHr9, invert: true },
  { key: "goAo", accessor: pGoAo },
];

const PITCHER_TYPE_DEFS: TypeDef[] = [
  { name: "ドクターK", style: (g) => g("k9"), score: (g) => mean(g("k9"), g("kbbPct"), g("eraLow")) },
  { name: "精密機械", style: (g) => g("bb9Low"), score: (g) => mean(g("bb9Low"), g("whipLow"), g("kbb")) },
  { name: "ワークホース", style: (g) => mean(g("ip"), g("gs"), g("cg")), score: (g) => mean(g("ip"), g("eraLow"), g("whipLow")) },
  { name: "守護神", style: (g) => g("svRaw"), score: (g) => mean(g("sv"), g("eraLow"), g("kbbPct")) },
  { name: "中継ぎの柱", style: (g) => g("hldRaw"), score: (g) => mean(g("hld"), g("eraLow"), g("whipLow")) },
  // MLBのみ。npb移植時は除外
  { name: "グラウンドボーラー", style: (g) => g("goAo"), score: (g) => mean(g("goAo"), g("hr9Low"), g("eraLow")) },
];

export const PITCHER_TYPE_NAMES = PITCHER_TYPE_DEFS.map((t) => t.name);

export function classifyPitchers(pool: PlayerSeasonRow[]): Map<number, TypeBadge[]> {
  return classify(pool, PITCHER_FEAT_DEFS, PITCHER_TYPE_DEFS);
}

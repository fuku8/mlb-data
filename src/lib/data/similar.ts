// 似たタイプの選手: 打者/投手それぞれ独立に、規定到達者プール内でz-score標準化したユークリッド距離が
// 最小の3名を返す。プールは呼び出し元（選手ページ）が既に持っている規定到達者配列をそのまま使う
import { parseNumber } from "@/lib/data/loaders";
import { isQualifiedHitter, ipToOuts } from "@/lib/data/normalizers";
import type { PlayerSeasonRow } from "@/lib/types";

export interface SimilarPlayersResult {
  type: "batting" | "pitching";
  ids: number[];
}

type FeatureFn = (r: PlayerSeasonRow) => number | null;

function rate(num: number | null | undefined, den: number | null | undefined): number | null {
  if (num === null || num === undefined || !den) return null;
  return num / den;
}

const bAvg: FeatureFn = (r) => parseNumber(r.hitting?.avg);
const bObp: FeatureFn = (r) => parseNumber(r.hitting?.obp);
const bIso: FeatureFn = (r) => {
  const slg = parseNumber(r.hitting?.slg);
  const avg = parseNumber(r.hitting?.avg);
  return slg !== null && avg !== null ? slg - avg : null;
};
const bHrRate: FeatureFn = (r) => rate(r.hitting?.homeRuns, r.hitting?.plateAppearances);
const bBbRate: FeatureFn = (r) => rate(r.hitting?.baseOnBalls, r.hitting?.plateAppearances);
const bKRate: FeatureFn = (r) => rate(r.hitting?.strikeOuts, r.hitting?.plateAppearances);
const bSbRate: FeatureFn = (r) => rate(r.hitting?.stolenBases, r.hitting?.gamesPlayed);

const BATTER_FEATURES: FeatureFn[] = [bAvg, bObp, bIso, bHrRate, bBbRate, bKRate, bSbRate];

const pEra: FeatureFn = (r) => parseNumber(r.pitching?.era);
const pWhip: FeatureFn = (r) => parseNumber(r.pitching?.whip);
const pK9: FeatureFn = (r) => parseNumber(r.pitching?.strikeoutsPer9Inn);
const pBb9: FeatureFn = (r) => parseNumber(r.pitching?.walksPer9Inn);
const pHr9: FeatureFn = (r) => parseNumber(r.pitching?.homeRunsPer9);
// 先発/救援を分離するための登板あたり投球回
const pIpPerG: FeatureFn = (r) => {
  const g = r.pitching?.gamesPlayed;
  if (!g) return null;
  return ipToOuts(r.pitching?.inningsPitched) / 3 / g;
};

const PITCHER_FEATURES: FeatureFn[] = [pEra, pWhip, pK9, pBb9, pHr9, pIpPerG];

// 母集団のz-score（平均・SD）で標準化したユークリッド距離が近い順にplayerIdを返す。自分自身は除外。
// 欠損値・SD=0の特徴量はz=0（母集団平均）扱い
function nearestByFeatures(target: PlayerSeasonRow, pool: PlayerSeasonRow[], features: FeatureFn[], count: number): number[] {
  const stats = features.map((f) => {
    const values = pool.map(f).filter((v): v is number => v !== null);
    const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const variance = values.length > 0 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length : 0;
    return { mean, sd: Math.sqrt(variance) };
  });

  const zVector = (r: PlayerSeasonRow) =>
    features.map((f, i) => {
      const v = f(r);
      if (v === null || stats[i].sd === 0) return 0;
      return (v - stats[i].mean) / stats[i].sd;
    });

  const targetZ = zVector(target);

  return pool
    .filter((r) => r.player_id !== target.player_id)
    .map((r) => {
      const z = zVector(r);
      const dist = Math.sqrt(z.reduce((sum, v, i) => sum + (v - targetZ[i]) ** 2, 0));
      return { playerId: r.player_id, dist };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map((r) => r.playerId);
}

// 打者・投手両方のスタッツを持つ選手は、規定打者なら打者優先（シンプルなタイブレーク）
export function getSimilarPlayers(
  player: PlayerSeasonRow,
  hitterPool: PlayerSeasonRow[],
  pitcherPool: PlayerSeasonRow[],
): SimilarPlayersResult | null {
  const hasHitting = (player.hitting?.plateAppearances ?? 0) > 0;
  const hasPitching = ipToOuts(player.pitching?.inningsPitched) > 0;
  if (!hasHitting && !hasPitching) return null;

  const useBatting = hasHitting && (!hasPitching || isQualifiedHitter(player.hitting?.plateAppearances ?? null));
  const pool = useBatting ? hitterPool : pitcherPool;
  const ids = nearestByFeatures(player, pool, useBatting ? BATTER_FEATURES : PITCHER_FEATURES, 3);
  if (ids.length === 0) return null;

  return { type: useBatting ? "batting" : "pitching", ids };
}

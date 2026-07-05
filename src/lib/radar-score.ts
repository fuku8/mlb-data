// レーダー総合スコア = 平均 × (1 − 標準偏差)。高水準かつ均等なほど高い（0-1）
export function radarScore(pcts: number[]): number {
  if (pcts.length === 0) return 0;
  const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const sd = Math.sqrt(pcts.reduce((a, p) => a + (p - mean) ** 2, 0) / pcts.length);
  return mean * (1 - sd);
}

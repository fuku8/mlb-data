// リーグ内パーセンタイル（mid-rank方式）。0〜1を返す
// 同値はタイの半分を加算するため、反転（1 - pct）しても対称に扱われる
export function percentileOf(values: number[], v: number): number {
  if (values.length === 0) return 0;
  let below = 0;
  let tied = 0;
  for (const x of values) {
    if (x < v) below++;
    else if (x === v) tied++;
  }
  return (below + tied / 2) / values.length;
}

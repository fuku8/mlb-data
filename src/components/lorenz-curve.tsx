// 分布の偏りを可視化するローレンツ曲線。サーバーコンポーネント・純SVG

const W = 200;
const H = 200;
const PAD = 10;

// values: 対象各人の値（順不同）
export function LorenzCurve({ values, label }: { values: number[]; label: string }) {
  const xs = [...values].sort((a, b) => a - b);
  const total = xs.reduce((a, b) => a + b, 0);
  if (xs.length === 0 || total === 0) return null;

  const sx = (f: number) => PAD + f * (W - 2 * PAD);
  const sy = (f: number) => H - PAD - f * (H - 2 * PAD);
  let cum = 0;
  const pts = [[sx(0), sy(0)] as [number, number]];
  xs.forEach((x, i) => {
    cum += x;
    pts.push([sx((i + 1) / xs.length), sy(cum / total)]);
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 400 }} role="img" aria-label={`${label}の偏りを表すローレンツ曲線`}>
      {/* 完全均等線と曲線の間が「偏り」 */}
      <path d={`${path}Z`} fill="#f97316" fillOpacity={0.15} />
      <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="4 3" />
      <path d={path} fill="none" stroke="#f97316" strokeWidth={2} />
      <text x={sx(0.5)} y={H - 1} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.6}>
        選手（{label}の少ない順）→
      </text>
      <text x={7} y={sy(0.5)} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.6} transform={`rotate(-90 7 ${sy(0.5)})`}>
        {label}の累積シェア→
      </text>
    </svg>
  );
}

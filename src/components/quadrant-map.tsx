// 汎用象限マップ: 中央値クロスの散布図。サーバーコンポーネント・純SVG

export interface QuadrantDot {
  name: string;
  x: number;
  y: number;
  detail?: string; // <title>に併記する補足（チーム名など）
}

const W = 640;
const H = 420;
const PAD = { l: 50, r: 16, t: 20, b: 40 };

// 偶数個は中間2値の平均
function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

export function QuadrantMap({
  dots,
  xLabel,
  yLabel,
  formatX = (v: number) => v.toFixed(2),
  formatY = (v: number) => v.toFixed(2),
}: {
  dots: QuadrantDot[];
  xLabel: string;
  yLabel: string;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
}) {
  if (dots.length === 0) return null;
  const xs = dots.map((d) => d.x).sort((a, b) => a - b);
  const ys = dots.map((d) => d.y).sort((a, b) => a - b);
  const xMed = median(xs);
  const yMed = median(ys);
  const xPad = (xs[xs.length - 1] - xs[0]) * 0.05 || 1;
  const yPad = (ys[ys.length - 1] - ys[0]) * 0.05 || 1;
  const x0 = xs[0] - xPad;
  const x1 = xs[xs.length - 1] + xPad;
  const y0 = ys[0] - yPad;
  const y1 = ys[ys.length - 1] + yPad;

  const sx = (v: number) => {
    const f = (v - x0) / (x1 - x0);
    return PAD.l + f * (W - PAD.l - PAD.r);
  };
  const sy = (v: number) => {
    const f = (v - y0) / (y1 - y0);
    return H - PAD.b - f * (H - PAD.t - PAD.b);
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", minWidth: 480 }}
        role="img"
        aria-label={`${xLabel}と${yLabel}の散布図（中央値クロス）`}
      >
        <line x1={sx(xMed)} y1={PAD.t} x2={sx(xMed)} y2={H - PAD.b} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        <line x1={PAD.l} y1={sy(yMed)} x2={W - PAD.r} y2={sy(yMed)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        {dots.map((d) => (
          <circle key={d.name} cx={sx(d.x)} cy={sy(d.y)} r={4} fill="#0ea5e9" fillOpacity={0.85}>
            <title>{`${d.name}${d.detail ? ` (${d.detail})` : ""}  ${xLabel} ${formatX(d.x)} / ${yLabel} ${formatY(d.y)}`}</title>
          </circle>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.6}>
          {xLabel}→
        </text>
        <text
          x={14}
          y={(PAD.t + H - PAD.b) / 2}
          textAnchor="middle"
          fontSize={11}
          fill="currentColor"
          fillOpacity={0.6}
          transform={`rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`}
        >
          {yLabel}→
        </text>
      </svg>
    </div>
  );
}

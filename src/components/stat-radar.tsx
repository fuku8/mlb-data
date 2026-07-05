// 汎用パーセンタイルレーダー（打者/投手で共用）。サーバーコンポーネント・純SVG
import { radarScore } from "@/lib/radar-score";
import { CardHeader } from "@/components/card-header";

export interface RadarAxis {
  label: string;
  pct: number; // 0-1
  display?: string;
}

const CX = 130; // 中心x
const CY = 110; // 中心y
const R = 78; // 最大半径

function pt(i: number, n: number, r: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export function StatRadar({
  title,
  axes,
  note,
  metricHref,
}: {
  title: string;
  axes: RadarAxis[];
  note?: string;
  metricHref?: string;
}) {
  const n = axes.length;
  if (n === 0) return null;
  const ring = (frac: number) => axes.map((_, i) => pt(i, n, R * frac).join(",")).join(" ");
  const shape = axes.map((a, i) => pt(i, n, R * Math.max(0.02, a.pct)).join(",")).join(" ");
  const computedScore = radarScore(axes.map((a) => a.pct));

  return (
    <section className="card">
      <CardHeader title={title} metricHref={metricHref} note={note} />
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <svg
          viewBox="0 0 260 220"
          style={{ width: "100%", maxWidth: 260 }}
          role="img"
          aria-label={`${title}: ${axes.map((a) => `${a.label} ${Math.round(a.pct * 100)}`).join(", ")}`}
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <polygon key={f} points={ring(f)} fill="none" stroke="currentColor" strokeOpacity={0.15} />
          ))}
          {axes.map((_, i) => {
            const [x, y] = pt(i, n, R);
            return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.15} />;
          })}
          <polygon points={shape} fill="#f97316" fillOpacity={0.35} stroke="#f97316" strokeWidth={1.5} />
          {axes.map((a, i) => {
            const [x, y] = pt(i, n, R + 18);
            return (
              <text key={a.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="currentColor">
                {a.label}
              </text>
            );
          })}
          {axes.map((a, i) => {
            const [x, y] = pt(i, n, R * Math.max(0.02, a.pct));
            return (
              <circle key={a.label} cx={x} cy={y} r={2.5} fill="#f97316">
                <title>{`${a.label}: ${a.display ?? `${Math.round(a.pct * 100)}%ile`}`}</title>
              </circle>
            );
          })}
        </svg>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>総合スコア（平均×均等さ）</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{Math.round(computedScore * 100)}</div>
        </div>
      </div>
    </section>
  );
}

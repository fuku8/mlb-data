// 選手比較用の複数系列レーダー（stat-radar.tsxと同じ幾何・純SVG）。選手ごとに色分けしたポリゴンを重ねる
import { CardHeader } from "@/components/card-header";
import type { RadarAxis } from "@/components/stat-radar";

const CX = 130; // 中心x
const CY = 110; // 中心y
const R = 78; // 最大半径

function pt(i: number, n: number, r: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export interface CompareRadarSeries {
  name: string;
  color: string;
  axes: RadarAxis[];
}

export function CompareRadar({
  title,
  note,
  series,
  metricHref,
}: {
  title: string;
  note?: string;
  series: CompareRadarSeries[];
  metricHref?: string;
}) {
  const axes = series[0]?.axes ?? [];
  const n = axes.length;
  if (n === 0) return null;
  const ring = (frac: number) => axes.map((_, i) => pt(i, n, R * frac).join(",")).join(" ");

  return (
    <section className="card">
      <CardHeader title={title} metricHref={metricHref} note={note} />
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
        <svg
          viewBox="0 0 260 220"
          style={{ width: "100%", maxWidth: 400 }}
          role="img"
          aria-label={`${title}: ${axes.map((a) => a.label).join(", ")}`}
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <polygon key={f} points={ring(f)} fill="none" stroke="currentColor" strokeOpacity={0.15} />
          ))}
          {axes.map((_, i) => {
            const [x, y] = pt(i, n, R);
            return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.15} />;
          })}
          {series.map((s) => {
            const shape = axes
              .map((a, i) => {
                const match = s.axes.find((x) => x.label === a.label);
                return pt(i, n, R * Math.max(0.02, match?.pct ?? 0)).join(",");
              })
              .join(" ");
            return (
              <polygon key={s.name} points={shape} fill={s.color} fillOpacity={0.15} stroke={s.color} strokeWidth={2} />
            );
          })}
          {axes.map((a, i) => {
            const [x, y] = pt(i, n, R + 18);
            return (
              <text key={a.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="currentColor">
                {a.label}
              </text>
            );
          })}
        </svg>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8, minWidth: 100 }}>
          {series.map((s) => (
            <li key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: s.color }}>
              <span style={{ height: 10, width: 10, borderRadius: "50%", backgroundColor: s.color, display: "inline-block", flexShrink: 0 }} />
              {s.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ラック指数（風向きメーター）: 中央=平均/FIP一致、左=向かい風・右=追い風。純SVG・サーバーコンポーネント
import { meterValue, type LuckResult } from "@/lib/luck";
import { CardHeader } from "@/components/card-header";

const W = 320;
const H = 70;
const TRACK_Y = 30;

export function LuckMeter({
  title,
  result,
  range,
  desc,
  metricHref,
}: {
  title: string;
  result: LuckResult;
  range: number; // 表示レンジ（この値で±クランプ）。打者0.06、投手1.2
  desc: string;
  metricHref?: string;
}) {
  // マーカー位置は生deltaでなくmeterValue（正=追い風=右）を使う。投手はdelta正=向かい風のため符号が逆
  const clamped = Math.max(-range, Math.min(range, meterValue(result)));
  const markerX = W / 2 + (clamped / range) * (W / 2 - 12);
  const color = result.direction === "neutral" ? "var(--muted-foreground)" : result.direction === "tail" ? "#22c55e" : "#ef4444";

  return (
    <section className="card">
      <CardHeader title={title} metricHref={metricHref} />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W }} role="img" aria-label={`${title}: ${result.label}`}>
        <line x1={6} y1={TRACK_Y} x2={W - 6} y2={TRACK_Y} stroke="var(--muted)" strokeWidth={6} strokeLinecap="round" />
        <line x1={W / 2} y1={TRACK_Y - 10} x2={W / 2} y2={TRACK_Y + 10} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="3 2" />
        <circle cx={markerX} cy={TRACK_Y} r={8} fill={color} />
        <text x={6} y={H - 6} fontSize={11} fill="currentColor" fillOpacity={0.6}>
          ← 向かい風
        </text>
        <text x={W - 6} y={H - 6} fontSize={11} textAnchor="end" fill="currentColor" fillOpacity={0.6}>
          追い風 →
        </text>
      </svg>
      <p style={{ margin: "8px 0 4px", fontWeight: 600 }}>{result.label}</p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>{desc}</p>
    </section>
  );
}

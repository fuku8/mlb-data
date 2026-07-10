// レーダー総合スコア（radar-score.ts）の選手間比較用横棒グラフ。純CSS、0-100固定スケール
import { CardHeader } from "@/components/card-header";
import { radarScore } from "@/lib/radar-score";
import type { CompareRadarSeries } from "@/components/compare-radar";

export function CompareScoreBars({
  title,
  note,
  series,
}: {
  title: string;
  note?: string;
  series: CompareRadarSeries[];
}) {
  const rows = series.filter((s) => s.axes.length > 0).map((s) => ({ ...s, score: Math.round(radarScore(s.axes.map((a) => a.pct)) * 100) }));
  if (rows.length === 0) return null;

  return (
    <section className="card">
      <CardHeader title={title} note={note} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((s) => (
          <div key={s.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: s.color, fontWeight: 600 }}>{s.name}</span>
              <span style={{ fontWeight: 700 }}>{s.score}</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: "var(--secondary)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.score}%`, background: s.color, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

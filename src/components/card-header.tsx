// カード見出し共通部品: タイトル + 任意のMetricLink + 任意の補足文
import { MetricLink } from "@/components/metric-link";

export function CardHeader({
  title,
  metricHref,
  note,
}: {
  title: string;
  metricHref?: string;
  note?: string;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: note ? 4 : 12 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {metricHref && <MetricLink anchor={metricHref} />}
      </div>
      {note && (
        <p style={{ marginTop: 0, marginBottom: 12, color: "var(--muted-foreground)", fontSize: 13 }}>{note}</p>
      )}
    </>
  );
}

// セイバー指標カード: 値＋リーグ内パーセンタイルバー＋1行解説の3点セット
import type { SaberRow } from "@/lib/metrics";
import { CardHeader } from "@/components/card-header";
import { pctColor } from "@/components/percentile-bars";

export function SaberCard({
  title,
  rows,
  note,
  metricHref,
}: {
  title: string;
  rows: SaberRow[];
  note?: string;
  metricHref?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="card">
      <CardHeader title={title} metricHref={metricHref} note={note} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((r) => {
          const p100 = Math.round(r.pct * 100);
          const color = pctColor(r.pct);
          return (
            <div key={r.label}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
                <div style={{ width: 90, flexShrink: 0, color: "var(--muted-foreground)" }}>{r.label}</div>
                <div style={{ position: "relative", flex: 1, height: 8, borderRadius: 999, background: "var(--muted)" }}>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: `${r.pct * 100}%`,
                      borderRadius: 999,
                      backgroundColor: color,
                      opacity: 0.45,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: `${r.pct * 100}%`,
                      transform: "translate(-50%, -50%)",
                      height: 22,
                      width: 22,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      backgroundColor: color,
                    }}
                  >
                    {p100}
                  </div>
                </div>
                <div style={{ width: 56, flexShrink: 0, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                  {r.display}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4, marginLeft: 102 }}>
                {r.desc}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

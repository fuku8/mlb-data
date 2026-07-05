// リーグ内パーセンタイルを色温度つきバーで表示するカード。サーバーコンポーネント・純CSS

export interface PercentileRow {
  label: string;
  display: string;
  pct: number; // 0-1。高いほど良い方向に正規化済みであること
}

// 青(低) → 赤(高) の色温度
function pctColor(pct: number): string {
  const hue = 220 * (1 - pct);
  return `hsl(${hue}, 65%, 48%)`;
}

export function PercentileBars({ title, rows, note }: { title: string; rows: PercentileRow[]; note?: string }) {
  return (
    <section className="card">
      <h2 style={{ marginTop: 0, marginBottom: note ? 4 : 12 }}>{title}</h2>
      {note && (
        <p style={{ marginTop: 0, marginBottom: 12, color: "var(--muted-foreground)", fontSize: 13 }}>{note}</p>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map(({ label, display, pct }) => {
          const p100 = Math.round(pct * 100);
          const color = pctColor(pct);
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
              <div style={{ width: 90, flexShrink: 0, color: "var(--muted-foreground)" }}>{label}</div>
              <div style={{ position: "relative", flex: 1, height: 8, borderRadius: 999, background: "var(--muted)" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${pct * 100}%`,
                    borderRadius: 999,
                    backgroundColor: color,
                    opacity: 0.45,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: `${pct * 100}%`,
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
                {display}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

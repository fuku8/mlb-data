// リーグ内パーセンタイルを色温度つきバーで表示するカード。サーバーコンポーネント・純CSS
import { CardHeader } from "@/components/card-header";

export interface PercentileRow {
  label: string;
  display: string;
  pct: number; // 0-1。高いほど良い方向に正規化済みであること
}

// 青(低) → 赤(高) の色温度
export function pctColor(pct: number): string {
  const hue = 220 * (1 - pct);
  return `hsl(${hue}, 65%, 48%)`;
}

// ノブ背景（pctColor）の相対輝度で文字色を白/黒に切り替える。
// 白文字固定だと黄〜緑帯（pct 0.3〜0.9）でWCAG 4.5:1を割るため（feel-viz 2026-07-16アクセシビリティ点検 A-1の移植）。
// しきい値0.179は白と黒のコントラストが等しくなる輝度＝境界でも両側4.58:1を確保できる値
export function knobTextColor(pct: number): string {
  const hue = 220 * (1 - pct);
  const s = 0.65;
  const l = 0.48;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : [0, x, c];
  const lin = (ch: number) => {
    const v = ch + m;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.179 ? "#000" : "#fff";
}

export function PercentileBars({
  title,
  rows,
  note,
  metricHref,
}: {
  title: string;
  rows: PercentileRow[];
  note?: string;
  metricHref?: string;
}) {
  return (
    <section className="card">
      <CardHeader title={title} metricHref={metricHref} note={note} />
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
                    height: 26,
                    width: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: knobTextColor(pct),
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

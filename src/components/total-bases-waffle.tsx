// 塁打構成ワッフル: 単打×1/二塁打×2/三塁打×3/本塁打×4 の塁打シェアを100マスで表示
// サーバーコンポーネント・純CSS grid
import { CardHeader } from "@/components/card-header";

const PARTS = [
  { key: "single", label: "単打", color: "#0ea5e9" },
  { key: "double", label: "二塁打", color: "#22c55e" },
  { key: "triple", label: "三塁打", color: "#f59e0b" },
  { key: "homeRun", label: "本塁打", color: "#ef4444" },
] as const;

export function TotalBasesWaffle({
  hits,
  doubles,
  triples,
  homeRuns,
  metricHref,
  title = "塁打構成",
  bare = false,
}: {
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  metricHref?: string;
  title?: string; // 比較ページで選手名付きタイトルに差し替える場合に使用
  bare?: boolean; // trueなら外側のcard/見出しを省略し、グリッドと凡例だけ返す（比較ページで1枚のcardに複数選手をまとめる用）
}) {
  const singles = Math.max(0, hits - doubles - triples - homeRuns);
  const bases = {
    single: singles * 1,
    double: doubles * 2,
    triple: triples * 3,
    homeRun: homeRuns * 4,
  };
  const total = bases.single + bases.double + bases.triple + bases.homeRun;
  if (total <= 0) return null;

  // 四捨五入で合計100にならない分は最大パートで調整（必ず100マスにする）
  const counts = PARTS.map((p) => Math.round((bases[p.key] / total) * 100));
  const diff = 100 - counts.reduce((a, b) => a + b, 0);
  counts[counts.indexOf(Math.max(...counts))] += diff;

  const cells: string[] = [];
  PARTS.forEach((p, i) => {
    for (let j = 0; j < counts[i]; j++) cells.push(p.color);
  });

  const content = (
    <>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 3, width: "fit-content", marginBottom: 14 }}
        role="img"
        aria-label={`塁打構成: ${PARTS.map((p, i) => `${p.label} ${counts[i]}%`).join(", ")}`}
      >
        {cells.map((color, i) => (
          <div key={i} style={{ height: 20, width: 20, borderRadius: 3, backgroundColor: color }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
        {PARTS.map((p, i) => (
          <span key={p.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ height: 10, width: 10, borderRadius: 2, backgroundColor: p.color, display: "inline-block" }} />
            {p.label} {counts[i]}%（{bases[p.key]}塁打）
          </span>
        ))}
      </div>
    </>
  );

  if (bare) return content;

  return (
    <section className="card">
      <CardHeader title={title} metricHref={metricHref} />
      {content}
    </section>
  );
}

// 選手タイプバッジ: タイプ名＋評価点(0-100)のピル表示。fallback=trueは「参考」注記付きで控えめに表示
import Link from "next/link";
import type { TypeBadge } from "@/lib/player-types";

export function TypeBadges({ label, badges }: { label: string; badges: TypeBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>{label}</span>
      {badges.map((b) => (
        <Link
          key={b.type}
          href="/types"
          title="タイプ判定の仕組みを見る"
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 6,
            borderRadius: 999,
            border: "1px solid var(--muted)",
            padding: "4px 12px",
            fontSize: 14,
            textDecoration: "none",
            color: "inherit",
            opacity: b.fallback ? 0.6 : 1,
            fontWeight: b.fallback ? 400 : 700,
          }}
        >
          {b.type}
          {b.fallback && "（参考）"}
          <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>
            {Math.round(b.score * 100)}
          </span>
        </Link>
      ))}
    </div>
  );
}

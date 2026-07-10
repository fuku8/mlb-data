import Link from "next/link";
import { gameDetailUrl } from "@/lib/game-display";
import type { GameResult } from "@/lib/types";

type Props = {
  game: GameResult;
  compact?: boolean;
};

export function GameCard({ game: g, compact }: Props) {
  const isFinal = g.status_code === "F";
  const awayWon = isFinal && g.away_score !== null && g.home_score !== null && g.away_score > g.home_score;
  const homeWon = isFinal && g.away_score !== null && g.home_score !== null && g.home_score > g.away_score;

  const jstTime = !isFinal && g.game_date
    ? new Date(g.game_date).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false })
    : null;

  const badgeSize = compact ? 11 : 12;
  const scoreSize = compact ? 18 : 22;
  const teamSize = compact ? 13 : undefined;
  const gap = compact ? 4 : 6;
  const mb = compact ? 6 : 10;

  return (
    <div
      className={compact ? undefined : "card"}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: compact ? "10px 14px" : 14,
        background: compact ? "var(--background)" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mb }}>
        <span
          style={{
            fontSize: badgeSize,
            fontWeight: 600,
            padding: compact ? "3px 8px" : "4px 10px",
            borderRadius: 4,
            background: isFinal ? "#166534" : "#854d0e",
            color: "#fff",
          }}
        >
          {isFinal ? "Final" : g.status}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: badgeSize, color: "var(--muted-foreground)" }}>
          <span>
            {jstTime && <span style={{ marginRight: 6 }}>{jstTime} JST</span>}
            {g.venue_name}
          </span>
          <a
            href={gameDetailUrl(g.game_pk)}
            target="_blank"
            rel="noopener noreferrer"
            title="公式サイトの試合詳細を開く"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--foreground)",
              background: "var(--secondary)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "5px 10px",
              whiteSpace: "nowrap",
            }}
          >
            Gameday ↗
          </a>
        </span>
      </div>

      <div style={{ display: "grid", gap }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: teamSize, fontWeight: awayWon ? 700 : 400, opacity: homeWon ? 0.5 : 1 }}>
            {g.away_team_id ? <Link href={`/teams/${g.away_team_id}`}>{g.away_team_name}</Link> : g.away_team_name}
          </span>
          <span style={{ fontSize: scoreSize, fontWeight: awayWon ? 700 : 400, opacity: homeWon ? 0.5 : 1, fontVariantNumeric: "tabular-nums" }}>
            {g.away_score ?? "-"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: teamSize, fontWeight: homeWon ? 700 : 400, opacity: awayWon ? 0.5 : 1 }}>
            {g.home_team_id ? <Link href={`/teams/${g.home_team_id}`}>{g.home_team_name}</Link> : g.home_team_name}
          </span>
          <span style={{ fontSize: scoreSize, fontWeight: homeWon ? 700 : 400, opacity: awayWon ? 0.5 : 1, fontVariantNumeric: "tabular-nums" }}>
            {g.home_score ?? "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

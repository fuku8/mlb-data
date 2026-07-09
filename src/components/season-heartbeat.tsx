// シーズン心電図: Final試合の得点差を日付順のバー列で表示する
// 月開始マーカー付き、バークリックで試合詳細を表示
"use client";

import { useState } from "react";
import { gameDetailUrl } from "@/lib/game-display";

export interface TeamGameMargin {
  date: string;
  opponent: string;
  teamScore: number;
  oppScore: number;
  margin: number; // 自チーム得点 − 相手得点
  isHome: boolean;
  gamePk: number;
}

const BAR_W = 5;
const GAP = 2;
const HALF = 42; // 中心線から上下の最大高さ
const CAP = 10; // 点差の表示キャップ
const TOP = 13; // 月ラベル帯の高さ

// 月開始位置: 最初の試合と、前の試合から月が変わった試合
function monthStarts(games: TeamGameMargin[]): { index: number; label: string }[] {
  return games.flatMap((g, i) => {
    const month = g.date.slice(5, 7);
    if (i > 0 && games[i - 1].date.slice(5, 7) === month) return [];
    return [{ index: i, label: `${Number(month)}月` }];
  });
}

export function SeasonHeartbeat({ games }: { games: TeamGameMargin[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (games.length === 0) return null;
  const width = games.length * (BAR_W + GAP);
  const height = TOP + HALF * 2;
  const sel = selected !== null ? games[selected] : null;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", minWidth: 560 }}
          role="img"
          aria-label="シーズン全試合の得点差"
        >
          {monthStarts(games).map(({ index, label }) => {
            const x = index * (BAR_W + GAP) - GAP / 2;
            return (
              <g key={index}>
                <line x1={x} y1={0} x2={x} y2={height} stroke="currentColor" strokeOpacity={0.15} />
                <text x={x + 3} y={9} fontSize={9} fill="currentColor" opacity={0.55}>
                  {label}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={TOP + HALF} x2={width} y2={TOP + HALF} stroke="currentColor" strokeOpacity={0.2} />
          {games.map((g, i) => {
            const win = g.margin > 0;
            const h = Math.max(3, (Math.min(Math.abs(g.margin), CAP) / CAP) * (HALF - 4));
            return (
              <rect
                key={`${g.date}-${i}`}
                x={i * (BAR_W + GAP)}
                y={TOP + (win ? HALF - h : HALF)}
                width={BAR_W}
                height={h}
                rx={1.5}
                fill={win ? "#10b981" : "#f43f5e"}
                stroke={selected === i ? "currentColor" : "none"}
                strokeWidth={selected === i ? 1 : 0}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(selected === i ? null : i)}
              >
                <title>{`${g.date} vs ${g.opponent} ${g.teamScore}-${g.oppScore}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      {sel && (
        <div
          style={{
            marginTop: 8,
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 12,
            fontSize: 14,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            columnGap: 12,
            rowGap: 4,
          }}
        >
          <span style={{ color: "var(--muted-foreground)" }}>{sel.date}</span>
          <span style={{ fontWeight: 500 }}>
            {sel.isHome ? "vs" : "@"} {sel.opponent}
          </span>
          <span style={{ fontWeight: 600, color: sel.margin > 0 ? "#10b981" : "#f43f5e" }}>
            {sel.margin > 0 ? "勝ち" : "負け"} {sel.teamScore}-{sel.oppScore}
          </span>
          <a
            href={gameDetailUrl(sel.gamePk)}
            target="_blank"
            rel="noopener noreferrer"
            title="公式サイトの試合詳細を開く"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--foreground)",
              background: "var(--secondary)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "8px 14px",
              whiteSpace: "nowrap",
            }}
          >
            公式サイトの試合詳細 ↗
          </a>
        </div>
      )}
    </div>
  );
}

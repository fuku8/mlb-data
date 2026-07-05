// シーズン心電図: Final試合の得点差を日付順のバー列で表示する。純SVG・サーバーコンポーネント

export interface TeamGameMargin {
  date: string;
  opponent: string;
  teamScore: number;
  oppScore: number;
  margin: number; // 自チーム得点 − 相手得点
}

const BAR_W = 5;
const GAP = 2;
const HALF = 42; // 中心線から上下の最大高さ
const CAP = 10; // 点差の表示キャップ

export function SeasonHeartbeat({ games }: { games: TeamGameMargin[] }) {
  if (games.length === 0) return null;
  const width = games.length * (BAR_W + GAP);
  const height = HALF * 2;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", minWidth: 560 }}
        role="img"
        aria-label="シーズン全試合の得点差"
      >
        <line x1={0} y1={HALF} x2={width} y2={HALF} stroke="currentColor" strokeOpacity={0.2} />
        {games.map((g, i) => {
          const win = g.margin > 0;
          const h = Math.max(3, (Math.min(Math.abs(g.margin), CAP) / CAP) * (HALF - 4));
          return (
            <rect
              key={`${g.date}-${i}`}
              x={i * (BAR_W + GAP)}
              y={win ? HALF - h : HALF}
              width={BAR_W}
              height={h}
              rx={1.5}
              fill={win ? "#10b981" : "#f43f5e"}
            >
              <title>{`${g.date} vs ${g.opponent} ${g.teamScore}-${g.oppScore}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

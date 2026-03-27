import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { getSchedule } from "@/lib/data/loaders";
import { getGameDates, parseGameResults } from "@/lib/data/normalizers";
import { formatDate } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function GamesPage({ searchParams }: Props) {
  const { date } = await searchParams;
  const raw = await getSchedule();
  const allGames = parseGameResults(raw);
  const dates = getGameDates(allGames);

  const selectedDate = date && dates.includes(date) ? date : dates[0] ?? "";
  const games = allGames
    .filter((g) => g.official_date === selectedDate)
    .sort((a, b) => a.game_date.localeCompare(b.game_date));

  const idx = dates.indexOf(selectedDate);
  const prevDate = idx >= 0 ? dates[idx + 1] : undefined;
  const nextDate = idx >= 1 ? dates[idx - 1] : undefined;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="card">
        <h1 style={{ margin: "0 0 12px", fontSize: 34, lineHeight: 1.1 }}>試合結果</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {prevDate ? (
            <Link href={`/games?date=${prevDate}`} style={{ fontSize: 14 }}>← {formatDate(prevDate)}</Link>
          ) : (
            <span style={{ opacity: 0.3, fontSize: 14 }}>← Prev</span>
          )}
          <form method="get" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select name="date" defaultValue={selectedDate} style={{ minWidth: 160 }} aria-label="日付を選択">
              {dates.map((d) => (
                <option key={d} value={d}>{formatDate(d)}</option>
              ))}
            </select>
            <button className="primary" type="submit">Go</button>
          </form>
          {nextDate ? (
            <Link href={`/games?date=${nextDate}`} style={{ fontSize: 14 }}>{formatDate(nextDate)} →</Link>
          ) : (
            <span style={{ opacity: 0.3, fontSize: 14 }}>Next →</span>
          )}
        </div>
      </section>

      {games.length === 0 ? (
        <section className="card">
          <p style={{ margin: 0, color: "var(--muted-foreground)" }}>この日の試合データはありません。</p>
        </section>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {games.map((g) => (
            <GameCard key={g.game_pk} game={g} />
          ))}
        </section>
      )}
    </div>
  );
}

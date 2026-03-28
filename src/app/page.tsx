import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { getSchedule, getStandings, parseNumber, readTextFile } from "@/lib/data/loaders";
import { parseGameResults } from "@/lib/data/normalizers";
import { formatUpdatedAtJst, getGamesForJstDate, getLatestFinalJstDate } from "@/lib/game-display";
import { formatDate } from "@/lib/utils";

export default async function HomePage() {
  const [updated, standings, scheduleRaw] = await Promise.all([
    readTextFile("last_updated.txt"),
    getStandings(),
    getSchedule(),
  ]);
  const allGames = parseGameResults(scheduleRaw);
  const latestFinalDate = getLatestFinalJstDate(allGames);
  const recentGames = latestFinalDate ? getGamesForJstDate(allGames, latestFinalDate) : [];
  const updatedAtLabel = formatUpdatedAtJst(updated);
  const sorted = [...standings].sort((a, b) => {
    const aRank = parseNumber(a.sport_rank);
    const bRank = parseNumber(b.sport_rank);

    if (aRank !== null && bRank !== null) return aRank - bRank;
    if (aRank !== null) return -1;
    if (bRank !== null) return 1;

    const aPct = parseNumber(a.winning_percentage) ?? -1;
    const bPct = parseNumber(b.winning_percentage) ?? -1;
    return bPct - aPct;
  });
  const topTeams = sorted.slice(0, 12);
  const divisions = [
    { id: 201, league: "AL", label: "East" },
    { id: 202, league: "AL", label: "Central" },
    { id: 200, league: "AL", label: "West" },
    { id: 204, league: "NL", label: "East" },
    { id: 205, league: "NL", label: "Central" },
    { id: 203, league: "NL", label: "West" },
  ] as const;
  const groups = [
    { key: "AL", title: "American League", badgeBg: "#1e3a8a", badgeFg: "#dbeafe" },
    { key: "NL", title: "National League", badgeBg: "#7f1d1d", badgeFg: "#fee2e2" },
  ] as const;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="card">
        <h1 style={{ margin: "0 0 18px", fontSize: 36, lineHeight: 1.1 }}>MLB Data Dashboard</h1>
        <p style={{ margin: 0, color: "var(--muted-foreground)" }}>選手検索・比較と、チームごとの選手スタッツを確認できます。</p>
      </section>

      <section className="card">
        <p style={{ margin: 0 }}>Last updated (JST): {updatedAtLabel}</p>
      </section>

      {recentGames.length > 0 && (
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>
              Latest Results
              <span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted-foreground)", marginLeft: 10 }}>
                {formatDate(latestFinalDate)}
              </span>
            </h2>
            <Link href={`/games?date=${latestFinalDate}`} style={{ fontSize: 13 }}>All games →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {recentGames.map((g) => (
              <GameCard key={g.game_pk} game={g} compact />
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Team Quick Links</h2>
          <Link href="/standings">View all standings</Link>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {topTeams.map((row) => (
            <Link
              key={`${row.team_id}-${row.season}`}
              href={`/teams/${row.team_id}?season=${row.season}`}
              className="rounded-full border border-border bg-accent px-3 py-1 text-xs text-accent-foreground transition-colors hover:bg-secondary"
            >
              {row.team_name ?? "N/A"}
            </Link>
          ))}
        </div>
      </section>

      <section className="card table-wrap">
        <h2 style={{ margin: "0 0 18px" }}>Standings Snapshot (All Teams)</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {groups.map((group) => (
            <div key={group.key} style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    background: group.badgeBg,
                    color: group.badgeFg,
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {group.key}
                </span>
                <span style={{ fontSize: 14, color: "#d4d4d8", fontWeight: 600 }}>{group.title}</span>
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                {divisions
                  .filter((d) => d.league === group.key)
                  .map((division) => {
                    const rows = sorted
                      .filter((row) => parseNumber(row.division_id) === division.id)
                      .sort((a, b) => {
                        const aRank = parseNumber(a.division_rank);
                        const bRank = parseNumber(b.division_rank);
                        if (aRank !== null && bRank !== null) return aRank - bRank;
                        if (aRank !== null) return -1;
                        if (bRank !== null) return 1;
                        return (parseNumber(b.winning_percentage) ?? -1) - (parseNumber(a.winning_percentage) ?? -1);
                      });

                    if (rows.length === 0) return null;

                    return (
                      <div key={`${group.key}-${division.id}`} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                        <div
                          style={{
                            padding: "8px 10px",
                            borderBottom: "1px solid var(--border)",
                            background: "rgba(255,255,255,0.03)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              color: "#e5e7eb",
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {group.key}
                          </span>
                          <h3 style={{ margin: 0, fontSize: 13, color: "#e5e7eb" }}>{division.label}</h3>
                        </div>

                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Team</th>
                              <th>W</th>
                              <th>L</th>
                              <th>PCT</th>
                              <th>GB</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={`snapshot-${division.id}-${row.team_id}-${row.season}`}>
                                <td>{row.division_rank ?? "N/A"}</td>
                                <td>
                                  <Link href={`/teams/${row.team_id}?season=${row.season}`}>{row.team_name ?? "N/A"}</Link>
                                </td>
                                <td>{row.wins ?? "N/A"}</td>
                                <td>{row.losses ?? "N/A"}</td>
                                <td>{row.winning_percentage ?? "N/A"}</td>
                                <td>{row.games_back ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

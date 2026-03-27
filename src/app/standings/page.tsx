import Link from "next/link";
import { getPlayerFielding, getPlayerHitting, getPlayerPitching, getPlayers, getStandings, parseNumber } from "@/lib/data/loaders";
import { mergePlayerStatsBySeason, seasonOrDefault } from "@/lib/data/normalizers";

type Props = {
  searchParams: Promise<{ season?: string; alDiv?: string; nlDiv?: string }>;
};

type DivisionTab = "east" | "central" | "west";

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (typeof v === "number" && Number.isFinite(v) ? v : 0), 0);
}

function fixed(value: number | null, digits: number): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return value.toFixed(digits);
}

function ipToOuts(ip: string | null | undefined): number {
  if (!ip) return 0;
  const [whole, part] = ip.split(".");
  const innings = Number(whole || "0");
  const partial = Number(part || "0");
  if (!Number.isFinite(innings) || !Number.isFinite(partial)) return 0;
  return innings * 3 + partial;
}

function wl(wins?: string, losses?: string): string {
  if (!wins && !losses) return "N/A";
  return `${wins ?? "0"}-${losses ?? "0"}`;
}

function validDivision(value?: string): DivisionTab {
  return value === "east" || value === "central" || value === "west" ? value : "east";
}

function tabMeta(league: "AL" | "NL", tab: DivisionTab) {
  if (league === "AL") {
    if (tab === "east") return { id: 201, label: "East" };
    if (tab === "central") return { id: 202, label: "Central" };
    return { id: 200, label: "West" };
  }
  if (tab === "east") return { id: 204, label: "East" };
  if (tab === "central") return { id: 205, label: "Central" };
  return { id: 203, label: "West" };
}

function leagueBadge(league: "AL" | "NL") {
  return league === "AL"
    ? { title: "American League", bg: "#1e3a8a", fg: "#dbeafe" }
    : { title: "National League", bg: "#7f1d1d", fg: "#fee2e2" };
}

export default async function StandingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const season = seasonOrDefault(params.season);
  const alDiv = validDivision(params.alDiv);
  const nlDiv = validDivision(params.nlDiv);

  const [standings, players, hitting, pitching, fielding] = await Promise.all([
    getStandings(),
    getPlayers(),
    getPlayerHitting(),
    getPlayerPitching(),
    getPlayerFielding(),
  ]);

  const merged = mergePlayerStatsBySeason({ players, hitting, pitching, fielding, season });
  const teamStats = new Map<number, { ops: string; era: string }>();
  const teamIds = new Set<number>();
  for (const row of standings) {
    const tid = parseNumber(row.team_id);
    if (tid !== null) teamIds.add(tid);
  }
  for (const teamId of teamIds) {
    const roster = merged.filter((p) => p.team_id === teamId);
    const teamAB = sum(roster.map((p) => p.hitting?.atBats));
    const teamH = sum(roster.map((p) => p.hitting?.hits));
    const teamBBBat = sum(roster.map((p) => p.hitting?.baseOnBalls));
    const teamHBP = sum(roster.map((p) => p.hitting?.hitByPitch));
    const teamSF = sum(roster.map((p) => p.hitting?.sacFlies));
    const teamTB = sum(roster.map((p) => p.hitting?.totalBases));

    const teamObpDenom = teamAB + teamBBBat + teamHBP + teamSF;
    const teamObp = teamObpDenom > 0 ? (teamH + teamBBBat + teamHBP) / teamObpDenom : null;
    const teamSlg = teamAB > 0 ? teamTB / teamAB : null;
    const teamOps = teamObp !== null && teamSlg !== null ? teamObp + teamSlg : null;

    const teamER = sum(roster.map((p) => p.pitching?.earnedRuns));
    const teamIpOuts = sum(roster.map((p) => ipToOuts(p.pitching?.inningsPitched)));
    const teamEra = teamIpOuts > 0 ? (teamER * 27) / teamIpOuts : null;

    teamStats.set(teamId, { ops: fixed(teamOps, 3), era: fixed(teamEra, 2) });
  }

  const rowsFor = (league: "AL" | "NL", tab: DivisionTab) => {
    const division = tabMeta(league, tab);
    return standings
      .filter((r) => r.season === season && parseNumber(r.division_id) === division.id)
      .sort((a, b) => {
        const aRank = parseNumber(a.division_rank);
        const bRank = parseNumber(b.division_rank);
        if (aRank !== null && bRank !== null) return aRank - bRank;
        if (aRank !== null) return -1;
        if (bRank !== null) return 1;
        return (parseNumber(b.winning_percentage) ?? -1) - (parseNumber(a.winning_percentage) ?? -1);
      });
  };

  const renderLeagueCard = (league: "AL" | "NL", currentTab: DivisionTab) => {
    const meta = leagueBadge(league);
    const division = tabMeta(league, currentTab);
    const rows = rowsFor(league, currentTab);
    const baseParams = new URLSearchParams({ season, alDiv, nlDiv });

    return (
      <section className="card table-wrap" key={league}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              background: meta.bg,
              color: meta.fg,
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {league}
          </span>
          <strong style={{ fontSize: 14 }}>{meta.title}</strong>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {(["east", "central", "west"] as DivisionTab[]).map((tab) => {
            const qs = new URLSearchParams(baseParams);
            if (league === "AL") qs.set("alDiv", tab);
            else qs.set("nlDiv", tab);
            const active = tab === currentTab;
            return (
              <Link
                key={`${league}-${tab}`}
                href={`/standings?${qs.toString()}`}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                  background: active ? "rgba(255,255,255,0.10)" : "transparent",
                  color: active ? "#f3f4f6" : "#9ca3af",
                }}
              >
                {tabMeta(league, tab).label}
              </Link>
            );
          })}
        </div>

        <h2 style={{ margin: "0 0 8px", fontSize: 13, color: "#e5e7eb" }}>{division.label}</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>PCT</th>
              <th>GB</th>
              <th>RD</th>
              <th>Streak</th>
              <th>Home</th>
              <th>Away</th>
              <th>L10</th>
              <th>OPS</th>
              <th>ERA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tid = parseNumber(row.team_id);
              const stat = tid !== null ? teamStats.get(tid) : undefined;
              return (
                <tr key={`${league}-${division.id}-${row.team_id}-${row.season}`}>
                  <td>{row.division_rank ?? "N/A"}</td>
                  <td>
                    <Link href={`/teams/${row.team_id}?season=${row.season}`}>{row.team_name ?? "N/A"}</Link>
                  </td>
                  <td>{row.wins ?? "N/A"}</td>
                  <td>{row.losses ?? "N/A"}</td>
                  <td>{row.winning_percentage ?? "N/A"}</td>
                  <td>{row.games_back ?? "-"}</td>
                  <td>{row.run_differential ?? "N/A"}</td>
                  <td>{row.streak_code ?? "N/A"}</td>
                  <td>{wl(row.home_wins, row.home_losses)}</td>
                  <td>{wl(row.away_wins, row.away_losses)}</td>
                  <td>{wl(row.last10_wins, row.last10_losses)}</td>
                  <td>{stat?.ops ?? "N/A"}</td>
                  <td>{stat?.era ?? "N/A"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    );
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 14px", fontSize: 40, lineHeight: 1.1 }}>Standings</h1>
          <p style={{ margin: 0, color: "var(--muted-foreground)" }}>MLB league/division standings</p>
        </div>
        <Link href="/players">Players</Link>
      </section>

      {renderLeagueCard("AL", alDiv)}
      {renderLeagueCard("NL", nlDiv)}
    </div>
  );
}

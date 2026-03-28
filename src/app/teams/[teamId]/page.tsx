import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerFielding, getPlayerHitting, getPlayerPitching, getPlayers, getStandings, getTeams, parseNumber } from "@/lib/data/loaders";
import { formatAvg, formatEra, formatObp, formatOps, formatWhip, isQualifiedHitter, isQualifiedPitcher, mergePlayerStatsBySeason, seasonOrDefault } from "@/lib/data/normalizers";
import { resolveTeamPlayerSort, sortTeamPlayerRows, type TeamSortKey } from "@/lib/team-player-sorting";
import { fixed, ipToOuts, n, sum } from "@/lib/utils";

type Props = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ season?: string; group?: string; sortBy?: string; sortDir?: string }>;
};

export default async function TeamDetailPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const { season, group, sortBy, sortDir } = await searchParams;
  const targetSeason = seasonOrDefault(season);
  const statGroup = group === "pitching" ? "pitching" : "hitting";
  const { sortBy: activeSortBy, sortDir: activeSortDir } = resolveTeamPlayerSort(statGroup, sortBy, sortDir);
  const teamIdNum = parseNumber(teamId);
  if (!teamIdNum) notFound();

  const [teams, standings, players, hitting, pitching, fielding] = await Promise.all([
    getTeams(),
    getStandings(),
    getPlayers(),
    getPlayerHitting(),
    getPlayerPitching(),
    getPlayerFielding(),
  ]);

  const teamMeta = teams.find((t) => parseNumber(t.team_id) === teamIdNum && (t.season === targetSeason || !t.season));
  const standing = standings.find((s) => parseNumber(s.team_id) === teamIdNum && s.season === targetSeason);

  const merged = mergePlayerStatsBySeason({ players, hitting, pitching, fielding, season: targetSeason }).filter(
    (row) => row.team_id === teamIdNum,
  );

  if (!teamMeta && !standing && merged.length === 0) notFound();

  const qualifiedHitters = merged.filter((r) => isQualifiedHitter(r.hitting?.plateAppearances ?? null)).length;
  const qualifiedPitchers = merged.filter((r) => isQualifiedPitcher(r.pitching?.inningsPitched)).length;
  const hitters = merged.filter((r) => r.hitting);
  const pitchers = merged.filter((r) => r.pitching);

  const teamAB = sum(hitters.map((r) => r.hitting?.atBats));
  const teamH = sum(hitters.map((r) => r.hitting?.hits));
  const teamBBBat = sum(hitters.map((r) => r.hitting?.baseOnBalls));
  const teamHBP = sum(hitters.map((r) => r.hitting?.hitByPitch));
  const teamSF = sum(hitters.map((r) => r.hitting?.sacFlies));
  const teamTB = sum(hitters.map((r) => r.hitting?.totalBases));
  const teamHR = sum(hitters.map((r) => r.hitting?.homeRuns));
  const teamSB = sum(hitters.map((r) => r.hitting?.stolenBases));
  const teamRBI = sum(hitters.map((r) => r.hitting?.rbi));
  const teamRuns = sum(hitters.map((r) => r.hitting?.runs));
  const teamPA = sum(hitters.map((r) => r.hitting?.plateAppearances));

  const teamAvg = teamAB > 0 ? teamH / teamAB : null;
  const obpDenom = teamAB + teamBBBat + teamHBP + teamSF;
  const teamObp = obpDenom > 0 ? (teamH + teamBBBat + teamHBP) / obpDenom : null;
  const teamSlg = teamAB > 0 ? teamTB / teamAB : null;
  const teamOps = teamObp !== null && teamSlg !== null ? teamObp + teamSlg : null;

  const teamER = sum(pitchers.map((r) => r.pitching?.earnedRuns));
  const teamHPit = sum(pitchers.map((r) => r.pitching?.hits));
  const teamBBPit = sum(pitchers.map((r) => r.pitching?.baseOnBalls));
  const teamSOPit = sum(pitchers.map((r) => r.pitching?.strikeOuts));
  const teamWins = sum(pitchers.map((r) => r.pitching?.wins));
  const teamLosses = sum(pitchers.map((r) => r.pitching?.losses));
  const teamIpOuts = sum(pitchers.map((r) => ipToOuts(r.pitching?.inningsPitched)));
  const teamEra = teamIpOuts > 0 ? (teamER * 27) / teamIpOuts : null;
  const teamWhip = teamIpOuts > 0 ? ((teamHPit + teamBBPit) * 3) / teamIpOuts : null;

  const sorted = sortTeamPlayerRows(merged, statGroup, activeSortBy, activeSortDir);

  const teamName = standing?.team_name ?? teamMeta?.name ?? `Team ${teamId}`;
  const commonQuery = new URLSearchParams({
    season: targetSeason,
    group: statGroup,
    sortBy: activeSortBy,
    sortDir: activeSortDir,
  });
  const headerQuery = (key: TeamSortKey) => {
    const qs = new URLSearchParams(commonQuery);
    if (activeSortBy === key) {
      qs.set("sortDir", activeSortDir === "asc" ? "desc" : "asc");
    } else {
      qs.set("sortBy", key);
      qs.set("sortDir", key === "era" ? "asc" : "desc");
    }
    return `/teams/${teamId}?${qs.toString()}`;
  };
  const sortableHeader = (label: string, key: TeamSortKey) => (
    <Link
      href={headerQuery(key)}
      style={{
        display: "inline-flex",
        color: activeSortBy === key ? "#f3f4f6" : "#a3a3a3",
        textDecoration: "none",
        cursor: "pointer",
        fontWeight: activeSortBy === key ? 700 : 600,
      }}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
    </Link>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="card">
        <p style={{ marginTop: 0 }}>
          <Link href="/standings">← Back to standings</Link>
        </p>
        <h1 style={{ margin: "0 0 14px", fontSize: 38, lineHeight: 1.1 }}>{teamName}</h1>
        <p style={{ margin: "8px 0 0", color: "var(--muted-foreground)" }}>
          Season {targetSeason} / {teamMeta?.league_name ?? "N/A"} {teamMeta?.division_name ?? ""}
        </p>
        <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span>W-L: {standing ? `${standing.wins}-${standing.losses}` : "N/A"}</span>
          <span>PCT: {standing?.winning_percentage ?? "N/A"}</span>
          <span>GB: {standing?.games_back ?? "-"}</span>
          <span>Run Diff: {standing?.run_differential ?? "N/A"}</span>
        </div>
      </section>

      <section className="card" style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Players Listed</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{merged.length}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Qualified Hitters</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{qualifiedHitters}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Qualified Pitchers</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{qualifiedPitchers}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>OPS</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{fixed(teamOps, 3)}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>AVG</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{fixed(teamAvg, 3)}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>OBP</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{fixed(teamObp, 3)}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>SLG</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{fixed(teamSlg, 3)}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Total HR</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{teamHR}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Total SB</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{teamSB}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Total RBI</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{teamRBI}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Total R</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{teamRuns}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Total PA</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{teamPA}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>ERA</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{fixed(teamEra, 2)}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>WHIP</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{fixed(teamWhip, 2)}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Pitching W-L</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{teamWins}-{teamLosses}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Total Pitching SO</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{teamSOPit}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Total Pitching BB</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{teamBBPit}</div>
        </div>
      </section>

      <section className="card">
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input name="season" defaultValue={targetSeason} style={{ width: 120 }} />
          <input type="hidden" name="sortBy" value={activeSortBy} />
          <input type="hidden" name="sortDir" value={activeSortDir} />
          <select name="group" defaultValue={statGroup}>
            <option value="hitting">Hitting</option>
            <option value="pitching">Pitching</option>
          </select>
          <button className="primary" type="submit">Apply</button>
          <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>小サンプル: 打者 PA&lt;30 / 投手 IP&lt;10</span>
        </form>
      </section>

      <section className="card table-wrap">
        <h2 style={{ marginTop: 0 }}>Roster & Stats ({statGroup})</h2>
        <table>
          <thead>
            <tr>
              <th>{sortableHeader("Player", "player")}</th>
              <th>Pos</th>
              {statGroup === "hitting" ? (
                <>
                  <th>{sortableHeader("PA", "pa")}</th>
                  <th>{sortableHeader("AVG", "avg")}</th>
                  <th>{sortableHeader("OBP", "obp")}</th>
                  <th>{sortableHeader("OPS", "ops")}</th>
                  <th>{sortableHeader("HR", "hr")}</th>
                  <th>{sortableHeader("RBI", "rbi")}</th>
                </>
              ) : (
                <>
                  <th>{sortableHeader("W", "w")}</th>
                  <th>{sortableHeader("L", "l")}</th>
                  <th>{sortableHeader("SV", "sv")}</th>
                  <th>{sortableHeader("IP", "ip")}</th>
                  <th>{sortableHeader("ERA", "era")}</th>
                  <th>{sortableHeader("WHIP", "whip")}</th>
                  <th>{sortableHeader("SO", "so")}</th>
                  <th>{sortableHeader("BB", "bb")}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={statGroup === "hitting" ? 8 : 10}>No players found for this team/season.</td>
              </tr>
            ) : (
              sorted.map((row) => {
                const smallSample = statGroup === "hitting" ? !isQualifiedHitter(row.hitting?.plateAppearances ?? null) : !isQualifiedPitcher(row.pitching?.inningsPitched);
                return (
                  <tr key={`${row.player_id}-${statGroup}`}>
                    <td>
                      <Link href={`/players/${row.player_id}?season=${targetSeason}`}>
                        {row.full_name} {smallSample ? <span title="Small sample">⚠</span> : null}
                      </Link>
                    </td>
                    <td>{row.position_abbr || "N/A"}</td>
                    {statGroup === "hitting" ? (
                      <>
                        <td>{n(row.hitting?.plateAppearances)}</td>
                        <td>{formatAvg(row.hitting?.avg)}</td>
                        <td>{formatObp(row.hitting?.obp)}</td>
                        <td>{formatOps(row.hitting?.ops)}</td>
                        <td>{n(row.hitting?.homeRuns)}</td>
                        <td>{n(row.hitting?.rbi)}</td>
                      </>
                    ) : (
                      <>
                        <td>{n(row.pitching?.wins)}</td>
                        <td>{n(row.pitching?.losses)}</td>
                        <td>{n(row.pitching?.saves)}</td>
                        <td>{n(row.pitching?.inningsPitched)}</td>
                        <td>{formatEra(row.pitching?.era)}</td>
                        <td>{formatWhip(row.pitching?.whip)}</td>
                        <td>{n(row.pitching?.strikeOuts)}</td>
                        <td>{n(row.pitching?.baseOnBalls)}</td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

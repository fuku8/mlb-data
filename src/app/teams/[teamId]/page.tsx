import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerFielding, getPlayerHitting, getPlayerPitching, getPlayers, getSchedule, getStandings, getTeams, parseNumber } from "@/lib/data/loaders";
import {
  formatAvg,
  formatEra,
  formatObp,
  formatOps,
  formatWhip,
  HITTER_QUALIFY_PA,
  INNINGS_DEPENDENCY_MIN_OUTS,
  isQualifiedHitter,
  isQualifiedPitcher,
  mergePlayerStatsBySeason,
  parseGameResults,
  PITCHER_QUALIFY_IP,
  seasonOrDefault,
} from "@/lib/data/normalizers";
import { defaultSortDirForKey, resolveTeamPlayerSort, sortTeamPlayerRows, type TeamSortKey } from "@/lib/team-player-sorting";
import { SeasonHeartbeat, type TeamGameMargin } from "@/components/season-heartbeat";
import { LorenzCurve } from "@/components/lorenz-curve";
import { CardHeader } from "@/components/card-header";
import { gini } from "@/lib/gini";
import { fixed, ipToOuts, n, sum } from "@/lib/utils";
import type { PlayerSeasonRow } from "@/lib/types";

type Props = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ season?: string; group?: string; sortBy?: string; sortDir?: string }>;
};

// 依存度カード（得点関与依存度/イニング依存度）共通レイアウト
function GiniCard({
  title,
  note,
  values,
  label,
  metricHref,
  overallRank,
}: {
  title: string;
  note: string;
  values: number[];
  label: string;
  metricHref: string;
  overallRank: { rank: number; total: number } | null;
}) {
  return (
    <section className="card">
      <CardHeader title={title} metricHref={metricHref} note={note} />
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <LorenzCurve values={values} label={label} />
        <div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Gini係数</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{gini(values).toFixed(3)}</div>
          {overallRank && (
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
              偏り MLB{overallRank.rank}位 / {overallRank.total}球団
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// 依存度のGini値算出に使う値列（チームカードと全球団順位で同条件を共有）
const hitterGiniValues = (rows: PlayerSeasonRow[]) =>
  rows
    .filter((r) => isQualifiedHitter(r.hitting?.plateAppearances ?? null))
    .map((r) => (r.hitting?.runs ?? 0) + (r.hitting?.rbi ?? 0) - (r.hitting?.homeRuns ?? 0));

const pitcherGiniValues = (rows: PlayerSeasonRow[]) =>
  rows.map((r) => ipToOuts(r.pitching?.inningsPitched)).filter((outs) => outs >= INNINGS_DEPENDENCY_MIN_OUTS);

// 全球団順位: リーグで絞らずMLB全チームに同条件でGiniを算出し降順（1位=最も偏っている）に並べた中の位置。対象3人未満のチームは除外
function overallGiniRank(
  allRows: PlayerSeasonRow[],
  teamId: number,
  extract: (teamRows: PlayerSeasonRow[]) => number[],
): { rank: number; total: number } | null {
  const byTeam = new Map<number, PlayerSeasonRow[]>();
  for (const row of allRows) {
    if (row.team_id === null) continue;
    const list = byTeam.get(row.team_id);
    if (list) list.push(row);
    else byTeam.set(row.team_id, [row]);
  }
  const ranked = [...byTeam.entries()]
    .map(([id, teamRows]) => ({ id, values: extract(teamRows) }))
    .filter((e) => e.values.length >= 3)
    .map((e) => ({ id: e.id, gini: gini(e.values) }))
    .sort((a, b) => b.gini - a.gini);
  const idx = ranked.findIndex((e) => e.id === teamId);
  return idx === -1 ? null : { rank: idx + 1, total: ranked.length };
}

export default async function TeamDetailPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const { season, group, sortBy, sortDir } = await searchParams;
  const targetSeason = seasonOrDefault(season);
  const statGroup = group === "pitching" ? "pitching" : "hitting";
  const { sortBy: activeSortBy, sortDir: activeSortDir } = resolveTeamPlayerSort(statGroup, sortBy, sortDir);
  const teamIdNum = parseNumber(teamId);
  if (!teamIdNum) notFound();

  const [teams, standings, players, hitting, pitching, fielding, schedule] = await Promise.all([
    getTeams(),
    getStandings(),
    getPlayers(),
    getPlayerHitting(),
    getPlayerPitching(),
    getPlayerFielding(),
    getSchedule(),
  ]);

  const teamMeta = teams.find((t) => parseNumber(t.team_id) === teamIdNum && (t.season === targetSeason || !t.season));
  const standing = standings.find((s) => parseNumber(s.team_id) === teamIdNum && s.season === targetSeason);

  const mergedAll = mergePlayerStatsBySeason({ players, hitting, pitching, fielding, season: targetSeason });
  const merged = mergedAll.filter((row) => row.team_id === teamIdNum);

  if (!teamMeta && !standing && merged.length === 0) notFound();

  // Season Heartbeat: schedule.csvにseason列がないため、Finalなチーム全試合を日付順に表示する
  const allGames = parseGameResults(schedule);
  const teamGames: TeamGameMargin[] = allGames
    .filter(
      (g) =>
        g.status_code === "F" &&
        (g.home_team_id === teamIdNum || g.away_team_id === teamIdNum) &&
        g.home_score !== null &&
        g.away_score !== null,
    )
    .map((g) => {
      const isHome = g.home_team_id === teamIdNum;
      const teamScore = (isHome ? g.home_score : g.away_score) as number;
      const oppScore = (isHome ? g.away_score : g.home_score) as number;
      return {
        date: g.jst_date || g.official_date,
        opponent: isHome ? g.away_team_name : g.home_team_name,
        teamScore,
        oppScore,
        margin: teamScore - oppScore,
        isHome,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const qualifiedHitterRows = merged.filter((r) => isQualifiedHitter(r.hitting?.plateAppearances ?? null));
  const qualifiedHitters = qualifiedHitterRows.length;
  const qualifiedPitchers = merged.filter((r) => isQualifiedPitcher(r.pitching?.inningsPitched)).length;
  const hitters = merged.filter((r) => r.hitting);
  const pitchers = merged.filter((r) => r.pitching);
  // 得点関与 = R + RBI − HR（本塁打はrunsとrbiの両方にカウントされるため二重計上を補正）
  const runsProducedValues = hitterGiniValues(merged);
  const pitcherOutsValues = pitcherGiniValues(merged);

  const hitterOverallRank = overallGiniRank(mergedAll, teamIdNum, hitterGiniValues);
  const pitcherOverallRank = overallGiniRank(mergedAll, teamIdNum, pitcherGiniValues);

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
      qs.set("sortDir", defaultSortDirForKey(key));
    }
    return `/teams/${teamId}?${qs.toString()}`;
  };
  const sortableHeader = (label: string, key: TeamSortKey) => (
    <Link
      href={headerQuery(key)}
      style={{
        display: "inline-flex",
        gap: 4,
        alignItems: "center",
        color: activeSortBy === key ? "#f3f4f6" : "#a3a3a3",
        textDecoration: "none",
        cursor: "pointer",
        fontWeight: activeSortBy === key ? 700 : 600,
      }}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      {activeSortBy === key && (
        <span style={{ fontSize: "0.7em", lineHeight: 1 }}>{activeSortDir === "asc" ? "▲" : "▼"}</span>
      )}
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

      {teamGames.length > 0 && (
        <section className="card">
          <CardHeader
            title="Season Heartbeat"
            metricHref="heartbeat"
            note="試合ごとの得点差（緑=勝ち・赤=負け、±10点でキャップ）"
          />
          <SeasonHeartbeat games={teamGames} />
        </section>
      )}

      {(qualifiedHitterRows.length >= 3 || pitcherOutsValues.length >= 3) && (
        <div className={qualifiedHitterRows.length >= 3 && pitcherOutsValues.length >= 3 ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
          {qualifiedHitterRows.length >= 3 && (
            <GiniCard
              title="得点関与依存度"
              metricHref="gini"
              note={`規定打者(PA≥${HITTER_QUALIFY_PA})内のR+RBI−HR(本塁打の二重計上を補正)分布。Gini係数が高いほど特定の選手に得点関与が偏っている`}
              values={runsProducedValues}
              label="得点関与"
              overallRank={hitterOverallRank}
            />
          )}

          {pitcherOutsValues.length >= 3 && (
            <GiniCard
              title="イニング依存度"
              metricHref="gini"
              note={`投球アウト数≥${INNINGS_DEPENDENCY_MIN_OUTS}(${INNINGS_DEPENDENCY_MIN_OUTS / 3}イニング)の投手${pitcherOutsValues.length}人の投球回分布。Gini係数が高いほど特定の投手にイニングが偏っている`}
              values={pitcherOutsValues}
              label="投球回"
              overallRank={pitcherOverallRank}
            />
          )}
        </div>
      )}

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
          <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
            {`小サンプル: 打者 PA<${HITTER_QUALIFY_PA} / 投手 IP<${PITCHER_QUALIFY_IP}`}
          </span>
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

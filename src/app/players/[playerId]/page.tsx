import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerFielding, getPlayerHitting, getPlayerPitching, getPlayers } from "@/lib/data/loaders";
import { formatAvg, formatEra, formatObp, formatOps, formatSlg, formatWhip, mergePlayerStatsBySeason } from "@/lib/data/normalizers";
import { n } from "@/lib/utils";

type Props = {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function PlayerDetailPage({ params, searchParams }: Props) {
  const { playerId } = await params;
  const { season } = await searchParams;
  const [players, hitting, pitching, fielding] = await Promise.all([
    getPlayers(),
    getPlayerHitting(),
    getPlayerPitching(),
    getPlayerFielding(),
  ]);

  const merged = mergePlayerStatsBySeason({
    players,
    hitting,
    pitching,
    fielding,
    season,
  });

  const player = merged.find((row) => String(row.player_id) === playerId);
  if (!player) notFound();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="card">
        <p style={{ marginTop: 0 }}>
          <Link href="/players">← Back to players</Link>
        </p>
        <h1 style={{ margin: "0 0 14px", fontSize: 38, lineHeight: 1.1 }}>{player.full_name}</h1>
        <p style={{ color: "var(--muted-foreground)", marginBottom: 0 }}>
          ID: {player.player_id} / Position: {player.position_abbr || "N/A"} / Team:{" "}
          {player.team_id ? (
            <Link href={`/teams/${player.team_id}?season=${player.season}`}>{player.team_name || "N/A"}</Link>
          ) : (
            player.team_name || "N/A"
          )}
        </p>
      </section>

      <section className="card table-wrap">
        <h2 style={{ marginTop: 0 }}>Hitting</h2>
        <table>
          <tbody>
            <tr><th>G</th><td>{n(player.hitting?.gamesPlayed)}</td></tr>
            <tr><th>AVG</th><td>{formatAvg(player.hitting?.avg)}</td></tr>
            <tr><th>OBP</th><td>{formatObp(player.hitting?.obp)}</td></tr>
            <tr><th>SLG</th><td>{formatSlg(player.hitting?.slg)}</td></tr>
            <tr><th>OPS</th><td>{formatOps(player.hitting?.ops)}</td></tr>
            <tr><th>AB</th><td>{n(player.hitting?.atBats)}</td></tr>
            <tr><th>H</th><td>{n(player.hitting?.hits)}</td></tr>
            <tr><th>2B</th><td>{n(player.hitting?.doubles)}</td></tr>
            <tr><th>3B</th><td>{n(player.hitting?.triples)}</td></tr>
            <tr><th>R</th><td>{n(player.hitting?.runs)}</td></tr>
            <tr><th>HR</th><td>{n(player.hitting?.homeRuns)}</td></tr>
            <tr><th>RBI</th><td>{n(player.hitting?.rbi)}</td></tr>
            <tr><th>PA</th><td>{n(player.hitting?.plateAppearances)}</td></tr>
            <tr><th>BB</th><td>{n(player.hitting?.baseOnBalls)}</td></tr>
            <tr><th>SO</th><td>{n(player.hitting?.strikeOuts)}</td></tr>
            <tr><th>SB</th><td>{n(player.hitting?.stolenBases)}</td></tr>
            <tr><th>CS</th><td>{n(player.hitting?.caughtStealing)}</td></tr>
            <tr><th>HBP</th><td>{n(player.hitting?.hitByPitch)}</td></tr>
            <tr><th>SF</th><td>{n(player.hitting?.sacFlies)}</td></tr>
            <tr><th>TB</th><td>{n(player.hitting?.totalBases)}</td></tr>
            <tr><th>BABIP</th><td>{n(player.hitting?.babip)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="card table-wrap">
        <h2 style={{ marginTop: 0 }}>Pitching</h2>
        <table>
          <tbody>
            <tr><th>G</th><td>{n(player.pitching?.gamesPlayed)}</td></tr>
            <tr><th>GS</th><td>{n(player.pitching?.gamesStarted)}</td></tr>
            <tr><th>GF</th><td>{n(player.pitching?.gamesFinished)}</td></tr>
            <tr><th>W-L</th><td>{n(player.pitching?.wins)}-{n(player.pitching?.losses)}</td></tr>
            <tr><th>SV</th><td>{n(player.pitching?.saves)}</td></tr>
            <tr><th>HLD</th><td>{n(player.pitching?.holds)}</td></tr>
            <tr><th>BS</th><td>{n(player.pitching?.blownSaves)}</td></tr>
            <tr><th>ERA</th><td>{formatEra(player.pitching?.era)}</td></tr>
            <tr><th>WHIP</th><td>{formatWhip(player.pitching?.whip)}</td></tr>
            <tr><th>IP</th><td>{n(player.pitching?.inningsPitched)}</td></tr>
            <tr><th>BF</th><td>{n(player.pitching?.battersFaced)}</td></tr>
            <tr><th>H</th><td>{n(player.pitching?.hits)}</td></tr>
            <tr><th>HR</th><td>{n(player.pitching?.homeRuns)}</td></tr>
            <tr><th>ER</th><td>{n(player.pitching?.earnedRuns)}</td></tr>
            <tr><th>SO</th><td>{n(player.pitching?.strikeOuts)}</td></tr>
            <tr><th>BB</th><td>{n(player.pitching?.baseOnBalls)}</td></tr>
            <tr><th>K/BB</th><td>{n(player.pitching?.strikeoutWalkRatio)}</td></tr>
            <tr><th>K/9</th><td>{n(player.pitching?.strikeoutsPer9Inn)}</td></tr>
            <tr><th>BB/9</th><td>{n(player.pitching?.walksPer9Inn)}</td></tr>
            <tr><th>H/9</th><td>{n(player.pitching?.hitsPer9Inn)}</td></tr>
            <tr><th>HR/9</th><td>{n(player.pitching?.homeRunsPer9)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="card table-wrap">
        <h2 style={{ marginTop: 0 }}>Fielding</h2>
        <table>
          <tbody>
            <tr><th>Position</th><td>{n(player.fielding?.position)}</td></tr>
            <tr><th>Games</th><td>{n(player.fielding?.gamesPlayed)}</td></tr>
            <tr><th>Assists</th><td>{n(player.fielding?.assists)}</td></tr>
            <tr><th>PutOuts</th><td>{n(player.fielding?.putOuts)}</td></tr>
            <tr><th>Errors</th><td>{n(player.fielding?.errors)}</td></tr>
            <tr><th>FLD%</th><td>{n(player.fielding?.fielding)}</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

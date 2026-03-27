import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerFielding, getPlayerHitting, getPlayerPitching, getPlayers } from "@/lib/data/loaders";
import { formatAvg, formatEra, formatObp, formatOps, formatSlg, formatWhip, mergePlayerStatsBySeason } from "@/lib/data/normalizers";
import { n } from "@/lib/utils";

type Props = {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ season?: string }>;
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--background)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function StatGrid({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <section className="card">
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
        {items.map(([label, value]) => (
          <StatCell key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}

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

  const showHitting = !!player.hitting;
  const showPitching = !!player.pitching;

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

      {showHitting && (
        <StatGrid
          title="Hitting"
          items={[
            ["G", n(player.hitting?.gamesPlayed)],
            ["AVG", formatAvg(player.hitting?.avg)],
            ["OBP", formatObp(player.hitting?.obp)],
            ["SLG", formatSlg(player.hitting?.slg)],
            ["OPS", formatOps(player.hitting?.ops)],
            ["AB", n(player.hitting?.atBats)],
            ["H", n(player.hitting?.hits)],
            ["2B", n(player.hitting?.doubles)],
            ["3B", n(player.hitting?.triples)],
            ["R", n(player.hitting?.runs)],
            ["HR", n(player.hitting?.homeRuns)],
            ["RBI", n(player.hitting?.rbi)],
            ["PA", n(player.hitting?.plateAppearances)],
            ["BB", n(player.hitting?.baseOnBalls)],
            ["SO", n(player.hitting?.strikeOuts)],
            ["SB", n(player.hitting?.stolenBases)],
            ["CS", n(player.hitting?.caughtStealing)],
            ["HBP", n(player.hitting?.hitByPitch)],
            ["SF", n(player.hitting?.sacFlies)],
            ["TB", n(player.hitting?.totalBases)],
            ["BABIP", n(player.hitting?.babip)],
          ]}
        />
      )}

      {showPitching && (
        <StatGrid
          title="Pitching"
          items={[
            ["G", n(player.pitching?.gamesPlayed)],
            ["GS", n(player.pitching?.gamesStarted)],
            ["GF", n(player.pitching?.gamesFinished)],
            ["W-L", `${n(player.pitching?.wins)}-${n(player.pitching?.losses)}`],
            ["SV", n(player.pitching?.saves)],
            ["HLD", n(player.pitching?.holds)],
            ["BS", n(player.pitching?.blownSaves)],
            ["ERA", formatEra(player.pitching?.era)],
            ["WHIP", formatWhip(player.pitching?.whip)],
            ["IP", n(player.pitching?.inningsPitched)],
            ["BF", n(player.pitching?.battersFaced)],
            ["H", n(player.pitching?.hits)],
            ["HR", n(player.pitching?.homeRuns)],
            ["ER", n(player.pitching?.earnedRuns)],
            ["SO", n(player.pitching?.strikeOuts)],
            ["BB", n(player.pitching?.baseOnBalls)],
            ["K/BB", n(player.pitching?.strikeoutWalkRatio)],
            ["K/9", n(player.pitching?.strikeoutsPer9Inn)],
            ["BB/9", n(player.pitching?.walksPer9Inn)],
            ["H/9", n(player.pitching?.hitsPer9Inn)],
            ["HR/9", n(player.pitching?.homeRunsPer9)],
          ]}
        />
      )}

      {player.fielding && (
        <StatGrid
          title="Fielding"
          items={[
            ["Position", n(player.fielding.position)],
            ["Games", n(player.fielding.gamesPlayed)],
            ["Assists", n(player.fielding.assists)],
            ["PutOuts", n(player.fielding.putOuts)],
            ["Errors", n(player.fielding.errors)],
            ["FLD%", n(player.fielding.fielding)],
          ]}
        />
      )}
    </div>
  );
}

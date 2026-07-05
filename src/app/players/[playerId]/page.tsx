import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerFielding, getPlayerHitting, getPlayerPitching, getPlayers, parseNumber } from "@/lib/data/loaders";
import {
  formatAvg,
  formatEra,
  formatObp,
  formatOps,
  formatSlg,
  formatWhip,
  isQualifiedHitter,
  isQualifiedPitcher,
  mergePlayerStatsBySeason,
} from "@/lib/data/normalizers";
import { percentileOf } from "@/lib/percentile";
import { PercentileBars, type PercentileRow } from "@/components/percentile-bars";
import { n } from "@/lib/utils";
import type { PlayerSeasonRow } from "@/lib/types";

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

function UnqualifiedNote() {
  return (
    <section className="card">
      <p style={{ margin: 0, color: "var(--muted-foreground)" }}>規定未到達のためパーセンタイル非表示</p>
    </section>
  );
}

// 打者のLeague Percentile: 母集団は同シーズンの規定打者（PA≥30）
function buildHitterPctRows(target: PlayerSeasonRow, pool: PlayerSeasonRow[]): PercentileRow[] {
  const avg = (r: PlayerSeasonRow) => parseNumber(r.hitting?.avg) ?? 0;
  const obp = (r: PlayerSeasonRow) => parseNumber(r.hitting?.obp) ?? 0;
  const slg = (r: PlayerSeasonRow) => parseNumber(r.hitting?.slg) ?? 0;
  const ops = (r: PlayerSeasonRow) => parseNumber(r.hitting?.ops) ?? 0;
  const hr = (r: PlayerSeasonRow) => r.hitting?.homeRuns ?? 0;
  const sb = (r: PlayerSeasonRow) => r.hitting?.stolenBases ?? 0;
  const bbPct = (r: PlayerSeasonRow) => (r.hitting?.baseOnBalls ?? 0) / (r.hitting?.plateAppearances || 1);
  const kPct = (r: PlayerSeasonRow) => (r.hitting?.strikeOuts ?? 0) / (r.hitting?.plateAppearances || 1);
  const iso = (r: PlayerSeasonRow) => slg(r) - avg(r);

  const h = target.hitting!;
  return [
    { label: "AVG", display: formatAvg(h.avg), pct: percentileOf(pool.map(avg), avg(target)) },
    { label: "OBP", display: formatObp(h.obp), pct: percentileOf(pool.map(obp), obp(target)) },
    { label: "SLG", display: formatSlg(h.slg), pct: percentileOf(pool.map(slg), slg(target)) },
    { label: "OPS", display: formatOps(h.ops), pct: percentileOf(pool.map(ops), ops(target)) },
    { label: "HR", display: n(h.homeRuns), pct: percentileOf(pool.map(hr), hr(target)) },
    { label: "SB", display: n(h.stolenBases), pct: percentileOf(pool.map(sb), sb(target)) },
    { label: "BB%", display: `${(bbPct(target) * 100).toFixed(1)}%`, pct: percentileOf(pool.map(bbPct), bbPct(target)) },
    { label: "K%", display: `${(kPct(target) * 100).toFixed(1)}%`, pct: 1 - percentileOf(pool.map(kPct), kPct(target)) },
    { label: "ISO", display: iso(target).toFixed(3), pct: percentileOf(pool.map(iso), iso(target)) },
  ];
}

// 投手のLeague Percentile: 母集団は同シーズンの規定投手（アウト数≥30）。低いほど良い指標は反転する
function buildPitcherPctRows(target: PlayerSeasonRow, pool: PlayerSeasonRow[]): PercentileRow[] {
  const era = (r: PlayerSeasonRow) => parseNumber(r.pitching?.era) ?? 0;
  const whip = (r: PlayerSeasonRow) => parseNumber(r.pitching?.whip) ?? 0;
  const bb9 = (r: PlayerSeasonRow) => parseNumber(r.pitching?.walksPer9Inn) ?? 0;
  const hr9 = (r: PlayerSeasonRow) => parseNumber(r.pitching?.homeRunsPer9) ?? 0;
  const oppAvg = (r: PlayerSeasonRow) => parseNumber(r.pitching?.avg) ?? 0;
  const k9 = (r: PlayerSeasonRow) => parseNumber(r.pitching?.strikeoutsPer9Inn) ?? 0;
  const kbb = (r: PlayerSeasonRow) => parseNumber(r.pitching?.strikeoutWalkRatio) ?? 0;

  const p = target.pitching!;
  return [
    { label: "ERA", display: formatEra(p.era), pct: 1 - percentileOf(pool.map(era), era(target)) },
    { label: "WHIP", display: formatWhip(p.whip), pct: 1 - percentileOf(pool.map(whip), whip(target)) },
    { label: "BB/9", display: n(p.walksPer9Inn), pct: 1 - percentileOf(pool.map(bb9), bb9(target)) },
    { label: "HR/9", display: n(p.homeRunsPer9), pct: 1 - percentileOf(pool.map(hr9), hr9(target)) },
    { label: "被打率", display: formatAvg(p.avg), pct: 1 - percentileOf(pool.map(oppAvg), oppAvg(target)) },
    { label: "K/9", display: n(p.strikeoutsPer9Inn), pct: percentileOf(pool.map(k9), k9(target)) },
    { label: "K/BB", display: n(p.strikeoutWalkRatio), pct: percentileOf(pool.map(kbb), kbb(target)) },
  ];
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

  // League Percentile: 母集団は同シーズンの規定打者/規定投手（player_hitting.csv / player_pitching.csvに
  // 移籍による同一選手複数行は現状データに存在しないため未対応。発生した場合はPA/アウト数最大の行を採用する）
  const hitterPool = merged.filter((r) => isQualifiedHitter(r.hitting?.plateAppearances ?? null));
  const pitcherPool = merged.filter((r) => isQualifiedPitcher(r.pitching?.inningsPitched));
  const hitterQualified = showHitting && isQualifiedHitter(player.hitting?.plateAppearances ?? null);
  const pitcherQualified = showPitching && isQualifiedPitcher(player.pitching?.inningsPitched);

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

      {showHitting &&
        (hitterQualified ? (
          <PercentileBars
            title="League Percentile (Hitting)"
            note={`規定打者(PA≥30)内での位置。${player.season}シーズン・100が最上位`}
            rows={buildHitterPctRows(player, hitterPool)}
          />
        ) : (
          <UnqualifiedNote />
        ))}

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

      {showPitching &&
        (pitcherQualified ? (
          <PercentileBars
            title="League Percentile (Pitching)"
            note={`規定投手(アウト数≥30)内での位置。${player.season}シーズン・100が最上位`}
            rows={buildPitcherPctRows(player, pitcherPool)}
          />
        ) : (
          <UnqualifiedNote />
        ))}

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

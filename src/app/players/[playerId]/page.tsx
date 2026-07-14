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
  HITTER_QUALIFY_PA,
  isQualifiedHitter,
  isQualifiedPitcher,
  mergePlayerStatsBySeason,
  PITCHER_QUALIFY_OUTS,
} from "@/lib/data/normalizers";
import { buildHitterSaber, buildHitterViz, buildPitcherSaber, buildPitcherViz, hBabip, hWoba, pitcherFipValue, poolFipConstant } from "@/lib/metrics";
import { hitterLuck, hitterLuckX, pitcherLuck } from "@/lib/luck";
import { classifyHitters, classifyPitchers } from "@/lib/player-types";
import { getSimilarPlayers } from "@/lib/data/similar";
import { buildHitterPhysical, buildPitcherPhysical, getStatcastHitting, getStatcastPitching } from "@/lib/data/statcast";
import { LuckMeter } from "@/components/luck-meter";
import { PercentileBars } from "@/components/percentile-bars";
import { PhysicalCard } from "@/components/physical-card";
import { SaberCard } from "@/components/saber-card";
import { StatRadar } from "@/components/stat-radar";
import { TotalBasesWaffle } from "@/components/total-bases-waffle";
import { TypeBadges } from "@/components/type-badges";
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

function UnqualifiedNote() {
  return (
    <section className="card">
      <p style={{ margin: 0, color: "var(--muted-foreground)" }}>規定未到達のためパーセンタイル非表示</p>
    </section>
  );
}

export default async function PlayerDetailPage({ params, searchParams }: Props) {
  const { playerId } = await params;
  const { season } = await searchParams;
  const [players, hitting, pitching, fielding, statcastHitting, statcastPitching] = await Promise.all([
    getPlayers(),
    getPlayerHitting(),
    getPlayerPitching(),
    getPlayerFielding(),
    getStatcastHitting(),
    getStatcastPitching(),
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
  const hitterViz = hitterQualified ? buildHitterViz(player, hitterPool) : null;
  const pitcherViz = pitcherQualified ? buildPitcherViz(player, pitcherPool) : null;
  const hitterSaber = hitterQualified ? buildHitterSaber(player, hitterPool) : [];
  const pitcherSaber = pitcherQualified ? buildPitcherSaber(player, pitcherPool) : [];

  // フィジカルカード: Statcast CSV自体が規定到達者(min=q)のみを収録しているため、規定判定とは独立してMap存在有無で表示を決める
  const statcastHitterRow = statcastHitting.get(player.player_id) ?? null;
  const statcastPitcherRow = statcastPitching.get(player.player_id) ?? null;
  const hitterPhysical = statcastHitterRow ? buildHitterPhysical(statcastHitterRow, [...statcastHitting.values()]) : [];
  const pitcherPhysical = statcastPitcherRow ? buildPitcherPhysical(statcastPitcherRow, [...statcastPitching.values()]) : [];

  // ラック指数（打者）: xwOBAとwOBA実測が両方揃えばX版（打球の質基準）、揃わなければBABIP版（リーグ平均との差）にフォールバック
  const leagueBabipValues = hitterPool.map(hBabip).filter((v): v is number => v !== null);
  const leagueBabipAvg = leagueBabipValues.length > 0 ? leagueBabipValues.reduce((a, b) => a + b, 0) / leagueBabipValues.length : null;
  const hitterBabip = hitterQualified ? hBabip(player) : null;
  const hitterWoba = hitterQualified ? hWoba(player) : null;
  const hitterXwoba = statcastHitterRow?.xwoba ?? null;
  const hitterLuckResult = hitterWoba !== null && hitterXwoba !== null
    ? hitterLuckX(hitterWoba, hitterXwoba)
    : hitterBabip !== null && leagueBabipAvg !== null
      ? hitterLuck(hitterBabip, leagueBabipAvg)
      : null;
  const hitterLuckIsX = hitterWoba !== null && hitterXwoba !== null;

  const pitcherEra = pitcherQualified ? parseNumber(player.pitching?.era) : null;
  const pitcherFip = pitcherQualified ? pitcherFipValue(player, poolFipConstant(pitcherPool)) : null;
  const pitcherLuckResult = pitcherEra !== null && pitcherFip !== null ? pitcherLuck(pitcherEra, pitcherFip) : null;

  // タイプバッジ: 規定到達者(hitterPool/pitcherPool)のみが判定対象のため、qualifiedでない選手は自然に空配列になる
  const hitterBadges = hitterQualified ? (classifyHitters(hitterPool).get(player.player_id) ?? []) : [];
  const pitcherBadges = pitcherQualified ? (classifyPitchers(pitcherPool).get(player.player_id) ?? []) : [];

  // 二刀流（大谷）や野手登板は打撃・投球の2リンクになる（主たる役割が先頭。similar.ts参照）
  const similarLinks = getSimilarPlayers(player, hitterPool, pitcherPool);

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
        <TypeBadges label="打者タイプ" badges={hitterBadges} />
        <TypeBadges label="投手タイプ" badges={pitcherBadges} />
        {similarLinks.map((s, i) => (
          <p key={s.type} style={{ marginTop: i === 0 ? 12 : 4, marginBottom: 0 }}>
            <Link href={`/compare?ids=${[player.player_id, ...s.ids].join(",")}${s.type === "pitching" ? "&tab=pitching" : ""}`}>
              似たタイプの選手{similarLinks.length > 1 ? (s.type === "batting" ? "（打撃）" : "（投球）") : ""} ↗
            </Link>
          </p>
        ))}
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
        (hitterViz ? (
          <PercentileBars
            title="League Percentile (Hitting)"
            note={`規定打者(PA≥${HITTER_QUALIFY_PA})内での位置。${player.season}シーズン・100が最上位`}
            rows={hitterViz.bars}
            metricHref="percentile"
          />
        ) : (
          <UnqualifiedNote />
        ))}

      {showHitting && <SaberCard title="セイバー指標（打撃）" rows={hitterSaber} metricHref="saber" />}

      {statcastHitterRow && <PhysicalCard title="フィジカル（Statcast）" rows={hitterPhysical} metricHref="statcast" />}

      {hitterLuckResult && (
        <LuckMeter
          title="ラック指数（打撃）"
          result={hitterLuckResult}
          range={hitterLuckIsX ? 0.05 : 0.06}
          desc={
            hitterLuckIsX
              ? "wOBA実測とxwOBA（打球の速度・角度から算出される期待値）の差。プラスは追い風=打球の質から期待される以上の結果が出ている。守備位置や球場の影響も含まれるため、乖離のすべてが運ではない"
              : "BABIP（インプレー打球の安打率）のリーグ平均との差。プラスは追い風=打球が平均より多くヒットになっている。俊足や強い打球など実力でBABIPが高い選手もいるため、乖離のすべてが運ではない"
          }
          metricHref="luck"
        />
      )}

      {(hitterViz || (showHitting && hitterQualified)) && (
        <div className={hitterViz && showHitting && hitterQualified ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
          {hitterViz && (
            <StatRadar
              title="5ツールレーダー"
              note={`規定打者(PA≥${HITTER_QUALIFY_PA})内でのパーセンタイル。${player.season}シーズン`}
              axes={hitterViz.radar}
              metricHref="radar"
            />
          )}

          {showHitting && hitterQualified && (
            <TotalBasesWaffle
              hits={player.hitting?.hits ?? 0}
              doubles={player.hitting?.doubles ?? 0}
              triples={player.hitting?.triples ?? 0}
              homeRuns={player.hitting?.homeRuns ?? 0}
              metricHref="waffle"
            />
          )}
        </div>
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

      {showPitching &&
        (pitcherViz ? (
          <PercentileBars
            title="League Percentile (Pitching)"
            note={`規定投手(アウト数≥${PITCHER_QUALIFY_OUTS})内での位置。${player.season}シーズン・100が最上位`}
            rows={pitcherViz.bars}
            metricHref="percentile"
          />
        ) : (
          <UnqualifiedNote />
        ))}

      {showPitching && <SaberCard title="セイバー指標（投球）" rows={pitcherSaber} metricHref="saber" />}

      {statcastPitcherRow && <PhysicalCard title="フィジカル（Statcast・被打球）" rows={pitcherPhysical} metricHref="statcast" />}

      {pitcherLuckResult && (
        <LuckMeter
          title="ラック指数（投球）"
          result={pitcherLuckResult}
          range={1.2}
          desc="ERAとFIP（守備と運を除いた実力値）の差。ERAがFIPより悪ければ向かい風=実力より打たれて見えている"
          metricHref="luck"
        />
      )}

      {pitcherViz && (
        <StatRadar
          title="投手レーダー"
          note={`規定投手(アウト数≥${PITCHER_QUALIFY_OUTS})内でのパーセンタイル。${player.season}シーズン`}
          axes={pitcherViz.radar}
          metricHref="radar"
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

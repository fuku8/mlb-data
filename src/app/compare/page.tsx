import { getPlayerHitting, getPlayerPitching, getPlayers } from "@/lib/data/loaders";
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
  seasonOrDefault,
} from "@/lib/data/normalizers";
import { buildHitterViz, buildPitcherViz } from "@/lib/metrics";
import { n } from "@/lib/utils";
import { CompareClient, type CompareBatter, type ComparePitcher } from "./client";

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{ ids?: string; tab?: string }>;
};

export default async function ComparePage({ searchParams }: Props) {
  const { ids, tab } = await searchParams;
  const season = seasonOrDefault(undefined);
  const [players, hitting, pitching] = await Promise.all([getPlayers(), getPlayerHitting(), getPlayerPitching()]);
  const merged = mergePlayerStatsBySeason({ players, hitting, pitching, fielding: [], season });

  // レーダーのパーセンタイル母集団は選手ページと同じ規定到達者プール
  const hitterPool = merged.filter((r) => isQualifiedHitter(r.hitting?.plateAppearances ?? null));
  const pitcherPool = merged.filter((r) => isQualifiedPitcher(r.pitching?.inningsPitched));

  const batters: CompareBatter[] = merged
    .filter((r) => r.hitting)
    .map((r) => ({
      playerId: r.player_id,
      name: r.full_name,
      team: r.team_name,
      gp: n(r.hitting?.gamesPlayed),
      pa: n(r.hitting?.plateAppearances),
      avg: formatAvg(r.hitting?.avg),
      obp: formatObp(r.hitting?.obp),
      slg: formatSlg(r.hitting?.slg),
      ops: formatOps(r.hitting?.ops),
      hr: n(r.hitting?.homeRuns),
      rbi: n(r.hitting?.rbi),
      sb: n(r.hitting?.stolenBases),
      bb: n(r.hitting?.baseOnBalls),
      so: n(r.hitting?.strikeOuts),
      hits: r.hitting?.hits ?? 0,
      doubles: r.hitting?.doubles ?? 0,
      triples: r.hitting?.triples ?? 0,
      homeRuns: r.hitting?.homeRuns ?? 0,
      radar: buildHitterViz(r, hitterPool).radar,
    }));

  const pitchers: ComparePitcher[] = merged
    .filter((r) => r.pitching)
    .map((r) => ({
      playerId: r.player_id,
      name: r.full_name,
      team: r.team_name,
      gp: n(r.pitching?.gamesPlayed),
      gs: n(r.pitching?.gamesStarted),
      w: n(r.pitching?.wins),
      l: n(r.pitching?.losses),
      sv: n(r.pitching?.saves),
      era: formatEra(r.pitching?.era),
      whip: formatWhip(r.pitching?.whip),
      ip: n(r.pitching?.inningsPitched),
      so: n(r.pitching?.strikeOuts),
      bb: n(r.pitching?.baseOnBalls),
      k9: n(r.pitching?.strikeoutsPer9Inn),
      radar: buildPitcherViz(r, pitcherPool).radar,
    }));

  // urlのids指定: 実在するplayerIdのみ最大MAX_PLAYERS件を初期選択として渡す。未指定時は従来と同じ挙動
  const initialTab: "batting" | "pitching" = tab === "pitching" ? "pitching" : "batting";
  const idPool = initialTab === "pitching" ? pitchers : batters;
  const initialIds = ids
    ? ids
        .split(",")
        .map((s) => Number(s))
        // "use client"モジュールからのvalue import（MAX_PLAYERS）は実行時にクライアント参照になり
        // Number変換でNaN→slice(0,NaN)=[]となるため、リテラルで指定する（client.tsxのMAX_PLAYERSと同値）
        .filter((id) => idPool.some((p) => p.playerId === id))
        .slice(0, 4)
    : [];

  return <CompareClient batters={batters} pitchers={pitchers} season={season} initialIds={initialIds} initialTab={initialTab} />;
}

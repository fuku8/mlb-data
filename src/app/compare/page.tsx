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

export default async function ComparePage() {
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

  return <CompareClient batters={batters} pitchers={pitchers} season={season} />;
}

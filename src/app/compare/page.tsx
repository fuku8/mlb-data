import Link from "next/link";
import { getPlayerFielding, getPlayerHitting, getPlayerPitching, getPlayers } from "@/lib/data/loaders";
import {
  formatAvg,
  formatEra,
  formatObp,
  formatOps,
  formatSlg,
  formatWhip,
  mergePlayerStatsBySeason,
  seasonOrDefault,
} from "@/lib/data/normalizers";
import { n } from "@/lib/utils";

type ComparePageProps = {
  searchParams: Promise<{
    players?: string;
    season?: string;
  }>;
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const season = seasonOrDefault(params.season);
  const ids = (params.players ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);

  const [players, hitting, pitching, fielding] = await Promise.all([
    getPlayers(),
    getPlayerHitting(),
    getPlayerPitching(),
    getPlayerFielding(),
  ]);

  const merged = mergePlayerStatsBySeason({ players, hitting, pitching, fielding, season });
  const selected = ids
    .map((id) => merged.find((row) => String(row.player_id) === id))
    .filter((row) => row !== undefined);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="card">
        <h1 style={{ margin: "0 0 16px", fontSize: 40, lineHeight: 1.1 }}>Player Compare</h1>
        <form method="GET" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              name="players"
              defaultValue={params.players ?? ""}
              placeholder="player IDs (comma-separated, max 4)"
              style={{ minWidth: 320 }}
            />
            <input name="season" defaultValue={season} placeholder="season (e.g. 2026)" />
            <button className="primary" type="submit">
              Compare
            </button>
          </div>
          <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
            例: <code>660271,669203</code>。IDは <Link href="/players">Players</Link> で確認できます。
          </p>
        </form>
      </section>

      {ids.length === 0 ? (
        <section className="card">
          <p style={{ margin: 0 }}>比較する選手IDを入力してください（最大4名）。</p>
        </section>
      ) : (
        <>
          <section className="card table-wrap">
            <h2 style={{ marginTop: 0 }}>Hitting</h2>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>AVG</th>
                  <th>OBP</th>
                  <th>SLG</th>
                  <th>OPS</th>
                  <th>HR</th>
                  <th>RBI</th>
                  <th>PA</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((row) => (
                  <tr key={`h-${row.player_id}`}>
                    <td>
                      <Link href={`/players/${row.player_id}?season=${season}`}>
                        {row.full_name}
                      </Link>
                    </td>
                    <td>{formatAvg(row.hitting?.avg)}</td>
                    <td>{formatObp(row.hitting?.obp)}</td>
                    <td>{formatSlg(row.hitting?.slg)}</td>
                    <td>{formatOps(row.hitting?.ops)}</td>
                    <td>{n(row.hitting?.homeRuns)}</td>
                    <td>{n(row.hitting?.rbi)}</td>
                    <td>{n(row.hitting?.plateAppearances)}</td>
                  </tr>
                ))}
                {ids.filter((id) => !selected.some((r) => String(r.player_id) === id)).map((id) => (
                  <tr key={`h-${id}`}>
                    <td>Unknown ({id})</td>
                    <td colSpan={7}>N/A</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card table-wrap">
            <h2 style={{ marginTop: 0 }}>Pitching</h2>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>W</th>
                  <th>L</th>
                  <th>SV</th>
                  <th>ERA</th>
                  <th>WHIP</th>
                  <th>IP</th>
                  <th>SO</th>
                  <th>BB</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((row) => (
                  <tr key={`p-${row.player_id}`}>
                    <td>
                      <Link href={`/players/${row.player_id}?season=${season}`}>
                        {row.full_name}
                      </Link>
                    </td>
                    <td>{n(row.pitching?.wins)}</td>
                    <td>{n(row.pitching?.losses)}</td>
                    <td>{n(row.pitching?.saves)}</td>
                    <td>{formatEra(row.pitching?.era)}</td>
                    <td>{formatWhip(row.pitching?.whip)}</td>
                    <td>{n(row.pitching?.inningsPitched)}</td>
                    <td>{n(row.pitching?.strikeOuts)}</td>
                    <td>{n(row.pitching?.baseOnBalls)}</td>
                  </tr>
                ))}
                {ids.filter((id) => !selected.some((r) => String(r.player_id) === id)).map((id) => (
                  <tr key={`p-${id}`}>
                    <td>Unknown ({id})</td>
                    <td colSpan={8}>N/A</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

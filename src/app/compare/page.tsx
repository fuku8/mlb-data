import Link from "next/link";
import { getPlayerHitting, getPlayerPitching, getPlayers } from "@/lib/data/loaders";

type ComparePageProps = {
  searchParams: Promise<{
    players?: string;
    season?: string;
  }>;
};

function fmt(value: string | null | undefined): string {
  if (!value) return "N/A";
  return value;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const season = (params.season ?? "").trim();
  const ids = (params.players ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);

  const [players, hittingRows, pitchingRows] = await Promise.all([
    getPlayers(),
    getPlayerHitting(),
    getPlayerPitching(),
  ]);

  const playerById = new Map(players.map((p) => [p.player_id, p]));
  const hittingById = new Map<string, Record<string, string>>();
  for (const row of hittingRows) {
    if (season && row.season !== season) continue;
    if (!hittingById.has(row.player_id)) hittingById.set(row.player_id, row);
  }
  const pitchingById = new Map<string, Record<string, string>>();
  for (const row of pitchingRows) {
    if (season && row.season !== season) continue;
    if (!pitchingById.has(row.player_id)) pitchingById.set(row.player_id, row);
  }

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
                {ids.map((id) => {
                  const player = playerById.get(id);
                  const row = hittingById.get(id);
                  return (
                    <tr key={`h-${id}`}>
                      <td>
                        {player?.full_name ?? "Unknown"} ({id})
                      </td>
                      <td>{fmt(row?.avg)}</td>
                      <td>{fmt(row?.obp)}</td>
                      <td>{fmt(row?.slg)}</td>
                      <td>{fmt(row?.ops)}</td>
                      <td>{fmt(row?.homeRuns)}</td>
                      <td>{fmt(row?.rbi)}</td>
                      <td>{fmt(row?.plateAppearances)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="card table-wrap">
            <h2 style={{ marginTop: 0 }}>Pitching</h2>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>ERA</th>
                  <th>WHIP</th>
                  <th>IP</th>
                  <th>SO</th>
                  <th>BB</th>
                </tr>
              </thead>
              <tbody>
                {ids.map((id) => {
                  const player = playerById.get(id);
                  const row = pitchingById.get(id);
                  return (
                    <tr key={`p-${id}`}>
                      <td>
                        {player?.full_name ?? "Unknown"} ({id})
                      </td>
                      <td>{fmt(row?.era)}</td>
                      <td>{fmt(row?.whip)}</td>
                      <td>{fmt(row?.inningsPitched)}</td>
                      <td>{fmt(row?.strikeOuts)}</td>
                      <td>{fmt(row?.baseOnBalls)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
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
} from "@/lib/data/normalizers";

type Props = {
  searchParams: Promise<{ season?: string; group?: string; q?: string; page?: string; perPage?: string; sortBy?: string; sortDir?: string }>;
};

function contains(base: string, q: string): boolean {
  if (!q) return true;
  return base.toLowerCase().includes(q.toLowerCase());
}

function n(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

export default async function PlayersPage({ searchParams }: Props) {
  const { season, group, q, page, perPage, sortBy, sortDir } = await searchParams;
  const statGroup = group === "pitching" ? "pitching" : "hitting";
  const defaultSortBy = statGroup === "hitting" ? "ops" : "era";
  const activeSortBy = sortBy?.trim() || defaultSortBy;
  const activeSortDir = sortDir === "asc" ? "asc" : "desc";
  const pageNum = Math.max(1, Number(page ?? "1") || 1);
  const perPageNum = [25, 50, 100].includes(Number(perPage)) ? Number(perPage) : 25;

  const [players, hitting, pitching] = await Promise.all([getPlayers(), getPlayerHitting(), getPlayerPitching()]);

  const mergedAll = mergePlayerStatsBySeason({
    players,
    hitting,
    pitching,
    fielding: [],
    season,
  })
    .filter((row) => contains(row.full_name, q ?? ""))
    .map((row) => ({
      ...row,
      qualified:
        statGroup === "hitting"
          ? isQualifiedHitter(row.hitting?.plateAppearances ?? null)
          : isQualifiedPitcher(row.pitching?.inningsPitched),
    }))
    .sort((a, b) => {
      const inningsToOuts = (ip?: string | null) => {
        if (!ip) return null;
        const [whole, partial] = ip.split(".");
        const w = Number(whole || "0");
        const p = Number(partial || "0");
        if (!Number.isFinite(w) || !Number.isFinite(p)) return null;
        return w * 3 + p;
      };

      const num = (v?: string | number | null) => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const valueFor = (rowVal: typeof a) => {
        if (activeSortBy === "player") return rowVal.full_name.toLowerCase();
        if (activeSortBy === "team") return (rowVal.team_name || "").toLowerCase();
        if (statGroup === "hitting") {
          if (activeSortBy === "g") return num(rowVal.hitting?.gamesPlayed ?? null);
          if (activeSortBy === "pa") return num(rowVal.hitting?.plateAppearances ?? null);
          if (activeSortBy === "ab") return num(rowVal.hitting?.atBats ?? null);
          if (activeSortBy === "h") return num(rowVal.hitting?.hits ?? null);
          if (activeSortBy === "2b") return num(rowVal.hitting?.doubles ?? null);
          if (activeSortBy === "3b") return num(rowVal.hitting?.triples ?? null);
          if (activeSortBy === "r") return num(rowVal.hitting?.runs ?? null);
          if (activeSortBy === "avg") return num(rowVal.hitting?.avg ?? null);
          if (activeSortBy === "obp") return num(rowVal.hitting?.obp ?? null);
          if (activeSortBy === "slg") return num(rowVal.hitting?.slg ?? null);
          if (activeSortBy === "ops") return num(rowVal.hitting?.ops ?? null);
          if (activeSortBy === "hr") return num(rowVal.hitting?.homeRuns ?? null);
          if (activeSortBy === "rbi") return num(rowVal.hitting?.rbi ?? null);
          if (activeSortBy === "bb") return num(rowVal.hitting?.baseOnBalls ?? null);
          if (activeSortBy === "so") return num(rowVal.hitting?.strikeOuts ?? null);
          if (activeSortBy === "sb") return num(rowVal.hitting?.stolenBases ?? null);
          if (activeSortBy === "cs") return num(rowVal.hitting?.caughtStealing ?? null);
          if (activeSortBy === "hbp") return num(rowVal.hitting?.hitByPitch ?? null);
          if (activeSortBy === "sf") return num(rowVal.hitting?.sacFlies ?? null);
          if (activeSortBy === "tb") return num(rowVal.hitting?.totalBases ?? null);
          if (activeSortBy === "babip") return num(rowVal.hitting?.babip ?? null);
        } else {
          if (activeSortBy === "g") return num(rowVal.pitching?.gamesPlayed ?? null);
          if (activeSortBy === "gs") return num(rowVal.pitching?.gamesStarted ?? null);
          if (activeSortBy === "gf") return num(rowVal.pitching?.gamesFinished ?? null);
          if (activeSortBy === "w") return num(rowVal.pitching?.wins ?? null);
          if (activeSortBy === "l") return num(rowVal.pitching?.losses ?? null);
          if (activeSortBy === "sv") return num(rowVal.pitching?.saves ?? null);
          if (activeSortBy === "hld") return num(rowVal.pitching?.holds ?? null);
          if (activeSortBy === "bs") return num(rowVal.pitching?.blownSaves ?? null);
          if (activeSortBy === "ip") return inningsToOuts(rowVal.pitching?.inningsPitched ?? null);
          if (activeSortBy === "bf") return num(rowVal.pitching?.battersFaced ?? null);
          if (activeSortBy === "h") return num(rowVal.pitching?.hits ?? null);
          if (activeSortBy === "hr") return num(rowVal.pitching?.homeRuns ?? null);
          if (activeSortBy === "er") return num(rowVal.pitching?.earnedRuns ?? null);
          if (activeSortBy === "era") return num(rowVal.pitching?.era ?? null);
          if (activeSortBy === "whip") return num(rowVal.pitching?.whip ?? null);
          if (activeSortBy === "so") return num(rowVal.pitching?.strikeOuts ?? null);
          if (activeSortBy === "bb") return num(rowVal.pitching?.baseOnBalls ?? null);
          if (activeSortBy === "kbb") return num(rowVal.pitching?.strikeoutWalkRatio ?? null);
          if (activeSortBy === "k9") return num(rowVal.pitching?.strikeoutsPer9Inn ?? null);
          if (activeSortBy === "bb9") return num(rowVal.pitching?.walksPer9Inn ?? null);
          if (activeSortBy === "h9") return num(rowVal.pitching?.hitsPer9Inn ?? null);
          if (activeSortBy === "hr9") return num(rowVal.pitching?.homeRunsPer9 ?? null);
        }
        return null;
      };

      const av = valueFor(a);
      const bv = valueFor(b);
      const dir = activeSortDir === "asc" ? 1 : -1;

      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir;
      }

      const an = typeof av === "number" ? av : null;
      const bn = typeof bv === "number" ? bv : null;
      if (an === null && bn === null) return 0;
      if (an === null) return 1;
      if (bn === null) return -1;
      return (an - bn) * dir;
    });
  const total = mergedAll.length;
  const totalPages = Math.max(1, Math.ceil(total / perPageNum));
  const currentPage = Math.min(pageNum, totalPages);
  const start = (currentPage - 1) * perPageNum;
  const merged = mergedAll.slice(start, start + perPageNum);

  const seasonValue = season ?? new Date().getUTCFullYear().toString();
  const commonQuery = new URLSearchParams({
    season: seasonValue,
    group: statGroup,
    q: q ?? "",
    perPage: String(perPageNum),
    sortBy: activeSortBy,
    sortDir: activeSortDir,
  });
  const prevQuery = new URLSearchParams(commonQuery);
  prevQuery.set("page", String(Math.max(1, currentPage - 1)));
  const nextQuery = new URLSearchParams(commonQuery);
  nextQuery.set("page", String(Math.min(totalPages, currentPage + 1)));
  const headerQuery = (key: string) => {
    const qs = new URLSearchParams(commonQuery);
    qs.set("page", "1");
    if (activeSortBy === key) {
      qs.set("sortDir", activeSortDir === "asc" ? "desc" : "asc");
    } else {
      qs.set("sortBy", key);
      qs.set("sortDir", key === "era" ? "asc" : "desc");
    }
    return `/players?${qs.toString()}`;
  };
  const sortableHeader = (label: string, key: string) => (
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
        <h1 style={{ margin: "0 0 16px", fontSize: 34, lineHeight: 1.1 }}>Players</h1>
        <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
          小サンプルは ⚠ 表示（打者 PA&lt;30 / 投手 IP&lt;10）
        </p>
        <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="q" defaultValue={q ?? ""} placeholder="Search player" />
          <input name="season" defaultValue={seasonValue} style={{ width: 120 }} />
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="sortBy" value={activeSortBy} />
          <input type="hidden" name="sortDir" value={activeSortDir} />
          <select name="group" defaultValue={statGroup}>
            <option value="hitting">Hitting</option>
            <option value="pitching">Pitching</option>
          </select>
          <select name="perPage" defaultValue={String(perPageNum)}>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
          <button className="primary" type="submit">Apply</button>
        </form>
      </section>

      <section className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: "var(--muted-foreground)" }}>
          {total} players / Page {currentPage} of {totalPages}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/players?${prevQuery.toString()}`} aria-disabled={currentPage <= 1} style={{ opacity: currentPage <= 1 ? 0.5 : 1 }}>
            Prev
          </Link>
          <Link href={`/players?${nextQuery.toString()}`} aria-disabled={currentPage >= totalPages} style={{ opacity: currentPage >= totalPages ? 0.5 : 1 }}>
            Next
          </Link>
        </div>
      </section>

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>{sortableHeader("Player", "player")}</th>
              <th>{sortableHeader("Team", "team")}</th>
              {statGroup === "hitting" ? (
                <>
                  <th>{sortableHeader("G", "g")}</th>
                  <th>{sortableHeader("PA", "pa")}</th>
                  <th>{sortableHeader("AB", "ab")}</th>
                  <th>{sortableHeader("H", "h")}</th>
                  <th>{sortableHeader("2B", "2b")}</th>
                  <th>{sortableHeader("3B", "3b")}</th>
                  <th>{sortableHeader("R", "r")}</th>
                  <th>{sortableHeader("AVG", "avg")}</th>
                  <th>{sortableHeader("OBP", "obp")}</th>
                  <th>{sortableHeader("SLG", "slg")}</th>
                  <th>{sortableHeader("OPS", "ops")}</th>
                  <th>{sortableHeader("HR", "hr")}</th>
                  <th>{sortableHeader("RBI", "rbi")}</th>
                  <th>{sortableHeader("BB", "bb")}</th>
                  <th>{sortableHeader("SO", "so")}</th>
                  <th>{sortableHeader("SB", "sb")}</th>
                  <th>{sortableHeader("CS", "cs")}</th>
                  <th>{sortableHeader("HBP", "hbp")}</th>
                  <th>{sortableHeader("SF", "sf")}</th>
                  <th>{sortableHeader("TB", "tb")}</th>
                  <th>{sortableHeader("BABIP", "babip")}</th>
                </>
              ) : (
                <>
                  <th>{sortableHeader("G", "g")}</th>
                  <th>{sortableHeader("GS", "gs")}</th>
                  <th>{sortableHeader("GF", "gf")}</th>
                  <th>{sortableHeader("W", "w")}</th>
                  <th>{sortableHeader("L", "l")}</th>
                  <th>{sortableHeader("SV", "sv")}</th>
                  <th>{sortableHeader("HLD", "hld")}</th>
                  <th>{sortableHeader("BS", "bs")}</th>
                  <th>{sortableHeader("IP", "ip")}</th>
                  <th>{sortableHeader("BF", "bf")}</th>
                  <th>{sortableHeader("H", "h")}</th>
                  <th>{sortableHeader("HR", "hr")}</th>
                  <th>{sortableHeader("ER", "er")}</th>
                  <th>{sortableHeader("SO", "so")}</th>
                  <th>{sortableHeader("BB", "bb")}</th>
                  <th>{sortableHeader("K/BB", "kbb")}</th>
                  <th>{sortableHeader("K/9", "k9")}</th>
                  <th>{sortableHeader("BB/9", "bb9")}</th>
                  <th>{sortableHeader("H/9", "h9")}</th>
                  <th>{sortableHeader("HR/9", "hr9")}</th>
                  <th>{sortableHeader("ERA", "era")}</th>
                  <th>{sortableHeader("WHIP", "whip")}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {merged.length === 0 ? (
              <tr>
                <td colSpan={statGroup === "hitting" ? 23 : 24}>No players found.</td>
              </tr>
            ) : (
              merged.map((row) => (
                <tr key={`${row.player_id}-${statGroup}`}>
                  <td>
                    <Link href={`/players/${row.player_id}?season=${seasonValue}`}>
                      {row.full_name} {!row.qualified && <span title="Small sample">⚠</span>}
                    </Link>
                  </td>
                  <td>
                    {row.team_id ? (
                      <Link href={`/teams/${row.team_id}?season=${seasonValue}`}>{n(row.team_name)}</Link>
                    ) : (
                      n(row.team_name)
                    )}
                  </td>
                  {statGroup === "hitting" ? (
                    <>
                      <td>{n(row.hitting?.gamesPlayed)}</td>
                      <td>{n(row.hitting?.plateAppearances)}</td>
                      <td>{n(row.hitting?.atBats)}</td>
                      <td>{n(row.hitting?.hits)}</td>
                      <td>{n(row.hitting?.doubles)}</td>
                      <td>{n(row.hitting?.triples)}</td>
                      <td>{n(row.hitting?.runs)}</td>
                      <td>{formatAvg(row.hitting?.avg)}</td>
                      <td>{formatObp(row.hitting?.obp)}</td>
                      <td>{formatSlg(row.hitting?.slg)}</td>
                      <td>{formatOps(row.hitting?.ops)}</td>
                      <td>{n(row.hitting?.homeRuns)}</td>
                      <td>{n(row.hitting?.rbi)}</td>
                      <td>{n(row.hitting?.baseOnBalls)}</td>
                      <td>{n(row.hitting?.strikeOuts)}</td>
                      <td>{n(row.hitting?.stolenBases)}</td>
                      <td>{n(row.hitting?.caughtStealing)}</td>
                      <td>{n(row.hitting?.hitByPitch)}</td>
                      <td>{n(row.hitting?.sacFlies)}</td>
                      <td>{n(row.hitting?.totalBases)}</td>
                      <td>{n(row.hitting?.babip)}</td>
                    </>
                  ) : (
                    <>
                      <td>{n(row.pitching?.gamesPlayed)}</td>
                      <td>{n(row.pitching?.gamesStarted)}</td>
                      <td>{n(row.pitching?.gamesFinished)}</td>
                      <td>{n(row.pitching?.wins)}</td>
                      <td>{n(row.pitching?.losses)}</td>
                      <td>{n(row.pitching?.saves)}</td>
                      <td>{n(row.pitching?.holds)}</td>
                      <td>{n(row.pitching?.blownSaves)}</td>
                      <td>{n(row.pitching?.inningsPitched)}</td>
                      <td>{n(row.pitching?.battersFaced)}</td>
                      <td>{n(row.pitching?.hits)}</td>
                      <td>{n(row.pitching?.homeRuns)}</td>
                      <td>{n(row.pitching?.earnedRuns)}</td>
                      <td>{n(row.pitching?.strikeOuts)}</td>
                      <td>{n(row.pitching?.baseOnBalls)}</td>
                      <td>{n(row.pitching?.strikeoutWalkRatio)}</td>
                      <td>{n(row.pitching?.strikeoutsPer9Inn)}</td>
                      <td>{n(row.pitching?.walksPer9Inn)}</td>
                      <td>{n(row.pitching?.hitsPer9Inn)}</td>
                      <td>{n(row.pitching?.homeRunsPer9)}</td>
                      <td>{formatEra(row.pitching?.era)}</td>
                      <td>{formatWhip(row.pitching?.whip)}</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Link href={`/players?${prevQuery.toString()}`} aria-disabled={currentPage <= 1} style={{ opacity: currentPage <= 1 ? 0.5 : 1 }}>
          Prev
        </Link>
        <Link href={`/players?${nextQuery.toString()}`} aria-disabled={currentPage >= totalPages} style={{ opacity: currentPage >= totalPages ? 0.5 : 1 }}>
          Next
        </Link>
      </section>
    </div>
  );
}

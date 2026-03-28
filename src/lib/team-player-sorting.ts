export type TeamStatGroup = "hitting" | "pitching";
export type TeamSortDir = "asc" | "desc";
export type TeamSortKey =
  | "player"
  | "pa"
  | "avg"
  | "obp"
  | "ops"
  | "hr"
  | "rbi"
  | "w"
  | "l"
  | "sv"
  | "ip"
  | "era"
  | "whip"
  | "so"
  | "bb";

type TeamSortablePlayerRow = {
  full_name: string;
  hitting?: {
    plateAppearances?: number | null;
    avg?: string | null;
    obp?: string | null;
    ops?: string | null;
    homeRuns?: number | null;
    rbi?: number | null;
  };
  pitching?: {
    wins?: number | null;
    losses?: number | null;
    saves?: number | null;
    inningsPitched?: string | null;
    era?: string | null;
    whip?: string | null;
    strikeOuts?: number | null;
    baseOnBalls?: number | null;
  };
};

const hittingSortKeys: TeamSortKey[] = ["player", "pa", "avg", "obp", "ops", "hr", "rbi"];
const pitchingSortKeys: TeamSortKey[] = ["player", "w", "l", "sv", "ip", "era", "whip", "so", "bb"];

export function defaultTeamPlayerSort(group: TeamStatGroup): { sortBy: TeamSortKey; sortDir: TeamSortDir } {
  return group === "hitting" ? { sortBy: "ops", sortDir: "desc" } : { sortBy: "era", sortDir: "asc" };
}

export function resolveTeamPlayerSort(
  group: TeamStatGroup,
  sortBy?: string | null,
  sortDir?: string | null,
): { sortBy: TeamSortKey; sortDir: TeamSortDir } {
  const fallback = defaultTeamPlayerSort(group);
  const allowed = group === "hitting" ? hittingSortKeys : pitchingSortKeys;
  const normalizedSortBy = sortBy && allowed.includes(sortBy as TeamSortKey) ? (sortBy as TeamSortKey) : fallback.sortBy;
  const normalizedSortDir = sortDir === "asc" || sortDir === "desc" ? sortDir : fallback.sortDir;

  if (normalizedSortBy !== fallback.sortBy) {
    return { sortBy: normalizedSortBy, sortDir: normalizedSortDir };
  }
  if (sortBy === fallback.sortBy) {
    return { sortBy: normalizedSortBy, sortDir: normalizedSortDir };
  }
  return fallback;
}

function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inningsToOuts(ip: string | null | undefined): number {
  if (!ip) return 0;
  const [whole, part] = ip.split(".");
  const innings = Number(whole || "0");
  const partial = Number(part || "0");
  if (!Number.isFinite(innings) || !Number.isFinite(partial)) return 0;
  return innings * 3 + partial;
}

export function valueForTeamPlayerSort<T extends TeamSortablePlayerRow>(
  row: T,
  group: TeamStatGroup,
  sortBy: TeamSortKey,
): number | string | null {
  if (sortBy === "player") return row.full_name.toLowerCase();

  if (group === "hitting") {
    if (sortBy === "pa") return num(row.hitting?.plateAppearances ?? null);
    if (sortBy === "avg") return num(row.hitting?.avg ?? null);
    if (sortBy === "obp") return num(row.hitting?.obp ?? null);
    if (sortBy === "ops") return num(row.hitting?.ops ?? null);
    if (sortBy === "hr") return num(row.hitting?.homeRuns ?? null);
    if (sortBy === "rbi") return num(row.hitting?.rbi ?? null);
    return null;
  }

  if (sortBy === "w") return num(row.pitching?.wins ?? null);
  if (sortBy === "l") return num(row.pitching?.losses ?? null);
  if (sortBy === "sv") return num(row.pitching?.saves ?? null);
  if (sortBy === "ip") return inningsToOuts(row.pitching?.inningsPitched ?? null);
  if (sortBy === "era") return num(row.pitching?.era ?? null);
  if (sortBy === "whip") return num(row.pitching?.whip ?? null);
  if (sortBy === "so") return num(row.pitching?.strikeOuts ?? null);
  if (sortBy === "bb") return num(row.pitching?.baseOnBalls ?? null);
  return null;
}

export function sortTeamPlayerRows<T extends TeamSortablePlayerRow>(
  rows: T[],
  group: TeamStatGroup,
  sortBy: TeamSortKey,
  sortDir: TeamSortDir,
): T[] {
  const dir = sortDir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const av = valueForTeamPlayerSort(a, group, sortBy);
    const bv = valueForTeamPlayerSort(b, group, sortBy);

    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv) * dir;
    }

    const an = typeof av === "number" ? av : null;
    const bn = typeof bv === "number" ? bv : null;
    if (an === null && bn === null) return a.full_name.localeCompare(b.full_name);
    if (an === null) return 1;
    if (bn === null) return -1;
    if (an === bn) return a.full_name.localeCompare(b.full_name);
    return (an - bn) * dir;
  });
}

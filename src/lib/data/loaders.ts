import { readFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || s === "N/A" || s === "--") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function readTextFile(fileName: string): Promise<string | null> {
  const fullPath = path.join(DATA_DIR, fileName);
  try {
    const raw = await readFile(fullPath, "utf8");
    const trimmed = raw.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export async function readCsv(fileName: string): Promise<Record<string, string>[]> {
  const fullPath = path.join(DATA_DIR, fileName);
  let raw: string;
  try {
    raw = await readFile(fullPath, "utf8");
  } catch {
    return [];
  }

  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (rows.length === 0) return [];

  const headers = parseCsvLine(rows[0]);
  return rows.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const rec: Record<string, string> = {};
    headers.forEach((header, i) => {
      rec[header] = cols[i] ?? "";
    });
    return rec;
  });
}

export async function getStandings(): Promise<Record<string, string>[]> {
  return readCsv("standings.csv");
}

export async function getPlayers(): Promise<Record<string, string>[]> {
  return readCsv("players.csv");
}

export async function getTeams(): Promise<Record<string, string>[]> {
  return readCsv("teams.csv");
}

export async function getPlayerHitting(): Promise<Record<string, string>[]> {
  return readCsv("player_hitting.csv");
}

export async function getPlayerPitching(): Promise<Record<string, string>[]> {
  return readCsv("player_pitching.csv");
}

export async function getPlayerFielding(): Promise<Record<string, string>[]> {
  return readCsv("player_fielding.csv");
}

export async function getSchedule(): Promise<Record<string, string>[]> {
  return readCsv("schedule.csv");
}

import type { GameResult } from "./types";

export function getLatestFinalJstDate(games: GameResult[]): string | null {
  const dates = [...new Set(games.map((game) => game.jst_date).filter(Boolean))].sort().reverse();
  return dates.find((date) => games.some((game) => game.jst_date === date && game.status_code === "F")) ?? null;
}

export function getGamesForJstDate(games: GameResult[], date: string): GameResult[] {
  return games
    .filter((game) => game.jst_date === date)
    .sort((a, b) => a.game_date.localeCompare(b.game_date));
}

export function formatUpdatedAtJst(value: string | null | undefined): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}/${map.month}/${map.day} ${map.hour}:${map.minute} JST`;
}

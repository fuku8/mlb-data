import test from "node:test";
import assert from "node:assert/strict";

import { formatUpdatedAtJst, getLatestFinalJstDate, getGamesForJstDate } from "./game-display.ts";

function makeGame(overrides = {}) {
  return {
    game_pk: 1,
    game_date: "2026-03-26T00:05:00Z",
    jst_date: "2026-03-26",
    official_date: "2026-03-25",
    status: "Final",
    status_code: "F",
    day_night: "night",
    away_team_id: 147,
    away_team_name: "New York Yankees",
    away_score: 7,
    home_team_id: 137,
    home_team_name: "San Francisco Giants",
    home_score: 0,
    venue_name: "Oracle Park",
    ...overrides,
  };
}

test("getLatestFinalJstDate uses jst_date instead of official_date", () => {
  const games = [
    makeGame({ game_pk: 1, jst_date: "2026-03-26", official_date: "2026-03-25", status_code: "F" }),
    makeGame({ game_pk: 2, jst_date: "2026-03-27", official_date: "2026-03-26", status_code: "I" }),
  ];

  assert.equal(getLatestFinalJstDate(games), "2026-03-26");
});

test("getGamesForJstDate groups games by jst_date", () => {
  const games = [
    makeGame({ game_pk: 1, jst_date: "2026-03-26", official_date: "2026-03-25", game_date: "2026-03-26T00:05:00Z" }),
    makeGame({ game_pk: 2, jst_date: "2026-03-26", official_date: "2026-03-26", game_date: "2026-03-26T17:15:00Z" }),
    makeGame({ game_pk: 3, jst_date: "2026-03-27", official_date: "2026-03-26", game_date: "2026-03-27T02:10:00Z" }),
  ];

  assert.deepEqual(
    getGamesForJstDate(games, "2026-03-26").map((game) => game.game_pk),
    [1, 2],
  );
});

test("formatUpdatedAtJst converts UTC timestamp to JST label", () => {
  assert.equal(
    formatUpdatedAtJst("2026-03-28T00:15:00Z"),
    "2026/03/28 09:15 JST",
  );
});

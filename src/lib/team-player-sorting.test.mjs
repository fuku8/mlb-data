import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultTeamPlayerSort,
  resolveTeamPlayerSort,
  sortTeamPlayerRows,
  valueForTeamPlayerSort,
} from "./team-player-sorting.ts";

function makeRow(overrides = {}) {
  return {
    player_id: 1,
    full_name: "Aaron Example",
    first_name: "Aaron",
    last_name: "Example",
    use_name: "Aaron",
    birth_date: "1995-01-01",
    current_age: 31,
    position_abbr: "1B",
    bat_side: "R",
    pitch_hand: "R",
    active: true,
    season: "2026",
    team_id: 147,
    team_name: "Example Team",
    hitting: undefined,
    pitching: undefined,
    fielding: undefined,
    ...overrides,
  };
}

test("defaultTeamPlayerSort matches team page defaults", () => {
  assert.deepEqual(defaultTeamPlayerSort("hitting"), { sortBy: "ops", sortDir: "desc" });
  assert.deepEqual(defaultTeamPlayerSort("pitching"), { sortBy: "era", sortDir: "asc" });
});

test("resolveTeamPlayerSort falls back to group defaults for invalid keys", () => {
  assert.deepEqual(resolveTeamPlayerSort("hitting", "era", "asc"), { sortBy: "ops", sortDir: "desc" });
  assert.deepEqual(resolveTeamPlayerSort("pitching", "ops", "desc"), { sortBy: "era", sortDir: "asc" });
  assert.deepEqual(resolveTeamPlayerSort("pitching", "so", "asc"), { sortBy: "so", sortDir: "asc" });
});

test("resolveTeamPlayerSort uses default dir when dir is omitted for valid key", () => {
  assert.deepEqual(resolveTeamPlayerSort("pitching", "so", undefined), { sortBy: "so", sortDir: "asc" });
  assert.deepEqual(resolveTeamPlayerSort("hitting", "pa", undefined), { sortBy: "pa", sortDir: "desc" });
});

test("valueForTeamPlayerSort returns numeric hitting values", () => {
  const row = makeRow({
    hitting: {
      plateAppearances: 120,
      avg: ".301",
      obp: ".370",
      ops: ".902",
      homeRuns: 11,
      rbi: 39,
    },
  });

  assert.equal(valueForTeamPlayerSort(row, "hitting", "pa"), 120);
  assert.equal(valueForTeamPlayerSort(row, "hitting", "ops"), 0.902);
});

test("valueForTeamPlayerSort returns pitching values including innings conversion", () => {
  const row = makeRow({
    pitching: {
      wins: 3,
      losses: 1,
      saves: 0,
      inningsPitched: "18.1",
      era: "2.95",
      whip: "1.04",
      strikeOuts: 22,
      baseOnBalls: 5,
    },
  });

  assert.equal(valueForTeamPlayerSort(row, "pitching", "era"), 2.95);
  assert.equal(valueForTeamPlayerSort(row, "pitching", "whip"), 1.04);
  assert.equal(valueForTeamPlayerSort(row, "pitching", "ip"), 55); // 18*3 + 1 = 55 outs
  assert.equal(valueForTeamPlayerSort(row, "pitching", "so"), 22);
  assert.equal(valueForTeamPlayerSort(row, "pitching", "w"), 3);
});

test("sortTeamPlayerRows sorts hitting rows by requested metric and direction", () => {
  const rows = [
    makeRow({ player_id: 1, full_name: "Beta", hitting: { plateAppearances: 90, ops: ".815", avg: ".280", obp: ".340", homeRuns: 7, rbi: 21 } }),
    makeRow({ player_id: 2, full_name: "Alpha", hitting: { plateAppearances: 120, ops: ".910", avg: ".300", obp: ".380", homeRuns: 14, rbi: 44 } }),
    makeRow({ player_id: 3, full_name: "Gamma", hitting: { plateAppearances: 75, ops: ".730", avg: ".250", obp: ".320", homeRuns: 4, rbi: 17 } }),
  ];

  assert.deepEqual(
    sortTeamPlayerRows(rows, "hitting", "ops", "desc").map((row) => row.full_name),
    ["Alpha", "Beta", "Gamma"],
  );
  assert.deepEqual(
    sortTeamPlayerRows(rows, "hitting", "player", "asc").map((row) => row.full_name),
    ["Alpha", "Beta", "Gamma"],
  );
});

test("sortTeamPlayerRows sorts pitching rows by ERA ascending and innings descending", () => {
  const rows = [
    makeRow({
      player_id: 1,
      full_name: "Charlie",
      pitching: { wins: 3, losses: 1, saves: 0, inningsPitched: "18.1", era: "2.95", whip: "1.04", strikeOuts: 22, baseOnBalls: 5 },
    }),
    makeRow({
      player_id: 2,
      full_name: "Bravo",
      pitching: { wins: 1, losses: 2, saves: 7, inningsPitched: "14.0", era: "1.93", whip: "0.98", strikeOuts: 19, baseOnBalls: 3 },
    }),
    makeRow({
      player_id: 3,
      full_name: "Alpha",
      pitching: { wins: 5, losses: 0, saves: 0, inningsPitched: "22.2", era: "3.10", whip: "1.11", strikeOuts: 27, baseOnBalls: 6 },
    }),
  ];

  assert.deepEqual(
    sortTeamPlayerRows(rows, "pitching", "era", "asc").map((row) => row.full_name),
    ["Bravo", "Charlie", "Alpha"],
  );
  assert.deepEqual(
    sortTeamPlayerRows(rows, "pitching", "ip", "desc").map((row) => row.full_name),
    ["Alpha", "Charlie", "Bravo"],
  );
});

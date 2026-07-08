import test from "node:test";
import assert from "node:assert/strict";

import { pickBadges, getTypeLeaderboard, classifyHitters } from "./player-types.ts";

// pickBadges(candidates): z≥1.0を最大3つ、score降順。なければ最上位1つをfallback
test("pickBadges selects up to 3 types with z >= 1.0, sorted by score", () => {
  const cand = [
    { name: "A", z: 2.0, score: 0.7 },
    { name: "B", z: 1.5, score: 0.9 },
    { name: "C", z: 1.1, score: 0.5 },
    { name: "D", z: 1.05, score: 0.6 },
    { name: "E", z: 0.2, score: 0.99 },
  ];
  const badges = pickBadges(cand);
  assert.deepEqual(badges.map((b) => b.type), ["B", "A", "C"]); // z上位3つをscore降順
  assert.ok(badges.every((b) => !b.fallback));
});

test("pickBadges falls back to the top-z type when none reach 1.0 but top z >= 0", () => {
  const cand = [
    { name: "A", z: 0.8, score: 0.4 },
    { name: "B", z: 0.3, score: 0.9 },
  ];
  const badges = pickBadges(cand);
  assert.equal(badges.length, 1);
  assert.equal(badges[0].type, "A");
  assert.equal(badges[0].fallback, true);
});

test("pickBadges returns empty when the top z is negative (below league average)", () => {
  const cand = [
    { name: "A", z: -0.2, score: 0.4 },
    { name: "B", z: -0.5, score: 0.9 },
  ];
  assert.deepEqual(pickBadges(cand), []);
});

const makeHitter = (id, overrides = {}) => ({
  player_id: id,
  full_name: `p${id}`,
  hitting: {
    avg: "0.250",
    obp: "0.320",
    slg: "0.400",
    plateAppearances: 400,
    homeRuns: 5,
    stolenBases: 0,
    caughtStealing: 0,
    baseOnBalls: 30,
    strikeOuts: 60,
    gamesPlayed: 100,
    triples: 0,
    runs: 40,
    hits: 90,
    rbi: 40,
    atBats: 360,
    intentionalWalks: 0,
    hitByPitch: 0,
    sacFlies: 0,
    doubles: 15,
    ...overrides,
  },
});

// 盗塁企図数/三塁打数はゼロ過多カウントのためzscore化した。企図0多数+高企図少数のプールで、
// 企図0の選手のスピードスターzが負（バッジなし）に沈むことを確認する
test("classifyHitters: zero-heavy attempt/triples pool sinks zero-value players below average", () => {
  // 企図0の選手8人 + 企図・三塁打が突出した1人（真のスピードスター）
  const pool = [
    ...Array.from({ length: 8 }, (_, i) => makeHitter(i)),
    makeHitter(100, { stolenBases: 40, caughtStealing: 5, triples: 6 }),
  ];
  const badges = classifyHitters(pool);
  const zeroPlayerBadges = badges.get(0) ?? [];
  assert.equal(
    zeroPlayerBadges.find((b) => b.type === "スピードスター"),
    undefined,
  );
});

// styleは率でなく生カウント: 小サンプルで三塁打だけ1本の選手（SB0/CS0）が
// 真のスピードスター（企図45+三塁打6）を差し置いて正規判定に入らないことを確認する
test("classifyHitters: a small-sample fluke triple does not earn a non-fallback speedster badge", () => {
  const pool = [
    ...Array.from({ length: 8 }, (_, i) => makeHitter(i)),
    makeHitter(100, { stolenBases: 40, caughtStealing: 5, triples: 6 }),
    makeHitter(200, { plateAppearances: 40, gamesPlayed: 12, triples: 1, hits: 9, atBats: 36 }),
  ];
  const badges = classifyHitters(pool);
  const flukeBadges = badges.get(200) ?? [];
  assert.equal(
    flukeBadges.find((b) => b.type === "スピードスター" && !b.fallback),
    undefined,
  );
  // 真のスピードスターは引き続き正規判定される
  const trueBadges = badges.get(100) ?? [];
  assert.ok(trueBadges.some((b) => b.type === "スピードスター" && !b.fallback));
});

// getTypeLeaderboard(pool, badges, typeNames): タイプ別score降順topN、fallback除外
test("getTypeLeaderboard sorts by score desc, excludes fallback, caps at topN", () => {
  const pool = [
    { player_id: 1, full_name: "Alice" },
    { player_id: 2, full_name: "Bob" },
    { player_id: 3, full_name: "Carol" },
  ];
  const badges = new Map([
    [1, [{ type: "X", score: 0.5, fallback: false }]],
    [2, [{ type: "X", score: 0.9, fallback: false }]],
    [3, [{ type: "X", score: 0.99, fallback: true }]], // fallbackは除外
  ]);
  const board = getTypeLeaderboard(pool, badges, ["X", "Y"], 1);
  assert.deepEqual(board.find((b) => b.type === "X").players, [{ id: 2, name: "Bob", score: 0.9 }]);
  assert.deepEqual(board.find((b) => b.type === "Y").players, []);
});

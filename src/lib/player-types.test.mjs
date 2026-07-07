import test from "node:test";
import assert from "node:assert/strict";

import { pickBadges } from "./player-types.ts";

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

test("pickBadges falls back to the top-z type when none reach 1.0", () => {
  const cand = [
    { name: "A", z: 0.8, score: 0.4 },
    { name: "B", z: 0.3, score: 0.9 },
  ];
  const badges = pickBadges(cand);
  assert.equal(badges.length, 1);
  assert.equal(badges[0].type, "A");
  assert.equal(badges[0].fallback, true);
});

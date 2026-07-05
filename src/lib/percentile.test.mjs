import test from "node:test";
import assert from "node:assert/strict";

import { percentileOf } from "./percentile.ts";

test("percentileOf returns 0 for an empty population", () => {
  assert.equal(percentileOf([], 5), 0);
});

test("percentileOf ranks a value with mid-rank tie handling", () => {
  const values = [1, 2, 2, 3, 4];
  assert.equal(percentileOf(values, 2), (1 + 2 / 2) / 5);
  assert.equal(percentileOf(values, 1), (0 + 1 / 2) / 5);
  assert.equal(percentileOf(values, 4), (4 + 1 / 2) / 5);
});

test("percentileOf stays symmetric under inversion (1 - pct) when all values tie", () => {
  const values = [10, 10, 10];
  const pct = percentileOf(values, 10);
  assert.equal(pct, 0.5);
  assert.equal(1 - pct, 0.5);
});

test("percentileOf gives the top value close to 1 and the bottom value close to 0", () => {
  const values = [1, 2, 3, 4, 5];
  assert.equal(percentileOf(values, 5), 0.9);
  assert.equal(percentileOf(values, 1), 0.1);
});

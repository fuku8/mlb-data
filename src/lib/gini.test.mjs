import test from "node:test";
import assert from "node:assert/strict";

import { gini } from "./gini.ts";

test("gini returns 0 for an empty population", () => {
  assert.equal(gini([]), 0);
});

test("gini returns 0 for a perfectly equal distribution", () => {
  assert.equal(gini([5, 5, 5, 5]), 0);
});

test("gini computes moderate inequality correctly", () => {
  // sorted [1,2,3,4], n=4, sum=10 -> acc=-3-2+3+12=10 -> 10/40=0.25
  assert.equal(gini([1, 2, 3, 4]), 0.25);
});

test("gini computes high inequality correctly", () => {
  // sorted [0,0,0,10], n=4, sum=10 -> acc=30 -> 30/40=0.75
  assert.equal(gini([0, 0, 0, 10]), 0.75);
});

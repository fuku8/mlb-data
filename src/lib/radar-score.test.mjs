import test from "node:test";
import assert from "node:assert/strict";

import { radarScore } from "./radar-score.ts";

test("radarScore returns 0 for an empty list", () => {
  assert.equal(radarScore([]), 0);
});

test("radarScore equals the mean when all percentiles tie (sd=0)", () => {
  assert.equal(radarScore([0.8, 0.8, 0.8]), 0.8);
});

test("radarScore penalizes unevenness via the standard deviation", () => {
  // mean=0.5, sd=sqrt(((0.5)^2+(0.5)^2)/2)=0.5 -> 0.5*(1-0.5)=0.25
  assert.equal(radarScore([1, 0]), 0.25);
});

test("radarScore handles a single value (sd=0)", () => {
  assert.equal(radarScore([0.6]), 0.6);
});

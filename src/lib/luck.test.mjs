import test from "node:test";
import assert from "node:assert/strict";

import { hitterLuck, hitterLuckX, meterValue, pitcherLuck } from "./luck.ts";

test("hitterLuck classifies BABIP deviation", () => {
  assert.equal(hitterLuck(0.310, 0.300).direction, "neutral"); // |Δ|<0.015
  assert.equal(hitterLuck(0.330, 0.300).direction, "tail");    // +0.015〜: 追い風
  assert.equal(hitterLuck(0.250, 0.300).direction, "head");    // −0.015超: 向かい風
  assert.ok(hitterLuck(0.350, 0.300).label.includes("かなり")); // |Δ|>0.040
});

test("pitcherLuck classifies ERA-FIP gap (positive = headwind)", () => {
  assert.equal(pitcherLuck(3.5, 3.4).direction, "neutral");  // |Δ|<0.30
  assert.equal(pitcherLuck(4.2, 3.5).direction, "head");     // ERA>FIP: 向かい風
  assert.equal(pitcherLuck(3.0, 3.8).direction, "tail");     // ERA<FIP: 追い風
  assert.ok(pitcherLuck(5.0, 3.8).label.includes("かなり")); // |Δ|>0.70
});

test("meterValue aligns sign with direction (positive = tailwind)", () => {
  assert.ok(meterValue(pitcherLuck(4.2, 3.5)) < 0);  // ERA>FIP: 向かい風=左（deltaは正でもメーターは負）
  assert.ok(meterValue(hitterLuck(0.330, 0.300)) > 0); // 追い風=右
  assert.equal(meterValue(hitterLuck(0.310, 0.300)), 0); // neutral=中央
});

test("hitterLuckX classifies wOBA-xwOBA deviation", () => {
  assert.equal(hitterLuckX(0.360, 0.340).direction, "tail"); // +0.020: 追い風
  assert.equal(hitterLuckX(0.320, 0.350).direction, "head"); // -0.030: 向かい風
  assert.equal(hitterLuckX(0.305, 0.300).direction, "neutral"); // |Δ|<0.010
  assert.equal(hitterLuckX(0.310, 0.300).direction, "tail");   // +0.010ちょうど: 閾値含む
  assert.ok(hitterLuckX(0.330, 0.300).label.includes("かなり")); // |Δ|>0.025
  assert.ok(meterValue(hitterLuckX(0.360, 0.340)) > 0); // 追い風=右
});

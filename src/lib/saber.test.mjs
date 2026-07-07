import test from "node:test";
import assert from "node:assert/strict";

import { woba, babip, fipCore, fipConstant, kbbPct } from "./saber.ts";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);

test("woba computes weighted on-base average", () => {
  // AB=100, H=30(2B=5,3B=1,HR=4 → 1B=20), BB=10(IBB=2), HBP=1, SF=2
  // uBB=8, denom=100+10-2+2+1=111
  // 分子=0.69*8 + 0.72*1 + 0.89*20 + 1.27*5 + 1.62*1 + 2.10*4 = 40.41
  const c = { ab: 100, bb: 10, ibb: 2, hbp: 1, sf: 2, h: 30, doubles: 5, triples: 1, hr: 4 };
  close(woba(c), 40.41 / 111);
});

test("woba returns null when denominator is zero", () => {
  assert.equal(woba({ ab: 0, bb: 0, ibb: 0, hbp: 0, sf: 0, h: 0, doubles: 0, triples: 0, hr: 0 }), null);
});

test("babip computes in-play hit rate", () => {
  // (30-4) / (100-20-4+2) = 26/78
  close(babip(30, 4, 100, 20, 2), 26 / 78);
});

test("babip returns null when denominator is not positive", () => {
  assert.equal(babip(1, 0, 5, 5, 0), null);
});

test("fipCore computes FIP numerator per inning", () => {
  // (13*10 + 3*(30+5) - 2*150) / 180 = (130+105-300)/180 = -65/180
  close(fipCore(10, 30, 5, 150, 180), -65 / 180);
});

test("fipConstant aligns league FIP to league ERA", () => {
  // 1投手のみ: ERA = 9*60/180 = 3.0, fipCore = -65/180 → C = 3.0 - (-65/180)
  const rows = [{ hr: 10, bb: 30, hbp: 5, so: 150, ip: 180, er: 60 }];
  close(fipConstant(rows), 3.0 + 65 / 180);
  // fipCore + C = リーグ平均ERAに一致することの確認
  close(fipCore(10, 30, 5, 150, 180) + fipConstant(rows), 3.0);
});

test("fipConstant returns null for empty league", () => {
  assert.equal(fipConstant([]), null);
});

test("kbbPct computes strikeout minus walk rate", () => {
  close(kbbPct(150, 30, 600), 120 / 600);
  assert.equal(kbbPct(1, 1, 0), null);
});

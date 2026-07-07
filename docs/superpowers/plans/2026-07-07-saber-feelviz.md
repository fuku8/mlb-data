# セイバー×feel-viz 拡張 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mlb-data/npb-dataにセイバー指標カード・プレイヤータイプ判定・ラック指数・Statcastフィジカルカードを追加する（spec: `docs/superpowers/specs/2026-07-07-saber-feelviz-design.md`）

> **状況（2026-07-07）: 全11タスク実装・レビュー完了。** 各タスクのコミット・レビュー結果・Minor申し送りは `.superpowers/sdd/progress.md`（gitignore）と `docs/feel-viz.md` を参照。最終全体レビュー: Ready to push（Critical/Important 0件）。

**Architecture:** mlb-dataで実装→npb-dataへ移植（feel-viz本体と同じ流れ）。計算は純関数（`src/lib/saber.ts`等）に分離してnode --testで検証、表示はサーバーコンポーネント＋純CSS/SVG。Statcast（Phase 3）はMLBのみで、取得失敗時はカード非表示にフォールバック。

**Tech Stack:** Next.js（App Router・サーバーコンポーネント）、TypeScript、node:test（.tsを直接import）、Python（fetch scripts）

## Global Constraints

- クライアントJS・チャートライブラリを追加しない（既存Season Heartbeatのみ"use client"）
- 欠損値は`null`でスキップ（`?? 0`禁止。欠損選手を最下位/最上位に誤表示しない）
- 規定未到達者は既存の`UnqualifiedNote`流儀で注記
- 母集団: mlb=全体の規定到達者（`isQualifiedHitter` PA≥30 / `isQualifiedPitcher` アウト≥30）、npb=**リーグ内**の規定到達者
- 検証はサンドボックス制約により `npx tsc --noEmit`＋`npx eslint <変更ファイル>`＋`node --test src/lib/*.test.mjs`。`npm run build`/devサーバーは**別ターミナルでユーザーが実行**
- 各タスク完了時にコミット。各Phase完了時に`docs/feel-viz.md`へ進捗追記（**5hリミット切断からの再開はこのplanのチェックボックスとfeel-viz.mdを読む**）
- コミットメッセージ末尾: `Co-Authored-By: Claude <noreply@anthropic.com>`

## 再開手順（セッション切断時）

1. 本ファイルのチェックボックスで完了タスクを確認
2. `~/mlb-data/docs/feel-viz.md`・`~/projects/npb-data/docs/feel-viz.md` の進捗記録を読む
3. `git log --oneline -10`（両リポ）で実際のコミット状態を照合してから次のタスクへ

---

### Task 1: [mlb] セイバー計算関数 `src/lib/saber.ts`

**Files:**
- Create: `~/mlb-data/src/lib/saber.ts`
- Test: `~/mlb-data/src/lib/saber.test.mjs`

**Interfaces:**
- Produces: `woba(c: WobaCounts): number | null` / `babip(h, hr, ab, so, sf): number | null` / `fipCore(hr, bb, hbp, so, ip): number | null` / `fipConstant(rows: FipLeagueRow[]): number | null` / `kbbPct(so, bb, bf): number | null`（Task 2のmetrics.ts統合が使用）

- [ ] **Step 1: 失敗するテストを書く**

```js
// src/lib/saber.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

import { woba, babip, fipCore, fipConstant, kbbPct } from "./saber.ts";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);

test("woba computes weighted on-base average", () => {
  // AB=100, H=30(2B=5,3B=1,HR=4 → 1B=20), BB=10(IBB=2), HBP=1, SF=2
  // uBB=8, denom=100+10-2+2+1=111
  // 分子=0.69*8 + 0.72*1 + 0.89*20 + 1.27*5 + 1.62*1 + 2.10*4 = 40.71
  const c = { ab: 100, bb: 10, ibb: 2, hbp: 1, sf: 2, h: 30, doubles: 5, triples: 1, hr: 4 };
  close(woba(c), 40.71 / 111);
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd ~/mlb-data && node --test src/lib/saber.test.mjs`
Expected: FAIL（`Cannot find module './saber.ts'`）

- [ ] **Step 3: 実装**

```ts
// src/lib/saber.ts
// セイバー指標の純計算関数。UIから独立させ node --test で検証する
// wOBA係数はFanGraphs近年版で固定（リーグ・年度別の厳密係数ではない近似。/metricsに注記）

export interface WobaCounts {
  ab: number;
  bb: number;
  ibb: number;
  hbp: number;
  sf: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
}

export function woba(c: WobaCounts): number | null {
  const denom = c.ab + c.bb - c.ibb + c.sf + c.hbp;
  if (denom <= 0) return null;
  const ubb = c.bb - c.ibb;
  const singles = c.h - c.doubles - c.triples - c.hr;
  return (0.69 * ubb + 0.72 * c.hbp + 0.89 * singles + 1.27 * c.doubles + 1.62 * c.triples + 2.1 * c.hr) / denom;
}

export function babip(h: number, hr: number, ab: number, so: number, sf: number): number | null {
  const denom = ab - so - hr + sf;
  return denom > 0 ? (h - hr) / denom : null;
}

// FIPの分子/IP部分。定数Cを足す前の値
export function fipCore(hr: number, bb: number, hbp: number, so: number, ip: number): number | null {
  return ip > 0 ? (13 * hr + 3 * (bb + hbp) - 2 * so) / ip : null;
}

export interface FipLeagueRow {
  hr: number;
  bb: number;
  hbp: number;
  so: number;
  ip: number;
  er: number;
}

// リーグ定数C = リーグ平均ERA − リーグ合算fipCore。fip = fipCore + C でERAとスケールが揃う
export function fipConstant(rows: FipLeagueRow[]): number | null {
  let hr = 0, bb = 0, hbp = 0, so = 0, ip = 0, er = 0;
  for (const r of rows) {
    hr += r.hr; bb += r.bb; hbp += r.hbp; so += r.so; ip += r.ip; er += r.er;
  }
  if (ip <= 0) return null;
  const leagueEra = (9 * er) / ip;
  const core = fipCore(hr, bb, hbp, so, ip);
  return core === null ? null : leagueEra - core;
}

export function kbbPct(so: number, bb: number, bf: number): number | null {
  return bf > 0 ? (so - bb) / bf : null;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd ~/mlb-data && node --test src/lib/saber.test.mjs`
Expected: 8/8 pass

- [ ] **Step 5: コミット**

```bash
cd ~/mlb-data && git add src/lib/saber.ts src/lib/saber.test.mjs && git commit -m "Add saber calculation functions (wOBA/BABIP/FIP/K-BB%)"
```

---

### Task 2: [mlb] 型拡張＋セイバービルダー統合

**Files:**
- Modify: `~/mlb-data/src/lib/types.ts`（HittingStatsに`intentionalWalks`、PitchingStatsに`hitBatsmen`・`intentionalWalks`・`groundOutsToAirouts`を追加）
- Modify: `~/mlb-data/src/lib/data/normalizers.ts`（同フィールドのパース追加。既存フィールドのパース方法を踏襲：カウント系は`parseIntOrNull`相当、率系はstring）
- Modify: `~/mlb-data/src/lib/metrics.ts`（`buildHitterSaber`/`buildPitcherSaber`追加）

**Interfaces:**
- Consumes: Task 1の`woba`/`babip`/`fipCore`/`fipConstant`/`kbbPct`
- Produces: `export interface SaberRow { label: string; display: string; pct: number; desc: string }` / `buildHitterSaber(target: PlayerSeasonRow, pool: PlayerSeasonRow[]): SaberRow[]` / `buildPitcherSaber(target, pool): SaberRow[]`（Task 3のカードが使用）

- [ ] **Step 1: types.ts/normalizers.tsにフィールド追加**

CSVカラム名: hitting `intentionalWalks` / pitching `hitBatsmen`, `intentionalWalks`, `groundOutsToAirouts`（率系string）。normalizers.tsの既存のhitting/pitchingパース関数に他フィールドと同じ形式で追加する。

- [ ] **Step 2: metrics.tsにセイバービルダー実装**

```ts
// metrics.ts 末尾に追加
import { woba, babip, fipCore, fipConstant, kbbPct, type FipLeagueRow } from "@/lib/saber";
import { ipToOuts } from "@/lib/data/normalizers"; // 既存のイニング文字列→アウト数変換

export interface SaberRow {
  label: string;
  display: string;
  pct: number;
  desc: string; // カード内に常時表示する1行解説
}

const hWobaCounts = (r: PlayerSeasonRow) => {
  const h = r.hitting;
  if (!h) return null;
  const { atBats, baseOnBalls, intentionalWalks, hitByPitch, sacFlies, hits, doubles, triples, homeRuns } = h;
  if (atBats === null || baseOnBalls === null || hits === null || doubles === null || triples === null || homeRuns === null) return null;
  return {
    ab: atBats, bb: baseOnBalls, ibb: intentionalWalks ?? 0, hbp: hitByPitch ?? 0, sf: sacFlies ?? 0,
    h: hits, doubles, triples, hr: homeRuns,
  };
};
const hWoba = (r: PlayerSeasonRow) => { const c = hWobaCounts(r); return c ? woba(c) : null; };
const hBabip = (r: PlayerSeasonRow) => parseNumber(r.hitting?.babip); // MLBはCSV値をそのまま使う

const pIp = (r: PlayerSeasonRow) => {
  const outs = ipToOuts(r.pitching?.inningsPitched);
  return outs === null ? null : outs / 3;
};
const pFipCore = (r: PlayerSeasonRow) => {
  const p = r.pitching;
  const ip = pIp(r);
  if (!p || ip === null || p.homeRuns === null || p.baseOnBalls === null || p.strikeOuts === null) return null;
  return fipCore(p.homeRuns, p.baseOnBalls, p.hitBatsmen ?? 0, p.strikeOuts, ip);
};
const pKbbPct = (r: PlayerSeasonRow) => {
  const p = r.pitching;
  if (!p || p.strikeOuts === null || p.baseOnBalls === null || p.battersFaced === null) return null;
  return kbbPct(p.strikeOuts, p.baseOnBalls, p.battersFaced);
};

// プールからFIP定数を計算（er/ipが揃う行のみ集計）
export function poolFipConstant(pool: PlayerSeasonRow[]): number | null {
  const rows: FipLeagueRow[] = [];
  for (const r of pool) {
    const p = r.pitching;
    const ip = pIp(r);
    if (!p || ip === null || p.homeRuns === null || p.baseOnBalls === null || p.strikeOuts === null || p.earnedRuns === null) continue;
    rows.push({ hr: p.homeRuns, bb: p.baseOnBalls, hbp: p.hitBatsmen ?? 0, so: p.strikeOuts, ip, er: p.earnedRuns });
  }
  return fipConstant(rows);
}

const HITTER_SABER_DESCS = {
  woba: "1打席あたりの得点貢献。OPSより正確に打者の総合力を測る",
  babip: "インプレー打球がヒットになった率。極端な高低は運の影響が大きい",
};
const PITCHER_SABER_DESCS = {
  fip: "三振・四球・被本塁打だけで測る投手の実力。守備と運の影響を除いた「本当のERA」",
  kbbPct: "支配力の最短指標。三振で取れて四球を出さない投手ほど高い",
};

// SaberRowビルダー: 各指標のpctは既存computeMetricsと同じmid-rank方式で1回計算
function saberRow(
  label: string, desc: string, target: PlayerSeasonRow, pool: PlayerSeasonRow[],
  accessor: (r: PlayerSeasonRow) => number | null,
  format: (v: number) => string, invert = false,
): SaberRow | null {
  const value = accessor(target);
  if (value === null) return null;
  const poolValues = pool.map(accessor).filter((v): v is number => v !== null);
  if (poolValues.length === 0) return null;
  let pct = percentileOf(poolValues, value);
  if (invert) pct = 1 - pct;
  return { label, display: format(value), pct, desc };
}

export function buildHitterSaber(target: PlayerSeasonRow, pool: PlayerSeasonRow[]): SaberRow[] {
  return [
    saberRow("wOBA", HITTER_SABER_DESCS.woba, target, pool, hWoba, (v) => v.toFixed(3)),
    saberRow("BABIP", HITTER_SABER_DESCS.babip, target, pool, hBabip, (v) => v.toFixed(3)),
  ].filter((r): r is SaberRow => r !== null);
}

export function buildPitcherSaber(target: PlayerSeasonRow, pool: PlayerSeasonRow[]): SaberRow[] {
  const c = poolFipConstant(pool);
  const pFip = (r: PlayerSeasonRow) => {
    const core = pFipCore(r);
    return core === null || c === null ? null : core + c;
  };
  return [
    saberRow("FIP", PITCHER_SABER_DESCS.fip, target, pool, pFip, (v) => v.toFixed(2), true),
    saberRow("K-BB%", PITCHER_SABER_DESCS.kbbPct, target, pool, pKbbPct, (v) => `${(v * 100).toFixed(1)}%`),
  ].filter((r): r is SaberRow => r !== null);
}
```

※`pFipCore`/`pIp`はTask 7（ラック指数のERA−FIP）でも使うため、`pFip`計算に必要な関数はexportしておく（`export function buildPitcherFip(pool)` 形式でも可。実装時にTask 7と齟齬がないよう命名はこのplanに合わせる: `poolFipConstant`をexport、ラック側は`buildPitcherSaber`と同じ手順でFIPを再構成する）。

- [ ] **Step 3: 検証**

Run: `cd ~/mlb-data && npx tsc --noEmit && npx eslint src/lib/metrics.ts src/lib/types.ts src/lib/data/normalizers.ts && node --test src/lib/*.test.mjs`
Expected: エラーなし、既存テスト全pass

- [ ] **Step 4: コミット**

```bash
cd ~/mlb-data && git add -A src/lib && git commit -m "Add saber metric builders (wOBA/BABIP/FIP/K-BB%) to metrics"
```

---

### Task 3: [mlb] セイバーカード表示＋/metrics追記

**Files:**
- Create: `~/mlb-data/src/components/saber-card.tsx`
- Modify: `~/mlb-data/src/app/players/[playerId]/page.tsx`（既存パーセンタイルカードの直後に配置）
- Modify: `~/mlb-data/src/app/metrics/page.tsx`（`#saber`セクション追加）
- Modify: `~/mlb-data/docs/feel-viz.md`（Phase進捗追記）

**Interfaces:**
- Consumes: Task 2の`buildHitterSaber`/`buildPitcherSaber`/`SaberRow`

- [ ] **Step 1: SaberCardコンポーネント作成**

既存`src/components/percentile-bars.tsx`のバー描画（hsl色温度・レイアウト）と`CardHeader`（`src/components/card-header.tsx`）の流儀を踏襲。各行は「ラベル＋値＋パーセンタイルバー」の下に`desc`を小さく常時表示する。mlb-dataはinline style流儀（Tailwind不使用、依存度カードのgridのみ例外）。

```tsx
// src/components/saber-card.tsx
// セイバー指標カード: 値＋リーグ内パーセンタイルバー＋1行解説の3点セット
import type { SaberRow } from "@/lib/metrics";
import { CardHeader } from "@/components/card-header";

export function SaberCard({ title, rows, note, metricHref }: {
  title: string;
  rows: SaberRow[];
  note?: string;
  metricHref?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="card">
      <CardHeader title={title} metricHref={metricHref} note={note} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((r) => (
          <div key={r.label}>
            {/* バー行のレイアウト・色はpercentile-bars.tsxと同一にする（実装時に同ファイルの行描画を参照） */}
            {/* ラベル・display・バー(width=pct*100%)・パーセンタイル値 */}
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

バー行部分は`percentile-bars.tsx`の1行分のJSX・色関数をそのまま使う。色関数が同ファイル内privateの場合はexportして再利用する（コピーしない）。

- [ ] **Step 2: 選手ページに組み込み**

`src/app/players/[playerId]/page.tsx`で既存の`buildHitterViz`/`buildPitcherViz`呼び出し箇所と同じプール変数を使い:

```tsx
const hitterSaber = qualifiedHitter ? buildHitterSaber(row, hitterPool) : [];
const pitcherSaber = qualifiedPitcher ? buildPitcherSaber(row, pitcherPool) : [];
// 既存のPercentileBarsカードの直後:
<SaberCard title="セイバー指標（打撃）" rows={hitterSaber} metricHref="/metrics#saber" />
<SaberCard title="セイバー指標（投球）" rows={pitcherSaber} metricHref="/metrics#saber" />
```

規定未到達者は既存流儀どおり`UnqualifiedNote`側で処理（rows空なら`SaberCard`はnullを返す）。

- [ ] **Step 3: /metricsに#saberセクション追記**

既存セクションと同じカード構造で追加。内容（この文言を基に整形）:
- **wOBA**: 打席結果に得点価値の重みを付けた出塁率系指標。係数はFanGraphs近年版で固定した近似であり、リーグ・年度別の厳密係数ではない
- **BABIP**: `(H−HR)/(AB−SO−HR+SF)`。リーグ平均は約.300前後で、大きな乖離は翌季に平均へ回帰しやすい
- **FIP**: `(13×HR+3×(BB+HBP)−2×SO)/IP + C`。Cは母集団のリーグ平均ERAに合わせて自算。低いほど良い（パーセンタイルは反転）
- **K-BB%**: `(SO−BB)/打者数`。母集団・規定到達しきい値は既存カードと共通

- [ ] **Step 4: 検証**

Run: `cd ~/mlb-data && npx tsc --noEmit && npx eslint src/components/saber-card.tsx "src/app/players/[playerId]/page.tsx" src/app/metrics/page.tsx && node --test src/lib/*.test.mjs`
Expected: エラーなし

- [ ] **Step 5: docs/feel-viz.md更新＋コミット**

feel-viz.mdに「セイバー拡張 Phase 1」セクションを追記（実装内容・検証結果・設計判断）。

```bash
cd ~/mlb-data && git add -A && git commit -m "Add feel-viz saber Phase 1: saber metric cards with inline descriptions"
```

---

### Task 4: [npb] Phase 1移植

**Files:**
- Create: `~/projects/npb-data/src/lib/saber.ts`（Task 1と同一内容）
- Test: `~/projects/npb-data/src/lib/saber.test.mjs`（Task 1と同一内容。importパスのみ確認）
- Modify: `~/projects/npb-data/src/lib/metrics.ts`
- Create: `~/projects/npb-data/src/components/saber-card.tsx`
- Modify: `~/projects/npb-data/src/app/players/[playerId]/page.tsx`、`src/app/metrics/page.tsx`、`docs/feel-viz.md`

**Interfaces:**
- Consumes: mlb-dataのTask 1-3の成果物（ファイルを読んで移植）
- Produces: npb版`buildHitterSaber`/`buildPitcherSaber`（Task 8のラック移植が使用）

- [ ] **Step 1: saber.ts＋テストを移植**

`saber.ts`/`saber.test.mjs`はmlb-dataから無変更コピー（純関数のため）。npbのテスト実行方式は`allowImportingTsExtensions`で`.ts`直接import（既存`src/lib/*.test.*`の流儀を確認して合わせる）。

Run: `cd ~/projects/npb-data && node --test src/lib/saber.test.mjs` → 8/8 pass

- [ ] **Step 2: metrics.tsにNPB版アクセサでビルダー追加**

mlb-dataのTask 2をベースに、NPBのCSVフィールド名で実装。**差分**:
- BABIP: CSVに列がないため自算 `babip(hits, hr, ab, so, sac_flies)`
- FIP: `ip = ip_outs / 3`
- K-BB%: 分母は`batters_faced`
- wOBA: `ab, bb, ibb, hbp, sac_flies, hits, doubles, triples, hr`（すべてCSVに有り）
- 母集団は既存流儀どおり**リーグ内**（呼び出し側が渡すpoolがリーグ絞り込み済みであることを既存コードで確認）

- [ ] **Step 3: SaberCard・ページ組み込み・/metrics追記**

mlb-data Task 3と同構成で移植。npbの/metricsの既存セクション構造に合わせる。BABIPの解説にのみ「NPBは自算（sac_flies使用）」の注記を追加。

- [ ] **Step 4: 検証＋docs＋コミット**

Run: `cd ~/projects/npb-data && npx tsc --noEmit && npx eslint <変更ファイル> && node --test src/lib/*.test.*`
Expected: エラーなし

feel-viz.mdに移植記録を追記してコミット:
```bash
cd ~/projects/npb-data && git add -A && git commit -m "Port feel-viz saber Phase 1 from mlb-data"
```

---

### Task 5: [mlb] プレイヤータイプ判定エンジン

**Files:**
- Create: `~/mlb-data/src/lib/player-types.ts`
- Test: `~/mlb-data/src/lib/player-types.test.mjs`

**Interfaces:**
- Consumes: `percentileOf`（`@/lib/percentile`）、`radarScore`（`@/lib/radar-score`＝水準×均等さ）、Task 2のwOBAアクセサ
- Produces: `export interface TypeBadge { type: string; score: number; fallback: boolean }` / `classifyHitters(pool: PlayerSeasonRow[]): Map<number, TypeBadge[]>` / `classifyPitchers(pool: PlayerSeasonRow[]): Map<number, TypeBadge[]>` / `HITTER_TYPE_NAMES: string[]` / `PITCHER_TYPE_NAMES: string[]`（キーは`player_id`）

**メカニズム（nba-data `src/lib/data/player-types.ts` の移植）:** 特徴量をプール内パーセンタイル化 → 各タイプのstyle値をz標準化 → z≥1.0を最大3バッジ（なければ最上位1つ`fallback: true`）。scoreは職務パーセンタイル平均。判定と評価は分離。

- [ ] **Step 1: 失敗するテストを書く（選抜ロジックの検証）**

```js
// src/lib/player-types.test.mjs
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
```

- [ ] **Step 2: テスト失敗を確認**

Run: `cd ~/mlb-data && node --test src/lib/player-types.test.mjs` → FAIL

- [ ] **Step 3: 実装**

nba-data `~/nba-data/src/lib/data/player-types.ts:141-161` の選抜部を`pickBadges`として分離実装し、その上に野球版TYPE_DEFSを構築:

```ts
// 選抜ロジック（テスト対象・純関数）
export interface TypeCandidate { name: string; z: number; score: number }
export interface TypeBadge { type: string; score: number; fallback: boolean }

export function pickBadges(cand: TypeCandidate[]): TypeBadge[] {
  const sorted = [...cand].sort((a, b) => b.z - a.z);
  const picked = sorted.filter((c) => c.z >= 1.0).slice(0, 3);
  const isFallback = picked.length === 0;
  return (isFallback ? [sorted[0]] : picked)
    .map((c) => ({ type: c.name, score: c.score, fallback: isFallback }))
    .sort((a, b) => b.score - a.score);
}
```

**打者の特徴量**（プール内パーセンタイル化。アクセサはmetrics.tsの既存関数を再利用・不足分は追加）:
`iso, hrRate(HR/PA), avg, kLow(K%反転=1−pct), sbAttempt((SB+CS)/G), tripleRate(3B/PA), bbPct, bbK, rbiRate(RBI/PA), obp, slg, woba, sb, sbSuccess(SB/max(SB+CS,1)), runs, hits, rbi`

**打者TYPE_DEFS**（spec準拠・6種）:

```ts
const HITTER_TYPE_DEFS = [
  { name: "パワーヒッター", style: (g) => mean(g("iso"), g("hrRate")), score: (g) => mean(g("slg"), g("hr"), g("woba")) },
  { name: "安打製造機", style: (g) => mean(g("avg"), g("kLow")), score: (g) => mean(g("avg"), g("obp"), g("hits")) },
  { name: "スピードスター", style: (g) => mean(g("sbAttempt"), g("tripleRate")), score: (g) => mean(g("sb"), g("sbSuccess"), g("runs")) },
  { name: "選球の達人", style: (g) => mean(g("bbPct"), g("bbK")), score: (g) => mean(g("obp"), g("bbPct"), g("woba")) },
  { name: "ポイントゲッター", style: (g) => g("rbiRate"), score: (g) => mean(g("rbi"), g("slg"), g("woba")) },
  // オールラウンダー: styleは生値（radarScore=5ツールpctの水準×均等さ）、scoreはそのプール内pct
  { name: "オールラウンダー", style: versatRaw, score: (g) => g("versat") },
];
```

`versatRaw = (g) => radarScore([g("avg"), g("obp"), g("iso"), g("sb"), g("bbK")])`。派生特徴`versat`のパーセンタイル化はnba-dataの`DERIVED`パターン（`~/nba-data/src/lib/data/player-types.ts:42-46,134-139`）をそのまま踏襲。

**投手の特徴量**: `k9, bb9Low(反転), ip(アウト数), gs(先発数), cg(完投), sv, hld, eraLow(反転), whipLow(反転), kbbPct, kbb, hr9Low(反転), goAo(groundOutsToAirouts)`

**投手TYPE_DEFS**（5種＋MLB専用1種）:

```ts
const PITCHER_TYPE_DEFS = [
  { name: "ドクターK", style: (g) => g("k9"), score: (g) => mean(g("k9"), g("kbbPct"), g("eraLow")) },
  { name: "精密機械", style: (g) => g("bb9Low"), score: (g) => mean(g("bb9Low"), g("whipLow"), g("kbb")) },
  { name: "ワークホース", style: (g) => mean(g("ip"), g("gs"), g("cg")), score: (g) => mean(g("ip"), g("eraLow"), g("whipLow")) },
  { name: "守護神", style: (g) => g("sv"), score: (g) => mean(g("sv"), g("eraLow"), g("kbbPct")) },
  { name: "中継ぎの柱", style: (g) => g("hld"), score: (g) => mean(g("hld"), g("eraLow"), g("whipLow")) },
  { name: "グラウンドボーラー", style: (g) => g("goAo"), score: (g) => mean(g("goAo"), g("hr9Low"), g("eraLow")) }, // MLBのみ。npb移植時は除外
];
```

母集団: 既存の規定到達者（打者PA≥30・投手アウト≥30）。**実装後、実データ分布でバッジ付与率を確認**（全員fallback・特定タイプ0人などの破綻がないか）し、破綻時はしきい値でなくstyle定義を見直す（nba-dataと同じ調整方針）。反転特徴（kLow等）は「1−pct」をパーセンタイル値として格納する。

- [ ] **Step 4: テストpass確認＋実データ検分**

Run: `cd ~/mlb-data && node --test src/lib/player-types.test.mjs && npx tsc --noEmit`

実データ検分用の一時スクリプトで各タイプの該当人数・上位3人を出力し、目視で妥当性確認（結果はfeel-viz.mdの設計判断に記録）。

- [ ] **Step 5: コミット**

```bash
cd ~/mlb-data && git add src/lib/player-types.ts src/lib/player-types.test.mjs && git commit -m "Add player type classification engine (6 hitter / 6 pitcher types)"
```

---

### Task 6: [mlb] タイプバッジ表示＋/typesページ

**Files:**
- Create: `~/mlb-data/src/components/type-badges.tsx`
- Create: `~/mlb-data/src/app/types/page.tsx`
- Modify: `~/mlb-data/src/app/players/[playerId]/page.tsx`（プロフィール直下にバッジ表示）
- Modify: ナビゲーション（既存のMetricsリンクと同じ場所にTypes追加）
- Modify: `~/mlb-data/docs/feel-viz.md`

**Interfaces:**
- Consumes: Task 5の`classifyHitters`/`classifyPitchers`/`TypeBadge`

- [ ] **Step 1: TypeBadgesコンポーネント**

nba-dataの選手ページ「プレイヤータイプ」表示（`~/nba-data/src/app/players/[playerId]/page.tsx:83`周辺）を参考に、バッジ（タイプ名＋評価点0-100表示）を横並び。fallbackバッジは「参考」注記付きの控えめ表示。

- [ ] **Step 2: /typesページ**

nba-data `src/app/types/page.tsx`の構成を野球版に翻訳: 各タイプの判定基準の解説（やや詳しめ・新feel-viz表現のため）＋タイプ別リーダーボード（評価点順トップ10、fallback除外）。打者/投手セクション分割。

- [ ] **Step 3: 選手ページにバッジ組み込み＋ナビにTypes追加**

- [ ] **Step 4: 検証＋docs＋コミット**

Run: `cd ~/mlb-data && npx tsc --noEmit && npx eslint <変更ファイル> && node --test src/lib/*.test.mjs`

```bash
cd ~/mlb-data && git add -A && git commit -m "Add feel-viz saber Phase 2a: player type badges and /types page"
```

---

### Task 7: [mlb] ラック指数（風向きメーター）

**Files:**
- Create: `~/mlb-data/src/lib/luck.ts`
- Test: `~/mlb-data/src/lib/luck.test.mjs`
- Create: `~/mlb-data/src/components/luck-meter.tsx`
- Modify: `~/mlb-data/src/app/players/[playerId]/page.tsx`、`src/app/metrics/page.tsx`（`#luck`セクション）、`docs/feel-viz.md`

**Interfaces:**
- Consumes: Task 2の`poolFipConstant`とFIP再構成、metrics.tsのBABIPアクセサ
- Produces: `export interface LuckResult { delta: number; direction: "tail" | "head" | "neutral"; label: string }` / `hitterLuck(babipValue: number, leagueAvg: number): LuckResult` / `pitcherLuck(era: number, fip: number): LuckResult`

- [ ] **Step 1: 失敗するテストを書く**

```js
// src/lib/luck.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

import { hitterLuck, pitcherLuck } from "./luck.ts";

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
```

- [ ] **Step 2: 失敗確認 → Step 3: 実装**

```ts
// src/lib/luck.ts
// ラック指数: 期待値との乖離を「追い風/向かい風」に翻訳する。判定文は控えめ表現（〜の可能性）
export interface LuckResult {
  delta: number;
  direction: "tail" | "head" | "neutral"; // tail=追い風（実績が出来すぎ）
  label: string;
}

function classify(delta: number, mild: number, strong: number, tailText: string, headText: string): LuckResult {
  const abs = Math.abs(delta);
  if (abs < mild) return { delta, direction: "neutral", label: "平年並み。実力どおりの成績と見てよさそう" };
  const strengh = abs >= strong ? "かなり" : "やや";
  return delta > 0
    ? { delta, direction: "tail", label: `${strengh}${tailText}` }
    : { delta, direction: "head", label: `${strengh}${headText}` };
}

// 打者: BABIP − リーグ平均。正=追い風（インプレー打球が平均より多く安打に）
export function hitterLuck(babipValue: number, leagueAvg: number): LuckResult {
  return classify(babipValue - leagueAvg, 0.015, 0.04,
    "追い風。好調の一部は運の上振れの可能性",
    "向かい風。実力より低い成績に見えている可能性");
}

// 投手: ERA − FIP。正=向かい風（FIPが示す実力より失点が多い）
export function pitcherLuck(era: number, fip: number): LuckResult {
  const r = classify(era - fip, 0.3, 0.7,
    "向かい風。守備や残塁運に恵まれていない可能性",
    "追い風。ERAの良さの一部は運や守備の助けの可能性");
  // 投手は正=向かい風なのでdirectionを反転
  return { ...r, direction: r.direction === "tail" ? "head" : r.direction === "head" ? "tail" : "neutral" };
}
```

※テストのdirection期待値と整合するよう実装する（投手は`era−fip`正で`head`）。

- [ ] **Step 4: LuckMeterコンポーネント（純SVG横メーター）**

中央=平均、左=向かい風・右=追い風。deltaを表示レンジ（打者±0.06、投手±1.2）でクランプしてマーカー配置。カード内解説は**やや厚め**（新feel-viz表現のため）:
- 打者版: 「BABIP（インプレー打球の安打率）のリーグ平均との差。プラスは追い風=打球が平均より多くヒットになっている。**俊足や強い打球など実力でBABIPが高い選手もいるため、乖離のすべてが運ではない**」
- 投手版: 「ERAとFIP（守備と運を除いた実力値）の差。ERAがFIPより悪ければ向かい風=実力より打たれて見えている」

- [ ] **Step 5: 選手ページ組み込み＋/metrics#luck追記**

リーグ平均BABIPはプールから自算（規定打者のBABIP平均）。規定未到達者は非表示。

- [ ] **Step 6: 検証＋docs＋コミット**

Run: `cd ~/mlb-data && npx tsc --noEmit && npx eslint <変更ファイル> && node --test src/lib/*.test.mjs`

```bash
cd ~/mlb-data && git add -A && git commit -m "Add feel-viz saber Phase 2b: luck meter (BABIP deviation / ERA-FIP gap)"
```

---

### Task 8: [npb] Phase 2移植

**Files:**
- Create: `~/projects/npb-data/src/lib/player-types.ts`＋test、`src/lib/luck.ts`＋test、`src/components/type-badges.tsx`、`src/components/luck-meter.tsx`、`src/app/types/page.tsx`
- Modify: 選手ページ・ナビ・/metrics・`docs/feel-viz.md`

**Interfaces:**
- Consumes: mlb-data Task 5-7の成果物

- [ ] **Step 1: player-types移植（差分適用）**

差分: グラウンドボーラー除外（投手5種）、母集団はリーグ内、特徴量アクセサはNPBフィールド名（`gs`=先発数が無い場合は`games`と`complete_games`で代替を検討し、feel-viz.mdに判断を記録。NPBのCSVは`ip, games, complete_games, saves, holds`等）。`radarScore`相当はnpb既存の`stat-radar`実装から流用（無ければmlbの`radar-score.ts`をコピー＋テスト）。

- [ ] **Step 2: luck移植**

`luck.ts`/`luck.test.mjs`は無変更コピー。組み込み側: リーグ平均BABIPは**リーグ内**規定打者から自算。

- [ ] **Step 3: /types・バッジ・メーター・/metrics組み込み**

mlb-dataのUIを npbのinline style流儀そのままで移植（両リポとも同流儀）。

- [ ] **Step 4: 検証＋docs＋コミット**

Run: `cd ~/projects/npb-data && npx tsc --noEmit && npx eslint <変更ファイル> && node --test src/lib/*.test.*`

```bash
cd ~/projects/npb-data && git add -A && git commit -m "Port feel-viz saber Phase 2 from mlb-data (types + luck meter)"
```

---

### Task 9: [mlb] Statcast PoC＋取得スクリプト

**Files:**
- Create: `~/mlb-data/scripts/fetch-statcast.py`
- Create: `~/mlb-data/data/statcast_hitting.csv` / `data/statcast_pitching.csv`（スクリプト実行結果）
- Modify: `~/mlb-data/docs/feel-viz.md`（PoC結果・運用方式の決定を記録）

**Interfaces:**
- Produces: `data/statcast_hitting.csv`（列: `player_id, player_name, year, xwoba, xba, xslg, exit_velocity_avg, barrel_batted_rate, hard_hit_percent, sprint_speed`）/ `data/statcast_pitching.csv`（列: `player_id, player_name, year, xwoba, exit_velocity_avg, barrel_batted_rate, whiff_percent, chase_percent`）— Task 10のローダーが使用

- [ ] **Step 1: PoC — エンドポイント確認（⚠️サンドボックス制限）**

**このステップのcurlはサンドボックスのネットワーク許可外のため、別ターミナルでユーザーが実行するか、baseballsavant.mlb.comへの接続許可を得て実行する。**

候補URL（実レスポンスを見てパラメータ調整）:
```bash
# 打者: カスタムリーダーボードCSV
curl -sL "https://baseballsavant.mlb.com/leaderboard/custom?year=2026&type=batter&min=q&selections=xwoba,xba,xslg,exit_velocity_avg,barrel_batted_rate,hard_hit_percent&csv=true" | head -3
# スプリントスピード
curl -sL "https://baseballsavant.mlb.com/leaderboard/sprint_speed?year=2026&min=10&csv=true" | head -3
# 投手
curl -sL "https://baseballsavant.mlb.com/leaderboard/custom?year=2026&type=pitcher&min=q&selections=xwoba,exit_velocity_avg,barrel_batted_rate,whiff_percent,chase_percent&csv=true" | head -3
```

確認事項: ①CSVが返るか ②`player_id`列（MLBAM ID）があるか ③`min=q`（規定到達）の母集団数。**結果をfeel-viz.mdに記録**。

- [ ] **Step 2: fetch-statcast.py実装**

既存`scripts/fetch-mlb-data.py`の流儀（requests・リトライ・保存先`data/`）を踏襲。PoCで確定したURL3本を取得し、打者2ソース（custom＋sprint_speed）は`player_id`でマージして`statcast_hitting.csv`に、投手は`statcast_pitching.csv`に保存。取得0行・HTTPエラー時は既存CSVを上書きせずexit 1。

- [ ] **Step 3: GitHub Actions組み込み可否の判断**

既存のデイリーworkflowにステップ追加を試し、CI環境から取得できるか1回実行して確認。**ブロックされる場合はワークフローに入れず「ローカル手動実行＋コミット」運用**とし、feel-viz.mdに運用手順を記録（nba-dataのdata/shots/と同方式）。

- [ ] **Step 4: データコミット**

```bash
cd ~/mlb-data && git add scripts/fetch-statcast.py data/statcast_*.csv docs/feel-viz.md && git commit -m "Add Statcast fetch script and initial data (PoC verified)"
```

---

### Task 10: [mlb] フィジカルカード

**Files:**
- Create: `~/mlb-data/src/lib/data/statcast.ts`（CSVローダー。既存`loaders.ts`流儀）
- Create: `~/mlb-data/src/components/physical-card.tsx`
- Modify: `~/mlb-data/src/app/players/[playerId]/page.tsx`、`src/app/metrics/page.tsx`（`#statcast`）、`docs/feel-viz.md`

**Interfaces:**
- Consumes: Task 9のCSV
- Produces: `getStatcastHitting(): Map<number, StatcastHitting>` / `getStatcastPitching(): Map<number, StatcastPitching>`（Task 11のラック強化が使用）

- [ ] **Step 1: ローダー実装**

CSVファイルが無い場合は空Mapを返す（**カード非表示でサイトを壊さない**）。型は Task 9のProduces列に対応。

- [ ] **Step 2: PhysicalCard実装**

SaberCard（Task 3）と同構造のパーセンタイルバー＋1行解説。母集団=Statcast CSV内の全選手。
- 打者: 平均打球速度・最大打球速度→CSVに無ければ平均のみ・Barrel%・HardHit%・スプリントスピード
- 投手: 被打球速度(反転)・被Barrel%(反転)・Whiff%・Chase%
- 1行解説例: Barrel%「理想的な速度と角度の打球の割合。長打の源泉」、Whiff%「スイングのうち空振りさせた割合」

- [ ] **Step 3: ページ組み込み＋/metrics#statcast追記＋検証＋docs＋コミット**

Run: `cd ~/mlb-data && npx tsc --noEmit && npx eslint <変更ファイル> && node --test src/lib/*.test.mjs`

```bash
cd ~/mlb-data && git add -A && git commit -m "Add feel-viz saber Phase 3a: Statcast physical cards"
```

---

### Task 11: [mlb] ラック指数のxwOBA強化

**Files:**
- Modify: `~/mlb-data/src/lib/luck.ts`（`hitterLuckX`追加）
- Modify: `~/mlb-data/src/lib/luck.test.mjs`
- Modify: `~/mlb-data/src/app/players/[playerId]/page.tsx`（xwOBAがあればX版、なければBABIP版に自動フォールバック）
- Modify: `src/app/metrics/page.tsx`、`docs/feel-viz.md`

**Interfaces:**
- Consumes: Task 10の`getStatcastHitting`、Task 2の`hWoba`相当

- [ ] **Step 1: テスト追加 → Step 2: 実装**

```ts
// 打者X版: wOBA実測 − xwOBA（打球の質からの期待値）。正=追い風（出来すぎ）
export function hitterLuckX(wobaActual: number, xwoba: number): LuckResult {
  return classify(wobaActual - xwoba, 0.01, 0.025,
    "追い風。打球の質から期待される以上の結果が出ている可能性",
    "向かい風。打球の質の割に結果が出ていない可能性");
}
```

テスト: `hitterLuckX(0.360, 0.340).direction === "tail"` / `hitterLuckX(0.320, 0.350).direction === "head"` / 閾値境界。

- [ ] **Step 3: ページ側フォールバック組み込み**

```tsx
const sc = getStatcastHitting().get(playerIdNum);
const wobaActual = hWobaValue; // Task 2のアクセサ値
const luck = sc?.xwoba != null && wobaActual != null
  ? hitterLuckX(wobaActual, sc.xwoba)
  : babipValue != null ? hitterLuck(babipValue, leagueAvgBabip) : null;
```

メーターのカード解説はX版/BABIP版で文言を切り替え（どちらの計算かを明示）。

- [ ] **Step 4: 検証＋/metrics更新＋docs＋コミット**

```bash
cd ~/mlb-data && git add -A && git commit -m "Add feel-viz saber Phase 3b: xwOBA-based luck meter with BABIP fallback"
```

---

## タスク依存関係

```
Task 1 → 2 → 3 → 4(npb)
Task 2 → 5 → 6 ─┐
Task 2 → 7 ──────┴→ 8(npb)
Task 9 → 10 → 11
```

Task 4はTask 3完了後いつでも可。Task 9-11（Statcast）はTask 1-8と独立して着手可能だが、PoC（ユーザー実行が必要）の待ち時間を考慮し、Task 5-8と並行で依頼しておくのが効率的。

## 各タスク共通の完了条件

1. `npx tsc --noEmit` エラーなし
2. `npx eslint <変更ファイル>` エラーなし
3. `node --test src/lib/*.test.mjs`（npbは既存流儀の拡張子）全pass
4. コミット済み
5. Phase完了タスク（3, 4, 7, 8, 11）は`docs/feel-viz.md`更新を含む

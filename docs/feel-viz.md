# MLB feel-viz — 指標・ビジュアル表現の追加プラン兼進捗記録

nba-data の feel-viz と同じ流儀で、mlb-data に「体感でわかる」指標とビジュアル表現を追加する。

## 方針（nba-data feel-viz を踏襲）

- すべてサーバーコンポーネント＋純CSS/SVGで描画する。クライアントJS・チャートライブラリは追加しない（recharts は依存に入っているが使わない）
- 既存の `data/*.csv` のみ使用する。新規データ取得はしない
- フェーズごとに「実装 → typecheck/build/test 検証 → 本ドキュメント更新 → コミット」を繰り返す
- コミットは `Add feel-viz Phase N: ...` → レビュー修正があれば `Fix feel-viz Phase N review findings: ...`

## データ前提

- 率系スタッツ（avg/obp/slg/ops/era/whip 等）はCSVで文字列（`.353` 形式）。`Number()` で数値化可能
- 規定到達判定は既存の `isQualifiedHitter`（PA≥30）/ `isQualifiedPitcher`（アウト数≥30）を再利用する
- イニング文字列（`"6.2"`）は既存 `ipToOuts` で換算する
- 熱戦指数（リードチェンジ）相当は play-by-play が必要なため今回のスコープ外（将来: `game/{gamePk}/feed/live` の過去分取得）

## 指標定義

### 打者（母集団: 規定打者 = PA≥30、シーズン単位）

| 指標 | 計算 |
|---|---|
| League Percentile | mid-rank 方式 `(下位数 + 同値数/2) / 母集団数`。対象: AVG, OBP, SLG, OPS, HR, SB, BB%(=BB/PA), K%(=SO/PA・反転), ISO(=SLG−AVG) |
| 5ツールレーダー | ミート(AVG)・出塁(OBP)・長打(ISO)・走塁(SB)・選球(BB/K) の5部門パーセンタイル。総合スコア = 平均×(1−標準偏差) |
| 塁打構成ワッフル | 単打×1 / 二塁打×2 / 三塁打×3 / 本塁打×4 の塁打シェアを100マスで表示（整数丸め＋端数調整で合計100を保証） |

### 投手（母集団: 規定投手 = アウト数≥30、シーズン単位）

| 指標 | 計算 |
|---|---|
| League Percentile | 対象: ERA(反転), WHIP(反転), K/9, BB/9(反転), HR/9(反転), 被打率(反転), K/BB |
| 投手レーダー | 奪三振(K/9)・制球(BB/9反転)・被打抑制(被打率反転)・一発回避(HR/9反転)・走者管理(WHIP反転) の5部門パーセンタイル |

### チーム

| 指標 | 計算 |
|---|---|
| Season Heartbeat | schedule.csv の Final 試合から `自チーム得点−相手得点` を時系列バーで表示。±10点でキャップ |
| 打点依存度（Gini/Lorenz） | チーム内打者（PA≥30）のRBI分布のGini係数＋Lorenz曲線 |

### リーグ横断（/players ページ）

| 指標 | 計算 |
|---|---|
| 打者マップ（OBP×SLG） | 規定打者の散布図。中央値クロスで4象限（偶数個は中間2値平均） |
| 投手マップ（K/9×BB/9） | 規定投手の散布図。中央値クロス。右下（K/9高×BB/9低）が優秀象限 |

## 実装フェーズ

### Phase 1: パーセンタイルバー + Season Heartbeat ✅

- [x] `src/lib/percentile.ts` — mid-rank `percentileOf` ＋テスト（4ケース）
- [x] `src/components/percentile-bars.tsx` — 純CSS横バー（hsl色温度: 低=青→高=赤）
- [x] `/players/[playerId]` に打者/投手の League Percentile カード（規定未到達者は注記のみ表示）
- [x] `src/components/season-heartbeat.tsx` — 純SVGバー列＋`<title>`ツールチップ
- [x] `/teams/[teamId]` に Season Heartbeat カード
- 検証: `npm run typecheck` / `npm run build` / `node --test src/lib/*.test.mjs`

### Phase 2: レーダー + ワッフル + Gini/Lorenz + 象限マップ ✅

- [x] `src/components/stat-radar.tsx` — 汎用5角形SVGレーダー（打者/投手で共用）
- [x] `/players/[playerId]` に5ツールレーダー（打者）/ 投手レーダー＋総合スコア
- [x] `src/components/total-bases-waffle.tsx` — 100マスCSS grid
- [x] `src/lib/gini.ts` — Gini係数＋テスト、`src/components/lorenz-curve.tsx` — 純SVG
- [x] `/teams/[teamId]` に打点依存度カード（規定打者3人未満なら非表示）
- [x] `src/components/quadrant-map.tsx` — 純SVG散布図（中央値クロス）
- [x] `/players` の打撃タブに打者マップ、投球タブに投手マップ
- 検証: 同上

### Phase 3: /metrics 解説ページ

- [ ] `src/app/metrics/page.tsx` — 全指標の定義・母集団・注意点の解説カード
- [ ] 各指標カードのタイトルから `/metrics` 該当セクションへのリンク
- [ ] README.md 更新（機能一覧に feel-viz を追記）
- 検証: 同上

### 将来スコープ（今回はやらない）

- 熱戦指数（過去試合の play-by-play 取得が必要）
- Statcast 系指標（打球速度・角度、Baseball Savant）
- 守備ビジュアル（rangeFactor 等はデータ有り、需要を見て）

## 進捗記録

### Phase 1（2026-07-05）

**実装**: `percentileOf`（mid-rank）＋テスト4件、`PercentileBars`（純CSS・hsl色温度）、選手詳細ページに打者9指標/投手7指標の League Percentile カード、`SeasonHeartbeat`（純SVG・±10点キャップ・`<title>`ツールチップ）をチームページに追加。

**検証結果**: typecheck ✅ / build ✅（全8ルート）/ node --test 14/14 pass ✅。dev サーバーで `/players/669016`（AVG .353 = リーグ最高値 → pct 100）と `/teams/143` のレンダリングを実確認。

**設計判断**:
- mlb-data は Tailwind ユーティリティ未使用（`.card`＋inline style 流儀）のため、nba-data と違い inline style で実装
- `PitchingStats` に被打率（`avg`）が未パースだったため `types.ts`/`normalizers.ts` に追加
- 移籍による同一選手複数行は現状データに0件（実データ確認済み）→ dedup 未実装、発生時は PA/アウト数最大行を採用する方針をコメントに記載
- パーセンタイル母集団は `mergePlayerStatsBySeason` の season 絞り込み済み出力を再利用（同シーズンの規定到達者のみ）
- `schedule.csv` に season 列が無いため Season Heartbeat はシーズン非依存（現状1シーズンのみで実害なし。複数シーズン化したら要対応）

### Phase 2（2026-07-05）

**実装**: `StatRadar`（汎用5角形SVGレーダー、総合スコア=平均×(1−標準偏差) は `src/lib/radar-score.ts` に分離しテスト4件）、選手詳細に5ツールレーダー（ミート/出塁/長打/走塁/選球）と投手レーダー（奪三振/制球/被打抑制/一発回避/走者管理）、`TotalBasesWaffle`（塁打構成100マス、端数調整で合計100保証）、`src/lib/gini.ts`＋`LorenzCurve` でチームページに打点依存度カード、`QuadrantMap`（中央値クロス散布図）で /players 打撃タブに OBP×SLG・投球タブに BB/9×K/9 マップ。

**検証結果**: typecheck ✅ / build ✅ / node --test 22/22 pass ✅（gini 4件・radar-score 4件追加）。本番ビルドで `/players/669016`（レーダー aria-label「ミート 100, 出塁 88, 長打 55, 走塁 61, 選球 15」・ワッフル描画）、`/teams/143`（Gini＋Lorenz）、`/players` 両タブ（マップ描画）を実確認。

**設計判断**:
- `radarScore` は node --test が `.tsx` を実行できないため `src/lib/radar-score.ts` に分離
- BB/K は分母0対策で `baseOnBalls / max(strikeOuts, 1)` に母集団全体で統一
- Percentile カードとレーダーで指標アクセサ（`hm`/`pm`）を共有しリファクタ（重複計算を排除）
- サブエージェント実装後のレビューで未使用 export（`radarScore` の re-export と page 側 import）を削除

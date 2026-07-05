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

### Phase 3: /metrics 解説ページ ✅

- [x] `src/app/metrics/page.tsx` — 全指標の定義・母集団・注意点の解説カード（6セクション、アンカー付き）
- [x] 各指標カードのタイトルから `/metrics` 該当セクションへのリンク（`MetricLink`）
- [x] ナビゲーションに Metrics リンク追加
- [x] README.md 更新（機能一覧に feel-viz を追記、Compare の「チャート」記述の乖離を修正）
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

### Phase 3（2026-07-05）

**実装**: `/metrics` 解説ページ（percentile/radar/waffle/gini/heartbeat/quadrant の6セクション、各カードに表示場所・何がわかるか・計算方法・母集団・注意点。mid-rank 方式と反転指標の説明含む）。`MetricLink`（lucide-react CircleHelp、既存依存を再利用）を全指標カードのタイトル横に設置——タイトルを内包する `PercentileBars`/`StatRadar`/`TotalBasesWaffle` には optional `metricHref` prop を追加、見出しが page 側にあるもの（Heartbeat/Gini/マップ）は page に直接設置。ナビに Metrics 追加。README の機能一覧を更新し、Compare の「テーブル+チャート」という実装乖離記述を「テーブル」に修正。

**検証結果**: typecheck ✅ / build ✅（`/metrics` は Static でプリレンダー）/ node --test 22/22 pass ✅。本番サーバーで `/metrics` の6アンカー、選手ページの `#percentile`/`#radar`/`#waffle` リンク、チームページの `#heartbeat`/`#gini` リンク、ナビの Metrics を実確認。

**設計判断**:
- `/metrics` に page-level metadata を付けない（このリポジトリは layout.tsx のみで設定する流儀のため）
- アンカーへのスクロール余白は inline `scrollMarginTop: 72`（ナビ高56px + 余白）

## 完了サマリー

全3フェーズ完了（2026-07-05）。追加されたビジュアル:

| 場所 | ビジュアル |
|---|---|
| /players/[id] | League Percentile バー（打者9・投手7指標）、5ツールレーダー、投手レーダー、塁打構成ワッフル |
| /teams/[id] | Season Heartbeat（得失点差バー）、打点依存度（Gini/Lorenz） |
| /players | 打者マップ（OBP×SLG）、投手マップ（BB/9×K/9） |
| /metrics | 全指標の解説ページ（各カードからリンク） |

コミット: Phase 1 `40a3442` / Phase 2 `521a386` / Phase 3 は本ドキュメント更新と同一コミット。

### レビュー修正（2026-07-05）

Phase 1-3 のコードレビュー指摘を修正。

- **欠損値の0扱いを廃止**: 打者/投手の指標アクセサが `?? 0` でCSV欠損を0扱いしていたため、欠損選手が最下位/最上位パーセンタイルとして誤表示されていた。アクセサを `number | null` に変更し、値がnullの指標は行/軸ごとにスキップするようにした（`src/lib/metrics.ts` に集約）
- **象限マップの0デフォルトを除外**: `/players` の打者/投手マップで OBP/SLG・BB9/K9 が欠損の選手を0扱いせず、座標そのものから除外するよう変更（1件の欠損行が軸範囲・中央値を歪めていた問題を解消）
- **Final試合のスコア欠損を除外**: `/teams/[id]` の Season Heartbeat で `home_score`/`away_score` が欠損のFinal試合を、得点差0＝敗戦として誤表示していたのを除外するよう修正
- **パーセンタイル計算の重複排除**: League Percentileカードとレーダーで指標定義（ラベル・アクセサ・表示・反転フラグ）を `src/lib/metrics.ts` に統一し、各指標のパーセンタイルを1回だけ計算するようにリファクタ
- **カード見出しの共通化**: `CardHeader`（`src/components/card-header.tsx`）を追加し、7箇所で重複していたタイトル+MetricLink+補足文を統一
- **未使用propsの削除**: `QuadrantMap` の `invertX`/`invertY`、`StatRadar` の `score`（いずれも呼び出し側で未使用）を削除
- **規定到達しきい値の定数化**: `HITTER_QUALIFY_PA`/`PITCHER_QUALIFY_OUTS` を `normalizers.ts` からexportし、全ページ・/metrics のプロース文言で補間
- **指標項目数の定数化**: `/metrics` の「打者9項目・投手7項目」等の記述を `src/lib/metrics.ts` の指標定義から導出するよう変更

**検証結果**: typecheck ✅ / build ✅ / node --test 22/22 pass ✅。

### 最終ビジュアル確認（2026-07-05）

デスクトップ(1440px)・モバイル(390px)の実スクリーンショット（headless Chrome / Playwright）で全ページを目視確認し、以下を修正。

- **カード見出しが本文サイズに潰れていた**: Tailwind preflight が h1-h6 を font-size: inherit にリセットするため、指標カードの h2 が14px相当で表示されていた → `globals.css` に `.card h2 { font-size: 20px; font-weight: 700 }` を一括追加（StatGrid「Hitting」等の既存カード見出しも同時に改善）
- **レーダーが小さい**: maxWidth 260→400（SVGなので軸ラベルも比例拡大）
- **塁打構成ワッフルが小さい**: マス 14px→20px、gap 2→3
- **ローレンツ曲線**: maxWidth 320→400
- **モバイル(390px)で横はみ出し**: /players（象限マップ minWidth 480）と /teams（Heartbeat minWidth 560）でページ全体が横に伸びていた。両者とも overflowX:auto で包んであったが、grid アイテムの min-width:auto が効いて突き抜けていた → `.card { min-width: 0 }` で一括解消（Playwright 実測で全5ページ scrollWidth=390 を確認）

検証: typecheck ✅ / build ✅ / 22/22 pass ✅ / 修正後の 1440px・390px スクリーンショットで目視確認。

**再レビュー（同日）**: 修正10件の適用を全件確認。1件の主張と実装の乖離を検出・修正——「パーセンタイルはバーとレーダーで1回だけ計算」とされていたが、実際は `buildHitterPctRows`/`buildHitterRadarAxes` が別々に `computeMetrics` を呼び2回計算していた。4つの個別ビルダーを `buildHitterViz`/`buildPitcherViz`（bars+radar を1回の computeMetrics から返す）に統合して解消。再検証: typecheck ✅ / build ✅ / 22/22 pass ✅ / 本番サーバーでレーダー値が修正前と同一であることを実確認。

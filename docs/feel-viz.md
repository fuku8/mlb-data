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
| 得点関与依存度（Gini/Lorenz） | チーム内打者（PA≥30）の `R+RBI−HR`（Runs Produced、本塁打の二重計上を補正）分布のGini係数＋Lorenz曲線。※当初はRBI単独だったが、中軸スラッガー依存を過大評価し先頭打者型の貢献を無視するため Phase 4 で変更 |
| イニング依存度（Gini/Lorenz） | チーム内投手（アウト数≥9=3イニング）の投球アウト数分布のGini係数＋Lorenz曲線。高い=少数の投手にイニング集中 |

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

### Phase 4: playerPool=all + 依存度カード刷新 ✅

- [x] `scripts/fetch-mlb-data.py` に `playerPool=all` 追加（規定到達者のみ→全選手取得。投手63→728行、打者154→647行、守備231→2234行）
- [x] 打点依存度カードを「得点関与依存度」（R+RBI−HR の Gini）に変更
- [x] 「イニング依存度」カード新設（アウト数≥9 の投手の投球アウト数 Gini＋Lorenz、3人未満なら非表示）
- [x] PC画面（lg以上）で2つの依存度カードを横並び（`grid gap-4 lg:grid-cols-2`。この箇所のみTailwindユーティリティ使用）
- [x] `/metrics` の #gini セクションを両カード対応に更新
- 検証: 同上＋1440px スクリーンショットで横並び・390px で scrollWidth=390 を確認

### 将来スコープ（今回はやらない）

- 熱戦指数（過去試合の play-by-play 取得が必要）
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

### Phase 4（2026-07-05）

**背景（実データ検証）**: RBI単独のGiniは中軸スラッガー依存を過大評価する（例: Orioles は Alonso のRBI集中でリーグ2位の高依存に見えるが、R+RBI にすると得点側で貢献する Ward らが反映され順位が23位分下がる。Gini平均変化量0.045）。投手側は当時のCSVが規定投球回到達者63人のみで分布指標が計算不能 → API の `playerPool=all` で全728投手が取れることを確認し、投球アウト数Giniがチーム間で0.33〜0.49に分布する（=指標として機能する）ことを事前検証した上で実装。

**実装**: fetch に `playerPool=all`、得点関与依存度（R+RBI−HR）、イニング依存度（アウト≥9、ローカル定数 `INNINGS_DEPENDENCY_MIN_OUTS=9`。規定投手の30アウトとは意図的に別）、PC横並びレイアウト、/metrics 更新。

**検証結果**: typecheck ✅ / build ✅ / 22/22 pass ✅。`/teams/143` 実測: 得点関与依存度 0.348・イニング依存度 0.454（投手21人）。1440px スクリーンショットで横並びを目視確認、390px で scrollWidth=390（はみ出しなし）。母集団拡大の波及も確認: 象限マップのドットが打者497/投手511に増加、規定未到達選手（PA=4）で UnqualifiedNote 表示、既存ゲート（PA≥30/アウト≥30）はコード変更不要で機能。**注意: League Percentile 等の母集団が「全選手中の規定到達者」に広がったため、既存のパーセンタイル値は全体的に変動している（より正確になった）。**

**レビュー修正（同日）**: /code-review（8アングル・sonnet ファインダー5体）で11候補→5件生存（CONFIRMED 4・PLAUSIBLE 1）。①片方の依存度カードのみ表示時に lg で半幅になる問題（両方表示時のみ `lg:grid-cols-2`）②`INNINGS_DEPENDENCY_MIN_OUTS` を normalizers.ts に一元化し /metrics・カード note の「9」「3イニング」を全て補間に ③2枚のカード JSX をローカル `GiniCard` に抽出 ④`ipToOuts` の二重呼び出し解消 ⑤fetch の limit=5000 到達時に [WARN] 出力。棄却: 移籍選手の複数行問題（実データで重複0組 — API は1選手1行を返す）、3IP としきい値差（意図的設計・注記済み）。再検証: typecheck ✅ / build ✅ / 22/22 pass ✅ / Gini 値 0.348/0.454 不変を実確認。

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

### セイバー拡張 Phase 1（2026-07-07）

**実装**: `src/lib/saber.ts`（純計算関数: `woba`/`babip`/`fipCore`/`fipConstant`/`kbbPct`＋テスト8件）、`src/lib/metrics.ts` に `SaberRow` 型と `buildHitterSaber`/`buildPitcherSaber`（wOBA・BABIP／FIP・K-BB% を既存 `computeMetrics` と同じ mid-rank パーセンタイルで算出し、1行解説文を付与）、`src/components/saber-card.tsx`（`SaberCard`。rows空ならnullを返す）、選手詳細ページの打者/投手 League Percentile カード直後に「セイバー指標（打撃/投球）」カードを追加、`/metrics` に `#saber` セクションを追加。

**検証結果**: `npx tsc --noEmit` ✅ / `npx eslint`（対象3ファイル）✅ / `node --test src/lib/*.test.mjs` 30/30 pass ✅（saber.ts の8件が追加）。build はサンドボックス制約のため未実行（本タスクの検証範囲外）。

**設計判断**:
- バー描画（レイアウト・hsl色温度）は `percentile-bars.tsx` のコピーではなく、`pctColor` をexportしてSaberCardから再利用する形にした（既存の色ロジックを一元管理）
- FIPはリーグ定数Cを母集団（規定投手プール）から都度算出（`poolFipConstant`）。低いほど良い指標のためパーセンタイルは反転
- 規定未到達者向けの専用注記は追加しない——`SaberCard`はrowsが空ならnullを返すだけで、既存の`UnqualifiedNote`（percentileカードの直下）が既に規定未到達を案内済みのため二重表示を避けた
- `CardHeader`/`MetricLink`の既存呼び出し規約に合わせ、`metricHref`には`"saber"`（アンカーIDのみ）を渡す。`MetricLink`側で`/metrics#${anchor}`を組み立てるため、フルパスを渡すと`/metrics#/metrics#saber`のような二重パスになってしまうため

**検証項目**: `node --test` でwOBA/BABIP/FIP/K-BB%の計算式・エッジケース（分母0など）を確認。UIの実ブラウザ確認はサンドボックス制約により未実施（次フェーズでのビジュアル確認時に合わせて確認する）。

### プレイヤータイプ判定エンジン（2026-07-07）

**実装**: `src/lib/player-types.ts`（nba-data `src/lib/data/player-types.ts` の移植）。`pickBadges`（z≥1.0を最大3タイプ・score降順、なければ最上位1つをfallback）を純関数として分離し、その上に打者6タイプ（パワーヒッター/安打製造機/スピードスター/選球の達人/ポイントゲッター/オールラウンダー）・投手6タイプ（ドクターK/精密機械/ワークホース/守護神/中継ぎの柱/グラウンドボーラー）を実装。母集団は既存の規定到達者（打者PA≥30・投手アウト≥30）。特徴量は全てプール内パーセンタイル化（mid-rank）し、反転指標（K%・BB/9・ERA・WHIP・HR/9）は`1−pct`を格納。オールラウンダーのみnba-data同様「style=radarScoreの生値でz標準化（選抜率を保つ）／score=その生値を再パーセンタイル化したもの」という二段構成。`classifyHitters`/`classifyPitchers`は`player_id`をキーに`Map<number, TypeBadge[]>`を返す。UIへの組み込み（バッジ表示）は次フェーズ。

**検証結果**: `npx tsc --noEmit` ✅ / `npx eslint src/lib/player-types.ts` ✅ / `node --test src/lib/*.test.mjs` 32/32 pass ✅（pickBadgesの選抜ロジック2件を追加）。実データ検分（規定到達者・打者498人/投手512人、欠損除外0件）: 全12タイプで非fallback該当者0人のケースなし、全員fallbackにもならない（打者fallbackのみ195/498・投手140/512）。上位選手は目視で妥当（例: パワーヒッター1位 Yordan Alvarez、ドクターK1位 Mason Miller）。

**設計判断**:
- ブリーフのTYPE_DEFS例で「パワーヒッター」のscoreが`g("hr")`（本塁打の生カウント）を参照する一方、ブリーフの特徴量列挙には`hrRate`（率）しか無かった。他タイプのscoreが`hits`/`sb`/`rbi`等の生カウントをrate系styleと組み合わせて評価に使う設計（styleは「何をする選手か」の率、scoreは「どれだけ稼いだか」の生産量）と一貫させるため、`hr`（生カウント）を特徴量に追加した。TypeBadge/TypeCandidate/pickBadgesのインターフェースは変更していない
- 投手の`ip`特徴はブリーフの注記「ip(アウト数)」に従い、`inningsPitched`の小数表記（例: "6.2"）ではなく`ipToOuts`で出したアウト数の生値を使用（IPの端数表記の丸め誤差を避けるため、`metrics.ts`の`pIp`=小数イニングとは別の値）
- Node --testが素の`node`ランタイムで`.ts`を直接importして走るため（tsconfig pathsの`@/*`エイリアスを解決できない）、`percentileOf`/`radarScore`/`woba`/`kbbPct`等の値importは相対パス＋明示`.ts`拡張子にした。これをtscで許可するため`tsconfig.json`に`allowImportingTsExtensions: true`を追加（`noEmit: true`のプロジェクトなので出力・既存ファイルへの影響なし。他ファイルは拡張子なしimportのまま動作する）
- 実データ検分で「守護神」バッジが512人中94人（18%）に付与され、SV分布はmedian=3・min=2（0はゼロ）という偏りを確認した。セーブ機会がクローザーに集中する一方で大多数の中継ぎがSV=0のため、パーセンタイル化するとSV1〜2の投手でもz≥1.0を超えやすい。ブリーフが事前に指摘していた「守護神が救援機会の集中で破綻するケース」に該当する

**修正（同日・レビュー承認済み）**: 「破綻時はしきい値でなくstyle定義を見直す」方針に基づき、ゼロ過多分布の守護神・中継ぎの柱のstyleを「パーセンタイル」から「生カウント」のz標準化に変更（versatRawと同じ「styleは任意スケールでよく、z標準化はstyle出力の分布に対して行われる」性質を利用。`FeatDef`に`raw`フラグを追加し`svRaw`/`hldRaw`特徴を生値のまま格納）。**scoreはパーセンタイル版`sv`/`hld`のまま変更なし**。再検分結果: 守護神 94→37人（SV分布 min=5・median=11・max=26 — 各チームのクローザー相当）、中継ぎの柱 108→85人。他タイプへの影響は再z標準化による軽微な変動のみ（ドクターK 106→107 等）。打者側は変更なし。tsc/eslint/node --test 32/32 すべてpass

### Phase 2a: タイプバッジ表示＋/typesページ（2026-07-07）

**実装**: `getTypeLeaderboard`（`src/lib/player-types.ts`。nba-dataの同名関数を移植。pool＋badges Map＋タイプ名リストを受け取り、タイプ別に評価点降順topN・fallback除外で返す純関数）、`TypeBadges`（`src/components/type-badges.tsx`。タイプ名＋評価点(0-100=score×100四捨五入)のピル表示、fallbackは薄い表示＋「（参考）」注記、`/types`へリンク）、`/types`ページ（打者6タイプ・投手6タイプそれぞれの解説＋リーダーボード。冒頭に判定の仕組み——パーセンタイル→z標準化→z≥1.0を最大3つ・なければ最上位1つをfallback表示——を1段落で説明し、各タイプにstyle/score構成の短い説明を付けた。守護神・中継ぎの柱は生セーブ/生ホールド数のz標準化を使う理由（セーブ・ホールドはクローザー/セットアッパーに機会が集中するゼロ過多分布のため、パーセンタイル化すると少数機会でも高評価になってしまう）を明記）、選手詳細ページのプロフィール見出し直下にタイプバッジを追加（打者タイプ・投手タイプ、二刀流選手は両方表示）、ナビにTypesリンクを追加。

**設計判断**:
- タイプ判定は`hitterPool`/`pitcherPool`（既存の規定到達者フィルタ）に対してのみ実行するため、「バッジは規定到達者のみ表示」という要件は追加のqualifiedフラグなしで自然に満たされる（未到達選手はプール自体に含まれず`classifyHitters(pool).get(id)`が`undefined`になる）
- キャッシュは追加しない。mlb-dataの既存コード（`buildHitterViz`等）もリクエスト毎の再計算のみで、選手ページ・/typesページともにこのリポジトリの既存パターンに合わせた
- `/types`ページはページ単体のmetadataを付けない（`/metrics`と同じくlayout.tsxのみで設定する既存の流儀を踏襲）
- バッジのリンク先は`/metrics#anchor`ではなく`/types`への直接リンクとした。タイプの解説自体が独立ページとして新設されるため、`/metrics`にセクションを追加して二重管理するより`/types`に一本化する方が自然
- `getTypeLeaderboard`は表示名解決（`full_name`）をpoolから引く設計にした。nba-data版は内部キャッシュのplayer名マップを使うが、mlb-dataのclassify系はプールを毎回引数で受け取る純関数設計のため、同じ引数から名前も引けるようにして依存を増やさなかった

**検証結果**: `npx tsc --noEmit` ✅ / `npx eslint`（変更5ファイル）✅ / `node --test src/lib/*.test.mjs` 33/33 pass ✅（`getTypeLeaderboard`のsort/fallback除外/topN capを検証する1件を追加）。build・実ブラウザ確認はサンドボックス制約のため未実施（次フェーズでのビジュアル確認時に合わせて確認する）。

### Phase 2b: ラック指数（風向きメーター）（2026-07-07）

**実装**: `src/lib/luck.ts`（純計算関数: `hitterLuck`/`pitcherLuck`。BABIP−リーグ平均・ERA−FIPの差を「tail(追い風)/head(向かい風)/neutral」に分類し、控えめな可能性表現のlabelを付ける。しきい値は打者±0.015/±0.040、投手±0.30/±0.70）＋テスト2件、`LuckMeter`（`src/components/luck-meter.tsx`。中央=平均/FIP一致の横メーター、deltaを表示レンジ（打者±0.06・投手±1.2）でクランプしてマーカー配置する純SVG）、選手詳細ページの各セイバー指標カード直後に「ラック指数（打撃/投球）」カードを追加（欠損時はカード自体を非表示）、`/metrics`に`#luck`セクションを追加。

**検証結果**: `npx tsc --noEmit` ✅ / `npx eslint`（変更5ファイル）✅ / `node --test src/lib/*.test.mjs` 35/35 pass ✅（luck.tsの2件が追加）。build・実ブラウザ確認はサンドボックス制約のため未実施。

**設計判断**:
- 投手の方向判定はブリーフのサンプル実装（分類後にdirectionを反転する後処理）ではなく、`classify`ヘルパーに正/負それぞれの方向とテキストを引数で渡す直接的な実装にした。テストの期待値（ERA>FIPで`head`）は変わらないが、後処理での反転より読みやすい
- FIP再構成のため`metrics.ts`の`buildPitcherSaber`内にあったローカル関数を`pitcherFipValue(target, constant)`としてexportし、選手ページから同じ計算式を再利用できるようにした。既存の`hBabip`アクセサも同ファイル内で`export`に変更（打者のラック指数のリーグ平均自算に必要なため。ラッパー関数は追加せず既存constをexportするだけに留めた）
- リーグ平均BABIPは選手ページ側で`hitterPool.map(hBabip)`から都度算出する1回限りの計算のため、`metrics.ts`に集計関数を追加せずページ内のインライン`reduce`に留めた（他で再利用される見込みがないため）
- 判定文はブリーフの文言をそのまま使用し、しきい値・ラベルとも変更していない

### Phase 3a準備: Statcast取得スクリプト（2026-07-07）

**PoC結果**: Baseball Savant の3エンドポイントを実環境から確認、全て成功。
- 打者カスタムリーダーボード（`type=batter&min=q`, xwOBA/xBA/xSLG/打球速度/バレル率/ハードヒット率）
- 投手カスタムリーダーボード（`type=pitcher&min=q`, xwOBA/打球速度/バレル率/空振り率/chase率）— **chase_percent は実データで全59行が空**（末尾カンマ）。ソース側の欠損でスクリプトのバグではない（curlで直接確認済み）。nullable前提で実装
- スプリント速度リーダーボード（`min=10`）

いずれもBOM付きCSV・ヘッダはダブルクォート、率の値も`"354"`のようなクォート済み文字列で返る。

**実装**: `scripts/fetch-statcast.py`（`fetch-mlb-data.py`と同じ流儀: `requests.Session`、season は `MLB_SEASON` env→未指定ならUTC年から導出、リトライ付きfetchヘルパー）。3エンドポイントをCSVとして取得し（`utf-8-sig`でBOM除去）、打者+スプリントを`player_id`でマージして`data/statcast_hitting.csv`、投手をそのまま`data/statcast_pitching.csv`に出力。列順は固定（Task 10の依存契約に合わせるため、既存`write_csv`のアルファベット順ソートは使わず本スクリプト内で列順を明示）。

**失敗時の安全策**: 3エンドポイントいずれかがHTTPエラー、または0行を返した場合は一切書き込まずexit 1（既存CSVを保持）。両方の分岐をスクリプト外から直接呼び出して確認済み（HTTPエラー→`RuntimeError`、空行→ガード条件が真になる）。

**運用方式**: `.github/workflows/fetch-mlb-data.yml`の既存fetchステップの後に「Fetch Statcast data」ステップを追加し、`continue-on-error: true`を付与（Statcast取得の失敗がデイリー更新全体を止めないようにするため）。CI環境での実測（ネットワーク到達性・実行時間）はコントローラー側で実施。

**実行結果（本番エンドポイントに対する実行、2026-07-07時点）**: `data/statcast_hitting.csv` 152行、`data/statcast_pitching.csv` 59行（シーズン中盤で規定到達者数がまだ少ないため、フルシーズンの「数百行」より少ない値。データとしては妥当）。

**検証結果**: `npx tsc --noEmit` ✅（既存TS成果物への影響なし）。実行後のCSVパース確認（列名・行数）✅。新規依存追加なし（`requests`のみ）。

**修正（同日）: chase率のソース列を`oz_swing_percent`に変更**。コントローラーの実測で、Savantカスタムリーダーボードの`chase_percent`は2025年でも全行空＝未提供の死に列と判明。チェイス率の正しい選択名は`oz_swing_percent`（O-Zone Swing % = ボール球スイング率）で、実値が返ることを確認済み。スクリプトの投手selectionsを`oz_swing_percent`に変更し、値は出力CSVの`chase_percent`列に書く（**出力契約の列名は変更なし**、Task 10への影響なし）。再実行結果: `statcast_pitching.csv` 59行中59行でchase_percentに値あり（38.4, 28.3 等）。hitting側は152行のまま変更なし。

### Phase 3a: フィジカルカード（Statcast）（2026-07-07）

**実装**: `src/lib/data/statcast.ts`（`getStatcastHitting`/`getStatcastPitching`。既存`loaders.ts`の`readCsv`/`parseNumber`をそのまま再利用し、CSVが無ければ`readCsv`が返す空配列からそのまま空Mapになる——専用の存在チェックは不要。率系文字列（`".354"`）・空文字列とも`parseNumber`が`null`に正規化する。同ファイルに`buildHitterPhysical`/`buildPitcherPhysical`も実装——`metrics.ts`の`saberRow`と同じmid-rank方式・null行スキップ・invertパターンを踏襲した`physicalRow`ヘルパーを使う）。`src/components/physical-card.tsx`は`SaberCard`（値＋パーセンタイルバー＋1行解説）と構造が完全一致するため、JSXを複製せず`export { SaberCard as PhysicalCard }`で再利用。選手詳細ページの各セイバー指標カード直後に「フィジカル（Statcast）」（打者: 平均打球速度・Barrel%・HardHit%・スプリントスピード）/「フィジカル（Statcast・被打球）」（投手: 被打球速度・被Barrel%は反転、Whiff%・Chase%）を追加。表示条件は規定到達判定と独立に「StatcastのMapに選手が存在するか」のみ（SavantのCSV自体がmin=q＝規定到達者のみを収録しているため）。`/metrics`に`#statcast`セクションを追加（データ源・計算方法・chase_percent が oz_swing_percent 由来である旨を明記）。

**検証結果**: `npx tsc --noEmit` ✅ / `npx eslint`（変更4ファイル）✅ / `node --test src/lib/*.test.mjs` 36/36 pass ✅（既存件数から増減なし——後述の理由により専用テストは追加していない）。実データでplayers.csvとの`player_id`重複を確認: statcast_hitting.csv 152行/152行が、statcast_pitching.csv 59行/59行がplayers.csvに存在（JJ Wetherholt=802139, Cristopher Sánchez=650911 等で目視確認）。build・実ブラウザ確認はサンドボックス制約のため未実施（既存フェーズと同様、次回のビジュアル確認時に合わせて確認する）。

**設計判断**:
- ローダー本体（`readCsv`/`parseNumber`のI/O層）は既存`loaders.ts`同様このリポジトリでは未テスト。`buildHitterPhysical`/`buildPitcherPhysical`（分岐・invertを含む純ロジック）も、直系の前例である`metrics.ts`の`buildHitterSaber`/`buildPitcherSaber`（同一形状のmid-rankビルダー）に専用テストが存在しないため、同じ前例に従い専用テストファイルは追加しなかった。パーセンタイル計算自体は`percentile.test.mjs`で検証済みのロジックをそのまま再利用している
- `physicalRow`/`buildHitterPhysical`/`buildPitcherPhysical`を`metrics.ts`ではなく新設の`statcast.ts`に置いた。`metrics.ts`は`player_hitting.csv`/`player_pitching.csv`由来の指標に閉じた既存ファイルのため、Statcast由来の指標を混在させず新ドメインファイルに集約した
- カード表示条件に`isQualifiedHitter`/`isQualifiedPitcher`を使わず、StatcastのMapの有無だけで判定した。Baseball SavantのカスタムリーダーボードCSV自体が`min=q`（規定到達者のみ）でフィルタ済みのため、二重判定は不要かつ将来Savant側のしきい値が変わった場合に自動追従できる

### Phase 3b: ラック指数のxwOBA強化（2026-07-07）

**実装**: `src/lib/luck.ts`に`hitterLuckX(wobaActual, xwoba)`を追加（wOBA実測−xwOBAの差を「tail(追い風)/head(向かい風)/neutral」に分類。しきい値±0.010/±0.025、既存`classify`ヘルパーをそのまま再利用）＋テスト1件（境界値・`meterValue`との整合を含む）。`metrics.ts`の`hWoba`（打者wOBAアクセサ、既存`buildHitterSaber`内でのみ使用していた非exportの内部const）をexportに変更し、選手ページから同じ計算式を再利用できるようにした（新規ラッパーは追加していない）。選手詳細ページ（`src/app/players/[playerId]/page.tsx`）にフォールバック分岐を追加: 対象選手のStatcast行（`statcastHitterRow`、Phase 3aで既に取得済み）に`xwoba`があり、かつ`hWoba(player)`が算出できる場合はX版を使用、どちらか一方でも欠損する場合は既存のBABIP版（`hitterLuck`）にフォールバックし、両方不可なら`hitterLuckResult`が`null`になりカード自体を非表示にする（既存の非表示パターンを踏襲）。`LuckMeter`の`range`・`desc`はX版かBABIP版かで切り替え——X版は表示レンジを±0.05（wOBA−xwOBAの|Δ|は既存BABIP版の±0.06ほど広がらないため）、解説文はブリーフ指定の文言をそのまま使用してどちらの計算かを明示する。`/metrics`の`#luck`セクションにX版の計算方法・しきい値・表示レンジ・フォールバック条件を追記。

**検証結果**: `npx tsc --noEmit` ✅ / `npx eslint`（変更5ファイル: `luck.ts`/`luck.test.mjs`/`metrics.ts`/`players/[playerId]/page.tsx`/`metrics/page.tsx`）✅ / `node --test src/lib/*.test.mjs` 37/37 pass ✅（luck.test.mjsに1件追加、既存36件は変更なし）。build・実ブラウザ確認はサンドボックス制約のため未実施（既存フェーズと同様）。

**設計判断**:
- `hitterLuckX`のしきい値・ラベル文言はブリーフの指定値をそのまま採用し変更していない（BABIP版の±0.015/±0.040とは別の値——wOBA−xwOBAはBABIP−リーグ平均よりも変動幅が小さいスケールのため）
- メーター表示レンジをX版だけ±0.06→±0.05に変更した。wOBA−xwOBAの実測値は±0.04を超えることが稀なため、共通の±0.06のままだとマーカーが常に中央付近に寄って見づらくなる（BABIP版は既存レンジを維持——挙動を変える理由がないため）
- フォールバック判定はページ内のインライン条件式に留め、専用ヘルパー関数を新設しなかった。分岐が2値のnullチェックのみで、他画面から再利用される見込みもないため
- `hitterLuckIsX`（表示切り替え用フラグ）は`hitterLuckResult`の算出条件と同じ式を2箇所に書いている。三項演算子内でTypeScriptの型絞り込みを効かせるため、真偽値変数を条件に流用する書き方は避けた（`number | null`のまま`hitterLuckX`に渡すとコンパイルエラーになる）

## 計画の全タスク完了サマリー（Task 1〜11、2026-07-07）

セイバー拡張＋Statcast強化プラン（Task 1〜11）が全完了。追加されたビジュアル・指標:

| Task | 内容 |
|---|---|
| 1〜3 | wOBA/BABIP/FIP/K-BB%（セイバー指標カード）、選手ページ・`/metrics`統合 |
| 4 | NPB版セイバー指標カード（npb-dataリポジトリ） |
| 5〜6 | プレイヤータイプ判定エンジン（打者/投手）、タイプバッジ表示・`/types`ページ |
| 7 | ラック指数（風向きメーター）: 打者BABIP版・投手ERA-FIP版 |
| 8 | NPB版タイプ判定・タイプバッジ（npb-dataリポジトリ） |
| 9〜10 | Statcast取得スクリプト、フィジカルカード（打球速度・Barrel%・HardHit%・スプリントスピード等） |
| 11 | ラック指数のxwOBA強化: `hitterLuckX`（wOBA−xwOBA）＋BABIP版への自動フォールバック |

母集団・しきい値・判定文の言い回しは各Taskのブリーフに準拠し、独自の拡張・変更は加えていない。検証は全Taskを通じて`tsc --noEmit` / `eslint` / `node --test`の3点のみ（build・実ブラウザ確認はサンドボックス制約のため未実施、既存Phase 1-4と同様）。

コミット範囲: `0948ec1..`（Task 1）から本コミット（Task 11）まで。各Taskの詳細ログは`.superpowers/sdd/task-*-report.md`、レビュー結果は`.superpowers/sdd/progress.md`を参照。

# セイバー×feel-viz 拡張設計（mlb-data 本体 / npb-data 移植）

2026-07-07 ブレインストーミング承認済み設計。

## 背景・目的

mlb/npb-data の選手評価は League Percentile＋レーダーまでで、nba-data（タイプ判定・ハッスル・ショットチャート等）と比べ「選手の個性が物語として見えない」。セイバー指標の導入と、それを素材にした新 feel-viz 表現（タイプ判定・ラック指数）でこのギャップを埋める。

## 決定事項

| 論点 | 決定 |
|---|---|
| 方向性 | セイバー指標＋新視点（タイプ判定・ラック指数・Statcast フィジカル）の両方 |
| データ範囲 | **MLB = Statcast 新規取得あり／NPB = 既存 CSV のみ**。表示の非対称は問題なし（mlb=公開・閲覧者はセイバー知識あり想定、npb=非公開・本人＋知人のみ） |
| 解説の深さ | 標準セイバー指標はカード内1行解説＋/metrics リンク。新 feel-viz 表現（ラック指数等）はカード内やや詳しめ＋/metrics リンク |
| 進め方 | 案A: CSV コア先行（Phase 1-2 を mlb→npb 移植）→ Statcast 層を最後（Phase 3・MLB のみ） |
| 実装流儀 | 既存 feel-viz 踏襲: サーバーコンポーネント＋純CSS/SVG、欠損 null スキップ、規定未到達は注記、計算関数は node --test |

## Phase 1: セイバー指標カード（/players/[playerId]）

既存パーセンタイルカードと重複しない新規指標のみ。「値＋リーグ内パーセンタイルバー＋1行解説（常時表示）」の3点セット。

### 打者

| 指標 | 計算 | 1行解説（案） |
|---|---|---|
| wOBA（近似） | `(0.69uBB + 0.72HBP + 0.89×1B + 1.27×2B + 1.62×3B + 2.10×HR) / (AB + BB − IBB + SF + HBP)`。uBB=BB−IBB、1B=H−2B−3B−HR | 1打席あたりの得点貢献。OPSより正確に打者の総合力を測る |
| BABIP | `(H − HR) / (AB − SO − HR + SF)`。MLB は CSV 値、NPB は自算 | インプレー打球がヒットになった率。極端な高低は運の影響が大きい |

### 投手

| 指標 | 計算 | 1行解説（案） |
|---|---|---|
| FIP | `(13×HR + 3×(BB+HBP) − 2×SO) / IP + C`。C はリーグ集計から自算（リーグ平均ERA − リーグ計FIP分子/リーグ計IP）で ERA とスケール一致 | 三振・四球・被本塁打だけで測る投手の実力。守備と運の影響を除いた「本当のERA」 |
| K-BB% | `(SO − BB) / 対戦打者数` | 支配力の最短指標。三振で取れて四球を出さない投手ほど高い |

- wOBA 係数は FanGraphs 近年版で固定。/metrics に「リーグ・年度別の厳密係数ではない近似」と注記
- 母集団は既存と同じ（MLB=全体の規定到達者、NPB=リーグ内の規定到達者）
- /metrics に4指標セクション追記、カードから ? リンク

## Phase 2: プレイヤータイプ判定＋ラック指数

### タイプ判定（nba-data `src/lib/data/player-types.ts` のメカニズム移植）

特徴量をプール内パーセンタイル化 → style を z 標準化 → **z≥1.0 を最大3バッジ**（なければ最上位1つを fallback 参考表示）。判定（style）と評価点（score=職務パーセンタイル平均）は分離。

打者タイプ（案・6種）:

| タイプ | style（らしさ） | score（評価点） |
|---|---|---|
| パワーヒッター | ISO・HR率 | SLG・HR・wOBA |
| 安打製造機 | AVG・K%低さ | AVG・OBP・安打数 |
| スピードスター | 盗塁企図率・三塁打率 | SB・盗塁成功率・得点 |
| 選球の達人 | BB%・BB/K | OBP・BB%・wOBA |
| ポイントゲッター | RBI率 | RBI・SLG・wOBA |
| オールラウンダー | 5ツールの水準×均等さ（nba の versatilityScore 流用） | 同パーセンタイル |

投手タイプ（案・5種＋MLB専用1種）:

| タイプ | style | score |
|---|---|---|
| ドクターK（本格派） | K/9 | K/9・K-BB%・ERA |
| 精密機械（制球派） | BB/9 の低さ | BB/9・WHIP・K/BB |
| ワークホース | 投球回・先発数・完投 | IP・ERA・WHIP |
| 守護神 | セーブ数 | SV・ERA・K-BB% |
| 中継ぎの柱 | ホールド数 | HLD・ERA・WHIP |
| グラウンドボーラー（MLBのみ） | GO/AO | GO/AO・HR/9低さ・ERA |

- 具体的な重み・しきい値は実装時に実データ分布を見て調整（nba-data と同じ進め方）
- `/types` ページ新設: タイプ別リーダーボード＋判定の仕組み解説

### ラック指数（風向きメーター）

純SVG横メーター（中央=リーグ平均、右=追い風、左=向かい風）＋値に応じた控えめな判定文（「〜の可能性」表現）。新 feel-viz 表現なのでカード内解説はやや厚め。

- 打者: BABIP − リーグ平均 BABIP（Phase 3 で MLB は wOBA−xwOBA に強化）
- 投手: ERA − FIP（正=向かい風、負=追い風）
- 「BABIP には俊足・打球質による個人差があり、乖離のすべてが運ではない」と正直に注記

## Phase 3: Statcast（MLB のみ）

### 取得

- Baseball Savant カスタムリーダーボード CSV（`baseballsavant.mlb.com/leaderboard/custom?...&csv=true`）。選手×シーズン集計、API キー不要、MLBAM ID＝既存 player_id で JOIN
- 新規 `scripts/fetch-statcast.py` → `data/statcast_hitting.csv` / `data/statcast_pitching.csv`
- **冒頭 PoC**: エンドポイント安定性＋GitHub Actions からのアクセス可否を確認。CI から弾かれる場合は「ローカル手動実行＋コミット」運用にフォールバック（nba-data の data/shots/ 方式）

### 表示

1. **フィジカルカード**（Savant 風パーセンタイルバー＋1行解説）— 打者: 平均/最大打球速度・Barrel%・HardHit%・スプリントスピード、投手: 被打球速度・被Barrel%・Whiff%・Chase%
2. **ラック指数強化** — 打者メーターを wOBA − xwOBA（実測−期待）に差し替え、/metrics 更新

### エラー処理

- Statcast CSV 欠損・取得失敗時はフィジカルカード非表示（サイトを壊さない）。ラック指数は BABIP 版に自動フォールバック

## 検証方針（全 Phase 共通）

各 Phase 完了ごとに: `tsc --noEmit`＋ESLint＋`node --test` → docs/feel-viz.md 更新 → コミット。実表示はローカル/Vercel でユーザー確認（サンドボックスで build 不可のため）。

## スコープ外（将来）

- タイプ判定への Statcast 特徴の組み込み（スプリントスピード→スピードスター等）— 両リポのロジック対称性維持のため今回は見送り
- リリーフ火消し度（inherited runners 生還阻止率）— 今回の選定で不採用
- NPB の新規データ取得（スクレイピング）

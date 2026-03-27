# MLB Data Dashboard - 実装プラン

## 概要

`~/nba-data/` と同様に、MLB のチーム・選手・試合データを収集して可視化するプロジェクトを `~/mlb-data/` に構築する。

結論として、**無料で使えるMLBデータAPIは存在する**。最有力は `statsapi.mlb.com`（MLB Stats API）。

---

## 1. 無料で使える主なデータソース

### 1.1 MLB Stats API（最優先）

- ベースURL: `https://statsapi.mlb.com/api/v1/`
- 認証: 現時点では API キー不要で取得可能
- 主用途:
  - 日程: `schedule`
  - 順位: `standings`
  - 試合詳細（ライブ含む）: `game/{gamePk}/feed/live`
  - チーム/選手情報: `teams`, `people`
  - 選手スタッツ: `people/{personId}/stats` / `stats`
- 備考:
  - MLB公式の一般公開された開発者ドキュメントは限定的
  - 実運用ではエンドポイント変更リスクに備え、取得処理を薄いラッパーで抽象化する

### 1.2 Baseball Savant（Statcast）

- サイト: `https://baseballsavant.mlb.com/statcast_search`
- 主用途: 球速・打球速度・打球角度などの詳細トラッキングデータ
- 取得形態: CSV エクスポート中心（APIというよりクエリベースのデータ取得）

### 1.3 Retrosheet CSV（履歴データ補完）

- サイト: `https://www.retrosheet.org/downloads/othercsvs.html`
- 主用途: 長期の過去データ（ゲームレベル/プレーレベル）
- 備考: リアルタイム用途ではなく、履歴分析向き

---

## 2. 利用条件・注意点（必須）

MLBデータのレスポンスには以下の利用条件参照が含まれる:
- `http://gdx.mlb.com/components/copyright.txt`

同ページには要旨として、**個人利用・非商用・非大量取得に限定**する旨の記載がある。商用利用や大量再配布は、利用前に必ず法務確認する。

### このプロジェクトの運用条件（確定）

- 利用形態: **非商用**
- 公開形態: **Web公開あり**
- 対応方針:
  - 元データの再配布サイト化は避け、ダッシュボード表示用途に限定する
  - 取得頻度を抑え、バルク取得を避ける（定期実行は日次〜数時間間隔）
  - 出典と利用条件参照先（`gdx.mlb.com/components/copyright.txt`）をREADMEに明記する
  - 利用条件変更に備え、データ取得レイヤーを分離して差し替え可能にする

---

## 3. MLB競技構造を前提にした要件定義

### 3.1 レギュレーション前提（本プロジェクトの基準）

- リーグは `American League` と `National League` の2つ
- 各リーグに `East / Central / West` の3ディビジョン
- レギュラーシーズンの順位は **ディビジョン内順位** が基本
- プレーオフ進出:
  - 各ディビジョン1位（各リーグ3チーム）
  - 同リーグのワイルドカード上位3チーム（ディビジョン1位を除く）
- ポストシーズンはレギュラーシーズン順位表とは別枠で扱う

### 3.2 画面要件の再定義（最優先）

- `standings` は **ディビジョン別表示が必須**
  - AL East / AL Central / AL West
  - NL East / NL Central / NL West
- 「全体勝率順のみ」の表示は補助情報で、主表示にしない
- トップページの順位サマリもディビジョン単位で表示する

### 3.3 今回のスコープ / 次フェーズ

- 今回（必須）:
  - ディビジョン順位表
  - チーム個別ページ（ロスター+スタッツ）
  - 選手検索・比較
- 次フェーズ（後で追加）:
  - ワイルドカード順位表
  - ポストシーズンブラケット

---

## 4. データ取得方針

### 4.1 方針

- 主要データは MLB Stats API から日次更新
- 追加分析用に必要な場合のみ Baseball Savant/Retrosheet を併用
- 取得結果は `data/*.csv` に保存し、Next.js 側で読み込む

### 4.2 初期CSVマッピング

- `data/schedule.csv` : 試合日程（`schedule`）
- `data/standings.csv` : 順位（`standings`）
- `data/teams.csv` : チーム情報（`teams`）
- `data/players.csv` : 選手基本情報（`people` など）
- `data/player_hitting.csv` : 選手打撃スタッツ（`group=hitting`）
- `data/player_pitching.csv` : 選手投球スタッツ（`group=pitching`）
- `data/player_fielding.csv` : 選手守備スタッツ（`group=fielding`）
- `data/game_live_<gamePk>.json` : ライブ詳細（必要試合のみ）
- `data/last_updated.txt` : 取得時刻

### 4.3 選手スタッツ取得戦略

- リーグ横断の集計取得（初期実装）:
  - `GET /api/v1/stats?stats=season&group=hitting&season={year}&sportIds=1`
  - `GET /api/v1/stats?stats=season&group=pitching&season={year}&sportIds=1`
  - `GET /api/v1/stats?stats=season&group=fielding&season={year}&sportIds=1`
- 個別選手詳細（必要時）:
  - `GET /api/v1/people/{personId}/stats?stats=season&group=hitting&season={year}`
  - `GET /api/v1/people/{personId}/stats?stats=season&group=pitching&season={year}`
- 画面要件:
  - 選手一覧で打撃/投球タブを切り替え
  - 選手詳細でシーズン成績（主要指標）を表示

### 4.4 検索・比較機能（nba-data互換）

- 選手検索:
  - 名前のインクリメンタル検索（2文字以上）
  - チーム/ポジション/最低出場試合数フィルター
  - 打撃・投球それぞれでソート可能
- 選手比較:
  - 最大4選手を同時選択
  - 打撃指標比較（例: AVG/OBP/SLG/OPS/HR/RBI）
  - 投球指標比較（例: ERA/WHIP/SO/BB/IP）
  - 表形式 + チャート表示（バーチャート中心）
- URL構成:
  - `/players` : 選手一覧 + フィルター + ソート
  - `/players/[playerId]` : 選手詳細
  - `/search` : グローバル検索
  - `/compare` : 選手比較

---

## 5. ディレクトリ構成（初期）

```
mlb-data/
├── data/
│   └── .gitkeep
├── scripts/
│   └── .gitkeep
├── src/
│   └── .gitkeep
└── plan.md
```

---

## 6. 実装フェーズ（改訂）

### Phase 1: API検証

1. `schedule`, `standings`, `teams`, `stats(group=hitting/pitching/fielding)` を curl で取得
2. `standings` の `league/division/divisionRank/sportRank/wildCard*` 系フィールドを優先的に固定
3. 失敗時リトライと待機（レート対策）を実装

### Phase 2: 収集スクリプト作成

1. `scripts/fetch-mlb-data.py` を作成
2. CSV/JSON 出力を `data/` に保存
3. `last_updated.txt` 更新

### Phase 3: ダッシュボード基盤

1. `src/` に Next.js アプリ骨組み作成
2. `data/` 読み込みユーティリティ作成
3. 最低限のページ（ホーム/順位表/チーム詳細/選手一覧/選手詳細/検索/比較）を作成
4. `順位表` は「リーグ→ディビジョン」の6ブロック表示で実装

### Phase 3.5: 検索・比較UI実装

1. 選手名検索コンポーネント（debounce付き）を作成
2. 比較対象選択UI（最大4名）を作成
3. 比較テーブルとチャートを実装
4. クエリパラメータで状態共有（`/compare?players=...`）

### Phase 3.8: レギュレーション整合UI

1. トップページの順位スナップショットをディビジョン別に修正
2. `standings` を divisionRank 優先で表示
3. 同率時の補助ソート（勝率→得失点差）を定義
4. 「この表示はRS順位基準」という注記を追加

### Phase 4: 運用

1. GitHub Actions で定期実行（6時間ごと）+ 手動実行
2. `data/` に差分がある時のみ自動コミット
3. 失敗時は手動再実行（workflow_dispatch）で復旧
4. 変更があればAPIラッパー側で吸収

---

## 7. 開幕直後（データ不足時）の運用方針

- 欠損値は `N/A` を表示し、0として扱わない
- 小サンプル警告をUI上に表示（「開幕直後のため参考値」）
- 最低サンプル条件を適用:
  - 打者: 最低PA（例: 30）
  - 投手: 最低IP（例: 10）
- 条件未満はランキング対象外（比較画面では表示のみ可）
- `2026` と `2025` の切替を用意し、データが薄い時は前年成績を参照可能にする
- 検索機能は常時有効（成績が空でも選手プロフィールは表示）

---

## 8. Next.js + Vercel 前提の実装プラン

### 7.1 技術構成

- Framework: Next.js (App Router, TypeScript)
- UI: Tailwind CSS + shadcn/ui
- Chart: Recharts
- Data Layer: `data/*.csv` + `lib/data/*` パーサ
- Deploy: Vercel（Git連携自動デプロイ）

### 7.2 ディレクトリ設計（実装版）

```text
mlb-data/
├── data/
│   ├── schedule.csv
│   ├── standings.csv
│   ├── teams.csv
│   ├── players.csv
│   ├── player_hitting.csv
│   ├── player_pitching.csv
│   ├── player_fielding.csv
│   └── last_updated.txt
├── scripts/
│   └── fetch-mlb-data.py
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── standings/page.tsx
│   │   ├── players/page.tsx
│   │   ├── players/[playerId]/page.tsx
│   │   ├── search/page.tsx
│   │   └── compare/page.tsx
│   ├── components/
│   │   ├── players/player-search.tsx
│   │   ├── players/player-compare-table.tsx
│   │   └── charts/player-compare-chart.tsx
│   └── lib/
│       ├── data/loaders.ts
│       ├── data/normalizers.ts
│       └── types.ts
├── package.json
└── plan.md
```

### 8.3 実装ステップ（順序固定）

1. Next.js プロジェクト初期化（`nba-data` と同等構成）
2. `scripts/fetch-mlb-data.py` 実装
3. `data/*.csv` 生成確認
4. `lib/data` にCSVローダー実装
5. `/standings` をディビジョン別で実装（最優先）
6. `/teams/[teamId]` 実装（ロスター+スタッツ）
7. `/players` と `/players/[playerId]` 実装
8. `/search` 実装（debounce + フィルター）
9. `/compare` 実装（最大4選手）
10. 開幕直後ルール（最低PA/IP・N/A・小サンプル警告）をUIへ反映
11. Vercelへデプロイ

### 8.4 Vercel運用

- GitHub連携で `main` push時に自動デプロイ
- 環境変数は原則不要（公開API + CSV運用）
- 再取得トリガー:
  - ローカル実行でCSV更新→push
  - 必要ならVercel Cronまたは外部CIで定期更新
- ISR/キャッシュ:
  - サーバーコンポーネントでCSVを読み込み
  - `revalidate` を設定して表示を安定化

### 8.5 完了条件

- Web公開URLでホーム/ディビジョン順位/チーム詳細/検索/比較が閲覧可能
- 順位表がMLBレギュレーション（ディビジョン基準）に整合している
- 開幕直後でも画面崩れ・`NaN` 表示がない
- 4選手比較が動作し、欠損項目は `N/A` 表示
- データ更新後、Vercel上の表示に反映される

---

## 9. 現時点の結論

- MLB の無料データ取得手段はある（最有力: MLB Stats API）。
- ただし利用条件と将来の互換性リスクがあるため、`scripts/` で吸収する設計が安全。
- 次の最優先は、`standings` とトップページをディビジョン順位基準に修正すること。

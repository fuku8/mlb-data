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

### 3.2 画面要件

| ページ | パス | 状態 | 説明 |
|--------|------|------|------|
| ホーム | `/` | **実装済** | 最新試合結果 + Team Quick Links + ディビジョン別順位スナップショット |
| 順位表 | `/standings` | **実装済** | リーグ→ディビジョンの6ブロック表示 |
| 試合結果 | `/games` | **実装済** | 日付セレクター + カード型グリッド表示 |
| 選手一覧 | `/players` | **実装済** | 打撃/投球タブ切替、ソート、ページネーション、小サンプル警告 |
| 選手詳細 | `/players/[playerId]` | **実装済** | スタッツカードグリッド表示（打者/投手/二刀流で条件分岐） |
| チーム詳細 | `/teams/[teamId]` | **実装済** | ロスター + スタッツ |
| 選手比較 | `/compare` | **実装済** | 最大4選手の比較テーブル + チャート |

### 3.3 今後のスコープ

- ワイルドカード順位表
- ポストシーズンブラケット

---

## 4. データ取得方針

### 4.1 方針

- 主要データは MLB Stats API から定期更新（GitHub Actions で6時間ごと）
- 追加分析用に必要な場合のみ Baseball Savant/Retrosheet を併用
- 取得結果は `data/*.csv` に保存し、Next.js 側で読み込む

### 4.2 CSVマッピング

| ファイル | 内容 | API |
|----------|------|-----|
| `data/schedule.csv` | シーズン全試合日程・結果 | `schedule` (season全体、差分取得) |
| `data/standings.csv` | 順位 | `standings` |
| `data/teams.csv` | チーム情報 | `teams` |
| `data/players.csv` | 選手基本情報 | `sports/1/players` |
| `data/player_hitting.csv` | 選手打撃スタッツ | `stats?group=hitting` |
| `data/player_pitching.csv` | 選手投球スタッツ | `stats?group=pitching` |
| `data/player_fielding.csv` | 選手守備スタッツ | `stats?group=fielding` |
| `data/game_live_<gamePk>.json` | 当日のライブ詳細（Final/InProgress のみ） | `game/{gamePk}/feed/live` |
| `data/last_updated.txt` | 取得時刻 | - |

### 4.3 スケジュール差分取得（実装済）

- 既存 `schedule.csv` の最新Final日付を検出
- その日以降のみAPIから取得（当日分はスコア更新のため再取得）
- 既存データとマージし、`game_pk` で重複排除（新しい方を優先）
- 初回はシーズン全体（3月〜12月末）をフル取得
- 取得範囲: `startDate` 〜 `endDate`（12月末まで、ポストシーズン対応）

### 4.4 選手スタッツ取得戦略

- リーグ横断の集計取得:
  - `GET /api/v1/stats?stats=season&group=hitting&season={year}&sportIds=1&limit=5000`
  - `GET /api/v1/stats?stats=season&group=pitching&season={year}&sportIds=1&limit=5000`
  - `GET /api/v1/stats?stats=season&group=fielding&season={year}&sportIds=1&limit=5000`

### 4.5 選手詳細の表示制御（実装済）

- 表示セクション（Hitting / Pitching / Fielding）は **実データの有無** で判定
  - `player.hitting` が存在 → Hitting セクション表示
  - `player.pitching` が存在 → Pitching セクション表示
  - `player.fielding` が存在 → Fielding セクション表示
- 二刀流選手（大谷 = `position_abbr: "TWP"`）は打撃・投球両方のデータがあるため両方表示

---

## 5. アーキテクチャ

### 5.1 技術構成

- Framework: Next.js 16 (App Router, TypeScript)
- UI: Tailwind CSS v4
- Chart: Recharts
- Icons: Lucide React
- Data Layer: `data/*.csv` + `lib/data/*` パーサ
- Deploy: Vercel（Git連携自動デプロイ）

### 5.2 ディレクトリ構成（現在）

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
│   │   ├── page.tsx                    # ホーム（最新試合結果 + 順位スナップショット）
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── standings/page.tsx          # 順位表
│   │   ├── games/page.tsx              # 試合結果
│   │   ├── players/page.tsx            # 選手一覧
│   │   ├── players/[playerId]/page.tsx # 選手詳細
│   │   ├── compare/page.tsx            # 選手比較
│   │   └── teams/[teamId]/page.tsx     # チーム詳細
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navigation.tsx          # ナビゲーション
│   │   │   └── footer.tsx              # フッター
│   │   └── game-card.tsx               # 試合カードコンポーネント（共通）
│   └── lib/
│       ├── data/
│       │   ├── loaders.ts              # CSV読み込み
│       │   └── normalizers.ts          # 型変換・フォーマット
│       ├── types.ts                    # 型定義
│       └── utils.ts                    # ユーティリティ
├── package.json
└── plan.md
```

### 5.3 共通コンポーネント

| コンポーネント | ファイル | 用途 |
|----------------|----------|------|
| `GameCard` | `components/game-card.tsx` | 試合結果カード（ホーム: compact, 試合ページ: 通常サイズ） |
| `StatCell` / `StatGrid` | `players/[playerId]/page.tsx` 内 | スタッツカードグリッド |
| `Navigation` | `components/layout/navigation.tsx` | ヘッダーナビ（ホーム/順位表/試合/選手/比較） |

### 5.4 データパイプライン

```
MLB Stats API
    ↓
Python fetch-mlb-data.py（差分取得 + リトライ）
    ↓
CSV files in /data/
    ↓
TypeScript Loaders (readCsv, parseNumber)
    ↓
Normalizers (toGameResult, mergePlayerStatsBySeason, etc.)
    ↓
Next.js Server Components
    ↓
Vercel → Public website
```

---

## 6. 実装フェーズ

### Phase 1: API検証 ✅

1. `schedule`, `standings`, `teams`, `stats(group=hitting/pitching/fielding)` を確認
2. `standings` の `league/division/divisionRank/sportRank/wildCard*` 系フィールドを確定
3. 失敗時リトライと待機（レート対策）を実装

### Phase 2: 収集スクリプト作成 ✅

1. `scripts/fetch-mlb-data.py` を実装
2. CSV/JSON 出力を `data/` に保存
3. `last_updated.txt` 更新
4. スケジュール差分取得を実装

### Phase 3: ダッシュボード基盤 ✅

1. Next.js アプリ骨組み作成
2. `data/` 読み込みユーティリティ作成
3. 全ページ実装済（ホーム/順位表/試合結果/チーム詳細/選手一覧/選手詳細/比較）
4. 順位表は「リーグ→ディビジョン」の6ブロック表示

### Phase 3.5: 検索・比較UI実装 ✅

1. 選手名検索（フィルタリング）
2. 比較対象選択UI（最大4名）
3. 比較テーブルとチャートを実装
4. クエリパラメータで状態共有

### Phase 3.8: 試合結果ページ追加 ✅

1. `/games` ページを新規作成（日付セレクター + カード型グリッド）
2. ホームページに最新試合結果セクションを追加
3. `GameCard` 共通コンポーネントに抽出
4. ナビゲーションに「試合」を追加

### Phase 4: 運用 ✅

1. GitHub Actions で定期実行（6時間ごと）+ 手動実行
2. `data/` に差分がある時のみ自動コミット
3. 失敗時は手動再実行（workflow_dispatch）で復旧
4. 変更があればAPIラッパー側で吸収

---

## 7. 開幕直後（データ不足時）の運用方針

- 欠損値は `N/A` を表示し、0として扱わない
- 小サンプル警告をUI上に表示（「⚠」マーク）
- 最低サンプル条件を適用:
  - 打者: 最低PA 30
  - 投手: 最低IP 10
- 条件未満はランキングで ⚠ 表示（比較画面では表示のみ可）
- シーズン切替可能（URLパラメータ `?season=2025`）
- 検索機能は常時有効（成績が空でも選手プロフィールは表示）
- 選手詳細の表示セクションはデータ有無で自動判定（データなしのセクションは非表示）

---

## 8. Vercel運用

- GitHub連携で `main` push時に自動デプロイ
- 公開URL: https://mlb-data.vercel.app/
- 環境変数は原則不要（公開API + CSV運用）
- 再取得トリガー:
  - GitHub Actions（6時間ごと）でCSV更新→自動コミット→自動デプロイ
  - 手動: `npm run fetch-data` 実行後 push

---

## 9. 完了条件

- [x] Web公開URLでホーム/ディビジョン順位/チーム詳細/選手一覧/選手詳細/比較が閲覧可能
- [x] 試合結果ページで日付別の試合結果を閲覧可能
- [x] ホームページに最新試合結果を表示
- [x] 順位表がMLBレギュレーション（ディビジョン基準）に整合している
- [x] 開幕直後でも画面崩れ・`NaN` 表示がない
- [x] 4選手比較が動作し、欠損項目は `N/A` 表示
- [x] データ更新後、Vercel上の表示に反映される
- [x] スケジュール差分取得が動作している

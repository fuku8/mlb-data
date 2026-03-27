# MLB Data Dashboard

MLBのチーム・選手・試合データを可視化するダッシュボードです。

## デプロイURL（Vercel）

- Production: https://mlb-data.vercel.app/

## 主要機能

| ページ | パス | 概要 |
|--------|------|------|
| ホーム | `/` | 最新試合結果 + チームクイックリンク + ディビジョン別順位スナップショット |
| 順位表 | `/standings` | AL/NL × East/Central/West の6ディビジョン別順位表 |
| 試合結果 | `/games` | 日付別の試合結果一覧（日付セレクター付き） |
| 選手一覧 | `/players` | 打撃/投球タブ切替、ソート、ページネーション、小サンプル警告 |
| 選手詳細 | `/players/[id]` | スタッツカードグリッド（打者/投手/二刀流で自動切替） |
| チーム詳細 | `/teams/[id]` | チーム成績 + ロスター + 選手スタッツ |
| 選手比較 | `/compare` | 最大4選手の並列比較（テーブル + チャート） |

## 技術スタック

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Data**: MLB Stats API → CSV → Server Components
- **Deploy**: Vercel (Git連携自動デプロイ)
- **Data Fetch**: Python 3 (`scripts/fetch-mlb-data.py`)

## セットアップ

```bash
npm install
npm run fetch-data   # MLBデータ取得
npm run dev          # 開発サーバー起動
```

## ディレクトリ構成

```text
mlb-data/
├── data/                          # CSV/JSONデータ（自動生成）
│   ├── schedule.csv               # シーズン全試合（差分取得）
│   ├── standings.csv              # 順位
│   ├── teams.csv                  # チーム情報
│   ├── players.csv                # 選手基本情報
│   ├── player_hitting.csv         # 打撃スタッツ
│   ├── player_pitching.csv        # 投球スタッツ
│   ├── player_fielding.csv        # 守備スタッツ
│   └── last_updated.txt           # 最終更新時刻
├── scripts/
│   └── fetch-mlb-data.py          # データ取得スクリプト
├── src/
│   ├── app/                       # Next.js ページ
│   ├── components/                # 共通コンポーネント
│   └── lib/                       # データローダー・型定義・ユーティリティ
├── plan.md                        # 実装プラン
├── ui-plan.md                     # UIプラン
└── README.md
```

## データ更新

### GitHub Actions（自動）

- ワークフロー: `.github/workflows/fetch-mlb-data.yml`
- 定期実行: 6時間ごと
- 手動実行: `workflow_dispatch`（season/date指定可）
- `data/` に差分がある場合のみ自動コミット → Vercel自動デプロイ

### スケジュール差分取得

試合結果（`schedule.csv`）は差分取得に対応:
- 既存CSVの最新Final日付以降のみAPIから取得
- 初回はシーズン全体をフル取得
- `game_pk` で重複排除、新しいデータを優先

### 手動更新

```bash
npm run fetch-data   # データ取得
git add data/
git commit -m "chore(data): update mlb data"
git push
```

## データソース

- **MLB Stats API** (`https://statsapi.mlb.com/api/v1/`) - 主要データソース

## 利用条件

- 利用形態: **非商用**
- 元データの再配布サイト化はしない（ダッシュボード表示用途に限定）
- MLBデータ利用条件: http://gdx.mlb.com/components/copyright.txt

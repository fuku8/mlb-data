# MLB Data Dashboard

`~/nba-data/` と同じ方針で構築する、MLBデータ可視化プロジェクトです。

## 対象データ

- チーム順位・試合日程・試合結果
- 選手基本情報
- 選手スタッツ（打撃 / 投球 / 守備）

## 主要機能（予定）

- 選手検索（名前・チーム・ポジション・成績フィルター）
- 選手比較（最大4選手、打撃/投球指標の並列比較）
- 開幕直後対応（小サンプル警告、最低PA/IP閾値、N/A表示）

## 利用条件（このリポジトリの前提）

- 利用形態: 非商用
- 公開形態: Web公開あり
- 注意:
  - 元データの再配布サイト化はしない（ダッシュボード表示用途に限定）
  - 大量取得を避ける（更新頻度は日次〜数時間間隔）
  - 利用条件変更に備えて取得レイヤーを分離する

MLBデータ利用条件参照:
- http://gdx.mlb.com/components/copyright.txt

## 想定データソース

1. MLB Stats API (`https://statsapi.mlb.com/api/v1/`)
2. Baseball Savant（必要時のみ）
3. Retrosheet（履歴分析向け）

## 初期構成

```text
mlb-data/
├── data/
├── scripts/
├── src/
├── plan.md
└── README.md
```

## 次の実装ステップ

Next.js（App Router）で実装し、Vercelへデプロイする前提です。  
詳細は [plan.md](./plan.md) を参照。

## データ更新運用（GitHub Actions）

- ワークフロー: `.github/workflows/fetch-mlb-data.yml`
- 実行タイミング:
  - 定期実行: 6時間ごと
  - 手動実行: `workflow_dispatch`（season/date指定可）
- 処理内容:
  - `scripts/fetch-mlb-data.py` を実行
  - `data/` に差分がある場合のみ自動コミット

# MLB UI Rework Plan (Aligned to nba-data)

## Goal
- `nba-data` に近い視覚トーン（黒背景、濃淡カード、小さめナビ、密度高めテーブル）へ統一する。
- MVPとして成立する導線を確保する（Home / Standings / Team Detail / Players / Search / Compare）。

## 1. Header
- Sticky header + dark translucent background + active navigation state
- 常に `Home` へ戻れる導線を保持
- ナビ項目は `nba-data` と同じ情報設計に寄せる（ホーム/順位表/選手/比較/検索）

## 2. Main Content
- カードベースでセクション分割（見出し + 補足テキスト + テーブル）
- `Team Quick Links` は可読性優先:
  - 背景を暗色
  - 文字を明色
  - ホバー時の視認性確保
- Standings / Team / Players 全てで「チーム名→個別チームページ」導線を統一

## 3. Players Page
- 長大テーブルをページネーションに変更（default 25件）
- `page`, `perPage`, `season`, `group`, `q` をクエリで保持
- 上下どちらからでもページ遷移できるUI

## 4. Team Detail Page
- チーム要約（W-L, PCT, GB, Run Diff）
- ロスター + スタッツ（hitting/pitching切替）
- 選手名リンクで個別選手ページへ遷移

## 5. Footer
- 全ページ共通フッターを追加
- データ出典・非商用・利用条件リンクを明示

## 6. Acceptance Criteria
- Quick Links の文字が常に可読
- Players は1ページに収まり、ページ移動で全件閲覧可能
- ヘッダー/フッターが全ページ共通
- `Home -> Standings -> Team -> Player` の導線が途切れない

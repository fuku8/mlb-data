# MLB UI Plan

## Goal
- `nba-data` に近い視覚トーン（黒背景、濃淡カード、小さめナビ、密度高めテーブル）へ統一する。
- MVPとして成立する導線を確保する（Home / Standings / Games / Players / Compare）。

---

## 1. Header / Navigation ✅

- Sticky header + dark translucent background (`rgba(10,10,10,0.95)`) + backdrop blur
- 常に `Home` へ戻れる導線を保持
- ナビ項目: **ホーム / 順位表 / 試合 / 選手 / 比較**
- 各項目にアイコン付き（Lucide React: LayoutDashboard, Trophy, Calendar, Users, GitCompareArrows）
- モバイルではラベル非表示、アイコンのみ
- アクティブ状態のハイライト表示

## 2. Home Page (`/`) ✅

### 2.1 Latest Results セクション
- 最新のFinal試合結果をカード型グリッドで表示
- `GameCard` コンポーネント（compact モード）を使用
- 勝利チーム太字 / 敗戦チーム薄表示
- 「All games →」リンクで `/games` ページへ遷移
- 日付表示: `YYYY/MM/DD` 形式

### 2.2 Team Quick Links
- 勝率上位12チームをピル型リンクで表示
- 暗色背景 + 明色文字、ホバー時の視認性確保
- チーム詳細ページへリンク

### 2.3 Standings Snapshot
- AL / NL のリーグバッジ（青 / 赤）
- ディビジョン別（East / Central / West）のミニテーブル
- 表示項目: #, Team, W, L, PCT, GB
- チーム名からチーム詳細ページへリンク

## 3. Games Page (`/games`) ✅

- 日付セレクター（`<select>` + Go ボタン）
- 前後日付ナビゲーション（← / →）
- `GameCard` コンポーネント（通常サイズ）でカード型グリッド表示
  - グリッド: `repeat(auto-fill, minmax(320px, 1fr))`
  - Final: 緑バッジ / それ以外: 黄バッジ
  - 勝利チーム太字（700） / 敗戦チーム薄表示（opacity 0.5）
  - スコアは tabular-nums で等幅表示
  - 球場名を右上に表示
  - チーム名からチーム詳細ページへリンク
- 試合がない日は「この日の試合データはありません。」メッセージ
- `aria-label` 付きアクセシビリティ対応

### GameCard 共通コンポーネント (`components/game-card.tsx`)
- `compact` prop でサイズ切替（Home用 / Games用）
- compact: フォントサイズ小さめ（badge 10px, score 18px, team 13px）
- 通常: フォントサイズ標準（badge 11px, score 22px）

## 4. Standings Page (`/standings`) ✅

- ディビジョン別6ブロック表示
- AL East / AL Central / AL West / NL East / NL Central / NL West
- divisionRank 優先ソート
- チーム名からチーム詳細ページへリンク

## 5. Players Page (`/players`) ✅

- 打撃 / 投球タブ切替（`group` パラメータ）
- ページネーション（25 / 50 / 100件）
- クエリパラメータ保持: `page`, `perPage`, `season`, `group`, `q`, `sortBy`, `sortDir`
- 上下どちらからでもページ遷移可能
- 全カラムでソート可能（ヘッダークリック）
- 小サンプル警告: PA < 30 / IP < 10 に ⚠ 表示
- 選手名リンクで個別選手ページへ遷移

## 6. Player Detail Page (`/players/[playerId]`) ✅

### 6.1 プロフィールカード
- 選手名（大きめ）、ID、ポジション、チーム名（リンク付き）
- 「← Back to players」リンク

### 6.2 スタッツカードグリッド
- `StatGrid` / `StatCell` コンポーネントでグリッド表示
- グリッド: `repeat(auto-fill, minmax(90px, 1fr))`（画面幅に応じて自動列数）
- 各カード: ラベル（上、小文字、muted）+ 値（下、大きめ、太字）
- 背景: `var(--background)`、角丸 8px

### 6.3 表示制御（データ有無判定）
- `player.hitting` が存在 → Hitting セクション表示
- `player.pitching` が存在 → Pitching セクション表示
- `player.fielding` が存在 → Fielding セクション表示
- 二刀流選手（大谷 = TWP）は打撃 + 投球の両方を表示
- データなしのセクションは非表示（空のN/Aカードを並べない）

## 7. Team Detail Page (`/teams/[teamId]`) ✅

- チーム要約（W-L, PCT, GB, Run Diff）
- ロスター + スタッツ（hitting / pitching 切替）
- 選手名リンクで個別選手ページへ遷移

## 8. Compare Page (`/compare`) ✅

- 最大4選手を同時選択・比較
- 打撃指標比較（AVG, OBP, SLG, OPS, HR, RBI 等）
- 投球指標比較（ERA, WHIP, SO, BB, IP 等）
- 表形式 + チャート表示
- クエリパラメータで状態共有

## 9. Footer ✅

- 全ページ共通フッター
- データ出典: MLB Stats API
- 非商用表示
- 利用条件リンク: `gdx.mlb.com/components/copyright.txt`

---

## 10. デザインシステム

### カラー
- 背景: `#0a0a0a` (body) / `oklch(0.205 0 0)` (card)
- テキスト: `#f5f5f5` (primary) / `oklch(0.708 0 0)` (muted)
- ボーダー: `oklch(1 0 0 / 10%)`
- ステータスバッジ: `#166534` (Final/緑) / `#854d0e` (Scheduled/黄)
- リーグバッジ: `#1e3a8a` (AL/青) / `#7f1d1d` (NL/赤)

### タイポグラフィ
- ページタイトル: 34-38px, font-weight 700, line-height 1.1
- セクション見出し: h2 デフォルト
- テーブル: 14px
- スタッツカードラベル: 11px, weight 600, muted color
- スタッツカード値: 18px, weight 700
- スコア表示: 18-22px, tabular-nums

### レイアウト
- 全体: `display: grid, gap: 16`
- カード: `.card` クラス（padding 16px, border-radius 10px）
- テーブル: `.table-wrap` で横スクロール対応
- グリッド（試合カード）: `repeat(auto-fill, minmax(280-320px, 1fr))`
- グリッド（スタッツカード）: `repeat(auto-fill, minmax(90px, 1fr))`

---

## 11. Acceptance Criteria ✅

- [x] Quick Links の文字が常に可読
- [x] Players は1ページに収まり、ページ移動で全件閲覧可能
- [x] ヘッダー / フッターが全ページ共通
- [x] `Home → Standings → Team → Player` の導線が途切れない
- [x] `Home → Games` の導線がある（最新結果 → 全試合一覧）
- [x] 試合結果カードが Home と Games で共通コンポーネント
- [x] 選手詳細でデータのないセクションは非表示
- [x] 二刀流選手で打撃 + 投球の両セクションが表示される
- [x] モバイルでもレイアウトが崩れない（グリッド auto-fill）

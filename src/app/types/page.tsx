// 選手タイプ解説＋リーダーボード: 判定の仕組みの説明と、タイプ別トップ10（fallback除外）
import Link from "next/link";
import { getPlayerHitting, getPlayerPitching, getPlayers } from "@/lib/data/loaders";
import { isQualifiedHitter, isQualifiedPitcher, mergePlayerStatsBySeason } from "@/lib/data/normalizers";
import {
  classifyHitters,
  classifyPitchers,
  getTypeLeaderboard,
  HITTER_TYPE_NAMES,
  PITCHER_TYPE_NAMES,
  type LeaderboardPlayer,
} from "@/lib/player-types";

const HITTER_TYPE_DESC: Record<string, string> = {
  パワーヒッター: "らしさ: ISO(=SLG−AVG、長打力)と本塁打率の平均。評価点: SLG・本塁打数・wOBAの平均。",
  安打製造機: "らしさ: 打率と低三振率（三振の少なさ）の平均。評価点: 打率・出塁率・安打数の平均。",
  スピードスター: "らしさ: 盗塁企図率（(SB+CS)/試合）と三塁打率の平均。評価点: 盗塁数・盗塁成功率・得点数の平均。",
  選球の達人: "らしさ: 四球率とBB/K（四球÷三振）の平均。評価点: 出塁率・四球率・wOBAの平均。",
  ポイントゲッター: "らしさ: 打点率（打点/打席）。評価点: 打点数・長打率・wOBAの平均。",
  オールラウンダー: "らしさ: 打率・出塁率・ISO・盗塁数・BB/Kの5部門パーセンタイルの水準×均等さ（高水準でバランスが取れているほど高い）。評価点: そのバランス値をリーグ内でパーセンタイル化したもの。",
};

const PITCHER_TYPE_DESC: Record<string, string> = {
  ドクターK: "らしさ: K/9（9イニングあたり奪三振）。評価点: K/9・K-BB%・ERA（低いほど良い）の平均。",
  精密機械: "らしさ: BB/9の低さ（少ないほど良い）。評価点: BB/9の低さ・WHIPの低さ・K/BBの平均。",
  ワークホース: "らしさ: 投球アウト数・先発数・完投数の平均。評価点: 投球アウト数・ERAの低さ・WHIPの低さの平均。",
  守護神: "らしさ: セーブの生カウントをリーグ内でz標準化した値。セーブはクローザーに機会が集中し大多数が0のゼロ過多分布のため、パーセンタイル化するとセーブ1〜2でも高評価になってしまう。生カウントのままz標準化することで、真のクローザー相当だけが選ばれるようにしている。評価点: セーブ数・ERAの低さ・K-BB%の平均（こちらはパーセンタイルベース）。",
  中継ぎの柱: "らしさ: ホールドの生カウントをリーグ内でz標準化した値。守護神と同じ理由（ホールドもセットアッパーに集中するゼロ過多分布）で、生カウントのz標準化を採用している。評価点: ホールド数・ERAの低さ・WHIPの低さの平均（こちらはパーセンタイルベース）。",
  グラウンドボーラー: "らしさ: ゴロ/フライ比率。評価点: ゴロ/フライ比率・HR/9の低さ・ERAの低さの平均。MLB専用のタイプ。",
};

function Board({ players }: { players: LeaderboardPlayer[] }) {
  if (players.length === 0) {
    return <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 13 }}>該当選手なし</p>;
  }
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
      {players.map((p, i) => (
        <li key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <span style={{ width: 20, textAlign: "right", fontFamily: "monospace", color: "var(--muted-foreground)" }}>{i + 1}</span>
          <Link href={`/players/${p.id}`} style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.name}
          </Link>
          <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{Math.round(p.score * 100)}</span>
        </li>
      ))}
    </ol>
  );
}

function TypeSection({ name, desc, players }: { name: string; desc: string; players: LeaderboardPlayer[] }) {
  return (
    <section className="card">
      <h2 style={{ marginTop: 0, marginBottom: 6 }}>{name}</h2>
      <p style={{ marginTop: 0, marginBottom: 12, color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.6 }}>{desc}</p>
      <Board players={players} />
    </section>
  );
}

export default async function TypesPage() {
  const [players, hitting, pitching] = await Promise.all([getPlayers(), getPlayerHitting(), getPlayerPitching()]);
  const merged = mergePlayerStatsBySeason({ players, hitting, pitching, fielding: [] });

  const hitterPool = merged.filter((r) => isQualifiedHitter(r.hitting?.plateAppearances ?? null));
  const pitcherPool = merged.filter((r) => isQualifiedPitcher(r.pitching?.inningsPitched));

  const hitterBoard = getTypeLeaderboard(hitterPool, classifyHitters(hitterPool), HITTER_TYPE_NAMES);
  const pitcherBoard = getTypeLeaderboard(pitcherPool, classifyPitchers(pitcherPool), PITCHER_TYPE_NAMES);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="card">
        <h1 style={{ margin: "0 0 12px", fontSize: 30, lineHeight: 1.1 }}>選手タイプ</h1>
        <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.7 }}>
          プレースタイル（何をする選手か）を表す特徴量を規定到達者内でパーセンタイル化し、リーグ平均からのz標準化スコアが+1.0以上のタイプを最大3つ、評価点（そのタイプの職務に対応するパーセンタイルの平均）順に付与する。
          +1.0以上のタイプが1つもない選手には、最もzスコアが高いタイプ1つだけを「（参考）」付きで表示する——これは「明確な適合はないが強いて言えば」という消去法の表示で、下記のリーダーボードには含まれない。
          リーダーボードは各タイプに+1.0以上で適合した選手のみを評価点順に最大10人表示する。
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>打者タイプ</h2>
      </section>
      {hitterBoard.map(({ type, players }) => (
        <TypeSection key={type} name={type} desc={HITTER_TYPE_DESC[type] ?? ""} players={players} />
      ))}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>投手タイプ</h2>
      </section>
      {pitcherBoard.map(({ type, players }) => (
        <TypeSection key={type} name={type} desc={PITCHER_TYPE_DESC[type] ?? ""} players={players} />
      ))}
    </div>
  );
}

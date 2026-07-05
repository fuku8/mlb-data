// 指標解説ページ: feel-vizで追加した各ビジュアルの意味・計算方法・母集団・注意点をまとめる

interface MetricSection {
  id: string;
  title: string;
  where: string;
  what: string;
  how: string;
  population: string;
  caveat: string;
}

const SECTIONS: MetricSection[] = [
  {
    id: "percentile",
    title: "League Percentile（リーグ内パーセンタイル）",
    where: "選手詳細ページ（打者/投手）",
    what: "各スタッツがリーグの中でどの位置にあるかを0〜100で表したもの。100が最上位、0が最下位。バーの位置と色（青=低い→赤=高い）だけで、数字を覚えていなくても選手の強み・弱みが一目でわかる。",
    how: "mid-rank方式で算出: (自分より下位の人数 + 自分と同値の人数 ÷ 2) ÷ 母集団数。同値の選手を公平に扱うため、同着はタイの半分だけ加算する。対象は打者がAVG・OBP・SLG・OPS・HR・SB・BB%(=BB/PA)・K%(=SO/PA)・ISO(=SLG−AVG)の9項目、投手がERA・WHIP・BB/9・HR/9・被打率・K/9・K/BBの7項目。",
    population: "打者は規定打者（PA≥30）、投手は規定投手（アウト数≥30）が母集団。同シーズン内でのみ比較する。",
    caveat: "K%・ERA・WHIP・BB/9・HR/9・被打率は「小さいほど良い」指標のため、パーセンタイルを反転して計算している（値が低いほどパーセンタイルが高くなる）。シーズン序盤は規定到達者そのものが少なく、数人の成績で分布全体が動きやすいので参考程度に見る。規定未到達の選手はパーセンタイルを表示しない。",
  },
  {
    id: "radar",
    title: "5ツールレーダー / 投手レーダー",
    where: "選手詳細ページ",
    what: "打者は「ミート・出塁・長打・走塁・選球」、投手は「奪三振・制球・被打抑制・一発回避・走者管理」の5部門パーセンタイルを五角形にしたもの。面積が大きく形が丸いほど、高水準でバランスの取れた選手。",
    how: "打者はAVG(ミート)・OBP(出塁)・ISO=SLG−AVG(長打)・SB(走塁)・BB/K(選球、BB÷max(SO,1))の5項目をパーセンタイル化。投手はK/9(奪三振)・BB/9反転(制球)・被打率反転(被打抑制)・HR/9反転(一発回避)・WHIP反転(走者管理)の5項目。総合スコア = 5部門パーセンタイルの平均 ×（1 − 標準偏差）。水準が高いだけでなく、5部門が均等なほどスコアが伸びる。",
    population: "打者は規定打者（PA≥30）、投手は規定投手（アウト数≥30）。",
    caveat: "細長い形はスペシャリスト型を意味し、それ自体が選手の個性。総合スコアは「オールラウンドさ」の指標なので、1〜2部門に極端に秀でた選手はむしろスコアが伸びにくい。",
  },
  {
    id: "waffle",
    title: "塁打構成ワッフル",
    where: "選手詳細ページ（規定打者のみ）",
    what: "総塁打（単打×1・二塁打×2・三塁打×3・本塁打×4）の内訳を100マスの正方形で表示したもの。同じ塁打数でも「打ち方の質」がまったく違うことが視覚的にわかる。",
    how: "各打撃内容の塁打数（例: 本塁打なら本塁打数×4）をシーズン総塁打で割った比率を100マスに割り当てる。四捨五入で合計が100からずれた分は最大シェアの区分で端数調整し、必ず100マスになるようにしている。",
    population: "規定打者（PA≥30）のみ表示。未到達の場合はカード自体を表示しない。",
    caveat: "本塁打の色が多い選手はパワー型、単打の色が多い選手はコンタクト型の目安になる。あくまで塁打の内訳であり、打率やOPSのような「質」全体を表す指標ではない。",
  },
  {
    id: "gini",
    title: "打点依存度（Gini係数・ローレンツ曲線）",
    where: "チーム詳細ページ",
    what: "チームの打点（RBI）が特定の選手にどれだけ偏っているかを、1つの数値（Gini係数）と曲線（ローレンツ曲線）で表したもの。所得格差の分析に使われる手法をチーム内のRBI分布に応用している。",
    how: "規定打者（PA≥30）のRBI分布からGini係数を算出（0=全員が完全に均等、1に近いほど偏りが大きい）。ローレンツ曲線は選手をRBIの少ない順に並べ、累積シェアをプロットしたもの。対角線（完全均等線）から離れるほど偏りが大きい。",
    population: "規定打者（PA≥30）。チーム内の規定打者が3人未満の場合はカード自体を非表示にしている。",
    caveat: "Gini係数が高い=エース依存、低い=全員野球というだけで、良し悪しを直接示す指標ではない。シーズン序盤は規定打者の人数自体が少なく、1人の好不調で数値が大きく動きやすい。",
  },
  {
    id: "heartbeat",
    title: "Season Heartbeat（シーズン心電図）",
    where: "チーム詳細ページ",
    what: "Final（終了済み）試合の得点差を時系列のバー列にしたもの。上（緑）=勝ち、下（赤）=負け、バーの高さ=点差の大きさ。シーズンの調子の波が心電図のように見える。",
    how: "各試合の「自チーム得点 − 相手得点」を時系列に並べ、±10点でキャップして表示する（10点差以上の大差もバーの高さは同じになる）。バーにカーソルを合わせると日付・対戦相手・スコアが表示される。",
    population: "対象チームのFinal試合すべて（シーズン全体）。",
    caveat: "schedule.csvにシーズン列がないため、現状は複数シーズンをまたぐ場合に区別できない（1シーズン運用のため実害なし）。",
  },
  {
    id: "quadrant",
    title: "打者マップ・投手マップ（四象限）",
    where: "選手一覧ページ（打撃/投球タブ）",
    what: "打者マップはOBP(横)×SLG(縦)、投手マップはBB/9(横)×K/9(縦)の散布図。破線（中央値）で4つの象限に分かれ、選手のタイプが一目でわかる。投手マップは右下（K/9高×BB/9低）が優秀な象限。",
    how: "破線は各軸の中央値（対象人数が偶数の場合は中央2値の平均）。ドットにカーソルを合わせると選手名・所属チーム・両軸の値が表示される。",
    population: "打者マップは規定打者（PA≥30）、投手マップは規定投手（アウト数≥30）。検索条件によらず同シーズンの規定到達者全員が対象。",
    caveat: "シーズン序盤は規定到達者数自体が少なく、中央値が数人の成績で大きく動く。母集団が小さいうちは象限の解釈に注意する。",
  },
];

export default function MetricsPage() {
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
      <section className="card">
        <h1 style={{ margin: "0 0 12px", fontSize: 30, lineHeight: 1.1 }}>指標解説</h1>
        <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
          このダッシュボードのビジュアル指標は、数値そのものではなくリーグ内での位置・分布の形・時間の推移に置き換えることで、スタッツの意味を体感的に伝えることを目指している。各カードのタイトル横にある「?」アイコンから、このページの該当セクションに飛べる。
        </p>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className="card" style={{ scrollMarginTop: 72 }}>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>{s.title}</h2>
          <p style={{ marginTop: 0, marginBottom: 12, color: "var(--muted-foreground)", fontSize: 13 }}>
            表示場所: {s.where}
          </p>
          <div style={{ display: "grid", gap: 10, fontSize: 14, lineHeight: 1.7 }}>
            <p style={{ margin: 0 }}>{s.what}</p>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 2 }}>
                計算方法
              </div>
              <p style={{ margin: 0 }}>{s.how}</p>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 2 }}>
                母集団
              </div>
              <p style={{ margin: 0 }}>{s.population}</p>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 2 }}>
                注意点
              </div>
              <p style={{ margin: 0 }}>{s.caveat}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

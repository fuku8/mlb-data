// ラック指数: 期待値との乖離を「追い風/向かい風」に翻訳する。判定文は控えめ表現（〜の可能性）
export interface LuckResult {
  delta: number;
  direction: "tail" | "head" | "neutral"; // tail=追い風（実績が出来すぎ）
  label: string;
}

function classify(
  delta: number,
  mild: number,
  strong: number,
  posDir: "tail" | "head",
  posText: string,
  negDir: "tail" | "head",
  negText: string,
): LuckResult {
  const abs = Math.abs(delta);
  if (abs < mild) return { delta, direction: "neutral", label: "平年並み。実力どおりの成績と見てよさそう" };
  const strength = abs >= strong ? "かなり" : "やや";
  return delta > 0
    ? { delta, direction: posDir, label: `${strength}${posText}` }
    : { delta, direction: negDir, label: `${strength}${negText}` };
}

// メーター表示用: 方向に符号を揃えた値（正=追い風tail、負=向かい風head、neutralは中央=0）
// 投手はdelta正=向かい風のため、生deltaの符号でマーカーを置くと左右が逆になる
export function meterValue(result: LuckResult): number {
  if (result.direction === "tail") return Math.abs(result.delta);
  if (result.direction === "head") return -Math.abs(result.delta);
  return 0;
}

// 打者: BABIP − リーグ平均。正=追い風（インプレー打球が平均より多く安打に）
export function hitterLuck(babipValue: number, leagueAvg: number): LuckResult {
  return classify(
    babipValue - leagueAvg, 0.015, 0.04,
    "tail", "追い風。好調の一部は運の上振れの可能性",
    "head", "向かい風。実力より低い成績に見えている可能性",
  );
}

// 打者X版: wOBA実測 − xwOBA（打球の速度・角度から算出される期待値）。正=追い風（出来すぎ）
// BABIP版よりも打球の質そのものを基準にするため守備位置・球場の影響が残る点はBABIP版と同様
export function hitterLuckX(wobaActual: number, xwoba: number): LuckResult {
  return classify(
    wobaActual - xwoba, 0.01, 0.025,
    "tail", "追い風。打球の質から期待される以上の結果が出ている可能性",
    "head", "向かい風。打球の質の割に結果が出ていない可能性",
  );
}

// 投手: ERA − FIP。正=向かい風（FIPが示す実力より失点が多い）
export function pitcherLuck(era: number, fip: number): LuckResult {
  return classify(
    era - fip, 0.3, 0.7,
    "head", "向かい風。守備や残塁運に恵まれていない可能性",
    "tail", "追い風。ERAの良さの一部は運や守備の助けの可能性",
  );
}

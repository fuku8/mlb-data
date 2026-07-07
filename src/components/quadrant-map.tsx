"use client";

// 汎用象限マップ: 中央値クロスの散布図。青丸クリックで選手名ラベル表示→クリックで個人ページへ遷移

import { useState } from "react";

export interface QuadrantDot {
  player_id: string; // 選択状態/keyの一意な識別に使う（同姓同名選手対策）
  name: string;
  x: number;
  y: number;
  detail?: string; // <title>に併記する補足（チーム名など）
  href?: string; // 選手個人ページへのリンク（あればラベルをリンク化）
}

const W = 640;
const H = 420;
const PAD = { l: 50, r: 16, t: 20, b: 40 };

// 偶数個は中間2値の平均
function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

export function QuadrantMap({
  dots,
  xLabel,
  yLabel,
  xDigits = 2,
  yDigits = 2,
}: {
  dots: QuadrantDot[];
  xLabel: string;
  yLabel: string;
  xDigits?: number;
  yDigits?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (dots.length === 0) return null;
  const xs = dots.map((d) => d.x).sort((a, b) => a - b);
  const ys = dots.map((d) => d.y).sort((a, b) => a - b);
  const xMed = median(xs);
  const yMed = median(ys);
  const xPad = (xs[xs.length - 1] - xs[0]) * 0.05 || 1;
  const yPad = (ys[ys.length - 1] - ys[0]) * 0.05 || 1;
  const x0 = xs[0] - xPad;
  const x1 = xs[xs.length - 1] + xPad;
  const y0 = ys[0] - yPad;
  const y1 = ys[ys.length - 1] + yPad;

  const sx = (v: number) => {
    const f = (v - x0) / (x1 - x0);
    return PAD.l + f * (W - PAD.l - PAD.r);
  };
  const sy = (v: number) => {
    const f = (v - y0) / (y1 - y0);
    return H - PAD.b - f * (H - PAD.t - PAD.b);
  };

  const selectedDot = selected ? dots.find((d) => d.player_id === selected) : undefined;

  // ラベル位置: ドット近傍からスタートし、viewBoxをはみ出す場合は反対側へクランプ
  let labelX = 0;
  let labelY = 0;
  let labelText = "";
  let labelWidth = 0;
  const labelHeight = 20;
  if (selectedDot) {
    labelText = `${selectedDot.name}${selectedDot.detail ? ` (${selectedDot.detail})` : ""}`;
    labelWidth = labelText.length * 6.2 + 16; // ponytail: SVGテキスト幅の概算（getBBox計測はしない）
    const dotX = sx(selectedDot.x);
    const dotY = sy(selectedDot.y);
    labelX = dotX + 10;
    if (labelX + labelWidth > W - PAD.r) labelX = dotX - labelWidth - 10;
    if (labelX < 0) labelX = 2;
    labelY = dotY - 10;
    if (labelY - labelHeight < 0) labelY = dotY + labelHeight + 10;
    if (labelY > H) labelY = H - 4;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", minWidth: 480 }}
        role="img"
        aria-label={`${xLabel}と${yLabel}の散布図（中央値クロス）`}
        onClick={() => setSelected(null)}
      >
        <line x1={sx(xMed)} y1={PAD.t} x2={sx(xMed)} y2={H - PAD.b} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        <line x1={PAD.l} y1={sy(yMed)} x2={W - PAD.r} y2={sy(yMed)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        {dots.map((d) => (
          <g key={d.player_id}>
            <circle cx={sx(d.x)} cy={sy(d.y)} r={4} fill="#0ea5e9" fillOpacity={0.85}>
              <title>{`${d.name}${d.detail ? ` (${d.detail})` : ""}  ${xLabel} ${d.x.toFixed(xDigits)} / ${yLabel} ${d.y.toFixed(yDigits)}`}</title>
            </circle>
            {/* タップしやすいよう透明な当たり判定を重ねる */}
            <circle
              cx={sx(d.x)}
              cy={sy(d.y)}
              r={10}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                setSelected((prev) => (prev === d.player_id ? null : d.player_id));
              }}
            />
          </g>
        ))}
        {selectedDot && (
          <g onClick={(e) => e.stopPropagation()}>
            <rect x={labelX} y={labelY - labelHeight} width={labelWidth} height={labelHeight} rx={3} fill="#111827" fillOpacity={0.9} />
            {selectedDot.href ? (
              <a href={selectedDot.href}>
                <text x={labelX + 8} y={labelY - 6} fontSize={11} fill="#f9fafb" style={{ cursor: "pointer" }}>
                  {labelText}
                </text>
              </a>
            ) : (
              <text x={labelX + 8} y={labelY - 6} fontSize={11} fill="#f9fafb">
                {labelText}
              </text>
            )}
          </g>
        )}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.6}>
          {xLabel}→
        </text>
        <text
          x={14}
          y={(PAD.t + H - PAD.b) / 2}
          textAnchor="middle"
          fontSize={11}
          fill="currentColor"
          fillOpacity={0.6}
          transform={`rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`}
        >
          {yLabel}→
        </text>
      </svg>
    </div>
  );
}

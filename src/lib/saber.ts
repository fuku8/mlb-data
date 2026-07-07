// セイバー指標の純計算関数。UIから独立させ node --test で検証する
// wOBA係数はFanGraphs近年版で固定（リーグ・年度別の厳密係数ではない近似。/metricsに注記）

export interface WobaCounts {
  ab: number;
  bb: number;
  ibb: number;
  hbp: number;
  sf: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
}

export function woba(c: WobaCounts): number | null {
  const denom = c.ab + c.bb - c.ibb + c.sf + c.hbp;
  if (denom <= 0) return null;
  const ubb = c.bb - c.ibb;
  const singles = c.h - c.doubles - c.triples - c.hr;
  return (0.69 * ubb + 0.72 * c.hbp + 0.89 * singles + 1.27 * c.doubles + 1.62 * c.triples + 2.175 * c.hr) / denom;
}

export function babip(h: number, hr: number, ab: number, so: number, sf: number): number | null {
  const denom = ab - so - hr + sf;
  return denom > 0 ? (h - hr) / denom : null;
}

// FIPの分子/IP部分。定数Cを足す前の値
export function fipCore(hr: number, bb: number, hbp: number, so: number, ip: number): number | null {
  return ip > 0 ? (13 * hr + 3 * (bb + hbp) - 2 * so) / ip : null;
}

export interface FipLeagueRow {
  hr: number;
  bb: number;
  hbp: number;
  so: number;
  ip: number;
  er: number;
}

// リーグ定数C = リーグ平均ERA − リーグ合算fipCore。fip = fipCore + C でERAとスケールが揃う
export function fipConstant(rows: FipLeagueRow[]): number | null {
  let hr = 0, bb = 0, hbp = 0, so = 0, ip = 0, er = 0;
  for (const r of rows) {
    hr += r.hr; bb += r.bb; hbp += r.hbp; so += r.so; ip += r.ip; er += r.er;
  }
  if (ip <= 0) return null;
  const leagueEra = (9 * er) / ip;
  const core = fipCore(hr, bb, hbp, so, ip);
  return core === null ? null : leagueEra - core;
}

export function kbbPct(so: number, bb: number, bf: number): number | null {
  return bf > 0 ? (so - bb) / bf : null;
}

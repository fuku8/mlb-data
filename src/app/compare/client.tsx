"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { CompareRadar } from "@/components/compare-radar";
import { CardHeader } from "@/components/card-header";
import { TotalBasesWaffle } from "@/components/total-bases-waffle";
import type { RadarAxis } from "@/components/stat-radar";

// 同時比較できる選手数の上限。変更する場合はここだけ直せばよい
const MAX_PLAYERS = 4;

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"];

export interface CompareBatter {
  playerId: number;
  name: string;
  team: string;
  gp: string;
  pa: string;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
  hr: string;
  rbi: string;
  sb: string;
  bb: string;
  so: string;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  radar: RadarAxis[];
}

export interface ComparePitcher {
  playerId: number;
  name: string;
  team: string;
  gp: string;
  gs: string;
  w: string;
  l: string;
  sv: string;
  era: string;
  whip: string;
  ip: string;
  so: string;
  bb: string;
  k9: string;
  radar: RadarAxis[];
}

// ダイアクリティカルマーク除去（例: José を "jose" で検索可能に）
const normalizeName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const BATTER_STAT_ROWS: { label: string; get: (p: CompareBatter) => string }[] = [
  { label: "GP", get: (p) => p.gp },
  { label: "PA", get: (p) => p.pa },
  { label: "AVG", get: (p) => p.avg },
  { label: "OBP", get: (p) => p.obp },
  { label: "SLG", get: (p) => p.slg },
  { label: "OPS", get: (p) => p.ops },
  { label: "HR", get: (p) => p.hr },
  { label: "RBI", get: (p) => p.rbi },
  { label: "SB", get: (p) => p.sb },
  { label: "BB", get: (p) => p.bb },
  { label: "SO", get: (p) => p.so },
];

const PITCHER_STAT_ROWS: { label: string; get: (p: ComparePitcher) => string }[] = [
  { label: "GP", get: (p) => p.gp },
  { label: "GS", get: (p) => p.gs },
  { label: "W", get: (p) => p.w },
  { label: "L", get: (p) => p.l },
  { label: "SV", get: (p) => p.sv },
  { label: "ERA", get: (p) => p.era },
  { label: "WHIP", get: (p) => p.whip },
  { label: "IP", get: (p) => p.ip },
  { label: "SO", get: (p) => p.so },
  { label: "BB", get: (p) => p.bb },
  { label: "K/9", get: (p) => p.k9 },
];

// 選手検索・選択・削除の状態管理。打者タブ/投手タブで独立させる
function useSelection<T extends { playerId: number; name: string }>(pool: T[]) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");

  const suggestions = useMemo(() => {
    if (search.length < 1) return [];
    const q = normalizeName(search);
    return pool.filter((p) => normalizeName(p.name).includes(q) && !selectedIds.includes(p.playerId)).slice(0, 8);
  }, [search, pool, selectedIds]);

  const selected = selectedIds.map((id) => pool.find((p) => p.playerId === id)).filter((p): p is T => p != null);

  const add = (id: number) => {
    if (selectedIds.length < MAX_PLAYERS && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
      setSearch("");
    }
  };

  const remove = (id: number) => setSelectedIds(selectedIds.filter((n) => n !== id));

  return { search, setSearch, suggestions, selected, add, remove };
}

export function CompareClient({
  batters,
  pitchers,
  season,
}: {
  batters: CompareBatter[];
  pitchers: ComparePitcher[];
  season: string;
}) {
  const [tab, setTab] = useState<"batting" | "pitching">("batting");
  const battersSel = useSelection(batters);
  const pitchersSel = useSelection(pitchers);
  const active = tab === "batting" ? battersSel : pitchersSel;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="card">
        <h1 style={{ margin: "0 0 8px", fontSize: 34, lineHeight: 1.1 }}>検索</h1>
        <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
          選手を追加すると比較表・レーダーチャートが表示されます（1名から可、最大{MAX_PLAYERS}名で比較）。打者・投手は混在できません。
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className={tab === "batting" ? "primary" : undefined} onClick={() => setTab("batting")} type="button">
            打者比較
          </button>
          <button className={tab === "pitching" ? "primary" : undefined} onClick={() => setTab("pitching")} type="button">
            投手比較
          </button>
        </div>

        <div style={{ position: "relative", maxWidth: 360, marginTop: 16 }}>
          <input
            placeholder={`選手名を入力（最大${MAX_PLAYERS}人）...`}
            value={active.search}
            onChange={(e) => active.setSearch(e.target.value)}
            disabled={active.selected.length >= MAX_PLAYERS}
            style={{ width: "100%" }}
          />
          {active.suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                zIndex: 10,
                width: "100%",
                marginTop: 4,
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              {active.suggestions.map((p) => (
                <button
                  key={p.playerId}
                  type="button"
                  onClick={() => active.add(p.playerId)}
                  style={{
                    display: "flex",
                    width: "100%",
                    gap: 8,
                    alignItems: "center",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: 0,
                    background: "transparent",
                    textAlign: "left",
                  }}
                >
                  {p.name}
                  <span style={{ color: "var(--muted-foreground)" }}>({p.team})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {active.selected.map((p, i) => (
            <span
              key={p.playerId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                background: "var(--secondary)",
                borderLeft: `3px solid ${COLORS[i]}`,
                fontSize: 13,
              }}
            >
              {p.name} ({p.team})
              <button
                type="button"
                onClick={() => active.remove(p.playerId)}
                style={{ border: "none", background: "transparent", padding: 0, display: "flex" }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </section>

      {active.selected.length === 0 && (
        <section className="card">
          <p style={{ margin: 0, textAlign: "center", color: "var(--muted-foreground)" }}>
            上の検索欄から選手を追加してください（最大{MAX_PLAYERS}人）
          </p>
        </section>
      )}

      {tab === "batting" && battersSel.selected.length > 0 && (
        <>
          <section className="card table-wrap">
            <CardHeader title="比較表" />
            <table>
              <thead>
                <tr>
                  <th>選手</th>
                  {BATTER_STAT_ROWS.map((row) => (
                    <th key={row.label} style={{ textAlign: "right" }}>
                      {row.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {battersSel.selected.map((p, i) => (
                  <tr key={p.playerId}>
                    <td>
                      <Link href={`/players/${p.playerId}?season=${season}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ height: 10, width: 10, borderRadius: "50%", backgroundColor: COLORS[i], flexShrink: 0 }} />
                        {p.name}
                      </Link>
                    </td>
                    {BATTER_STAT_ROWS.map((row) => (
                      <td key={row.label} style={{ textAlign: "right", fontFamily: "monospace" }}>
                        {row.get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <CompareRadar
            title="スタッツ比較（5ツール・パーセンタイル）"
            note="規定打者内でのパーセンタイル。選手ページと同じ算出方式"
            series={battersSel.selected.map((p, i) => ({ name: p.name, color: COLORS[i], axes: p.radar }))}
          />

          <section className="card">
            <CardHeader title="塁打構成比較" />
            <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              {battersSel.selected.map((p, i) => (
                <div key={p.playerId}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontWeight: 600 }}>
                    <span style={{ height: 10, width: 10, borderRadius: "50%", backgroundColor: COLORS[i], flexShrink: 0 }} />
                    {p.name}
                  </div>
                  <TotalBasesWaffle hits={p.hits} doubles={p.doubles} triples={p.triples} homeRuns={p.homeRuns} bare />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === "pitching" && pitchersSel.selected.length > 0 && (
        <>
          <section className="card table-wrap">
            <CardHeader title="比較表" />
            <table>
              <thead>
                <tr>
                  <th>選手</th>
                  {PITCHER_STAT_ROWS.map((row) => (
                    <th key={row.label} style={{ textAlign: "right" }}>
                      {row.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pitchersSel.selected.map((p, i) => (
                  <tr key={p.playerId}>
                    <td>
                      <Link href={`/players/${p.playerId}?season=${season}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ height: 10, width: 10, borderRadius: "50%", backgroundColor: COLORS[i], flexShrink: 0 }} />
                        {p.name}
                      </Link>
                    </td>
                    {PITCHER_STAT_ROWS.map((row) => (
                      <td key={row.label} style={{ textAlign: "right", fontFamily: "monospace" }}>
                        {row.get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <CompareRadar
            title="投手レーダー比較（パーセンタイル）"
            note="規定投手内でのパーセンタイル。選手ページと同じ算出方式"
            series={pitchersSel.selected.map((p, i) => ({ name: p.name, color: COLORS[i], axes: p.radar }))}
          />
        </>
      )}
    </div>
  );
}

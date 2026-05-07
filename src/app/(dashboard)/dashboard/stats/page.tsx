"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DealStage } from "@/types/database";

const STAGES: { id: DealStage; label: string }[] = [
  { id: "lead",         label: "Lead" },
  { id: "bezichtiging", label: "Bezichtiging" },
  { id: "bod",          label: "Bod" },
  { id: "koopakte",     label: "Koopakte" },
  { id: "voorwaarden",  label: "Voorwaarden" },
  { id: "financiering", label: "Financiering" },
  { id: "overdracht",   label: "Overdracht" },
  { id: "gesloten",     label: "Gesloten" },
];

type Period = "maand" | "kwartaal" | "jaar";

interface Deal {
  id: string;
  address: string | null;
  title: string;
  stage: string;
  agreed_price: number | null;
  value: number | null;
  created_at: string;
  updated_at: string | null;
  buyer_name: string | null;
}

function periodStart(p: Period): Date {
  const now = new Date();
  if (p === "maand") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === "kwartaal") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  return new Date(now.getFullYear(), 0, 1);
}

function formatEuro(v: number) {
  return "€ " + Math.round(v).toLocaleString("nl-NL");
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default function StatsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("maand");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("deals")
        .select("id, address, title, stage, agreed_price, value, created_at, updated_at");
      setDeals((data ?? []) as Deal[]);
      setLoading(false);
    }
    load();
  }, []);

  const start = periodStart(period);
  const inPeriod = (d: Deal) => new Date(d.created_at) >= start;

  const periodDeals = deals.filter(inPeriod);
  const closed = periodDeals.filter((d) => d.stage === "gesloten");
  const closedPrices = closed.map((d) => d.agreed_price ?? d.value ?? 0).filter((v) => v > 0);
  const totalRevenue = closedPrices.reduce((s, v) => s + v, 0);
  const avgPrice = closedPrices.length ? totalRevenue / closedPrices.length : 0;

  const avgDays = closed.length
    ? closed.reduce((s, d) => {
        const days = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000);
        return s + days;
      }, 0) / closed.length
    : 0;

  const stageCounts = STAGES.map((s) => ({
    ...s,
    count: periodDeals.filter((d) => d.stage === s.id).length,
  }));
  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);

  const KPIS = [
    { label: "Deals gesloten",    value: closed.length.toString(),                     sub: "In geselecteerde periode" },
    { label: "Totale omzet",      value: totalRevenue > 0 ? formatEuro(totalRevenue) : "—", sub: "Som gesloten deals" },
    { label: "Gem. verkoopprijs", value: avgPrice > 0 ? formatEuro(avgPrice) : "—",    sub: "Gemiddelde koopsom" },
    { label: "Gem. doorlooptijd", value: avgDays > 0 ? `${Math.round(avgDays)} dagen` : "—", sub: "Aangemaakt → gesloten" },
  ];

  const PERIODS: { id: Period; label: string }[] = [
    { id: "maand",    label: "Deze maand" },
    { id: "kwartaal", label: "Dit kwartaal" },
    { id: "jaar",     label: "Dit jaar" },
  ];

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>Laden…</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Statistieken</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>Jouw prestaties als makelaar</span>
        </div>
        {/* Period filter */}
        <div style={{ display: "flex", gap: "6px" }}>
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: active ? "600" : "400",
                  background: active ? "#0284c7" : "#fff",
                  color: active ? "#fff" : "#64748b",
                  border: active ? "1px solid #0284c7" : "1px solid #e8ecf0",
                  cursor: "pointer", transition: "all 0.1s",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {KPIS.map((k) => (
            <div key={k.label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "18px 20px" }}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>{k.label}</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", marginBottom: "4px" }}>{k.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "20px 24px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "16px" }}>Deals per fase</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {stageCounts.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", width: "100px", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
                <div style={{ flex: 1, background: "#f1f5f9", borderRadius: "4px", height: "20px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${(s.count / maxCount) * 100}%`,
                    background: s.id === "gesloten" ? "#22c55e" : "#0284c7",
                    borderRadius: "4px",
                    transition: "width 0.4s ease",
                    minWidth: s.count > 0 ? "4px" : "0",
                  }} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a", width: "24px", textAlign: "right", flexShrink: 0 }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Closed deals table */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>Gesloten deals</span>
          </div>
          {closed.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
              Nog geen gesloten deals
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Adres", "Koper", "Koopsom", "Gesloten op"].map((col) => (
                    <th key={col} style={{ padding: "10px 16px", fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left", borderBottom: "1px solid #e8ecf0" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closed.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: i < closed.length - 1 ? "1px solid #f8fafc" : "none" }}>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>{d.address ?? d.title}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>{d.buyer_name ?? "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                      {(d.agreed_price ?? d.value) ? formatEuro(d.agreed_price ?? d.value ?? 0) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>{formatDate(d.updated_at ?? d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

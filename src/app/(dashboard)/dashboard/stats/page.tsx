"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DealStage } from "@/types/database";

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: "lead",         label: "Lead",         color: "#94a3b8" },
  { id: "bezichtiging", label: "Bezichtiging", color: "#eab308" },
  { id: "bod",          label: "Bod",           color: "#3b82f6" },
  { id: "koopakte",     label: "Koopakte",      color: "#8b5cf6" },
  { id: "voorwaarden",  label: "Voorwaarden",   color: "#ef4444" },
  { id: "financiering", label: "Financiering",  color: "#f97316" },
  { id: "overdracht",   label: "Overdracht",    color: "#22c55e" },
  { id: "gesloten",     label: "Gesloten",      color: "#0284c7" },
];

type Period = "maand" | "kwartaal" | "jaar";

interface Deal {
  id: string;
  address: string | null;
  title: string | null;
  stage: string;
  agreed_price: number | null;
  asking_price: number | null;
  value: number | null;
  created_at: string;
  updated_at: string | null;
  contacts: { name: string | null } | null;
}

function periodStart(p: Period): Date {
  const now = new Date();
  if (p === "maand")    return new Date(now.getFullYear(), now.getMonth(), 1);
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
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("jaar");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("deals")
        .select("id, address, title, stage, agreed_price, asking_price, value, created_at, updated_at, contacts!deals_buyer_id_fkey(name)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      setDeals((data ?? []) as unknown as Deal[]);
      setLoading(false);
    }
    load();
  }, []);

  const start = periodStart(period);
  const inPeriod = (d: Deal) => new Date(d.created_at) >= start;

  const periodDeals = deals.filter(inPeriod);

  // KPIs use period-filtered deals
  const closedInPeriod = periodDeals.filter((d) => d.stage === "gesloten");
  const closedPrices = closedInPeriod.map((d) => d.agreed_price ?? d.value ?? 0).filter((v) => v > 0);
  const totalRevenue = closedPrices.reduce((s, v) => s + v, 0);
  const avgPrice = closedPrices.length ? totalRevenue / closedPrices.length : 0;
  const activeDeals = deals.filter((d) => d.stage !== "gesloten");
  const avgDays = activeDeals.length
    ? activeDeals.reduce((s, d) => s + Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000), 0) / activeDeals.length
    : 0;

  // Bar chart uses ALL deals
  const stageCounts = STAGES.map((s) => ({
    ...s,
    count: deals.filter((d) => d.stage === s.id).length,
  }));
  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);

  // Closed deals table uses ALL closed deals
  const allClosed = deals.filter((d) => d.stage === "gesloten");

  const KPIS = [
    { label: "Deals gesloten",    value: closedInPeriod.length.toString(),                  sub: "In geselecteerde periode", accent: "#0284c7" },
    { label: "Totale omzet",      value: totalRevenue > 0 ? formatEuro(totalRevenue) : "—", sub: "Som gesloten deals",       accent: "#16a34a" },
    { label: "Gem. verkoopprijs", value: avgPrice > 0 ? formatEuro(avgPrice) : "—",         sub: "Gemiddelde koopsom",       accent: "#7c3aed" },
    { label: "Gem. doorlooptijd", value: avgDays > 0 ? `${Math.round(avgDays)} dagen` : "—", sub: "Actieve deals",           accent: "#f97316" },
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

  if (deals.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Nog geen deals</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Maak je eerste deal aan om statistieken te zien</div>
          <button
            onClick={() => router.push("/dashboard/new-deal")}
            style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + Eerste deal aanmaken
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Statistieken</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>{deals.length} deals totaal</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: "6px 14px", borderRadius: "20px", fontSize: "12px",
                  fontWeight: active ? "600" : "400",
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
              <div style={{ fontSize: "22px", fontWeight: "700", color: k.accent, letterSpacing: "-0.5px", marginBottom: "4px" }}>{k.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Bar chart — ALL deals */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Deals per fase
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{deals.length} totaal</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {stageCounts.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", width: "100px", flexShrink: 0 }}>{s.label}</span>
                <div style={{ flex: 1, background: "#f1f5f9", borderRadius: "4px", height: "20px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${(s.count / maxCount) * 100}%`,
                    background: s.color,
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

        {/* Closed deals table — ALL closed */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Gesloten deals
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{allClosed.length} totaal</span>
          </div>
          {allClosed.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
              Nog geen gesloten deals
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Adres", "Koper", "Koopsom", "Aangemaakt"].map((col) => (
                    <th key={col} style={{ padding: "10px 16px", fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left", borderBottom: "1px solid #e8ecf0" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allClosed.map((d, i) => (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/dashboard/${d.id}`)}
                    style={{ borderBottom: i < allClosed.length - 1 ? "1px solid #f8fafc" : "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>
                      {d.address ?? d.title ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>
                      {d.contacts?.name ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "600", color: "#16a34a" }}>
                      {d.agreed_price ? formatEuro(d.agreed_price) : d.value ? formatEuro(d.value) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>
                      {formatDate(d.created_at)}
                    </td>
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

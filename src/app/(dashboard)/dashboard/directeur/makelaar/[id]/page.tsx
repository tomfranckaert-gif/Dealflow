"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Deal } from "@/types/database";

const supabase = createClient();

const TEAM = [
  { id: "1", name: "Marco de Boer",  initials: "MB", color: "#0284c7" },
  { id: "2", name: "Lisa Vermeer",   initials: "LV", color: "#7c3aed" },
  { id: "3", name: "Jeroen Smit",    initials: "JS", color: "#16a34a" },
  { id: "4", name: "Sarah Bakker",   initials: "SB", color: "#f97316" },
  { id: "5", name: "Thomas Klein",   initials: "TK", color: "#dc2626" },
];

const STAGE_ORDER = ["lead", "bezichtiging", "bod", "koopakte", "voorwaarden", "financiering", "overdracht", "gesloten"];

const STAGE_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  lead:         { bg: "#f1f5f9", text: "#64748b",  dot: "#94a3b8" },
  bezichtiging: { bg: "#fef9c3", text: "#854d0e",  dot: "#eab308" },
  bod:          { bg: "#dbeafe", text: "#1e40af",  dot: "#3b82f6" },
  koopakte:     { bg: "#ede9fe", text: "#5b21b6",  dot: "#8b5cf6" },
  voorwaarden:  { bg: "#fee2e2", text: "#991b1b",  dot: "#ef4444" },
  financiering: { bg: "#ffedd5", text: "#9a3412",  dot: "#f97316" },
  overdracht:   { bg: "#dcfce7", text: "#14532d",  dot: "#22c55e" },
  gesloten:     { bg: "#f1f5f9", text: "#374151",  dot: "#6b7280" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

interface Condition {
  id: string;
  deal_id: string;
  label: string;
  deadline: string;
  status: string;
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: "-0.5px", marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>
    </div>
  );
}

export default function MakelaarPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);

  const memberIndex = TEAM.findIndex((m) => m.id === id);
  const member = TEAM[memberIndex];

  useEffect(() => {
    if (memberIndex === -1) { setLoading(false); return; }
    supabase
      .from("deals")
      .select("*")
      .neq("stage", "gesloten")
      .then(async ({ data }) => {
        const all = (data as Deal[]) ?? [];
        const mine = all.filter((_, idx) => idx % 5 === memberIndex);
        setDeals(mine);

        if (mine.length > 0) {
          const { data: conds } = await supabase
            .from("conditions")
            .select("*")
            .in("deal_id", mine.map((d) => d.id))
            .eq("status", "open");
          setConditions((conds as Condition[]) ?? []);
        }

        setLoading(false);
      });
  }, [memberIndex]);

  if (!member) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#64748b" }}>Makelaar niet gevonden</div>
          <button onClick={() => router.push("/dashboard/directeur")} style={{ marginTop: 12, color: "#0284c7", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
            ← Terug
          </button>
        </div>
      </div>
    );
  }

  // ── KPI calculations ─────────────────────────────────────────────────────

  const criticalCount = conditions.filter((c) =>
    Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000) <= 3
  ).length;

  const courtageDeals = deals.filter((d) => d.transfer_date);
  const courtageTotal = courtageDeals.reduce((s, d) => s + (d.agreed_price ?? 0) * 0.015, 0);
  const pipelineTotal = deals.reduce((s, d) => s + (d.agreed_price ?? 0), 0);

  // ── Urgent conditions (within 7 days) ────────────────────────────────────

  const urgentConditions = conditions
    .filter((c) => Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000) <= 7)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  // ── Deals grouped by stage ───────────────────────────────────────────────

  const byStage = STAGE_ORDER.reduce<Record<string, Deal[]>>((acc, s) => {
    const group = deals.filter((d) => d.stage === s);
    if (group.length > 0) acc[s] = group;
    return acc;
  }, {});

  // ── Courtage table deals ─────────────────────────────────────────────────

  const courtageRows = deals
    .filter((d) => d.transfer_date)
    .sort((a, b) => new Date(a.transfer_date!).getTime() - new Date(b.transfer_date!).getTime());

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>

        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard/directeur")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 13, fontWeight: 500, marginBottom: 20, padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
          Terug naar kantoor
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: member.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
            {member.initials}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>{member.name}</h1>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "3px 0 0" }}>Makelaar overzicht</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>Laden…</div>
        ) : (
          <>
            {/* ── Section 1: KPI row ─────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <KpiCard
                label="Actieve objecten"
                value={deals.length}
                sub="in behandeling"
                color="#0284c7"
              />
              <KpiCard
                label="Kritieke acties"
                value={criticalCount}
                sub="deadlines binnen 3 dagen"
                color={criticalCount > 0 ? "#ef4444" : "#16a34a"}
              />
              <KpiCard
                label="Verwachte courtage"
                value={fmt(courtageTotal)}
                sub="transport ingepland"
                color="#16a34a"
              />
              <KpiCard
                label="Pipeline totaal"
                value={fmt(pipelineTotal)}
                sub="alle actieve objecten"
                color="#7c3aed"
              />
            </div>

            {/* ── Section 2: Kritieke acties ─────────────────────────────────── */}
            <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
                🔴 Kritieke acties
              </div>
              {urgentConditions.length === 0 ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#16a34a" }}>
                  ✓ Geen kritieke acties
                </div>
              ) : (
                urgentConditions.map((c, i) => {
                  const days = Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000);
                  const deal = deals.find((d) => d.id === c.deal_id);
                  const dotColor = days <= 1 ? "#ef4444" : days <= 3 ? "#f97316" : "#eab308";
                  const textColor = days <= 1 ? "#ef4444" : days <= 3 ? "#f97316" : "#eab308";
                  return (
                    <div
                      key={c.id}
                      onClick={() => router.push(`/dashboard/${deal?.id}?section=voorwaarden`)}
                      style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < urgentConditions.length - 1 ? "1px solid #f8fafc" : "none" }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: dotColor }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{c.label}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{deal?.address ?? "Onbekend adres"}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: textColor, flexShrink: 0 }}>
                        {days <= 0 ? "Verlopen" : days === 1 ? "Morgen" : `${days} dagen`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Section 3: Status per object ───────────────────────────────── */}
            <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
                Objecten status
              </div>
              {deals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "#94a3b8" }}>Geen actieve objecten</div>
              ) : (
                Object.entries(byStage).map(([stage, stageDeals]) => {
                  const s = STAGE_STYLE[stage] ?? STAGE_STYLE.lead;
                  return (
                    <div key={stage} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: s.text, background: s.bg, borderRadius: 20, padding: "2px 10px" }}>
                          {stage.charAt(0).toUpperCase() + stage.slice(1)}
                        </span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{stageDeals.length} object{stageDeals.length !== 1 ? "en" : ""}</span>
                      </div>
                      {stageDeals.map((d) => {
                        const daysUntilTransfer = d.transfer_date ? daysUntil(d.transfer_date) : null;
                        return (
                          <div
                            key={d.id}
                            onClick={() => router.push(`/dashboard/${d.id}`)}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, marginBottom: 6, cursor: "pointer" }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {d.address ?? d.title ?? "Onbekend adres"}
                              </div>
                              {d.city && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{d.city}</div>}
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0284c7" }}>
                                {d.agreed_price ? fmt(d.agreed_price) : d.asking_price ? fmt(d.asking_price) : "—"}
                              </div>
                              {d.transfer_date && (
                                <div style={{ fontSize: 10, color: daysUntilTransfer !== null && daysUntilTransfer <= 14 ? "#ef4444" : "#64748b", marginTop: 2 }}>
                                  📅 {new Date(d.transfer_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Section 4: Courtage overzicht ──────────────────────────────── */}
            <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  Courtage forecast
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Alleen deals met transport datum</div>
              </div>

              {courtageRows.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4 }}>Geen transport datums ingesteld</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Courtage wordt zichtbaar zodra transport is ingepland</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e8ecf0" }}>
                      {["Adres", "Transport datum", "Koopsom", "Courtage"].map((h) => (
                        <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {courtageRows.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => router.push(`/dashboard/${d.id}`)}
                        style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <td style={{ padding: "10px 8px", color: "#0f172a", fontWeight: 500 }}>
                          {d.address ?? d.title ?? "—"}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#64748b" }}>
                          {new Date(d.transfer_date!).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#0f172a" }}>
                          {d.agreed_price ? fmt(d.agreed_price) : "—"}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#16a34a", fontWeight: 700 }}>
                          {d.agreed_price ? fmt(d.agreed_price * 0.015) : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid #e8ecf0", background: "#f8fafc" }}>
                      <td colSpan={3} style={{ padding: "10px 8px", fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Totaal</td>
                      <td style={{ padding: "10px 8px", color: "#16a34a", fontWeight: 700, fontSize: 14 }}>{fmt(courtageTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

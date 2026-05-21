"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

const STAGES: { key: string; label: string; color: string }[] = [
  { key: "lead",         label: "Lead",         color: "#94a3b8" },
  { key: "bezichtiging", label: "Bezichtiging", color: "#f97316" },
  { key: "bod",          label: "Bod",          color: "#eab308" },
  { key: "koopakte",     label: "Koopakte",     color: "#0284c7" },
  { key: "voorwaarden",  label: "Voorwaarden",  color: "#7c3aed" },
  { key: "financiering", label: "Financiering", color: "#ec4899" },
  { key: "overdracht",   label: "Overdracht",   color: "#059669" },
];

interface Viewing {
  id: string;
  scheduled_at: string;
  status: string;
  deals: { address: string | null; city: string | null } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8ecf0",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 16,
};

const thStyle: React.CSSProperties = {
  padding: "8px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: "#374151",
  borderBottom: "1px solid #f8fafc",
  verticalAlign: "middle",
};

export default function DirecteurPage() {
  const router = useRouter();
  const [deals, setDeals]     = useState<Deal[]>([]);
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    const today    = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

    Promise.all([
      supabase.from("deals").select("*").neq("stage", "gesloten"),
      supabase
        .from("viewings")
        .select("id, scheduled_at, status, deals(address, city)")
        .gte("scheduled_at", today)
        .lt("scheduled_at", tomorrow),
    ]).then(([{ data: d }, { data: v }]) => {
      setDeals((d as Deal[]) ?? []);
      setViewings((v as unknown as Viewing[]) ?? []);
      setLoading(false);
    });
  }, []);

  // Distribute by index % 5
  const memberDeals    = TEAM.map((_, i) => deals.filter((_, idx) => idx % 5 === i));
  const memberViewings = TEAM.map((_, i) => viewings.filter((_, idx) => idx % 5 === i));

  const totalValue    = deals.reduce((s, d) => s + (d.agreed_price ?? d.asking_price ?? 0), 0);
  const totalCourtage = deals.reduce((s, d) => s + ((d.agreed_price ?? d.asking_price ?? 0) * 0.015), 0);
  const voorwaarden   = deals.filter(d => d.stage === "voorwaarden").length;
  const geslotenDeals = deals.filter(d => d.stage === "gesloten").length;
  const maxDeals      = Math.max(...memberDeals.map(m => m.length), 1);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <span style={{ color: "#94a3b8", fontSize: 14 }}>Laden…</span>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>Kantoor Dashboard 🏢</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
            Transactly Makelaars · Directeur overzicht
          </p>
        </div>

        {/* ─────────────────────────────────────────────
            SECTION 1 — KPI ROW
        ───────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Actieve deals",     value: deals.length,        sub: "open trajecten",       accent: "#0284c7", href: "/dashboard" },
            { label: "Pipeline waarde",   value: fmt(totalValue),     sub: "totale verkoopwaarde", accent: "#7c3aed", href: null },
            { label: "Courtage (1,5%)",   value: fmt(totalCourtage),  sub: "verwachte omzet",      accent: "#16a34a", href: null },
            { label: "Voorwaarden deals", value: voorwaarden,         sub: "actiepunten vandaag",  accent: voorwaarden > 0 ? "#dc2626" : "#64748b", href: "/dashboard?filter=Voorwaarden" },
            { label: "Gesloten deals",    value: geslotenDeals,       sub: "afgeronde trajecten",  accent: "#16a34a", href: null },
          ].map(({ label, value, sub, accent, href }) => (
            <div
              key={label}
              onClick={() => href && router.push(href)}
              style={{
                background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 18px",
                cursor: href ? "pointer" : "default",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { if (href) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor = "#cbd5e1"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e8ecf0"; }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginTop: 6 }}>{label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ─────────────────────────────────────────────
            SECTION 2 — TEAM PRESTATIES
        ───────────────────────────────────────────── */}
        <div style={card}>
          <div style={sectionLabel}>Team Prestaties</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Makelaar", "Deals", "Pipeline waarde", "Courtage", "Prestatie"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAM.map((member, i) => {
                const md    = memberDeals[i];
                const val   = md.reduce((s, d) => s + (d.agreed_price ?? d.asking_price ?? 0), 0);
                const pct   = Math.round((md.length / maxDeals) * 100);
                return (
                  <tr
                    key={member.id}
                    onClick={() => router.push(`/dashboard/directeur/makelaar/${member.id}`)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: member.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {member.initials}
                        </div>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{member.name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "#0f172a" }}>{md.length}</td>
                    <td style={tdStyle}>{fmt(val)}</td>
                    <td style={{ ...tdStyle, color: "#16a34a", fontWeight: 600 }}>{fmt(val * 0.015)}</td>
                    <td style={{ ...tdStyle, minWidth: 130 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${pct}%`, background: member.color, borderRadius: 4, height: 6 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#64748b", minWidth: 30 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8fafc" }}>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#0f172a", borderTop: "2px solid #e8ecf0" }}>Totaal</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#0f172a", borderTop: "2px solid #e8ecf0" }}>{deals.length}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#0f172a", borderTop: "2px solid #e8ecf0" }}>{fmt(totalValue)}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#16a34a", borderTop: "2px solid #e8ecf0" }}>{fmt(totalCourtage)}</td>
                <td style={{ borderTop: "2px solid #e8ecf0" }} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ─────────────────────────────────────────────
            SECTION 3 — TEAM AGENDA VANDAAG
        ───────────────────────────────────────────── */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={sectionLabel}>Team Agenda Vandaag</div>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 }}>
            {TEAM.map((member, i) => {
              const mv = memberViewings[i];
              return (
                <div key={member.id} style={{ border: "1px solid #e8ecf0", borderRadius: 10, overflow: "hidden" }}>
                  {/* Column header */}
                  <div style={{ padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: member.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {member.initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {member.name.split(" ")[0]}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>{mv.length} afspraken</div>
                    </div>
                  </div>

                  {/* Cards */}
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, minHeight: 80 }}>
                    {mv.length === 0 ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 64, color: "#cbd5e1", fontSize: 11 }}>
                        Geen afspraken
                      </div>
                    ) : mv.map(v => {
                      const addr = v.deals
                        ? [v.deals.address, v.deals.city].filter(Boolean).join(", ")
                        : "Onbekend adres";
                      return (
                        <div key={v.id} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px", borderLeft: `3px solid ${member.color}` }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{fmtTime(v.scheduled_at)}</div>
                          <div style={{ fontSize: 11, color: "#374151", marginTop: 2, lineHeight: 1.4 }}>{addr}</div>
                          <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 600, background: "#dbeafe", color: "#1d4ed8", borderRadius: 4, padding: "1px 6px" }}>
                            Bezichtiging
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8", paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
            <strong style={{ color: "#374151" }}>{viewings.length}</strong> bezichtigingen vandaag ·{" "}
            <strong style={{ color: "#374151" }}>{memberViewings.filter(mv => mv.length > 0).length}</strong> makelaars actief
          </div>
        </div>

        {/* ─────────────────────────────────────────────
            SECTION 4 — PIPELINE DISTRIBUTIE
        ───────────────────────────────────────────── */}
        <div style={card}>
          <div style={sectionLabel}>Pipeline Distributie</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STAGES.map(({ key, label, color }) => {
              const totalDeals = deals.length || 1;
              const count = deals.filter(d => d.stage === key).length;
              const pct   = Math.round((count / totalDeals) * 100);
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 96, fontSize: 12, color: "#64748b", fontWeight: 500, flexShrink: 0 }}>{label}</div>
                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 6, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, background: color, borderRadius: 6, height: 10 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{count}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>deals · {pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

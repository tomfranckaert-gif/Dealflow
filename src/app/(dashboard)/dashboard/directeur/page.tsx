"use client";

import { useState, useEffect } from "react";
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

interface Viewing {
  id: string;
  scheduled_at: string;
  status: string;
  deals: { address: string | null; city: string | null } | null;
}

const STAGES: { key: string; label: string; color: string }[] = [
  { key: "lead",        label: "Lead",        color: "#94a3b8" },
  { key: "bezichtiging",label: "Bezichtiging",color: "#f97316" },
  { key: "bod",         label: "Bod",         color: "#eab308" },
  { key: "koopakte",    label: "Koopakte",    color: "#0284c7" },
  { key: "voorwaarden", label: "Voorwaarden", color: "#7c3aed" },
  { key: "financiering",label: "Financiering",color: "#ec4899" },
  { key: "overdracht",  label: "Overdracht",  color: "#059669" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

const todayLabel = () =>
  new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

const sectionCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8ecf0",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const th: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  borderBottom: "1px solid #f1f5f9",
};

const td: React.CSSProperties = {
  padding: "12px 12px",
  fontSize: 13,
  color: "#374151",
  borderBottom: "1px solid #f8fafc",
};

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px" }}>
        {title}
      </div>
      {right}
    </div>
  );
}

function Avatar({ initials, color, size = 32 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function DirecteurPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

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

  const memberDeals = TEAM.map((_, i) => deals.filter((_, idx) => idx % 5 === i));
  const memberViewings = TEAM.map((_, i) => viewings.filter((_, idx) => idx % 5 === i));

  const totalValue = deals.reduce((s, d) => s + (d.agreed_price ?? d.asking_price ?? 0), 0);
  const totalCourtage = totalValue * 0.015;
  const urgente = deals.filter((d) => d.stage === "voorwaarden").length;
  const maxDeals = Math.max(...memberDeals.map((md) => md.length), 1);

  const healthColors: Record<string, { bg: string; color: string; label: string }> = {
    good:   { bg: "#dcfce7", color: "#15803d", label: "Goed" },
    ok:     { bg: "#fef9c3", color: "#a16207", label: "Matig" },
    low:    { bg: "#fee2e2", color: "#dc2626", label: "Laag" },
  };
  const healthFor = (count: number): keyof typeof healthColors =>
    count >= 4 ? "good" : count >= 2 ? "ok" : "low";

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Laden...</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>Kantoor Dashboard 🏢</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
            Transactly Makelaars&nbsp;·&nbsp;Directeur overzicht
          </p>
        </div>

        {/* SECTION 1 — KPI ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Actieve deals",       value: deals.length,         sub: "open trajecten",         color: "#0284c7" },
            { label: "Pipeline waarde",      value: fmt(totalValue),      sub: "totale verkoopwaarde",   color: "#7c3aed" },
            { label: "Verwachte courtage",   value: fmt(totalCourtage),   sub: "bij 1,5%",               color: "#16a34a" },
            { label: "Urgente acties",       value: urgente,              sub: "in voorwaarden fase",    color: urgente > 0 ? "#dc2626" : "#64748b" },
            { label: "Gem. health",          value: "85%",                sub: "kantoorscore",           color: "#f97316" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* SECTION 2 — TEAM PRESTATIES */}
        <div style={sectionCard}>
          <SectionHeader title="Team Prestaties" />
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Makelaar", "Deals", "Pipeline waarde", "Courtage", "Prestatie", "Health"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAM.map((member, i) => {
                const md = memberDeals[i];
                const val = md.reduce((s, d) => s + (d.agreed_price ?? d.asking_price ?? 0), 0);
                const court = val * 0.015;
                const health = healthFor(md.length);
                const hs = healthColors[health];
                const barWidth = Math.round((md.length / maxDeals) * 100);
                return (
                  <tr key={member.id}>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar initials={member.initials} color={member.color} size={30} />
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{member.name}</span>
                      </div>
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: "#0f172a" }}>{md.length}</td>
                    <td style={td}>{fmt(val)}</td>
                    <td style={{ ...td, color: "#16a34a", fontWeight: 600 }}>{fmt(court)}</td>
                    <td style={{ ...td, minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${barWidth}%`, background: member.color, borderRadius: 4, height: 6 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#64748b", minWidth: 28 }}>{barWidth}%</span>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 11, fontWeight: 600, background: hs.bg, color: hs.color, borderRadius: 6, padding: "3px 8px" }}>
                        {hs.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8fafc" }}>
                <td style={{ ...td, fontWeight: 700, color: "#0f172a", borderTop: "2px solid #e8ecf0" }}>Totaal</td>
                <td style={{ ...td, fontWeight: 700, color: "#0f172a", borderTop: "2px solid #e8ecf0" }}>{deals.length}</td>
                <td style={{ ...td, fontWeight: 700, color: "#0f172a", borderTop: "2px solid #e8ecf0" }}>{fmt(totalValue)}</td>
                <td style={{ ...td, fontWeight: 700, color: "#16a34a", borderTop: "2px solid #e8ecf0" }}>{fmt(totalCourtage)}</td>
                <td style={{ ...td, borderTop: "2px solid #e8ecf0" }} />
                <td style={{ ...td, borderTop: "2px solid #e8ecf0" }} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* SECTION 3 — TEAM AGENDA VANDAAG */}
        <div style={sectionCard}>
          <SectionHeader
            title="Team Agenda Vandaag"
            right={<span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{todayLabel()}</span>}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            {TEAM.map((member, i) => {
              const mv = memberViewings[i];
              return (
                <div key={member.id} style={{ border: "1px solid #e8ecf0", borderRadius: 10, overflow: "hidden" }}>
                  {/* Column header */}
                  <div style={{ padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar initials={member.initials} color={member.color} size={26} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{member.name.split(" ")[0]}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>
                        <span style={{ background: member.color, color: "#fff", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 600 }}>
                          {mv.length} afspraken
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Viewing cards */}
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {mv.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "16px 0", color: "#cbd5e1", fontSize: 11 }}>
                        Geen afspraken
                      </div>
                    ) : (
                      mv.map((v) => {
                        const addr = v.deals
                          ? [v.deals.address, v.deals.city].filter(Boolean).join(", ")
                          : "Onbekend adres";
                        return (
                          <div key={v.id} style={{
                            background: "#f8fafc", borderRadius: 8, padding: "8px 10px",
                            borderLeft: `3px solid ${member.color}`,
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{fmtTime(v.scheduled_at)}</div>
                            <div style={{ fontSize: 11, color: "#374151", marginTop: 2, lineHeight: 1.3 }}>{addr}</div>
                            <div style={{ marginTop: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, background: "#dbeafe", color: "#1d4ed8", borderRadius: 4, padding: "1px 5px" }}>
                                Bezichtiging
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
            <strong style={{ color: "#374151" }}>{viewings.length}</strong> bezichtigingen vandaag&nbsp;·&nbsp;
            <strong style={{ color: "#374151" }}>{memberViewings.filter((mv) => mv.length > 0).length}</strong> makelaars actief
          </div>
        </div>

        {/* SECTION 4 — PIPELINE DISTRIBUTIE */}
        <div style={sectionCard}>
          <SectionHeader title="Pipeline Distributie" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STAGES.map(({ key, label, color }) => {
              const count = deals.filter((d) => d.stage === key).length;
              const val = deals.filter((d) => d.stage === key).reduce((s, d) => s + (d.agreed_price ?? d.asking_price ?? 0), 0);
              const pct = deals.length > 0 ? Math.round((count / deals.length) * 100) : 0;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 100, fontSize: 12, color: "#64748b", fontWeight: 500, flexShrink: 0 }}>{label}</div>
                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 6, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, background: color, borderRadius: 6, height: 10, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ width: 28, fontSize: 12, fontWeight: 700, color: "#0f172a", textAlign: "right", flexShrink: 0 }}>{count}</div>
                  <div style={{ width: 90, fontSize: 11, color: "#64748b", textAlign: "right", flexShrink: 0 }}>{val > 0 ? fmt(val) : "—"}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

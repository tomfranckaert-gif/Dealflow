"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface TeamMember {
  id: string;
  name: string;
  color: string;
  role: string;
}

interface Viewing {
  id: string;
  scheduled_at: string;
  status: string;
  deal_id: string;
  owner_id: string;
  deals: {
    address: string;
    city: string;
    owner_id: string;
  } | null;
}

const TEAM: TeamMember[] = [
  { id: "agent-1", name: "Sophie de Vries", color: "#7c3aed", role: "Makelaar" },
  { id: "agent-2", name: "Lars Janssen", color: "#0284c7", role: "Makelaar" },
  { id: "agent-3", name: "Emma Bakker", color: "#059669", role: "Makelaar" },
  { id: "agent-4", name: "Tim Smit", color: "#d97706", role: "Junior Makelaar" },
];

const MOCK_VIEWINGS: Viewing[] = [
  { id: "v1", scheduled_at: new Date().toISOString().replace(/T\d\d/, "T09"), status: "gepland", deal_id: "d1", owner_id: "agent-1", deals: { address: "Dorpsstraat 14", city: "Terneuzen", owner_id: "agent-1" } },
  { id: "v2", scheduled_at: new Date().toISOString().replace(/T\d\d/, "T10"), status: "gepland", deal_id: "d2", owner_id: "agent-1", deals: { address: "Kerkplein 3", city: "Hulst", owner_id: "agent-1" } },
  { id: "v3", scheduled_at: new Date().toISOString().replace(/T\d\d/, "T11"), status: "bevestigd", deal_id: "d3", owner_id: "agent-2", deals: { address: "Molenweg 22", city: "Sluis", owner_id: "agent-2" } },
  { id: "v4", scheduled_at: new Date().toISOString().replace(/T\d\d/, "T13"), status: "gepland", deal_id: "d4", owner_id: "agent-2", deals: { address: "Havenstraat 7", city: "Breskens", owner_id: "agent-2" } },
  { id: "v5", scheduled_at: new Date().toISOString().replace(/T\d\d/, "T14"), status: "bevestigd", deal_id: "d5", owner_id: "agent-3", deals: { address: "Markt 1", city: "IJzendijke", owner_id: "agent-3" } },
  { id: "v6", scheduled_at: new Date().toISOString().replace(/T\d\d/, "T15"), status: "afgerond", deal_id: "d6", owner_id: "agent-3", deals: { address: "Scheldekade 18", city: "Terneuzen", owner_id: "agent-3" } },
  { id: "v7", scheduled_at: new Date().toISOString().replace(/T\d\d/, "T10"), status: "gepland", deal_id: "d7", owner_id: "agent-4", deals: { address: "Langestraat 45", city: "Axel", owner_id: "agent-4" } },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  gepland: { bg: "#dbeafe", color: "#1d4ed8", label: "Gepland" },
  bevestigd: { bg: "#dcfce7", color: "#15803d", label: "Bevestigd" },
  afgerond: { bg: "#f1f5f9", color: "#64748b", label: "Afgerond" },
  geannuleerd: { bg: "#fee2e2", color: "#dc2626", label: "Geannuleerd" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function DirecteurPage() {
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("viewings")
        .select("id, scheduled_at, status, deal_id, owner_id, deals(address, city, owner_id)")
        .gte("scheduled_at", `${todayStr}T00:00:00`)
        .lte("scheduled_at", `${todayStr}T23:59:59`)
        .order("scheduled_at", { ascending: true });

      if (error || !data || data.length === 0) {
        setUseMock(true);
        setViewings(MOCK_VIEWINGS);
      } else {
        setViewings(data as unknown as Viewing[]);
      }
      setLoading(false);
    }
    load();
  }, [todayStr]);

  const viewingsByMember = TEAM.map((member) => ({
    member,
    viewings: viewings.filter((v) => v.owner_id === member.id).sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    ),
  }));

  const totalViewings = viewings.length;
  const bevestigd = viewings.filter((v) => v.status === "bevestigd").length;
  const afgerond = viewings.filter((v) => v.status === "afgerond").length;

  const statCard = (label: string, value: number, color: string) => (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0 }}>Directeur Overzicht</h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>{formatDate(today)}</p>
      </div>

      {/* TEAM TABLE */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Team</h2>
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e8ecf0", background: "#f8fafc" }}>
                {["Naam", "Functie", "Bezichtigingen vandaag", "Afgerond", "Openstaand"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewingsByMember.map(({ member, viewings: mv }, i) => {
                const done = mv.filter((v) => v.status === "afgerond").length;
                const open = mv.filter((v) => v.status !== "afgerond" && v.status !== "geannuleerd").length;
                return (
                  <tr key={member.id} style={{ borderBottom: i < TEAM.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: member.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {member.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{member.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>{member.role}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{mv.length}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{done}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{open}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* TEAM AGENDA VANDAAG */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
            Team Agenda Vandaag
          </h2>
          {useMock && (
            <span style={{ fontSize: 11, color: "#94a3b8", background: "#f1f5f9", borderRadius: 6, padding: "3px 8px" }}>Demo data</span>
          )}
        </div>

        {/* Summary stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {statCard("Totaal bezichtigingen", totalViewings, "#0284c7")}
          {statCard("Bevestigd", bevestigd, "#059669")}
          {statCard("Afgerond", afgerond, "#64748b")}
          {statCard("Actieve makelaars", viewingsByMember.filter((m) => m.viewings.length > 0).length, "#7c3aed")}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Agenda laden...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${TEAM.length}, 1fr)`, gap: 12, alignItems: "start" }}>
            {viewingsByMember.map(({ member, viewings: mv }) => (
              <div key={member.id} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 14, overflow: "hidden" }}>
                {/* Column header */}
                <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: member.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{member.name.split(" ")[0]}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{mv.length} bezichtiging{mv.length !== 1 ? "en" : ""}</div>
                  </div>
                </div>

                {/* Viewing cards */}
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {mv.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#cbd5e1", fontSize: 12 }}>
                      Geen bezichtigingen
                    </div>
                  ) : (
                    mv.map((v) => {
                      const st = STATUS_STYLE[v.status] ?? STATUS_STYLE.gepland;
                      const addr = v.deals ? `${v.deals.address}${v.deals.city ? ", " + v.deals.city : ""}` : "Onbekend adres";
                      return (
                        <div key={v.id} style={{ background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${member.color}` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{formatTime(v.scheduled_at)}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, background: st.bg, color: st.color, borderRadius: 5, padding: "2px 6px" }}>{st.label}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#374151", fontWeight: 500, lineHeight: 1.3 }}>{addr}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

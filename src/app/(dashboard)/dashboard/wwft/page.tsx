"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface WwftRow {
  id: string;
  deal_id: string;
  contact_id: string;
  risk_score: "laag" | "middel" | "hoog";
  pep_check: boolean;
  sanctions_check: boolean;
  verified_at: string | null;
  retention_until: string | null;
  deal_address: string;
  contact_name: string;
}

const RISK: Record<string, { bg: string; color: string; dot: string }> = {
  laag:   { bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e" },
  middel: { bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  hoog:   { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};

export default function WwftOverviewPage() {
  const router = useRouter();
  const [rows, setRows] = useState<WwftRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: entries } = await supabase
      .from("wwft_entries")
      .select("id, deal_id, contact_id, risk_score, pep_check, sanctions_check, verified_at, retention_until")
      .eq("owner_id", user.id)
      .order("verified_at", { ascending: false });

    if (!entries || entries.length === 0) { setLoading(false); return; }

    const dealIds = Array.from(new Set(entries.map((e) => e.deal_id)));
    const contactIds = Array.from(new Set(entries.map((e) => e.contact_id)));

    const [dealsRes, contactsRes] = await Promise.all([
      supabase.from("deals").select("id, address, title").in("id", dealIds),
      supabase.from("contacts").select("id, name").in("id", contactIds),
    ]);

    const dealMap = new Map((dealsRes.data ?? []).map((d) => [d.id, d.address ?? d.title]));
    const contactMap = new Map((contactsRes.data ?? []).map((c) => [c.id, c.name]));

    setRows(entries.map((e) => ({
      ...e,
      deal_address: dealMap.get(e.deal_id) ?? "Onbekend",
      contact_name: contactMap.get(e.contact_id) ?? "Onbekend",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const highRiskCount = rows.filter((r) => r.risk_score === "hoog").length;
  const verifiedCount = rows.filter((r) => r.verified_at).length;

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <span style={{ fontSize: "13px", color: "#94a3b8" }}>Laden…</span>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Wwft Dossiers</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>Compliance overzicht alle deals</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Totaal dossiers",  value: rows.length,        sub: "Alle partijen" },
            { label: "Geverifieerd",      value: verifiedCount,      sub: "Via Move.nl" },
            { label: "Hoog risico",       value: highRiskCount,      sub: "Vereist aandacht" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px 20px" }}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>{s.label}</div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: s.label === "Hoog risico" && highRiskCount > 0 ? "#ef4444" : "#0f172a", letterSpacing: "-0.5px", marginBottom: "4px" }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>Alle dossiers</span>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
              Nog geen Wwft dossiers aangemaakt. Open een deal en vul het Wwft tabblad in.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Deal", "Partij", "Risico", "PEP", "Sancties", "Geverifieerd", "Bewaartermijn"].map((col) => (
                    <th key={col} style={{ padding: "10px 16px", fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left", borderBottom: "1px solid #e8ecf0" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const risk = RISK[row.risk_score] ?? RISK.laag;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/dashboard/${row.deal_id}`)}
                      style={{ borderBottom: i < rows.length - 1 ? "1px solid #f8fafc" : "none", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>{row.deal_address}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>{row.contact_name}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: risk.bg, color: risk.color }}>
                          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: risk.dot }} />
                          {row.risk_score.charAt(0).toUpperCase() + row.risk_score.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: row.pep_check ? "#ef4444" : "#16a34a" }}>{row.pep_check ? "⚠️ Ja" : "✓ Nee"}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: row.sanctions_check ? "#16a34a" : "#94a3b8" }}>{row.sanctions_check ? "✓ Vrij" : "—"}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>{row.verified_at ? new Date(row.verified_at).toLocaleDateString("nl-NL") : "—"}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>{row.retention_until ? new Date(row.retention_until).toLocaleDateString("nl-NL", { month: "short", year: "numeric" }) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

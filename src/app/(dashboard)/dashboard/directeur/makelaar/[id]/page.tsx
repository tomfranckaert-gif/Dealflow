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

function StageBadge({ stage }: { stage: string }) {
  const s = STAGE_STYLE[stage] ?? STAGE_STYLE.lead;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {stage.charAt(0).toUpperCase() + stage.slice(1)}
    </span>
  );
}

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const price = deal.agreed_price ?? deal.asking_price ?? deal.value;
  const isAgreed = deal.agreed_price != null;
  const days = Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86400000);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hovered ? "#cbd5e1" : "#e8ecf0"}`,
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
        borderRadius: 12,
        padding: "14px 16px",
        cursor: "pointer",
        marginBottom: 8,
        transition: "all 0.15s",
        opacity: deal.stage === "gesloten" ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
          {deal.address ?? deal.title ?? "Onbekend adres"}
        </span>
        {price != null && (
          <div style={{ flexShrink: 0, marginLeft: 12, textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{fmt(price)}</div>
            {!isAgreed && <div style={{ fontSize: 10, color: "#94a3b8" }}>Vraagprijs</div>}
          </div>
        )}
      </div>

      {deal.city && (
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{deal.city}</div>
      )}

      {(deal.property_type || deal.surface) && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
          {deal.property_type ?? ""}{deal.surface ? ` · ${deal.surface}m²` : ""}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <StageBadge stage={deal.stage} />
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{days}d</span>
      </div>

      {deal.transfer_date && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
          Overdracht: {new Date(deal.transfer_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      )}
    </div>
  );
}

export default function MakelaarPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const memberIndex = TEAM.findIndex((m) => m.id === id);
  const member = TEAM[memberIndex];

  useEffect(() => {
    supabase
      .from("deals")
      .select("*")
      .neq("stage", "gesloten")
      .then(({ data }) => {
        const all = (data as Deal[]) ?? [];
        const mine = all.filter((_, idx) => idx % 5 === memberIndex);
        setDeals(mine);
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

  const totalValue = deals.reduce((s, d) => s + (d.agreed_price ?? d.asking_price ?? 0), 0);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>

        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard/directeur")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 13, fontWeight: 500, marginBottom: 20, padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
          Terug naar kantoor
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: member.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
            {member.initials}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Deals van {member.name}</h1>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "3px 0 0" }}>
              {deals.length} actieve deals · pipeline {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalValue)}
            </p>
          </div>
        </div>

        {/* Deal cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>Laden…</div>
        ) : deals.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14, color: "#64748b" }}>Geen actieve deals</div>
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => router.push(`/dashboard/${deal.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

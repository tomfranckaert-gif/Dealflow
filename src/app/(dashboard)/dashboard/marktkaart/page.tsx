"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { DealStage } from "@/types/database";

interface DealPin {
  id: string;
  address: string | null;
  city: string | null;
  stage: DealStage;
  agreed_price: number | null;
  asking_price: number | null;
  lat: number;
  lng: number;
}

const STAGE_COLORS: Record<string, string> = {
  lead:         "#94a3b8",
  bezichtiging: "#eab308",
  bod:          "#3b82f6",
  koopakte:     "#8b5cf6",
  voorwaarden:  "#ef4444",
  financiering: "#f97316",
  overdracht:   "#22c55e",
  gesloten:     "#6b7280",
};

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => (
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
    <span style={{ fontSize: 13, color: "#94a3b8" }}>Kaart laden…</span>
  </div>
) });

function formatEuro(v: number) {
  return "€ " + Math.round(v).toLocaleString("nl-NL");
}

export default function MarktkaartPage() {
  const [deals, setDeals] = useState<DealPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("deals")
        .select("id, address, city, stage, agreed_price, asking_price, lat, lng")
        .not("lat", "is", null)
        .not("lng", "is", null);
      setDeals((data ?? []) as DealPin[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = activeStage ? deals.filter((d) => d.stage === activeStage) : deals;

  const totalValue = filtered.reduce((s, d) => s + (d.agreed_price ?? d.asking_price ?? 0), 0);

  const stageCounts = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.stage] = (acc[d.stage] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>

      {/* Header */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.4px" }}>Marktkaart</span>
          {!loading && (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} objecten{activeStage ? ` · ${activeStage}` : ""}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {totalValue > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{formatEuro(totalValue)}</span>
          )}
        </div>
      </div>

      {/* Stage filter pills */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf0", padding: "8px 24px", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
        <button
          onClick={() => setActiveStage(null)}
          style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: activeStage === null ? "#0284c7" : "#e8ecf0", background: activeStage === null ? "#f0f9ff" : "#fff", color: activeStage === null ? "#0284c7" : "#64748b" }}
        >
          Alle ({deals.length})
        </button>
        {Object.entries(stageCounts).map(([stage, count]) => (
          <button
            key={stage}
            onClick={() => setActiveStage(activeStage === stage ? null : stage)}
            style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: activeStage === stage ? STAGE_COLORS[stage] : "#e8ecf0", background: activeStage === stage ? STAGE_COLORS[stage] + "18" : "#fff", color: activeStage === stage ? STAGE_COLORS[stage] : "#64748b" }}
          >
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: STAGE_COLORS[stage] ?? "#94a3b8", marginRight: 5, verticalAlign: "middle" }} />
            {stage.charAt(0).toUpperCase() + stage.slice(1)} ({count})
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", height: "100%" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Deals laden…</span>
          </div>
        ) : (
          <MapView deals={filtered} stageColors={STAGE_COLORS} />
        )}
      </div>
    </div>
  );
}

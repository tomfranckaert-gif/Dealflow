"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { DealStage } from "@/types/database";

export interface DealPin {
  id: string;
  address: string | null;
  city: string | null;
  stage: DealStage;
  agreed_price: number | null;
  asking_price: number | null;
  lat: number;
  lng: number;
  has_buyer: boolean;
  viewing_count: number;
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

const LAYERS = [
  { key: "objecten",       label: "Objecten",       icon: "🏠", color: "#0284c7" },
  { key: "kopers",         label: "Kopers",         icon: "👤", color: "#ef4444" },
  { key: "bezichtigingen", label: "Bezichtigingen", icon: "👁", color: "#f97316" },
  { key: "prijzen",        label: "Prijzen",        icon: "💰", color: "#16a34a" },
];

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
      <span style={{ fontSize: 13, color: "#94a3b8" }}>Kaart laden…</span>
    </div>
  ),
});

function formatEuro(v: number) {
  return "€ " + Math.round(v).toLocaleString("nl-NL");
}

export default function MarktkaartPage() {
  const [deals, setDeals] = useState<DealPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>(["objecten"]);
  const [selectedDeal, setSelectedDeal] = useState<DealPin | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [dealsRes, viewingsRes] = await Promise.all([
        supabase
          .from("deals")
          .select("id, address, city, stage, agreed_price, asking_price, lat, lng, buyer_id")
          .not("lat", "is", null)
          .not("lng", "is", null),
        supabase.from("viewings").select("deal_id"),
      ]);

      const rawDeals = (dealsRes.data ?? []) as Array<{
        id: string;
        address: string | null;
        city: string | null;
        stage: DealStage;
        agreed_price: number | null;
        asking_price: number | null;
        lat: number;
        lng: number;
        buyer_id: string | null;
      }>;

      const viewings = (viewingsRes.data ?? []) as Array<{ deal_id: string }>;
      const viewingCounts: Record<string, number> = {};
      for (const v of viewings) {
        if (v.deal_id) viewingCounts[v.deal_id] = (viewingCounts[v.deal_id] ?? 0) + 1;
      }

      const mapped: DealPin[] = rawDeals.map((d) => ({
        id: d.id,
        address: d.address,
        city: d.city,
        stage: d.stage,
        agreed_price: d.agreed_price,
        asking_price: d.asking_price,
        lat: d.lat,
        lng: d.lng,
        has_buyer: Boolean(d.buyer_id),
        viewing_count: viewingCounts[d.id] ?? 0,
      }));

      setDeals(mapped);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = activeStage ? deals.filter((d) => d.stage === activeStage) : deals;

  // City average price and representative coords for heatmap
  const cityData: Record<string, { prices: number[]; lat: number; lng: number }> = {};
  for (const d of deals) {
    const price = d.agreed_price ?? d.asking_price;
    if (!d.city) continue;
    if (!cityData[d.city]) cityData[d.city] = { prices: [], lat: d.lat, lng: d.lng };
    if (price) cityData[d.city].prices.push(price);
  }
  const cityAvg: Record<string, number> = {};
  const cityCoords: Record<string, { lat: number; lng: number }> = {};
  for (const [city, { prices, lat, lng }] of Object.entries(cityData)) {
    cityCoords[city] = { lat, lng };
    if (prices.length) cityAvg[city] = prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  const totalValue = filtered.reduce((s, d) => s + (d.agreed_price ?? d.asking_price ?? 0), 0);

  const stageCounts = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.stage] = (acc[d.stage] ?? 0) + 1;
    return acc;
  }, {});

  function toggleLayer(key: string) {
    setActiveLayers((prev) =>
      prev.includes(key) ? prev.filter((l) => l !== key) : [...prev, key]
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>

      {/* Header */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.4px" }}>Marktkaart</span>
          {!loading && (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} objecten{activeStage ? ` · ${activeStage}` : ""}</span>
          )}
        </div>

        {/* Layer toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center" }}>
          {LAYERS.map((layer) => (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                borderColor: activeLayers.includes(layer.key) ? layer.color : "#e8ecf0",
                background: activeLayers.includes(layer.key) ? layer.color + "15" : "#fff",
                color: activeLayers.includes(layer.key) ? layer.color : "#64748b",
              }}
            >
              <span>{layer.icon}</span>
              <span>{layer.label}</span>
            </button>
          ))}
        </div>

        <div style={{ flexShrink: 0 }}>
          {totalValue > 0 && activeLayers.includes("objecten") && (
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
            style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: activeStage === stage ? STAGE_COLORS[stage] : "#e8ecf0", background: activeStage === stage ? (STAGE_COLORS[stage] ?? "#94a3b8") + "18" : "#fff", color: activeStage === stage ? STAGE_COLORS[stage] : "#64748b" }}
          >
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: STAGE_COLORS[stage] ?? "#94a3b8", marginRight: 5, verticalAlign: "middle" }} />
            {stage.charAt(0).toUpperCase() + stage.slice(1)} ({count})
          </button>
        ))}
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Deals laden…</span>
          </div>
        ) : (
          <MapView
            deals={filtered}
            stageColors={STAGE_COLORS}
            activeLayers={activeLayers}
            onSelectDeal={setSelectedDeal}
            cityAvg={cityAvg}
            cityCoords={cityCoords}
          />
        )}

        {/* Prijskaart disclaimer */}
        {activeLayers.includes("prijzen") && !loading && (
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
            background: "rgba(15,23,42,0.8)", color: "#fff", borderRadius: 8, padding: "6px 14px",
            fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", pointerEvents: "none",
          }}>
            Prijsheatmap gebaseerd op gemiddelde vraag-/transactieprijzen per stad
          </div>
        )}

        {/* Legend */}
        {activeLayers.length > 0 && !loading && (
          <div style={{
            position: "absolute", bottom: 24, left: 56, zIndex: 1000,
            background: "rgba(255,255,255,0.96)", borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)", padding: "12px 14px", minWidth: 148,
          }}>
            {activeLayers.includes("objecten") && (
              <div style={{ marginBottom: activeLayers.length > 1 ? 10 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Objecten</div>
                {Object.entries(STAGE_COLORS).map(([stage, color]) => {
                  if (!stageCounts[stage]) return null;
                  return (
                    <div key={stage} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#0f172a", textTransform: "capitalize" }}>{stage}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {activeLayers.includes("kopers") && (
              <div style={{ marginBottom: activeLayers.filter(l => l !== "objecten" && l !== "kopers").length > 0 ? 10 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Kopers</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                  <span style={{ fontSize: 11, color: "#0f172a" }}>Koper aanwezig</span>
                </div>
              </div>
            )}
            {activeLayers.includes("bezichtigingen") && (
              <div style={{ marginBottom: activeLayers.includes("prijzen") ? 10 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Bezichtigingen</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316", display: "inline-block", opacity: 0.6 }} />
                  <span style={{ fontSize: 11, color: "#0f172a" }}>Bezichtigingen</span>
                </div>
              </div>
            )}
            {activeLayers.includes("prijzen") && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Prijszone</div>
                {[
                  { label: "< €200k", color: "#22c55e" },
                  { label: "< €400k", color: "#eab308" },
                  { label: "< €600k", color: "#f97316" },
                  { label: "≥ €600k", color: "#ef4444" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: "#0f172a" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected deal panel */}
        {selectedDeal && (
          <div style={{
            position: "absolute", bottom: 24, right: 24, zIndex: 1000,
            width: 280, background: "#fff", borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)", overflow: "hidden",
          }}>
            <div style={{ background: "#0f172a", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                {selectedDeal.address ?? "Object"}
              </span>
              <button
                onClick={() => setSelectedDeal(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0, padding: 0 }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: "14px 16px" }}>
              {selectedDeal.city && (
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>{selectedDeal.city}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_COLORS[selectedDeal.stage] ?? "#94a3b8", display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>{selectedDeal.stage}</span>
              </div>
              {(selectedDeal.agreed_price ?? selectedDeal.asking_price) != null && (
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0284c7", marginBottom: 10 }}>
                  {formatEuro((selectedDeal.agreed_price ?? selectedDeal.asking_price)!)}
                </div>
              )}
              {(selectedDeal.has_buyer || selectedDeal.viewing_count > 0) && (
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#64748b", marginBottom: 14 }}>
                  {selectedDeal.has_buyer && <span>👤 Koper aanwezig</span>}
                  {selectedDeal.viewing_count > 0 && (
                    <span>👁 {selectedDeal.viewing_count} bezichtiging{selectedDeal.viewing_count !== 1 ? "en" : ""}</span>
                  )}
                </div>
              )}
              <a
                href={`/dashboard/${selectedDeal.id}`}
                style={{ display: "block", textAlign: "center", background: "#0284c7", color: "#fff", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
              >
                Open deal →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

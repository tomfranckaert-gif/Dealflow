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
  surface: number | null;
  property_type: string | null;
}

interface SelectedCity {
  city: string;
  eurPerM2: number;
  count: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  byType: Record<string, number[]>;
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

function getPrijsColor(eurPerM2: number): string {
  if (eurPerM2 < 2000) return "#16a34a";
  if (eurPerM2 < 2500) return "#eab308";
  if (eurPerM2 < 3000) return "#f97316";
  return "#ef4444";
}

function groupByType(cityDeals: DealPin[]): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const d of cityDeals) {
    const type = d.property_type ?? "overig";
    const price = d.agreed_price ?? d.asking_price ?? 0;
    const surface = d.surface ?? 100;
    if (price > 0) {
      if (!result[type]) result[type] = [];
      result[type].push(Math.round(price / surface));
    }
  }
  return result;
}

export default function MarktkaartPage() {
  const [deals, setDeals] = useState<DealPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>(["objecten"]);
  const [selectedDeal, setSelectedDeal] = useState<DealPin | null>(null);
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [dealsRes, viewingsRes] = await Promise.all([
        supabase
          .from("deals")
          .select("id, address, city, stage, agreed_price, asking_price, lat, lng, buyer_id, surface, property_type")
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
        surface: number | null;
        property_type: string | null;
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
        surface: d.surface,
        property_type: d.property_type,
      }));

      setDeals(mapped);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = activeStage ? deals.filter((d) => d.stage === activeStage) : deals;

  // Build city €/m² data
  const cityM2Map: Record<string, {
    eurPerM2s: number[];
    lat: number;
    lng: number;
    cityDeals: DealPin[];
    prices: number[];
  }> = {};
  for (const d of deals) {
    if (!d.city) continue;
    if (!cityM2Map[d.city]) cityM2Map[d.city] = { eurPerM2s: [], lat: d.lat, lng: d.lng, cityDeals: [], prices: [] };
    cityM2Map[d.city].cityDeals.push(d);
    const price = d.agreed_price ?? d.asking_price ?? 0;
    if (price > 0) {
      const surface = d.surface ?? 100;
      cityM2Map[d.city].eurPerM2s.push(price / surface);
      cityM2Map[d.city].prices.push(price);
    }
  }

  const cityAvg: Record<string, number> = {}; // avg €/m² across all types
  const cityCoords: Record<string, { lat: number; lng: number }> = {};
  for (const [city, data] of Object.entries(cityM2Map)) {
    cityCoords[city] = { lat: data.lat, lng: data.lng };
    if (data.eurPerM2s.length) {
      cityAvg[city] = data.eurPerM2s.reduce((a, b) => a + b, 0) / data.eurPerM2s.length;
    }
  }

  // Per-type, per-city ranking data
  const typeCityMap: Record<string, Record<string, number[]>> = {};
  for (const d of deals) {
    if (!d.city || !d.property_type) continue;
    const price = d.agreed_price ?? d.asking_price ?? 0;
    if (price <= 0) continue;
    const surface = d.surface ?? 100;
    if (!typeCityMap[d.property_type]) typeCityMap[d.property_type] = {};
    if (!typeCityMap[d.property_type][d.city]) typeCityMap[d.property_type][d.city] = [];
    typeCityMap[d.property_type][d.city].push(Math.round(price / surface));
  }

  // When a type is selected, override city avg with type-specific avg for the map
  const effectiveCityAvg: Record<string, number> =
    selectedType && typeCityMap[selectedType]
      ? Object.fromEntries(
          Object.entries(typeCityMap[selectedType]).map(([city, vals]) => [
            city,
            vals.reduce((a, b) => a + b, 0) / vals.length,
          ])
        )
      : cityAvg;

  // Sorted ranking for the selected type panel
  const typeRanking = selectedType
    ? Object.entries(typeCityMap[selectedType] ?? {})
        .map(([city, vals]) => ({
          city,
          avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          count: vals.length,
        }))
        .sort((a, b) => b.avg - a.avg)
    : [];

  function handleSelectCity(city: string) {
    const data = cityM2Map[city];
    if (!data) return;
    const prices = data.prices;
    setSelectedCity({
      city,
      eurPerM2: Math.round(cityAvg[city] ?? 0),
      count: data.cityDeals.length,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      avgPrice: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      byType: groupByType(data.cityDeals),
    });
    setSelectedDeal(null);
    setSelectedType(null);
  }

  function handleSelectDeal(deal: DealPin | null) {
    setSelectedDeal(deal);
    setSelectedCity(null);
    setSelectedType(null);
  }

  function handleSelectType(type: string) {
    setSelectedType(type);
    setSelectedCity(null);
    setSelectedDeal(null);
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

  // Deal panel €/m² comparison
  const dealPrice = selectedDeal ? (selectedDeal.agreed_price ?? selectedDeal.asking_price ?? 0) : 0;
  const dealEurM2 = dealPrice > 0 ? Math.round(dealPrice / (selectedDeal?.surface ?? 100)) : 0;
  const cityAvgM2 = selectedDeal?.city ? Math.round(cityAvg[selectedDeal.city] ?? 0) : 0;
  const m2Diff = dealEurM2 - cityAvgM2;
  const m2DiffPct = cityAvgM2 > 0 ? Math.round((m2Diff / cityAvgM2) * 100) : 0;

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
          {/* Active type filter chip */}
          {selectedType && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "#0f172a15", border: "1px solid #0f172a30", color: "#0f172a" }}>
              <span style={{ textTransform: "capitalize" }}>{selectedType}</span>
              <button onClick={() => setSelectedType(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
            </div>
          )}
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
            onSelectDeal={handleSelectDeal}
            onSelectCity={handleSelectCity}
            cityAvg={effectiveCityAvg}
            cityCoords={cityCoords}
          />
        )}

        {/* Legend */}
        {activeLayers.length > 0 && !loading && (
          <div style={{
            position: "absolute", bottom: 24, left: 56, zIndex: 1000,
            background: "rgba(255,255,255,0.96)", borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)", padding: "12px 14px", minWidth: 152,
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
              <div style={{ marginBottom: (activeLayers.includes("bezichtigingen") || activeLayers.includes("prijzen")) ? 10 : 0 }}>
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
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Prijszone (€/m²){selectedType ? ` · ${selectedType}` : ""}
                </div>
                {[
                  { label: "< €2.000/m²",        color: "#16a34a" },
                  { label: "€2.000 – €2.500/m²", color: "#eab308" },
                  { label: "€2.500 – €3.000/m²", color: "#f97316" },
                  { label: "> €3.000/m²",         color: "#ef4444" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#64748b" }}>{item.label}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8, marginTop: 8, fontSize: 9, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.4 }}>
                  Gebaseerd op eigen transacties.<br />
                  Marktbrede data via Brainbay API.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Type ranking panel — highest priority */}
        {selectedType && (
          <div style={{
            position: "absolute", bottom: 24, right: 24, zIndex: 1001,
            width: 280, background: "#fff", borderRadius: 14,
            border: "1px solid #e8ecf0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden",
          }}>
            <div style={{ background: "#0f172a", padding: "12px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>{selectedType}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>Prijs per gemeente</div>
              </div>
              <button
                onClick={() => setSelectedType(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {typeRanking.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>Geen data beschikbaar</div>
              ) : (
                typeRanking.map((item, i) => (
                  <div
                    key={item.city}
                    onClick={() => handleSelectCity(item.city)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 16px", borderBottom: "1px solid #f8fafc",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#94a3b8", width: 18, textAlign: "right", flexShrink: 0, fontWeight: 600 }}>{i + 1}</span>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: getPrijsColor(item.avg), display: "inline-block", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: "#0f172a", textTransform: "capitalize" }}>{item.city}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>€{item.avg.toLocaleString("nl-NL")}/m²</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>({item.count})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* City detail panel */}
        {selectedCity && !selectedType && (
          <div style={{
            position: "absolute", bottom: 24, right: 24, zIndex: 1000,
            width: 280, background: "#fff", borderRadius: 14,
            border: "1px solid #e8ecf0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden",
          }}>
            <div style={{ background: "#0f172a", padding: "12px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{selectedCity.city}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>Prijsoverzicht</div>
              </div>
              <button
                onClick={() => setSelectedCity(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: "14px 16px" }}>
              {/* Gem €/m² */}
              <div style={{ fontSize: 20, fontWeight: 800, color: getPrijsColor(selectedCity.eurPerM2), marginBottom: 10 }}>
                €{selectedCity.eurPerM2.toLocaleString("nl-NL")}/m²
              </div>
              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "TRANSACTIES", value: String(selectedCity.count) },
                  { label: "GEM. PRIJS",  value: formatEuro(selectedCity.avgPrice) },
                  { label: "LAAGSTE",     value: formatEuro(selectedCity.minPrice) },
                  { label: "HOOGSTE",     value: formatEuro(selectedCity.maxPrice) },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: "#f8fafc", borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{stat.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              {/* Clickable type rows */}
              {Object.keys(selectedCity.byType).length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Per woningtype</div>
                  {Object.entries(selectedCity.byType).map(([type, m2Vals]) => {
                    const avg = Math.round(m2Vals.reduce((a, b) => a + b, 0) / m2Vals.length);
                    return (
                      <div
                        key={type}
                        onClick={() => handleSelectType(type)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f8fafc", cursor: "pointer" }}
                      >
                        <span style={{ fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>{type}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>€{avg.toLocaleString("nl-NL")}/m²</span>
                          <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1 }}>›</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected deal panel */}
        {selectedDeal && !selectedCity && !selectedType && (
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
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{selectedDeal.city}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_COLORS[selectedDeal.stage] ?? "#94a3b8", display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>{selectedDeal.stage}</span>
              </div>
              {dealPrice > 0 && (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0284c7", marginBottom: 4 }}>
                    {formatEuro(dealPrice)}
                  </div>
                  {dealEurM2 > 0 && (
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
                      €{dealEurM2.toLocaleString("nl-NL")}/m²
                      {cityAvgM2 > 0 && (
                        <span style={{ marginLeft: 4, color: m2Diff > 0 ? "#ef4444" : m2Diff < 0 ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
                          {m2Diff > 0
                            ? ` · +${m2DiffPct}% boven gem. ${selectedDeal.city}`
                            : m2Diff < 0
                            ? ` · ${Math.abs(m2DiffPct)}% onder gem. ${selectedDeal.city}`
                            : ` · Gem. prijs ${selectedDeal.city}`}
                        </span>
                      )}
                    </div>
                  )}
                </>
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

"use client";

import { useEffect, useState, useMemo } from "react";
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

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
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

export default function MarktkaartPage() {
  const [deals, setDeals] = useState<DealPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("alle");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DealPin | null>(null);
  const [copied, setCopied] = useState(false);

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

      setDeals(rawDeals.map((d) => ({
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
      })));
      setLoading(false);
    }
    load();
  }, []);

  const filteredDeals = useMemo(() => {
    let d = deals.filter((deal) => deal.lat !== null && deal.lng !== null);
    if (selectedType !== "alle") d = d.filter((deal) => deal.property_type === selectedType);
    if (activeStage !== null) d = d.filter((deal) => deal.stage === activeStage);
    return d;
  }, [deals, selectedType, activeStage]);

  const cityData = useMemo(() => {
    const grouped: Record<string, { price: number; eurPerM2: number; deal: DealPin }[]> = {};
    for (const deal of filteredDeals) {
      const city = deal.city ?? "Onbekend";
      if (!grouped[city]) grouped[city] = [];
      const price = deal.agreed_price ?? deal.asking_price ?? 0;
      if (price > 0) {
        grouped[city].push({ price, eurPerM2: Math.round(price / (deal.surface ?? 100)), deal });
      }
    }
    return Object.entries(grouped)
      .map(([city, items]) => ({
        city,
        avgPrice: Math.round(items.reduce((s, i) => s + i.price, 0) / items.length),
        avgM2:    Math.round(items.reduce((s, i) => s + i.eurPerM2, 0) / items.length),
        count:    items.length,
        lat:      items[0].deal.lat,
        lng:      items[0].deal.lng,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.avgPrice - a.avgPrice);
  }, [filteredDeals]);

  const maxAvgPrice = Math.max(...cityData.map((c) => c.avgPrice), 1);
  const zeelandGem = cityData.length > 0
    ? Math.round(cityData.reduce((s, c) => s + c.avgPrice, 0) / cityData.length)
    : 0;

  // Map data derived from cityData
  const cityAvgM2 = Object.fromEntries(cityData.map((c) => [c.city, c.avgM2]));
  const cityCoords = Object.fromEntries(cityData.map((c) => [c.city, { lat: c.lat, lng: c.lng }]));

  // Stage counts from raw deals for filter pills
  const stageCounts = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.stage] = (acc[d.stage] ?? 0) + 1;
    return acc;
  }, {});

  // Deal panel €/m² comparison
  const dealPrice = selectedDeal ? (selectedDeal.agreed_price ?? selectedDeal.asking_price ?? 0) : 0;
  const dealEurM2 = dealPrice > 0 ? Math.round(dealPrice / (selectedDeal?.surface ?? 100)) : 0;
  const dealCityAvgM2 = selectedDeal?.city ? (cityAvgM2[selectedDeal.city] ?? 0) : 0;
  const m2Diff = dealEurM2 - dealCityAvgM2;
  const m2DiffPct = dealCityAvgM2 > 0 ? Math.round((m2Diff / dealCityAvgM2) * 100) : 0;

  function handleSelectDeal(deal: DealPin) {
    setSelectedDeal(deal);
    if (deal.city) setSelectedCity(deal.city);
  }

  function handleCopy() {
    const typeLabel = selectedType === "alle" ? "alle woningtypes" : selectedType;
    const lines = cityData.map((c) =>
      `${c.city}: gem. ${formatEuro(c.avgPrice)} (€${c.avgM2.toLocaleString("nl-NL")}/m²)`
    ).join("\n");
    const text =
      `Prijsoverzicht ${typeLabel} — Zeeland\n` +
      `${"─".repeat(40)}\n` +
      `${lines}\n` +
      `${"─".repeat(40)}\n` +
      `Zeeland gem.: ${formatEuro(zeelandGem)}\n\n` +
      `Bron: Transactly — eigen transacties\n` +
      `${new Date().toLocaleDateString("nl-NL")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>

      {/* TOP BAR */}
      <div style={{ height: 52, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>Marktkaart</span>
          {!loading && (
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {filteredDeals.length} objecten · {cityData.length} gemeenten
            </span>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf0", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Type dropdown */}
        <select
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setSelectedCity(null); setSelectedDeal(null); }}
          style={{
            border: "1px solid #e8ecf0", borderRadius: 20, padding: "5px 14px",
            fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none",
            color: selectedType !== "alle" ? "#0284c7" : "#64748b",
            background: selectedType !== "alle" ? "#f0f9ff" : "#fff",
            flexShrink: 0,
          }}
        >
          <option value="alle">🏠 Alle types</option>
          <option value="tussenwoning">Tussenwoning</option>
          <option value="hoekwoning">Hoekwoning</option>
          <option value="twee-onder-een-kapwoning">2-onder-1-kap</option>
          <option value="eengezinswoning">Eengezinswoning</option>
          <option value="appartement">Appartement</option>
          <option value="bovenwoning">Bovenwoning</option>
          <option value="vrijstaande woning">Vrijstaand</option>
          <option value="bungalow">Bungalow</option>
        </select>

        {/* Stage pills */}
        <button
          onClick={() => setActiveStage(null)}
          style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid", flexShrink: 0, borderColor: activeStage === null ? "#0284c7" : "#e8ecf0", background: activeStage === null ? "#f0f9ff" : "#fff", color: activeStage === null ? "#0284c7" : "#64748b" }}
        >
          Alle
        </button>
        {Object.entries(stageCounts).map(([stage, count]) => (
          <button
            key={stage}
            onClick={() => setActiveStage(activeStage === stage ? null : stage)}
            style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid", flexShrink: 0, borderColor: activeStage === stage ? STAGE_COLORS[stage] : "#e8ecf0", background: activeStage === stage ? (STAGE_COLORS[stage] ?? "#94a3b8") + "18" : "#fff", color: activeStage === stage ? STAGE_COLORS[stage] : "#64748b" }}
          >
            <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: STAGE_COLORS[stage] ?? "#94a3b8", marginRight: 4, verticalAlign: "middle" }} />
            {stage.charAt(0).toUpperCase() + stage.slice(1)} ({count})
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Count pill */}
        <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 11, borderRadius: 20, padding: "4px 12px", flexShrink: 0 }}>
          {filteredDeals.length} objecten
        </span>
      </div>

      {/* MAIN SPLIT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* LEFT — MAP 65% */}
        <div style={{ flex: "0 0 65%", position: "relative", overflow: "hidden" }}>
          {loading ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Laden…</span>
            </div>
          ) : (
            <MapView
              deals={filteredDeals}
              stageColors={STAGE_COLORS}
              onSelectDeal={handleSelectDeal}
              onSelectCity={(city) => { setSelectedCity(city); setSelectedDeal(null); }}
              onHoverCity={setHoveredCity}
              selectedCity={selectedCity}
              hoveredCity={hoveredCity}
              cityAvg={cityAvgM2}
              cityCoords={cityCoords}
            />
          )}

          {/* Deal detail overlay — kept in left map */}
          {selectedDeal && (
            <div style={{
              position: "absolute", bottom: 20, right: 20, zIndex: 1000,
              width: 264, background: "#fff", borderRadius: 12,
              boxShadow: "0 8px 28px rgba(0,0,0,0.14)", overflow: "hidden",
            }}>
              <div style={{ background: "#0f172a", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                  {selectedDeal.address ?? "Object"}
                </span>
                <button onClick={() => setSelectedDeal(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 17, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
              </div>
              <div style={{ padding: "12px 14px" }}>
                {selectedDeal.city && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{selectedDeal.city}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: STAGE_COLORS[selectedDeal.stage] ?? "#94a3b8", display: "inline-block" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>{selectedDeal.stage}</span>
                </div>
                {dealPrice > 0 && (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0284c7", marginBottom: 3 }}>{formatEuro(dealPrice)}</div>
                    {dealEurM2 > 0 && (
                      <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>
                        €{dealEurM2.toLocaleString("nl-NL")}/m²
                        {dealCityAvgM2 > 0 && (
                          <span style={{ marginLeft: 3, color: m2Diff > 0 ? "#ef4444" : m2Diff < 0 ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
                            {m2Diff > 0 ? ` · +${m2DiffPct}% boven gem.` : m2Diff < 0 ? ` · ${Math.abs(m2DiffPct)}% onder gem.` : " · Gem."}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
                {(selectedDeal.has_buyer || selectedDeal.viewing_count > 0) && (
                  <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#64748b", marginBottom: 10 }}>
                    {selectedDeal.has_buyer && <span>👤 Koper</span>}
                    {selectedDeal.viewing_count > 0 && <span>👁 {selectedDeal.viewing_count} bezichtiging{selectedDeal.viewing_count !== 1 ? "en" : ""}</span>}
                  </div>
                )}
                <a href={`/dashboard/${selectedDeal.id}`} style={{ display: "block", textAlign: "center", background: "#0284c7", color: "#fff", borderRadius: 7, padding: "7px 0", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                  Open deal →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — DATA PANEL 35% */}
        <div style={{ flex: "0 0 35%", borderLeft: "1px solid #e8ecf0", background: "#ffffff", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 20, flex: 1 }}>

            {/* Panel header */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
                {selectedType === "alle"
                  ? "Prijsoverzicht Zeeland"
                  : selectedType.charAt(0).toUpperCase() + selectedType.slice(1) + " — Zeeland"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                {filteredDeals.length} transacties · gem. {formatEuro(zeelandGem)}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e8ecf0", marginBottom: 14 }} />

            {/* Bar chart */}
            {loading ? (
              <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>Laden…</div>
            ) : cityData.length === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>Geen data voor deze filters</div>
            ) : (
              cityData.map((c) => {
                const isSelected = selectedCity === c.city;
                const isHovered = hoveredCity === c.city;
                const isHighlighted = isSelected || isHovered;
                return (
                  <div
                    key={c.city}
                    onMouseEnter={() => setHoveredCity(c.city)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={() => setSelectedCity(selectedCity === c.city ? null : c.city)}
                    style={{
                      marginBottom: 12, cursor: "pointer",
                      opacity: selectedCity && !isHighlighted ? 0.4 : 1,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {/* City name + price */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: isHighlighted ? 700 : 500, color: isHighlighted ? "#0f172a" : "#374151" }}>
                        {c.city}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: getPrijsColor(c.avgM2) }}>
                          {formatEuro(c.avgPrice)}
                        </span>
                        <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6 }}>
                          €{c.avgM2.toLocaleString("nl-NL")}/m²
                        </span>
                      </div>
                    </div>
                    {/* Bar */}
                    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${(c.avgPrice / maxAvgPrice) * 100}%`,
                        background: getPrijsColor(c.avgM2),
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                        opacity: isHighlighted ? 1 : 0.7,
                      }} />
                    </div>
                    {/* Count */}
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                      {c.count} transactie{c.count !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })
            )}

            {/* Zeeland gemiddelde */}
            {zeelandGem > 0 && (
              <div style={{ borderTop: "2px dashed #e8ecf0", paddingTop: 12, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Zeeland gemiddeld</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{formatEuro(zeelandGem)}</span>
              </div>
            )}

            {/* Copy button */}
            {cityData.length > 0 && (
              <button
                onClick={handleCopy}
                style={{
                  width: "100%", marginTop: 20, padding: "10px 0",
                  background: copied ? "#16a34a" : "#0284c7",
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                {copied ? "✓ Gekopieerd naar klembord!" : "📋 Kopieer voor verkoopgesprek"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

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
  created_at: string;
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

const LAYER_DEFS = [
  { key: "objecten", label: "Objecten",    icon: "🏠", color: "#0284c7" },
  { key: "prijzen",  label: "Prijsanalyse", icon: "💰", color: "#16a34a" },
];

const DROP_STYLE = {
  border: "1px solid #e8ecf0", borderRadius: 20, padding: "5px 14px",
  fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none",
  background: "#fff", color: "#64748b", flexShrink: 0,
} as const;

const DROP_ACTIVE = {
  ...DROP_STYLE, color: "#0284c7", background: "#f0f9ff",
} as const;

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

function periodeLabel(v: string) {
  if (v === "alle") return "alle tijd";
  if (v === "3")    return "afgelopen 3 maanden";
  if (v === "6")    return "afgelopen 6 maanden";
  if (v === "12")   return "afgelopen 12 maanden";
  return "afgelopen 2 jaar";
}

export default function MarktkaartPage() {
  const [deals, setDeals] = useState<DealPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLayers, setActiveLayers] = useState<string[]>(["objecten"]);
  // objecten filters
  const [activeStage, setActiveStage] = useState<string | null>(null);
  // prijzen filters
  const [periodeFilter, setPeriodeFilter] = useState("12");
  const [typeFilter, setTypeFilter]       = useState("alle");
  const [gemeenteFilter, setGemeenteFilter] = useState("alle");
  // selection
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [hoveredCity,  setHoveredCity]  = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DealPin | null>(null);
  const [copied, setCopied] = useState(false);

  const showObjecten = activeLayers.includes("objecten");
  const showPrijzen  = activeLayers.includes("prijzen");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [dealsRes, viewingsRes] = await Promise.all([
        supabase
          .from("deals")
          .select("id, address, city, stage, agreed_price, asking_price, lat, lng, buyer_id, surface, property_type, created_at")
          .not("lat", "is", null)
          .not("lng", "is", null),
        supabase.from("viewings").select("deal_id"),
      ]);

      const rawDeals = (dealsRes.data ?? []) as Array<{
        id: string; address: string | null; city: string | null; stage: DealStage;
        agreed_price: number | null; asking_price: number | null;
        lat: number; lng: number; buyer_id: string | null;
        surface: number | null; property_type: string | null; created_at: string;
      }>;

      const viewings = (viewingsRes.data ?? []) as Array<{ deal_id: string }>;
      const viewingCounts: Record<string, number> = {};
      for (const v of viewings) {
        if (v.deal_id) viewingCounts[v.deal_id] = (viewingCounts[v.deal_id] ?? 0) + 1;
      }

      setDeals(rawDeals.map((d) => ({
        id: d.id, address: d.address, city: d.city, stage: d.stage,
        agreed_price: d.agreed_price, asking_price: d.asking_price,
        lat: d.lat, lng: d.lng, has_buyer: Boolean(d.buyer_id),
        viewing_count: viewingCounts[d.id] ?? 0,
        surface: d.surface, property_type: d.property_type, created_at: d.created_at,
      })));
      setLoading(false);
    }
    load();
  }, []);

  // ── Objecten layer ────────────────────────────────────────────────────────
  const filteredDeals = useMemo(() => {
    let d = deals.filter((x) => x.lat !== null && x.lng !== null);
    if (activeStage !== null) d = d.filter((x) => x.stage === activeStage);
    return d;
  }, [deals, activeStage]);

  // ── Prijsanalyse layer (gesloten only) ───────────────────────────────────
  const geslotenDeals = useMemo(
    () => deals.filter((d) => d.stage === "gesloten"),
    [deals]
  );

  const filteredGesloten = useMemo(() => {
    let d = geslotenDeals.filter((x) => x.lat !== null && x.lng !== null);
    if (periodeFilter !== "alle") {
      const months = parseInt(periodeFilter);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      d = d.filter((x) => x.created_at && new Date(x.created_at) >= cutoff);
    }
    if (typeFilter    !== "alle") d = d.filter((x) => x.property_type === typeFilter);
    if (gemeenteFilter !== "alle") d = d.filter((x) => x.city === gemeenteFilter);
    return d;
  }, [geslotenDeals, periodeFilter, typeFilter, gemeenteFilter]);

  const cities = useMemo(
    () => Array.from(new Set(geslotenDeals.map((d) => d.city).filter(Boolean) as string[])).sort(),
    [geslotenDeals]
  );

  // ── City aggregation from gesloten deals ─────────────────────────────────
  const cityData = useMemo(() => {
    const grouped: Record<string, { price: number; eurPerM2: number; deal: DealPin }[]> = {};
    for (const deal of filteredGesloten) {
      const city = deal.city ?? "Onbekend";
      if (!grouped[city]) grouped[city] = [];
      const price = deal.agreed_price ?? 0;
      if (price > 0) grouped[city].push({ price, eurPerM2: Math.round(price / (deal.surface ?? 100)), deal });
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
      .sort((a, b) => b.avgPrice - a.avgPrice);
  }, [filteredGesloten]);

  // ── Right panel mode ──────────────────────────────────────────────────────
  const mode: "type" | "gemeente" | "both" =
    typeFilter !== "alle" && gemeenteFilter !== "alle" ? "both"
    : gemeenteFilter !== "alle" ? "gemeente"
    : "type";

  // Mode B — group by property type within selected gemeente
  const byType = useMemo(() => {
    if (gemeenteFilter === "alle") return [];
    const grouped: Record<string, DealPin[]> = {};
    for (const d of filteredGesloten) {
      const t = d.property_type ?? "overig";
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(d);
    }
    return Object.entries(grouped)
      .map(([type, items]) => ({
        type,
        avgPrice: Math.round(items.reduce((s, d) => s + (d.agreed_price ?? 0), 0) / items.length),
        avgM2:    Math.round(items.reduce((s, d) => s + (d.agreed_price ?? 0) / (d.surface ?? 100), 0) / items.length),
        count:    items.length,
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice);
  }, [filteredGesloten, gemeenteFilter]);

  // Mode C — comparison stats
  const bothStats = useMemo(() => {
    if (typeFilter === "alle" || gemeenteFilter === "alle" || filteredGesloten.length === 0) return null;
    const avgPrice = Math.round(filteredGesloten.reduce((s, d) => s + (d.agreed_price ?? 0), 0) / filteredGesloten.length);
    const avgM2    = Math.round(filteredGesloten.reduce((s, d) => s + (d.agreed_price ?? 0) / (d.surface ?? 100), 0) / filteredGesloten.length);
    const zeelandTypeDeals = geslotenDeals.filter((d) => d.property_type === typeFilter);
    const zeelandAvg = zeelandTypeDeals.length > 0
      ? Math.round(zeelandTypeDeals.reduce((s, d) => s + (d.agreed_price ?? 0), 0) / zeelandTypeDeals.length)
      : 0;
    const diffPct = zeelandAvg > 0 ? Math.round(((avgPrice - zeelandAvg) / zeelandAvg) * 100) : 0;
    return { avgPrice, avgM2, count: filteredGesloten.length, zeelandAvg, diffPct };
  }, [filteredGesloten, geslotenDeals, typeFilter, gemeenteFilter]);

  // ── Derived map data ──────────────────────────────────────────────────────
  const maxAvgPrice  = Math.max(...cityData.map((c) => c.avgPrice), 1);
  const maxTypePrice = Math.max(...byType.map((t) => t.avgPrice), 1);
  const zeelandGem   = cityData.length > 0
    ? Math.round(cityData.reduce((s, c) => s + c.avgPrice, 0) / cityData.length) : 0;

  const cityAvgM2  = Object.fromEntries(cityData.map((c) => [c.city, c.avgM2]));
  const cityCoords = Object.fromEntries(cityData.map((c) => [c.city, { lat: c.lat, lng: c.lng }]));

  const stageCounts = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.stage] = (acc[d.stage] ?? 0) + 1;
    return acc;
  }, {});

  // ── Deal panel ────────────────────────────────────────────────────────────
  const dealPrice     = selectedDeal ? (selectedDeal.agreed_price ?? 0) : 0;
  const dealEurM2     = dealPrice > 0 ? Math.round(dealPrice / (selectedDeal?.surface ?? 100)) : 0;
  const dealCityAvgM2 = selectedDeal?.city ? (cityAvgM2[selectedDeal.city] ?? 0) : 0;
  const m2Diff        = dealEurM2 - dealCityAvgM2;
  const m2DiffPct     = dealCityAvgM2 > 0 ? Math.round((m2Diff / dealCityAvgM2) * 100) : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function toggleLayer(key: string) {
    setActiveLayers((prev) =>
      prev.includes(key) ? prev.filter((l) => l !== key) : [...prev, key]
    );
  }

  function handleSelectDeal(deal: DealPin) {
    setSelectedDeal(deal);
    if (deal.city) setSelectedCity(deal.city);
  }

  function handleCopy() {
    const dateStr    = new Date().toLocaleDateString("nl-NL");
    const source     = `\nBron: Transactly — eigen transacties\n${dateStr}`;
    const periodeStr = `Periode: ${periodeLabel(periodeFilter)}`;
    const sep        = "─".repeat(40);
    let text = "";

    if (mode === "type") {
      const typeLabel = typeFilter === "alle" ? "alle woningtypes" : typeFilter;
      const lines = cityData.map((c) =>
        `${c.city}: gem. ${formatEuro(c.avgPrice)} (€${c.avgM2.toLocaleString("nl-NL")}/m²)`
      ).join("\n");
      text = `Prijsoverzicht ${typeLabel} — Zeeland\n${periodeStr}\n${sep}\n${lines}\n${sep}\nZeeland gem.: ${formatEuro(zeelandGem)}${source}`;
    } else if (mode === "gemeente") {
      const lines = byType.map((t) =>
        `${t.type}: gem. ${formatEuro(t.avgPrice)} (€${t.avgM2.toLocaleString("nl-NL")}/m²)`
      ).join("\n");
      const gemeenteGem = byType.length > 0
        ? Math.round(byType.reduce((s, t) => s + t.avgPrice, 0) / byType.length) : 0;
      text = `${gemeenteFilter} — Alle woningtypes\n${periodeStr}\n${sep}\n${lines}\n${sep}\nGem. ${gemeenteFilter}: ${formatEuro(gemeenteGem)}${source}`;
    } else if (bothStats) {
      const diffStr = bothStats.diffPct >= 0 ? `+${bothStats.diffPct}%` : `${bothStats.diffPct}%`;
      text = `${typeFilter} in ${gemeenteFilter}\n${periodeStr}\n${sep}\nGem. prijs: ${formatEuro(bothStats.avgPrice)}\nGem. €/m²: €${bothStats.avgM2.toLocaleString("nl-NL")}\nTransacties: ${bothStats.count}\nvs Zeeland gem.: ${diffStr}${source}`;
    }
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Panel subtitle ────────────────────────────────────────────────────────
  const panelTitle =
    mode === "both"    ? `${typeFilter} in ${gemeenteFilter}` :
    mode === "gemeente" ? `${gemeenteFilter} — Alle types` :
    typeFilter === "alle" ? "Prijsoverzicht Zeeland" :
    `${typeFilter.charAt(0).toUpperCase()}${typeFilter.slice(1)} — Zeeland`;

  const panelSubtitle = `${filteredGesloten.length} transacties · gem. ${formatEuro(zeelandGem)} · ${periodeLabel(periodeFilter)}`;

  // ── Can show copy button ──────────────────────────────────────────────────
  const canCopy = mode === "type" ? cityData.length > 0
    : mode === "gemeente" ? byType.length > 0
    : bothStats !== null;

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
        {/* Layer toggles */}
        <div style={{ display: "flex", gap: 6 }}>
          {LAYER_DEFS.map((layer) => {
            const on = activeLayers.includes(layer.key);
            return (
              <button
                key={layer.key}
                onClick={() => toggleLayer(layer.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                  borderColor: on ? layer.color : "#e8ecf0",
                  background: on ? layer.color + "12" : "#fff",
                  color: on ? layer.color : "#64748b",
                }}
              >
                {layer.icon} {layer.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf0", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        {showPrijzen ? (
          <>
            {/* Periode */}
            <select
              value={periodeFilter}
              onChange={(e) => setPeriodeFilter(e.target.value)}
              style={periodeFilter !== "12" ? DROP_ACTIVE : DROP_STYLE}
            >
              <option value="3">Afgelopen 3 maanden</option>
              <option value="6">Afgelopen 6 maanden</option>
              <option value="12">Afgelopen 12 maanden</option>
              <option value="24">Afgelopen 2 jaar</option>
              <option value="alle">Alle tijd</option>
            </select>

            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setSelectedCity(null); }}
              style={typeFilter !== "alle" ? DROP_ACTIVE : DROP_STYLE}
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

            {/* Gemeente */}
            <select
              value={gemeenteFilter}
              onChange={(e) => { setGemeenteFilter(e.target.value); setSelectedCity(null); }}
              style={gemeenteFilter !== "alle" ? DROP_ACTIVE : DROP_STYLE}
            >
              <option value="alle">📍 Alle gemeenten</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ flex: 1 }} />
            <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 11, borderRadius: 20, padding: "4px 12px", flexShrink: 0 }}>
              {filteredGesloten.length} gesloten
            </span>
          </>
        ) : (
          <>
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
            <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 11, borderRadius: 20, padding: "4px 12px", flexShrink: 0 }}>
              {filteredDeals.length} objecten
            </span>
          </>
        )}
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
              deals={showObjecten ? filteredDeals : []}
              stageColors={STAGE_COLORS}
              onSelectDeal={handleSelectDeal}
              onSelectCity={(city) => { setSelectedCity(city); setSelectedDeal(null); }}
              onHoverCity={setHoveredCity}
              selectedCity={selectedCity}
              hoveredCity={hoveredCity}
              cityAvg={showPrijzen ? cityAvgM2 : {}}
              cityCoords={showPrijzen ? cityCoords : {}}
            />
          )}

          {/* Empty state when prijzen active but no gesloten deals match */}
          {showPrijzen && !loading && filteredGesloten.length === 0 && (
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              zIndex: 999, background: "#fff", borderRadius: 12, padding: "18px 28px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)", textAlign: "center", pointerEvents: "none",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
                Geen gesloten transacties gevonden
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>voor deze filters</div>
            </div>
          )}

          {/* Deal detail overlay */}
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
                          <span style={{ marginLeft: 3, fontWeight: 600, color: m2Diff > 0 ? "#ef4444" : m2Diff < 0 ? "#16a34a" : "#94a3b8" }}>
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

          {!showPrijzen ? (
            /* Prijsanalyse not active — invite user */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", gap: 12 }}>
              <span style={{ fontSize: 36 }}>💰</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Prijsanalyse</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, maxWidth: 220 }}>
                Activeer Prijsanalyse om per gemeente en woningtype te zien wat gesloten transacties gemiddeld opbrengen.
              </div>
              <button
                onClick={() => setActiveLayers((prev) => [...prev, "prijzen"])}
                style={{ marginTop: 4, padding: "10px 20px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Activeer Prijsanalyse
              </button>
            </div>
          ) : (
            <div style={{ padding: 20, flex: 1 }}>

              {/* Panel header */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>{panelTitle}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{panelSubtitle}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic", marginTop: 1 }}>Alleen gesloten transacties</div>
              </div>

              <div style={{ borderTop: "1px solid #e8ecf0", marginBottom: 14 }} />

              {/* ── MODE A: type — city bars ─────────────────────────────── */}
              {mode === "type" && (
                loading ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>Laden…</div>
                ) : cityData.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>Geen gesloten transacties voor deze filters</div>
                ) : (
                  cityData.map((c) => {
                    const isSelected   = selectedCity === c.city;
                    const isHovered    = hoveredCity === c.city;
                    const isHighlighted = isSelected || isHovered;
                    return (
                      <div
                        key={c.city}
                        onMouseEnter={() => setHoveredCity(c.city)}
                        onMouseLeave={() => setHoveredCity(null)}
                        onClick={() => setSelectedCity(selectedCity === c.city ? null : c.city)}
                        style={{ marginBottom: 12, cursor: "pointer", opacity: selectedCity && !isHighlighted ? 0.4 : 1, transition: "opacity 0.2s" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: isHighlighted ? 700 : 500, color: isHighlighted ? "#0f172a" : "#374151" }}>{c.city}</span>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: getPrijsColor(c.avgM2) }}>{formatEuro(c.avgPrice)}</span>
                            <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6 }}>€{c.avgM2.toLocaleString("nl-NL")}/m²</span>
                          </div>
                        </div>
                        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(c.avgPrice / maxAvgPrice) * 100}%`, background: getPrijsColor(c.avgM2), borderRadius: 4, transition: "width 0.4s", opacity: isHighlighted ? 1 : 0.7 }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{c.count} transactie{c.count !== 1 ? "s" : ""}</div>
                      </div>
                    );
                  })
                )
              )}

              {/* ── MODE B: gemeente — type bars ─────────────────────────── */}
              {mode === "gemeente" && (
                byType.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>Geen data voor {gemeenteFilter}</div>
                ) : (
                  byType.map((t) => (
                    <div key={t.type} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", textTransform: "capitalize" }}>{t.type}</span>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: getPrijsColor(t.avgM2) }}>{formatEuro(t.avgPrice)}</span>
                          <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6 }}>€{t.avgM2.toLocaleString("nl-NL")}/m²</span>
                        </div>
                      </div>
                      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(t.avgPrice / maxTypePrice) * 100}%`, background: getPrijsColor(t.avgM2), borderRadius: 4, opacity: 0.8 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{t.count} transactie{t.count !== 1 ? "s" : ""}</div>
                    </div>
                  ))
                )
              )}

              {/* ── MODE C: both — centered comparison ───────────────────── */}
              {mode === "both" && (
                !bothStats ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>Geen data</div>
                ) : (
                  <div style={{ textAlign: "center", paddingTop: 12 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: getPrijsColor(bothStats.avgM2), letterSpacing: "-0.5px" }}>
                      {formatEuro(bothStats.avgPrice)}
                    </div>
                    <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                      €{bothStats.avgM2.toLocaleString("nl-NL")}/m²
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      {bothStats.count} transactie{bothStats.count !== 1 ? "s" : ""}
                    </div>

                    <div style={{ borderTop: "1px solid #e8ecf0", marginTop: 20, paddingTop: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                        Vergelijking
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                        <span style={{ fontSize: 12, color: "#64748b" }}>vs Zeeland gem. {typeFilter}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: bothStats.diffPct > 0 ? "#ef4444" : bothStats.diffPct < 0 ? "#16a34a" : "#94a3b8" }}>
                          {bothStats.diffPct >= 0 ? `+${bothStats.diffPct}%` : `${bothStats.diffPct}%`}
                        </span>
                      </div>
                      {bothStats.zeelandAvg > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>Zeeland gem.</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{formatEuro(bothStats.zeelandAvg)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Zeeland gemiddelde — only in mode A */}
              {mode === "type" && zeelandGem > 0 && (
                <div style={{ borderTop: "2px dashed #e8ecf0", paddingTop: 12, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Zeeland gemiddeld</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{formatEuro(zeelandGem)}</span>
                </div>
              )}

              {/* Copy button */}
              {canCopy && (
                <button
                  onClick={handleCopy}
                  style={{ width: "100%", marginTop: 20, padding: "10px 0", background: copied ? "#16a34a" : "#0284c7", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
                >
                  {copied ? "✓ Gekopieerd naar klembord!" : "📋 Kopieer voor verkoopgesprek"}
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

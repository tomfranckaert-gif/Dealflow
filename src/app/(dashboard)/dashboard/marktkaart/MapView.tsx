"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DealPin } from "./page";

function formatEuro(v: number) {
  return "€ " + Math.round(v).toLocaleString("nl-NL");
}

function priceColor(eurPerM2: number): string {
  if (eurPerM2 < 2000) return "#16a34a";
  if (eurPerM2 < 2500) return "#eab308";
  if (eurPerM2 < 3000) return "#f97316";
  return "#ef4444";
}

function FitBounds({ deals }: { deals: DealPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (deals.length === 0) return;
    if (deals.length === 1) {
      map.setView([deals[0].lat, deals[0].lng], 13);
      return;
    }
    const lats = deals.map((d) => d.lat);
    const lngs = deals.map((d) => d.lng);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [40, 40] }
    );
  }, [deals, map]);
  return null;
}

interface MapViewProps {
  deals: DealPin[];
  stageColors: Record<string, string>;
  activeLayers: string[];
  onSelectDeal: (deal: DealPin | null) => void;
  onSelectCity: (city: string) => void;
  cityAvg: Record<string, number>;
  cityCoords: Record<string, { lat: number; lng: number }>;
}

const PRICE_LABEL_CSS = `
  .price-label {
    background: rgba(15,23,42,0.85) !important;
    border: none !important;
    border-radius: 6px !important;
    color: white !important;
    padding: 4px 8px !important;
    box-shadow: none !important;
  }
  .price-label::before {
    display: none !important;
  }
`;

export default function MapView({ deals, stageColors, activeLayers, onSelectDeal, onSelectCity, cityAvg, cityCoords }: MapViewProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRICE_LABEL_CSS }} />
      <MapContainer
        center={[52.3, 5.3]}
        zoom={8}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds deals={deals} />

        {/* Prijskaart laag — city circles with permanent labels */}
        {activeLayers.includes("prijzen") &&
          Object.entries(cityAvg).map(([city, avg]) => {
            const coords = cityCoords[city];
            if (!coords) return null;
            const color = priceColor(avg);
            return (
              <Circle
                key={`price-${city}`}
                center={[coords.lat, coords.lng]}
                radius={3000}
                pathOptions={{ fillColor: color, fillOpacity: 0.25, color: color, weight: 1.5 }}
                eventHandlers={{ click: () => onSelectCity(city) }}
              >
                <Tooltip permanent direction="center" className="price-label">
                  <div style={{ fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>
                    {city}<br />
                    €{Math.round(avg).toLocaleString("nl-NL")}/m²
                  </div>
                </Tooltip>
              </Circle>
            );
          })}

        {/* Bezichtigingen laag */}
        {activeLayers.includes("bezichtigingen") &&
          deals
            .filter((d) => d.viewing_count > 0)
            .map((deal) => (
              <CircleMarker
                key={`view-${deal.id}`}
                center={[deal.lat, deal.lng]}
                radius={6}
                pathOptions={{ fillColor: "#f97316", fillOpacity: 0.5, color: "#f97316", weight: 1 }}
                eventHandlers={{ click: () => onSelectDeal(deal) }}
              >
                <Popup>
                  <div style={{ fontFamily: "DM Sans, sans-serif" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{deal.address ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "#f97316", fontWeight: 600, marginTop: 3 }}>
                      {deal.viewing_count} bezichtiging{deal.viewing_count !== 1 ? "en" : ""}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

        {/* Kopers laag */}
        {activeLayers.includes("kopers") &&
          deals
            .filter((d) => d.has_buyer)
            .map((deal) => (
              <CircleMarker
                key={`buyer-${deal.id}`}
                center={[deal.lat, deal.lng]}
                radius={8}
                pathOptions={{ fillColor: "#ef4444", fillOpacity: 0.7, color: "#fff", weight: 2 }}
                eventHandlers={{ click: () => onSelectDeal(deal) }}
              />
            ))}

        {/* Objecten laag */}
        {activeLayers.includes("objecten") &&
          deals.map((deal) => {
            const color = stageColors[deal.stage] ?? "#94a3b8";
            const price = deal.agreed_price ?? deal.asking_price;
            return (
              <CircleMarker
                key={deal.id}
                center={[deal.lat, deal.lng]}
                radius={9}
                pathOptions={{ fillColor: color, fillOpacity: 0.85, color: "#fff", weight: 2 }}
                eventHandlers={{ click: () => onSelectDeal(deal) }}
              >
                <Popup>
                  <div style={{ minWidth: 160, fontFamily: "DM Sans, sans-serif" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                      {deal.address ?? "—"}
                    </div>
                    {deal.city && (
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{deal.city}</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>{deal.stage}</span>
                    </div>
                    {price != null && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0284c7" }}>{formatEuro(price)}</div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </>
  );
}

"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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

function formatEuro(v: number) {
  return "€ " + Math.round(v).toLocaleString("nl-NL");
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

export default function MapView({ deals, stageColors }: { deals: DealPin[]; stageColors: Record<string, string> }) {
  return (
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
      {deals.map((deal) => {
        const color = stageColors[deal.stage] ?? "#94a3b8";
        const price = deal.agreed_price ?? deal.asking_price;
        return (
          <CircleMarker
            key={deal.id}
            center={[deal.lat, deal.lng]}
            radius={9}
            pathOptions={{ fillColor: color, fillOpacity: 0.85, color: "#fff", weight: 2 }}
          >
            <Popup>
              <div style={{ minWidth: 160, fontFamily: "DM Sans, sans-serif" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                  {deal.address ?? "—"}
                </div>
                {deal.city && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{deal.city}</div>}
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
  );
}

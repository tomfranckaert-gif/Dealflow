"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Deal {
  id: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
}

interface LogLine {
  text: string;
  ok: boolean;
}

async function nominatim(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const q = encodeURIComponent(`${address} ${city} Nederland`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=nl`,
    { headers: { "User-Agent": "Transactly/1.0" } }
  );
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function GeocodePage() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);

  function addLog(text: string, ok: boolean) {
    setLog((prev) => [...prev, { text, ok }]);
  }

  async function start() {
    setRunning(true);
    setDone(false);
    setCurrent(0);
    setLog([]);

    const supabase = createClient();

    const { data: deals, error } = await supabase
      .from("deals")
      .select("id, address, city, postcode")
      .is("lat", null);

    if (error) {
      addLog(`Fout bij ophalen deals: ${error.message}`, false);
      setRunning(false);
      return;
    }

    const todo = (deals as Deal[]).filter((d) => d.address && d.city);
    setTotal(todo.length);
    addLog(`${todo.length} deals te geocoden…`, true);

    let count = 0;
    for (const deal of todo) {
      const coords = await nominatim(deal.address!, deal.city!);
      if (coords) {
        await supabase
          .from("deals")
          .update({ lat: coords.lat, lng: coords.lng })
          .eq("id", deal.id);
        count++;
        addLog(`✓ ${deal.address}, ${deal.city} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, true);
      } else {
        addLog(`✗ ${deal.address}, ${deal.city} → niet gevonden`, false);
      }
      setCurrent((n) => n + 1);
      await sleep(1100);
    }

    addLog(`\n✅ Klaar — ${count}/${todo.length} deals geocoded`, true);
    setRunning(false);
    setDone(true);
  }

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div style={{ flex: 1, background: "#f8fafc", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 24px" }}>
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "640px" }}>

        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Admin</div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "0 0 6px" }}>Geocoding</h1>
        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 24px", lineHeight: "1.6" }}>
          Haalt coördinaten op voor alle deals zonder lat/lng via Nominatim (OpenStreetMap). Max 1 request per seconde.
        </p>

        {/* Progress bar */}
        {(running || done) && total > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                {current}/{total} geocoded
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{pct}%</span>
            </div>
            <div style={{ background: "#f1f5f9", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, background: done ? "#16a34a" : "#0284c7", height: "8px", borderRadius: "6px", transition: "width 0.3s ease" }} />
            </div>
          </div>
        )}

        {/* Start button */}
        <button
          onClick={start}
          disabled={running}
          style={{
            background: running ? "#94a3b8" : done ? "#16a34a" : "#0284c7",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 24px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: running ? "not-allowed" : "pointer",
            marginBottom: "20px",
          }}
        >
          {running ? `Bezig… ${current}/${total}` : done ? "Opnieuw starten" : "Start Geocoding"}
        </button>

        {/* Log output */}
        {log.length > 0 && (
          <div style={{ background: "#0f172a", borderRadius: "10px", padding: "16px", maxHeight: "360px", overflowY: "auto", fontFamily: "monospace" }}>
            {log.map((line, i) => (
              <div key={i} style={{ fontSize: "12px", color: line.ok ? "#86efac" : "#fca5a5", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
                {line.text}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

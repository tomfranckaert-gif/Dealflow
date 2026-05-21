"use client";

import { useRouter } from "next/navigation";

export default function MarktkaartPage() {
  const router = useRouter();

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "16px", padding: "48px", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🗺️</div>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Marktkaart</div>
        <div style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.6", marginBottom: "24px" }}>
          Zie precies waar jouw kopers vandaan komen, waar de vraag het grootst is en waar je de volgende nieuwbouwdag moet houden.
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginBottom: "24px" }}>
          {["📍 Heatmap potentiële kopers", "💰 Prijskaart per wijk", "🎯 Optimale event locatie"].map((pill) => (
            <span key={pill} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", borderRadius: "20px", fontSize: "12px", padding: "6px 14px" }}>
              {pill}
            </span>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #e8ecf0", marginBottom: "24px" }} />

        <div style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic", marginBottom: "24px" }}>
          Beschikbaar in Sprint 5
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
        >
          ← Terug naar dashboard
        </button>
      </div>
    </div>
  );
}

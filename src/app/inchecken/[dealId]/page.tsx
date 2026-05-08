"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", border: "1px solid #e8ecf0",
  borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#0f172a",
  outline: "none", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
  background: "#fff", marginTop: 6,
};

const lbl: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.4px",
};

export default function IncheckenPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const [address, setAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    budget: "Onbekend", interest_level: "neutraal",
    has_agent: false, has_mortgage: false,
  });

  useEffect(() => {
    supabase.from("deals").select("address, city").eq("id", dealId).single()
      .then(({ data }) => {
        if (data) setAddress([data.address, data.city].filter(Boolean).join(", "));
      });
  }, [dealId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    await supabase.from("viewings_guests").insert({
      deal_id: dealId,
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      budget: form.budget,
      interest_level: form.interest_level,
      has_agent: form.has_agent,
      has_mortgage: form.has_mortgage,
      source: "qr",
      event_date: new Date().toISOString().split("T")[0],
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Bedankt voor je bezoek!</div>
          <div style={{ fontSize: 15, color: "#64748b", marginBottom: 6 }}>{address}</div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>De makelaar neemt binnenkort contact op.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/logo.png" width={48} height={48} alt="Logo" style={{ borderRadius: 10 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 16, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 6px", textAlign: "center", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
            {address ? `Welkom bij ${address}` : "Welkom!"}
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", margin: "0 0 24px", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
            Vul je gegevens in om in te checken
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lbl}>Naam *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Voor- en achternaam" style={inp} />
            </div>
            <div>
              <label style={lbl}>Telefoonnummer</label>
              <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+31 6 12 34 56 78" style={inp} />
            </div>
            <div>
              <label style={lbl}>E-mailadres</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="naam@email.nl" style={inp} />
            </div>
            <div>
              <label style={lbl}>Budget</label>
              <select value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} style={inp}>
                {["< €300k","€300-400k","€400-500k","€500-700k","> €700k","Onbekend"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Interesse in deze woning</label>
              <select value={form.interest_level} onChange={e => setForm({...form, interest_level: e.target.value})} style={inp}>
                <option value="zeer_geinteresseerd">Zeer geïnteresseerd</option>
                <option value="geinteresseerd">Geïnteresseerd</option>
                <option value="neutraal">Neutraal</option>
                <option value="niet_geinteresseerd">Niet geïnteresseerd</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#374151", cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
                <input type="checkbox" checked={form.has_agent} onChange={e => setForm({...form, has_agent: e.target.checked})} style={{ width: 16, height: 16 }} />
                Ik heb al een aankoopmakelaar
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#374151", cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
                <input type="checkbox" checked={form.has_mortgage} onChange={e => setForm({...form, has_mortgage: e.target.checked})} style={{ width: 16, height: 16 }} />
                Mijn hypotheek is al geregeld
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              style={{
                background: "#0284c7", color: "#fff", border: "none",
                borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 700,
                cursor: submitting || !form.name.trim() ? "default" : "pointer",
                opacity: submitting || !form.name.trim() ? 0.6 : 1,
                fontFamily: "DM Sans, Helvetica Neue, sans-serif",
                marginTop: 4,
              }}
            >
              {submitting ? "Inchecken..." : "Inchecken"}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 16, fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
          Je gegevens worden alleen gebruikt door de makelaar
        </p>
      </div>
    </div>
  );
}

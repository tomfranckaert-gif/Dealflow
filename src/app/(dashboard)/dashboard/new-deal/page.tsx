"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchProperties, type RealworksProperty } from "@/lib/realworks";

const inp: React.CSSProperties = { width: "100%", background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif" };
const lbl: React.CSSProperties = { display: "block", fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "20px 24px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const cardTitle: React.CSSProperties = { fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" };

export default function NewDealPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RealworksProperty[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    address: "", postcode: "", city: "", property_type: "", surface: "", rooms: "",
    asking_price: "", agreed_price: "", transfer_date: "", notary_name: "",
    seller_name: "", seller_email: "", seller_phone: "",
    buyer_name: "", buyer_email: "", buyer_phone: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); setShowDropdown(false); return; }
    const data = searchProperties(q);
    setResults(data);
    setShowDropdown(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 500);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectProperty(p: RealworksProperty) {
    setQuery(p.address);
    setShowDropdown(false);
    setForm((f) => ({ ...f, address: p.address, postcode: p.postcode, city: p.city, property_type: p.type, surface: p.surface.toString(), rooms: p.rooms.toString(), asking_price: p.asking_price.toString(), agreed_price: p.asking_price.toString(), seller_name: p.owner_name, seller_email: p.owner_email, seller_phone: p.owner_phone }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: seller, error: e1 } = await supabase.from("contacts").insert({ owner_id: user.id, name: form.seller_name, email: form.seller_email || null, phone: form.seller_phone || null, type: "seller" }).select().single();
    if (e1) { setError(e1.message); setSubmitting(false); return; }

    const { data: buyer, error: e2 } = await supabase.from("contacts").insert({ owner_id: user.id, name: form.buyer_name, email: form.buyer_email || null, phone: form.buyer_phone || null, type: "buyer" }).select().single();
    if (e2) { setError(e2.message); setSubmitting(false); return; }

    const { error: e3 } = await supabase.from("deals").insert({ owner_id: user.id, title: `${form.address}, ${form.city}`, company: form.seller_name, stage: "lead", address: form.address, postcode: form.postcode, city: form.city, property_type: form.property_type, surface: form.surface ? parseInt(form.surface) : null, rooms: form.rooms ? parseInt(form.rooms) : null, asking_price: form.asking_price ? parseFloat(form.asking_price) : null, agreed_price: form.agreed_price ? parseFloat(form.agreed_price) : null, value: form.agreed_price ? parseFloat(form.agreed_price) : null, transfer_date: form.transfer_date || null, notary_name: form.notary_name || null, seller_id: seller.id, buyer_id: buyer.id, contact_name: form.seller_name, contact_email: form.seller_email || null });
    if (e3) { setError(e3.message); setSubmitting(false); return; }
    router.push("/dashboard");
  }

  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/dashboard" style={{ color: "#94a3b8", textDecoration: "none", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
          </Link>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Nieuwe transactie</span>
        </div>
      </div>

      {/* Form content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: "680px" }}>
          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#ef4444", marginBottom: "16px" }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Realworks search */}
            <div style={card}>
              <div style={cardTitle}>Woning zoeken via Realworks</div>
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <label style={lbl}>Adres zoeken</label>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="bv. Keizersgracht of Amsterdam..." style={{ ...inp, paddingLeft: "32px" }} />
                </div>
                {showDropdown && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e8ecf0", borderRadius: "10px", zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                    {results.length === 0 ? (
                      <div style={{ padding: "12px 16px", fontSize: "13px", color: "#94a3b8" }}>Geen woningen gevonden</div>
                    ) : results.map((p) => (
                      <button key={p.id} type="button" onClick={() => selectProperty(p)}
                        style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{p.address}, {p.postcode} {p.city}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{p.type} · {p.surface}m² · {p.rooms} kamers · € {p.asking_price.toLocaleString("nl-NL")}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Woning */}
            <div style={card}>
              <div style={cardTitle}>Woninggegevens</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lbl}>Adres *</label>
                  <input required value={form.address} onChange={(e) => set("address", e.target.value)} style={inp} placeholder="Straat en huisnummer" />
                </div>
                <div><label style={lbl}>Postcode</label><input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} style={inp} placeholder="1234 AB" /></div>
                <div><label style={lbl}>Plaats</label><input value={form.city} onChange={(e) => set("city", e.target.value)} style={inp} placeholder="Amsterdam" /></div>
                <div><label style={lbl}>Type woning</label><input value={form.property_type} onChange={(e) => set("property_type", e.target.value)} style={inp} placeholder="Appartement" /></div>
                <div><label style={lbl}>Oppervlakte (m²)</label><input type="number" value={form.surface} onChange={(e) => set("surface", e.target.value)} style={inp} placeholder="0" /></div>
                <div><label style={lbl}>Kamers</label><input type="number" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} style={inp} placeholder="0" /></div>
                <div><label style={lbl}>Vraagprijs (€)</label><input type="number" value={form.asking_price} onChange={(e) => set("asking_price", e.target.value)} style={inp} placeholder="0" /></div>
              </div>
            </div>

            {/* Verkoper */}
            <div style={card}>
              <div style={cardTitle}>Verkoper</div>
              <div style={grid2}>
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Naam *</label><input required value={form.seller_name} onChange={(e) => set("seller_name", e.target.value)} style={inp} placeholder="Volledige naam" /></div>
                <div><label style={lbl}>E-mail</label><input type="email" value={form.seller_email} onChange={(e) => set("seller_email", e.target.value)} style={inp} placeholder="naam@email.nl" /></div>
                <div><label style={lbl}>Telefoon</label><input value={form.seller_phone} onChange={(e) => set("seller_phone", e.target.value)} style={inp} placeholder="+31 6 12345678" /></div>
              </div>
            </div>

            {/* Koper */}
            <div style={card}>
              <div style={cardTitle}>Koper</div>
              <div style={grid2}>
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Naam *</label><input required value={form.buyer_name} onChange={(e) => set("buyer_name", e.target.value)} style={inp} placeholder="Volledige naam" /></div>
                <div><label style={lbl}>E-mail</label><input type="email" value={form.buyer_email} onChange={(e) => set("buyer_email", e.target.value)} style={inp} placeholder="naam@email.nl" /></div>
                <div><label style={lbl}>Telefoon</label><input value={form.buyer_phone} onChange={(e) => set("buyer_phone", e.target.value)} style={inp} placeholder="+31 6 12345678" /></div>
              </div>
            </div>

            {/* Transactie */}
            <div style={card}>
              <div style={cardTitle}>Transactiedetails</div>
              <div style={grid2}>
                <div><label style={lbl}>Overeengekomen prijs (€)</label><input type="number" value={form.agreed_price} onChange={(e) => set("agreed_price", e.target.value)} style={inp} placeholder="0" /></div>
                <div><label style={lbl}>Overdrachtsdatum</label><input type="date" value={form.transfer_date} onChange={(e) => set("transfer_date", e.target.value)} style={inp} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Notaris</label><input value={form.notary_name} onChange={(e) => set("notary_name", e.target.value)} style={inp} placeholder="Naam notariskantoor" /></div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <Link href="/dashboard" style={{ flex: 1, background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", color: "#64748b", textDecoration: "none", textAlign: "center" }}>
                Annuleren
              </Link>
              <button type="submit" disabled={submitting} style={{ flex: 2, background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", cursor: "pointer", opacity: submitting ? 0.6 : 1, fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
                {submitting ? "Opslaan…" : "Transactie opslaan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchProperties, type RealworksProperty } from "@/lib/realworks";

const STEPS = ["Woning", "Verkoper", "Koper", "Transactie"];

const inp: React.CSSProperties = {
  width: "100%", background: "#f8fafc", border: "1px solid #e8ecf0",
  borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#0f172a",
  outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: "600", color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px",
};
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" };

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "12px", fontWeight: "600", marginBottom: "6px",
              background: i < step ? "#0284c7" : i === step ? "#0284c7" : "#f1f5f9",
              color: i <= step ? "#fff" : "#94a3b8",
              border: i === step ? "3px solid #bae6fd" : "none",
              boxSizing: "border-box",
              transition: "all 0.2s",
            }}>
              {i < step ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
              ) : i + 1}
            </div>
            <span style={{ fontSize: "11px", fontWeight: i === step ? "600" : "400", color: i === step ? "#0284c7" : "#94a3b8" }}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ height: "3px", background: "#f1f5f9", borderRadius: "2px", position: "relative" }}>
        <div style={{ height: "100%", width: `${(step / (STEPS.length - 1)) * 100}%`, background: "#0284c7", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

export default function NewDealPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RealworksProperty[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    address: "", postcode: "", city: "", property_type: "", surface: "", rooms: "", asking_price: "",
    seller_name: "", seller_email: "", seller_phone: "",
    buyer_name: "", buyer_email: "", buyer_phone: "",
    agreed_price: "", transfer_date: "", notary_name: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); setShowDropdown(false); return; }
    setResults(searchProperties(q));
    setShowDropdown(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 500);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function selectProperty(p: RealworksProperty) {
    setQuery(`${p.address}, ${p.postcode} ${p.city}`);
    setShowDropdown(false);
    setForm((f) => ({
      ...f,
      address: p.address, postcode: p.postcode, city: p.city, property_type: p.type,
      surface: p.surface.toString(), rooms: p.rooms.toString(),
      asking_price: p.asking_price.toString(), agreed_price: p.asking_price.toString(),
      seller_name: p.owner_name, seller_email: p.owner_email, seller_phone: p.owner_phone,
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: seller, error: e1 } = await supabase.from("contacts")
      .insert({ owner_id: user.id, name: form.seller_name, email: form.seller_email || null, phone: form.seller_phone || null, type: "seller" })
      .select().single();
    if (e1) { setError(e1.message); setSubmitting(false); return; }

    const { data: buyer, error: e2 } = await supabase.from("contacts")
      .insert({ owner_id: user.id, name: form.buyer_name, email: form.buyer_email || null, phone: form.buyer_phone || null, type: "buyer" })
      .select().single();
    if (e2) { setError(e2.message); setSubmitting(false); return; }

    const { error: e3 } = await supabase.from("deals").insert({
      owner_id: user.id, title: `${form.address}, ${form.city}`, company: form.seller_name,
      stage: "lead", address: form.address, postcode: form.postcode, city: form.city,
      property_type: form.property_type, surface: form.surface ? parseInt(form.surface) : null,
      rooms: form.rooms ? parseInt(form.rooms) : null,
      asking_price: form.asking_price ? parseFloat(form.asking_price) : null,
      agreed_price: form.agreed_price ? parseFloat(form.agreed_price) : null,
      value: form.agreed_price ? parseFloat(form.agreed_price) : null,
      transfer_date: form.transfer_date || null, notary_name: form.notary_name || null,
      seller_id: seller.id, buyer_id: buyer.id,
      contact_name: form.seller_name, contact_email: form.seller_email || null,
    });
    if (e3) { setError(e3.message); setSubmitting(false); return; }
    router.push("/dashboard");
  }

  const btnPrimary: React.CSSProperties = {
    background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px",
    padding: "10px 20px", fontSize: "13px", fontWeight: "600", cursor: "pointer",
    fontFamily: "DM Sans, Helvetica Neue, sans-serif",
  };
  const btnSecondary: React.CSSProperties = {
    background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px",
    padding: "10px 20px", fontSize: "13px", fontWeight: "600", color: "#64748b",
    cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", padding: "0 24px", gap: "12px", flexShrink: 0 }}>
        <Link href="/dashboard" style={{ color: "#94a3b8", textDecoration: "none", display: "flex" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
        </Link>
        <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Nieuwe transactie</span>
      </div>

      {/* Centered form */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: "560px" }}>
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "16px", padding: "28px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

            <ProgressBar step={step} />

            {error && (
              <div style={{ background: "#fff1f2", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#ef4444", marginBottom: "20px" }}>
                {error}
              </div>
            )}

            {/* Step 1: Woning */}
            {step === 0 && (
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px" }}>Woning zoeken</h2>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px" }}>Zoek via Realworks of vul het adres handmatig in.</p>

                <div ref={dropdownRef} style={{ position: "relative", marginBottom: "16px" }}>
                  <label style={lbl}>Adres zoeken (Realworks)</label>
                  <div style={{ position: "relative" }}>
                    <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="bv. Keizersgracht..." style={{ ...inp, paddingLeft: "32px" }} />
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

                <div style={{ marginBottom: "14px" }}>
                  <label style={lbl}>Adres *</label>
                  <input required value={form.address} onChange={(e) => set("address", e.target.value)} style={inp} placeholder="Straat en huisnummer" />
                </div>
                <div style={{ ...grid2, marginBottom: "14px" }}>
                  <div><label style={lbl}>Postcode</label><input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} style={inp} placeholder="1234 AB" /></div>
                  <div><label style={lbl}>Plaats</label><input value={form.city} onChange={(e) => set("city", e.target.value)} style={inp} placeholder="Amsterdam" /></div>
                </div>
                <div style={{ ...grid2, marginBottom: "14px" }}>
                  <div><label style={lbl}>Type woning</label><input value={form.property_type} onChange={(e) => set("property_type", e.target.value)} style={inp} placeholder="Appartement" /></div>
                  <div><label style={lbl}>Oppervlakte (m²)</label><input type="number" value={form.surface} onChange={(e) => set("surface", e.target.value)} style={inp} placeholder="0" /></div>
                </div>
                <div style={{ ...grid2, marginBottom: "24px" }}>
                  <div><label style={lbl}>Kamers</label><input type="number" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} style={inp} placeholder="0" /></div>
                  <div><label style={lbl}>Vraagprijs (€)</label><input type="number" value={form.asking_price} onChange={(e) => set("asking_price", e.target.value)} style={inp} placeholder="0" /></div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => { if (!form.address) return; setStep(1); }} style={{ ...btnPrimary, opacity: form.address ? 1 : 0.4 }}>
                    Volgende →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Verkoper */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px" }}>Verkoper bevestigen</h2>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px" }}>Controleer of aanvul de gegevens van de verkoper.</p>

                {form.address && (
                  <div style={{ background: "#f0f9ff", border: "1px solid rgba(2,132,199,0.2)", borderRadius: "8px", padding: "10px 14px", marginBottom: "20px", fontSize: "13px", color: "#0284c7", fontWeight: "500" }}>
                    📍 {form.address}, {form.postcode} {form.city}
                  </div>
                )}

                <div style={{ marginBottom: "14px" }}>
                  <label style={lbl}>Naam *</label>
                  <input required value={form.seller_name} onChange={(e) => set("seller_name", e.target.value)} style={inp} placeholder="Volledige naam" />
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={lbl}>E-mailadres</label>
                  <input type="email" value={form.seller_email} onChange={(e) => set("seller_email", e.target.value)} style={inp} placeholder="naam@email.nl" />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={lbl}>Telefoonnummer</label>
                  <input value={form.seller_phone} onChange={(e) => set("seller_phone", e.target.value)} style={inp} placeholder="+31 6 12345678" />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setStep(0)} style={btnSecondary}>← Terug</button>
                  <button onClick={() => { if (!form.seller_name) return; setStep(2); }} style={{ ...btnPrimary, opacity: form.seller_name ? 1 : 0.4 }}>Volgende →</button>
                </div>
              </div>
            )}

            {/* Step 3: Koper */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px" }}>Koper toevoegen</h2>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px" }}>Voer de gegevens in van de koper.</p>

                <div style={{ marginBottom: "14px" }}>
                  <label style={lbl}>Naam *</label>
                  <input required value={form.buyer_name} onChange={(e) => set("buyer_name", e.target.value)} style={inp} placeholder="Volledige naam" />
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={lbl}>E-mailadres</label>
                  <input type="email" value={form.buyer_email} onChange={(e) => set("buyer_email", e.target.value)} style={inp} placeholder="naam@email.nl" />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={lbl}>Telefoonnummer</label>
                  <input value={form.buyer_phone} onChange={(e) => set("buyer_phone", e.target.value)} style={inp} placeholder="+31 6 12345678" />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setStep(1)} style={btnSecondary}>← Terug</button>
                  <button onClick={() => { if (!form.buyer_name) return; setStep(3); }} style={{ ...btnPrimary, opacity: form.buyer_name ? 1 : 0.4 }}>Volgende →</button>
                </div>
              </div>
            )}

            {/* Step 4: Transactie */}
            {step === 3 && (
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px" }}>Transactiedetails</h2>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px" }}>Vul de prijs, datum en notaris in.</p>

                {/* Summary */}
                <div style={{ background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div><span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>Adres</span><span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{form.address}</span></div>
                  <div><span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>Verkoper</span><span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{form.seller_name}</span></div>
                  <div><span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>Koper</span><span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{form.buyer_name}</span></div>
                  <div><span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>Vraagprijs</span><span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>€ {form.asking_price ? parseInt(form.asking_price).toLocaleString("nl-NL") : "—"}</span></div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={lbl}>Overeengekomen prijs (€)</label>
                  <input type="number" value={form.agreed_price} onChange={(e) => set("agreed_price", e.target.value)} style={inp} placeholder="0" />
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={lbl}>Overdrachtsdatum</label>
                  <input type="date" value={form.transfer_date} onChange={(e) => set("transfer_date", e.target.value)} style={inp} />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={lbl}>Notaris</label>
                  <input value={form.notary_name} onChange={(e) => set("notary_name", e.target.value)} style={inp} placeholder="Naam notariskantoor" />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setStep(2)} style={btnSecondary}>← Terug</button>
                  <button onClick={handleSubmit} disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }}>
                    {submitting ? "Opslaan…" : "Transactie aanmaken"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

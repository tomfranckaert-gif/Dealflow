"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { searchProperties, type RealworksProperty } from "@/lib/realworks";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f1628",
  border: "1px solid #1e2d4a",
  borderRadius: "8px",
  padding: "10px 14px",
  color: "#e8e0d0",
  fontFamily: "Georgia, serif",
  fontSize: "14px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#c9a84c",
  marginBottom: "6px",
  fontFamily: "Georgia, serif",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const sectionStyle: React.CSSProperties = {
  background: "#0f1628",
  border: "1px solid #1e2d4a",
  borderRadius: "12px",
  padding: "24px",
  marginBottom: "20px",
};

const sectionTitleStyle: React.CSSProperties = {
  color: "#c9a84c",
  fontFamily: "Georgia, serif",
  fontSize: "16px",
  fontWeight: "bold",
  marginBottom: "20px",
  paddingBottom: "10px",
  borderBottom: "1px solid #1e2d4a",
};

export default function NewDealPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RealworksProperty[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    address: "",
    postcode: "",
    city: "",
    property_type: "",
    surface: "",
    rooms: "",
    asking_price: "",
    agreed_price: "",
    transfer_date: "",
    notary_name: "",
    seller_name: "",
    seller_email: "",
    seller_phone: "",
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setShowDropdown(false); return; }
    const data = searchProperties(q);
    setResults(data);
    setShowDropdown(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 500);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectProperty(p: RealworksProperty) {
    setQuery(p.address);
    setShowDropdown(false);
    setForm((f) => ({
      ...f,
      address: p.address,
      postcode: p.postcode,
      city: p.city,
      property_type: p.type,
      surface: p.surface.toString(),
      rooms: p.rooms.toString(),
      asking_price: p.asking_price.toString(),
      agreed_price: p.asking_price.toString(),
      seller_name: p.owner_name,
      seller_email: p.owner_email,
      seller_phone: p.owner_phone,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Insert seller contact
    const { data: seller, error: sellerErr } = await supabase
      .from("contacts")
      .insert({ owner_id: user.id, name: form.seller_name, email: form.seller_email || null, phone: form.seller_phone || null, type: "seller" })
      .select().single();
    if (sellerErr) { setError(sellerErr.message); setSubmitting(false); return; }

    // Insert buyer contact
    const { data: buyer, error: buyerErr } = await supabase
      .from("contacts")
      .insert({ owner_id: user.id, name: form.buyer_name, email: form.buyer_email || null, phone: form.buyer_phone || null, type: "buyer" })
      .select().single();
    if (buyerErr) { setError(buyerErr.message); setSubmitting(false); return; }

    // Insert deal
    const { error: dealErr } = await supabase.from("deals").insert({
      owner_id: user.id,
      title: `${form.address}, ${form.city}`,
      company: form.seller_name,
      stage: "lead",
      address: form.address,
      postcode: form.postcode,
      city: form.city,
      property_type: form.property_type,
      surface: form.surface ? parseInt(form.surface) : null,
      rooms: form.rooms ? parseInt(form.rooms) : null,
      asking_price: form.asking_price ? parseFloat(form.asking_price) : null,
      agreed_price: form.agreed_price ? parseFloat(form.agreed_price) : null,
      value: form.agreed_price ? parseFloat(form.agreed_price) : null,
      transfer_date: form.transfer_date || null,
      notary_name: form.notary_name || null,
      seller_id: seller.id,
      buyer_id: buyer.id,
      contact_name: form.seller_name,
      contact_email: form.seller_email || null,
    });

    if (dealErr) { setError(dealErr.message); setSubmitting(false); return; }
    router.push("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", padding: "40px 24px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ color: "#c9a84c", fontFamily: "Georgia, serif", fontSize: "14px", background: "none", border: "none", cursor: "pointer", marginBottom: "16px" }}
          >
            ← Terug naar dashboard
          </button>
          <h1 style={{ color: "#e8e0d0", fontFamily: "Georgia, serif", fontSize: "28px", fontWeight: "bold", margin: 0 }}>
            Nieuwe transactie
          </h1>
          <p style={{ color: "#8a7a6a", fontFamily: "Georgia, serif", fontSize: "14px", marginTop: "8px" }}>
            Zoek een woning via Realworks of vul de gegevens handmatig in.
          </p>
        </div>

        {error && (
          <div style={{ background: "#2a0f0f", border: "1px solid #5a1a1a", borderRadius: "8px", padding: "12px 16px", color: "#ff6b6b", fontFamily: "Georgia, serif", fontSize: "14px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Realworks zoeken */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Woning zoeken via Realworks</div>
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <label style={labelStyle}>Adres zoeken</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="bv. Keizersgracht of Amsterdam..."
                style={inputStyle}
              />
              {showDropdown && results.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#0f1628", border: "1px solid #c9a84c", borderRadius: "8px", zIndex: 50, marginTop: "4px", overflow: "hidden" }}>
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectProperty(p)}
                      style={{ width: "100%", textAlign: "left", padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid #1e2d4a", cursor: "pointer", color: "#e8e0d0", fontFamily: "Georgia, serif" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#1a2540")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <div style={{ fontWeight: "bold", fontSize: "14px" }}>{p.address}, {p.postcode} {p.city}</div>
                      <div style={{ fontSize: "12px", color: "#8a7a6a", marginTop: "2px" }}>
                        {p.type} · {p.surface}m² · {p.rooms} kamers · €{p.asking_price.toLocaleString("nl-NL")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && results.length === 0 && !loading && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#0f1628", border: "1px solid #1e2d4a", borderRadius: "8px", padding: "12px 16px", color: "#8a7a6a", fontFamily: "Georgia, serif", fontSize: "14px", marginTop: "4px" }}>
                  Geen woningen gevonden
                </div>
              )}
            </div>
          </div>

          {/* Woninggegevens */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Woninggegevens</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Adres *</label>
                <input required value={form.address} onChange={(e) => set("address", e.target.value)} style={inputStyle} placeholder="Straat en huisnummer" />
              </div>
              <div>
                <label style={labelStyle}>Postcode</label>
                <input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} style={inputStyle} placeholder="1234 AB" />
              </div>
              <div>
                <label style={labelStyle}>Plaats</label>
                <input value={form.city} onChange={(e) => set("city", e.target.value)} style={inputStyle} placeholder="Amsterdam" />
              </div>
              <div>
                <label style={labelStyle}>Type woning</label>
                <input value={form.property_type} onChange={(e) => set("property_type", e.target.value)} style={inputStyle} placeholder="Appartement" />
              </div>
              <div>
                <label style={labelStyle}>Oppervlakte (m²)</label>
                <input type="number" value={form.surface} onChange={(e) => set("surface", e.target.value)} style={inputStyle} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>Kamers</label>
                <input type="number" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} style={inputStyle} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>Vraagprijs (€)</label>
                <input type="number" value={form.asking_price} onChange={(e) => set("asking_price", e.target.value)} style={inputStyle} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Verkoper */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Verkoper</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Naam *</label>
                <input required value={form.seller_name} onChange={(e) => set("seller_name", e.target.value)} style={inputStyle} placeholder="Volledige naam" />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input type="email" value={form.seller_email} onChange={(e) => set("seller_email", e.target.value)} style={inputStyle} placeholder="naam@email.nl" />
              </div>
              <div>
                <label style={labelStyle}>Telefoon</label>
                <input value={form.seller_phone} onChange={(e) => set("seller_phone", e.target.value)} style={inputStyle} placeholder="06-12345678" />
              </div>
            </div>
          </div>

          {/* Koper */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Koper</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Naam *</label>
                <input required value={form.buyer_name} onChange={(e) => set("buyer_name", e.target.value)} style={inputStyle} placeholder="Volledige naam" />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input type="email" value={form.buyer_email} onChange={(e) => set("buyer_email", e.target.value)} style={inputStyle} placeholder="naam@email.nl" />
              </div>
              <div>
                <label style={labelStyle}>Telefoon</label>
                <input value={form.buyer_phone} onChange={(e) => set("buyer_phone", e.target.value)} style={inputStyle} placeholder="06-12345678" />
              </div>
            </div>
          </div>

          {/* Transactiedetails */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Transactiedetails</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Overeengekomen prijs (€)</label>
                <input type="number" value={form.agreed_price} onChange={(e) => set("agreed_price", e.target.value)} style={inputStyle} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>Overdracht datum</label>
                <input type="date" value={form.transfer_date} onChange={(e) => set("transfer_date", e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notaris</label>
                <input value={form.notary_name} onChange={(e) => set("notary_name", e.target.value)} style={inputStyle} placeholder="Naam notariskantoor" />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              style={{ flex: 1, padding: "14px", background: "none", border: "1px solid #1e2d4a", borderRadius: "8px", color: "#8a7a6a", fontFamily: "Georgia, serif", fontSize: "15px", cursor: "pointer" }}
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ flex: 2, padding: "14px", background: "#c9a84c", border: "none", borderRadius: "8px", color: "#0a0f1a", fontFamily: "Georgia, serif", fontSize: "15px", fontWeight: "bold", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Opslaan…" : "Transactie opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

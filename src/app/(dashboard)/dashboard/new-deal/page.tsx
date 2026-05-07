"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchProperties, type RealworksProperty } from "@/lib/realworks";
import { newDealEmail } from "@/lib/email-templates";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Buyer {
  name: string;
  email: string;
  phone: string;
}

interface DealData {
  agreed_price: string;
  transfer_date: string;
  notary: string;
  stage: string;
}

const STAGES = ["lead","bezichtiging","bod","koopakte","voorwaarden","financiering","overdracht","gesloten"];

const MOCK_BUYERS: Buyer[] = [
  { name: "Thomas van der Berg", email: "t.vanderberg@gmail.com",  phone: "+31 6 11 22 33 44" },
  { name: "Lisa Bakker",         email: "l.bakker@ziggo.nl",        phone: "+31 6 55 66 77 88" },
  { name: "Erik & Nina Smit",    email: "smit.family@gmail.com",    phone: "+31 6 99 88 77 66" },
  { name: "David Cohen",         email: "d.cohen@xs4all.nl",        phone: "+31 6 44 33 22 11" },
];

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", border: "1px solid #e8ecf0",
  borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#0f172a",
  outline: "none", fontFamily: "DM Sans, Helvetica Neue, sans-serif", background: "#fff",
};
const labelSt: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  const LABELS = ["Woning zoeken", "Verkoper", "Koper", "Dealgegevens"];
  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
        {LABELS.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", flex: i < LABELS.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0,
                background: i <= step ? "#0284c7" : "transparent",
                color: i <= step ? "#fff" : "#94a3b8",
                border: i <= step ? "none" : "1.5px solid #e8ecf0",
                transition: "all 0.2s",
              }}>
                {i < step ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
                ) : i + 1}
              </div>
              <span style={{ fontSize: 11, color: i === step ? "#0284c7" : "#94a3b8", fontWeight: i === step ? 600 : 400, marginTop: 6, whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < LABELS.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: i < step ? "#0284c7" : "#e8ecf0", marginTop: 16, transition: "background 0.3s" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FocusInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...inputBase, ...style, borderColor: focused ? "#0284c7" : "#e8ecf0", boxShadow: focused ? "0 0 0 3px rgba(2,132,199,0.1)" : "none" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ─── Step 1 ──────────────────────────────────────────────────────────────────

function Step1({ selected, onSelect }: { selected: RealworksProperty | null; onSelect: (p: RealworksProperty) => void }) {
  const [query, setQuery] = useState(selected ? `${selected.address}, ${selected.postcode} ${selected.city}` : "");
  const [results, setResults] = useState<RealworksProperty[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setResults(searchProperties(q));
    setOpen(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 400);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Welke woning?</h2>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px" }}>Zoek op adres — data wordt automatisch opgehaald</p>

      <div ref={ref} style={{ position: "relative", marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (selected) onSelect(null as unknown as RealworksProperty); }}
            placeholder="Zoek op adres of postcode…"
            style={{ ...inputBase, paddingLeft: 42, fontSize: 14, borderRadius: 10, padding: "12px 16px 12px 42px" }}
          />
        </div>

        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #e8ecf0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", zIndex: 50, overflow: "hidden" }}>
            {results.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>Geen resultaten gevonden</div>
            ) : results.map((p, i) => (
              <button key={p.id} type="button" onClick={() => { setQuery(`${p.address}, ${p.postcode} ${p.city}`); setOpen(false); onSelect(p); }}
                style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "none", border: "none", borderTop: i > 0 ? "1px solid #f1f5f9" : "none", cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{p.address}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{p.postcode} {p.city}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0284c7", whiteSpace: "nowrap", marginLeft: 12 }}>
                  € {p.asking_price.toLocaleString("nl-NL")}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={{ position: "relative", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px", background: "#fff" }}>
          <span style={{ position: "absolute", top: 12, right: 14, fontSize: 10, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 20, padding: "2px 8px" }}>
            ✓ Auto-ingevuld vanuit Realworks
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 8 }}>
            {[
              { label: "Type", value: selected.type },
              { label: "Oppervlakte", value: `${selected.surface} m²` },
              { label: "Kamers", value: `${selected.rooms} kamers` },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2 ──────────────────────────────────────────────────────────────────

function Step2({ property, confirmed, onConfirm }: { property: RealworksProperty; confirmed: boolean; onConfirm: (s: { name: string; email: string; phone: string }) => void }) {
  const [name, setName]   = useState(property.owner_name);
  const [email, setEmail] = useState(property.owner_email);
  const [phone, setPhone] = useState(property.owner_phone);
  const [editing, setEditing] = useState<string | null>(null);

  const rows = [
    { key: "phone", icon: "📞", label: "Telefoon", value: phone, set: setPhone },
    { key: "email", icon: "✉️",  label: "E-mail",   value: email, set: setEmail },
    { key: "addr",  icon: "📍", label: "Adres",    value: `${property.address}, ${property.city}`, set: () => {} },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Verkoper bevestigen</h2>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px" }}>Automatisch opgehaald via Realworks</p>

      {/* Avatar + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
          {name.charAt(0).toUpperCase()}
        </div>
        {editing === "name" ? (
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setEditing(null)}
            style={{ ...inputBase, fontSize: 18, fontWeight: 700, border: "1px solid #0284c7", boxShadow: "0 0 0 3px rgba(2,132,199,0.1)" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{name}</span>
            <button type="button" onClick={() => setEditing("name")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Info rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {rows.map((row) => (
          <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #e8ecf0", borderRadius: 8, padding: "10px 14px", background: "#fff" }}>
            <span style={{ fontSize: 16 }}>{row.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3px" }}>{row.label}</div>
              {editing === row.key && row.key !== "addr" ? (
                <input autoFocus value={row.value} onChange={(e) => row.set(e.target.value)} onBlur={() => setEditing(null)}
                  style={{ ...inputBase, padding: "2px 0", border: "none", borderBottom: "1px solid #0284c7", borderRadius: 0, fontSize: 13 }} />
              ) : (
                <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value}</div>
              )}
            </div>
            {row.key !== "addr" && (
              <button type="button" onClick={() => setEditing(row.key)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Confirm button */}
      <button type="button" onClick={() => onConfirm({ name, email, phone })}
        style={{ width: "100%", padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
          background: confirmed ? "#f0f9ff" : "#f8fafc",
          border: `1.5px solid ${confirmed ? "#0284c7" : "#e8ecf0"}`,
          color: confirmed ? "#0284c7" : "#94a3b8",
        }}>
        {confirmed ? "Verkoper bevestigd ✓" : "Bevestig verkopersgegevens"}
      </button>
    </div>
  );
}

// ─── Step 3 ──────────────────────────────────────────────────────────────────

function Step3({ buyer, onBuyer }: { buyer: Buyer | null; onBuyer: (b: Buyer) => void }) {
  const [tab, setTab] = useState<"search" | "new">("new");
  const [query, setQuery] = useState("");
  const [name, setName]   = useState(buyer?.name ?? "");
  const [phone, setPhone] = useState(buyer?.phone ?? "");
  const [email, setEmail] = useState(buyer?.email ?? "");

  const filtered = MOCK_BUYERS.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase()) ||
    b.email.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (tab === "new" && (name || phone || email)) onBuyer({ name, email, phone });
  }, [name, phone, email, tab]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px", fontSize: 13, fontWeight: active ? 600 : 400,
    color: active ? "#0284c7" : "#64748b", background: "none", border: "none",
    borderBottom: `2px solid ${active ? "#0284c7" : "#e8ecf0"}`,
    cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif", transition: "all 0.15s",
  });

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Koper toevoegen</h2>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>Zoek een bestaand contact of voeg een nieuwe koper toe.</p>

      <div style={{ display: "flex", borderBottom: "1px solid #e8ecf0", marginBottom: 20 }}>
        <button type="button" style={tabStyle(tab === "search")} onClick={() => setTab("search")}>Zoek bestaand contact</button>
        <button type="button" style={tabStyle(tab === "new")} onClick={() => setTab("new")}>Nieuwe koper</button>
      </div>

      {tab === "search" && (
        <div>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek op naam of e-mail…"
              style={{ ...inputBase, paddingLeft: 40 }} />
          </div>
          <div style={{ border: "1px solid #e8ecf0", borderRadius: 10, overflow: "hidden" }}>
            {filtered.map((b, i) => (
              <button key={b.email} type="button" onClick={() => onBuyer(b)}
                style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: buyer?.email === b.email ? "#f0f9ff" : "none", border: "none", borderTop: i > 0 ? "1px solid #f1f5f9" : "none", cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}
                onMouseEnter={(e) => { if (buyer?.email !== b.email) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { if (buyer?.email !== b.email) e.currentTarget.style.background = "none"; }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{b.email}</div>
                </div>
                {buyer?.email === b.email && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "new" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={labelSt}>Volledige naam</label><FocusInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Voor- en achternaam" /></div>
          <div><label style={labelSt}>Telefoonnummer</label><FocusInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 6 12 34 56 78" /></div>
          <div><label style={labelSt}>E-mailadres</label><FocusInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="koper@email.nl" /></div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4 ──────────────────────────────────────────────────────────────────

function Step4({ property, seller, buyer, data, onChange }: {
  property: RealworksProperty; seller: Buyer; buyer: Buyer;
  data: DealData; onChange: (d: DealData) => void;
}) {
  function set(field: keyof DealData, value: string) {
    onChange({ ...data, [field]: value });
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Dealgegevens</h2>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px" }}>Vul de prijs, datum en notaris in.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        {/* Price */}
        <div>
          <label style={labelSt}>Overeengekomen prijs</label>
          <div style={{ display: "flex" }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e8ecf0", borderRight: "none", borderRadius: "8px 0 0 8px", padding: "10px 14px", fontSize: 14, color: "#64748b", fontWeight: 600 }}>€</div>
            <FocusInput
              type="text"
              value={data.agreed_price ? parseInt(data.agreed_price).toLocaleString("nl-NL") : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/\./g, "").replace(/[^\d]/g, "");
                set("agreed_price", raw);
              }}
              placeholder="875.000"
              style={{ borderRadius: "0 8px 8px 0" }}
            />
          </div>
        </div>

        <div><label style={labelSt}>Overdrachtsdatum</label><FocusInput type="date" value={data.transfer_date} onChange={(e) => set("transfer_date", e.target.value)} /></div>

        <div><label style={labelSt}>Notaris</label><FocusInput value={data.notary} onChange={(e) => set("notary", e.target.value)} placeholder="Bijv. Smit & Partners Notarissen" /></div>

        <div>
          <label style={labelSt}>Fase</label>
          <select value={data.stage} onChange={(e) => set("stage", e.target.value)}
            style={{ ...inputBase, fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
            {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 10 }}>Deal samenvatting</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
          {[
            { label: "Adres",    value: `${property.address}, ${property.city}` },
            { label: "Verkoper", value: seller.name },
            { label: "Koper",    value: buyer.name },
            { label: "Prijs",    value: data.agreed_price ? `€ ${parseInt(data.agreed_price).toLocaleString("nl-NL")}` : "—" },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 1 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function NewDealPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [property, setProperty]       = useState<RealworksProperty | null>(null);
  const [seller, setSeller]           = useState<Buyer | null>(null);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const [buyer, setBuyer]             = useState<Buyer | null>(null);
  const [dealData, setDealData]       = useState<DealData>({ agreed_price: "", transfer_date: "", notary: "", stage: "lead" });
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Pre-fill agreed_price when property selected
  useEffect(() => {
    if (property) {
      setSeller({ name: property.owner_name, email: property.owner_email, phone: property.owner_phone });
      setDealData((d) => ({ ...d, agreed_price: property.asking_price.toString() }));
    }
  }, [property]);

  const canNext = [
    !!property,
    sellerConfirmed,
    !!buyer?.name,
    true,
  ][step];

  async function handleSubmit() {
    if (!property || !seller || !buyer) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: sellerContact, error: e1 } = await supabase.from("contacts")
      .insert({ owner_id: user.id, name: seller.name, email: seller.email || null, phone: seller.phone || null })
      .select().single();
    if (e1) { setError(`Contact (verkoper): ${e1.message}`); setSubmitting(false); return; }

    const { data: buyerContact, error: e2 } = await supabase.from("contacts")
      .insert({ owner_id: user.id, name: buyer.name, email: buyer.email || null, phone: buyer.phone || null })
      .select().single();
    if (e2) { setError(`Contact (koper): ${e2.message}`); setSubmitting(false); return; }

    const { error: e3 } = await supabase.from("deals").insert({
      owner_id: user.id,
      title: `${property.address}, ${property.city}`,
      stage: dealData.stage,
      address: property.address,
      city: property.city,
      postcode: property.postcode,
      property_type: property.type,
      surface: property.surface,
      rooms: property.rooms,
      asking_price: property.asking_price,
      agreed_price: dealData.agreed_price ? parseFloat(dealData.agreed_price) : null,
      transfer_date: dealData.transfer_date || null,
      notary_name: dealData.notary || null,
      seller_id: sellerContact.id,
      buyer_id: buyerContact.id,
      contact_name: buyer.name,
    });
    if (e3) { setError(`Deal: ${e3.message}`); setSubmitting(false); return; }
    const agentName = user.email?.split("@")[0] ?? "Makelaar";
    const address = `${property.address}, ${property.city}`;
    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: user.email, subject: `Nieuwe deal: ${address}`, html: newDealEmail(agentName, address) }),
    }).catch(() => {});
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        <Link href="/dashboard" style={{ color: "#94a3b8", textDecoration: "none", display: "flex" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
        </Link>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>Nieuwe transactie</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "32px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", border: "1px solid #e8ecf0", borderRadius: 16, padding: "28px 32px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

          <ProgressDots step={step} />

          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#ef4444", marginBottom: 20 }}>
              {error}
            </div>
          )}

          {step === 0 && <Step1 selected={property} onSelect={setProperty} />}
          {step === 1 && property && (
            <Step2
              property={property}
              confirmed={sellerConfirmed}
              onConfirm={(s) => { setSeller(s); setSellerConfirmed(true); }}
            />
          )}
          {step === 2 && <Step3 buyer={buyer} onBuyer={setBuyer} />}
          {step === 3 && property && seller && buyer && (
            <Step4 property={property} seller={seller} buyer={buyer} data={dealData} onChange={setDealData} />
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
            <div>
              {step > 0 && (
                <button type="button" onClick={() => setStep(step - 1)}
                  style={{ background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
                  ← Vorige
                </button>
              )}
            </div>

            {step < 3 ? (
              <button type="button" onClick={() => canNext && setStep(step + 1)}
                style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: canNext ? "pointer" : "default", opacity: canNext ? 1 : 0.4, fontFamily: "DM Sans, Helvetica Neue, sans-serif", transition: "opacity 0.15s" }}>
                Volgende →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting}
                style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "14px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1, fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
                {submitting ? "Opslaan…" : "Deal aanmaken"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

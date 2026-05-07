"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DealWithContacts, DealStage } from "@/types/database";

const STAGES: { id: DealStage; label: string }[] = [
  { id: "lead",         label: "Lead" },
  { id: "bezichtiging", label: "Bezichtiging" },
  { id: "bod",          label: "Bod" },
  { id: "koopakte",     label: "Koopakte" },
  { id: "voorwaarden",  label: "Voorwaarden" },
  { id: "financiering", label: "Financiering" },
  { id: "overdracht",   label: "Overdracht" },
  { id: "gesloten",     label: "Gesloten" },
];

const STAGE_BADGE: Record<DealStage, { bg: string; text: string; dot: string }> = {
  lead:         { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" },
  bezichtiging: { bg: "#fef9c3", text: "#854d0e", dot: "#eab308" },
  bod:          { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  koopakte:     { bg: "#ede9fe", text: "#5b21b6", dot: "#8b5cf6" },
  voorwaarden:  { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  financiering: { bg: "#ffedd5", text: "#9a3412", dot: "#f97316" },
  overdracht:   { bg: "#dcfce7", text: "#14532d", dot: "#22c55e" },
  gesloten:     { bg: "#f1f5f9", text: "#374151", dot: "#6b7280" },
};

type SubNav = "overzicht" | "verkoper" | "documenten" | "voorwaarden" | "wwft" | "whatsapp" | "gesprekken" | "overdracht";

const SUB_NAV: { id: SubNav; label: string; icon: React.ReactNode }[] = [
  {
    id: "overzicht", label: "Overzicht",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  },
  {
    id: "verkoper", label: "Verkoper",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9,22 9,12 15,12 15,22" /></svg>,
  },
  {
    id: "documenten", label: "Documenten",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>,
  },
  {
    id: "voorwaarden", label: "Voorwaarden",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  },
  {
    id: "wwft", label: "Wwft",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  },
  {
    id: "whatsapp", label: "WhatsApp",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  },
  {
    id: "gesprekken", label: "Gesprekken",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  {
    id: "overdracht", label: "Overdracht",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17,1 21,5 17,9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7,23 3,19 7,15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>,
  },
];

interface WwftEntry {
  id: string;
  contact_id: string;
  risk_score: "laag" | "middel" | "hoog";
  pep_check: boolean;
  sanctions_check: boolean;
  funding_source: string | null;
  verified_at: string | null;
  retention_until: string | null;
}

interface WwftForm {
  risk_score: "laag" | "middel" | "hoog";
  pep_check: boolean;
  sanctions_check: boolean;
  financing_type: string;
  bank: string;
  mortgage_amount: string;
  own_funds: string;
  own_funds_source: string;
}

function emptyForm(): WwftForm {
  return {
    risk_score: "laag",
    pep_check: false,
    sanctions_check: false,
    financing_type: "Hypotheek",
    bank: "",
    mortgage_amount: "",
    own_funds: "",
    own_funds_source: "",
  };
}

function entryToForm(e: WwftEntry): WwftForm {
  let funding: Partial<WwftForm> = {};
  try { if (e.funding_source) funding = JSON.parse(e.funding_source); } catch {}
  return {
    risk_score: e.risk_score ?? "laag",
    pep_check: e.pep_check ?? false,
    sanctions_check: e.sanctions_check ?? false,
    financing_type: (funding as WwftForm).financing_type ?? "Hypotheek",
    bank: (funding as WwftForm).bank ?? "",
    mortgage_amount: (funding as WwftForm).mortgage_amount ?? "",
    own_funds: (funding as WwftForm).own_funds ?? "",
    own_funds_source: (funding as WwftForm).own_funds_source ?? "",
  };
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #e8ecf0", borderRadius: "8px",
  fontSize: "13px", color: "#0f172a", background: "#fff", outline: "none",
  boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: "500", color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px",
};

const RISK_EXPLANATION: Record<string, { bg: string; color: string; border: string; text: string }> = {
  laag:   { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", text: "Standaard transactie — geen bijzonderheden" },
  middel: { bg: "#fef9c3", color: "#854d0e", border: "#fde047", text: "Verhoogd risico — extra documentatie vereist" },
  hoog:   { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", text: "Hoog risico — overweeg FIU melding via fiu.nl" },
};

function WwftSection({ deal, dealId }: { deal: DealWithContacts; dealId: string }) {
  const [activeParty, setActiveParty] = useState<"buyer" | "seller">("buyer");
  const [buyerEntry, setBuyerEntry] = useState<WwftEntry | null>(null);
  const [sellerEntry, setSellerEntry] = useState<WwftEntry | null>(null);
  const [buyerForm, setBuyerForm] = useState<WwftForm>(emptyForm());
  const [sellerForm, setSellerForm] = useState<WwftForm>(emptyForm());
  const [buyerMockVerified, setBuyerMockVerified] = useState(false);
  const [sellerMockVerified, setSellerMockVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

  const loadEntries = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("wwft_entries").select("*").eq("deal_id", dealId);
    if (!data) return;
    for (const e of data) {
      if (deal.buyer_id && e.contact_id === deal.buyer_id) { setBuyerEntry(e); setBuyerForm(entryToForm(e)); }
      if (deal.seller_id && e.contact_id === deal.seller_id) { setSellerEntry(e); setSellerForm(entryToForm(e)); }
    }
  }, [dealId, deal.buyer_id, deal.seller_id]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const currentEntry = activeParty === "buyer" ? buyerEntry : sellerEntry;
  const currentForm = activeParty === "buyer" ? buyerForm : sellerForm;
  const setCurrentForm = (updater: (f: WwftForm) => WwftForm) =>
    activeParty === "buyer" ? setBuyerForm(updater) : setSellerForm(updater);
  const currentContact = activeParty === "buyer" ? deal.buyer : deal.seller;
  const currentContactId = activeParty === "buyer" ? deal.buyer_id : deal.seller_id;
  const mockVerified = activeParty === "buyer" ? buyerMockVerified : sellerMockVerified;
  const setMockVerified = activeParty === "buyer" ? setBuyerMockVerified : setSellerMockVerified;

  const compliant = buyerMockVerified && sellerMockVerified && !!buyerEntry && !!sellerEntry;
  const showsHypotheek = ["Hypotheek", "Combinatie"].includes(currentForm.financing_type);
  const showsEigenMiddelen = ["Eigen middelen", "Combinatie"].includes(currentForm.financing_type);

  async function handleSave() {
    if (!currentContactId) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const retentionUntil = new Date();
    retentionUntil.setFullYear(retentionUntil.getFullYear() + 5);

    const funding_source = JSON.stringify({
      type: currentForm.financing_type,
      bank: currentForm.bank,
      mortgage_amount: currentForm.mortgage_amount,
      own_funds: currentForm.own_funds,
      own_funds_source: currentForm.own_funds_source,
    });

    const payload = {
      owner_id: user.id,
      deal_id: dealId,
      contact_id: currentContactId,
      risk_score: currentForm.risk_score,
      pep_check: currentForm.pep_check,
      sanctions_check: currentForm.sanctions_check,
      funding_source,
      verified_at: new Date().toISOString(),
      retention_until: retentionUntil.toISOString(),
    };

    if (currentEntry) {
      await supabase.from("wwft_entries").update(payload).eq("id", currentEntry.id);
    } else {
      await supabase.from("wwft_entries").insert(payload);
    }
    await loadEntries();
    setSaving(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  const avatarGradient = activeParty === "buyer"
    ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
    : "linear-gradient(135deg, #818cf8, #6366f1)";
  const initial = currentContact?.name?.charAt(0)?.toUpperCase() ?? "?";
  const risk = RISK_EXPLANATION[currentForm.risk_score];

  return (
    <div style={{ padding: "20px 24px", maxWidth: "680px", position: "relative" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          Opgeslagen ✓
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>Wwft Dossier</span>
        <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: compliant ? "#dcfce7" : "#fff7ed", color: compliant ? "#16a34a" : "#c2410c" }}>
          {compliant ? "✓ Compliant" : "In behandeling"}
        </span>
      </div>

      {/* Info banner */}
      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: "12px", color: "#0369a1", lineHeight: "1.5" }}>
          ✓ Identiteitsverificatie verloopt via Move.nl — koper en verkoper ontvangen een verificatieverzoek via DigiD. Dealflow bewaakt de status en bewaartermijn.
        </span>
        <span style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>Bewaartermijn: 5 jaar na overdracht</span>
      </div>

      {/* Party tabs */}
      <div style={{ display: "flex", border: "1px solid #e8ecf0", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
        {(["buyer", "seller"] as const).map((p) => {
          const active = activeParty === p;
          return (
            <button key={p} onClick={() => setActiveParty(p)} style={{ flex: 1, padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: active ? "600" : "400", cursor: "pointer", border: "none", background: active ? "#0284c7" : "#fff", color: active ? "#fff" : "#64748b", transition: "all 0.1s" }}>
              {p === "buyer" ? "Koper" : "Verkoper"}
            </button>
          );
        })}
      </div>

      {/* Move.nl verification status card */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px" }}>Move.nl Verificatiestatus</div>

        {/* Contact name row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: avatarGradient, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "16px", fontWeight: "700", flexShrink: 0 }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{currentContact?.name ?? "Onbekend"}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{activeParty === "buyer" ? "Koper" : "Verkoper"}</div>
          </div>
        </div>

        {/* Verification status */}
        {!mockVerified ? (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px" }}>
            <div style={{ fontSize: "12px", color: "#c2410c", marginBottom: "8px" }}>
              ⏳ Verificatieverzoek verstuurd via Move.nl — wacht op DigiD verificatie van {currentContact?.name ?? "de partij"}
            </div>
            <button
              onClick={() => console.log("Resend Move.nl verification for", currentContactId)}
              style={{ padding: "6px 12px", background: "#fff", border: "1px solid #e8ecf0", borderRadius: "6px", fontSize: "11px", color: "#64748b", cursor: "pointer" }}
            >
              Opnieuw versturen
            </button>
          </div>
        ) : (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px" }}>
            <div style={{ fontSize: "12px", color: "#16a34a", marginBottom: "10px" }}>✓ Geverifieerd via DigiD op {fmtDate(new Date().toISOString())}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
              {[
                { label: "Naam",         value: currentContact?.name ?? "—" },
                { label: "Geboortedatum",value: "— (via Move.nl)" },
                { label: "ID type",      value: "Paspoort (via Move.nl)" },
                { label: "ID nummer",    value: "•••••• (via Move.nl)" },
              ].map((f) => (
                <div key={f.label}>
                  <div style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>{f.label}</div>
                  <div style={{ fontSize: "13px", color: "#0f172a" }}>{f.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontStyle: "italic" }}>(ontvangen via Move.nl)</div>
          </div>
        )}

        {/* Demo toggle */}
        <button
          onClick={() => setMockVerified(!mockVerified)}
          style={{ fontSize: "10px", color: "#cbd5e1", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          [Demo] Toggle verificatiestatus
        </button>
      </div>

      {/* Risk assessment card */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>Risicobeoordeling Makelaar</div>
        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "14px" }}>In te vullen door de makelaar — eigen professionele beoordeling</div>

        <div style={{ marginBottom: "12px" }}>
          <label style={lbl}>Risicoscore</label>
          <select value={currentForm.risk_score} onChange={(e) => setCurrentForm((f) => ({ ...f, risk_score: e.target.value as WwftForm["risk_score"] }))} style={{ ...inp, width: "100%" }}>
            <option value="laag">Laag</option>
            <option value="middel">Middel</option>
            <option value="hoog">Hoog</option>
          </select>
          <div style={{ background: risk.bg, border: `1px solid ${risk.border}`, borderRadius: "8px", padding: "10px 12px", fontSize: "11px", color: risk.color, marginTop: "8px" }}>
            {risk.text}
          </div>
        </div>

        <div
          onClick={() => setCurrentForm((f) => ({ ...f, pep_check: !f.pep_check }))}
          style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px", marginBottom: "8px", cursor: "pointer" }}
        >
          <input type="checkbox" checked={currentForm.pep_check} onChange={() => {}} style={{ width: "16px", height: "16px", accentColor: "#0284c7", cursor: "pointer", marginTop: "2px", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>PEP — Politiek Prominent Persoon</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Vink aan indien {currentContact?.name ?? "deze partij"} een politiek prominente functie bekleedt of heeft bekleed</div>
          </div>
        </div>

        <div
          onClick={() => setCurrentForm((f) => ({ ...f, sanctions_check: !f.sanctions_check }))}
          style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px", cursor: "pointer" }}
        >
          <input type="checkbox" checked={currentForm.sanctions_check} onChange={() => {}} style={{ width: "16px", height: "16px", accentColor: "#0284c7", cursor: "pointer", marginTop: "2px", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>Sanctielijst gecontroleerd en vrij</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Bevestig dat u de EU sanctielijst heeft geraadpleegd en geen treffer gevonden</div>
          </div>
        </div>
      </div>

      {/* Herkomst vermogen — buyer only */}
      {activeParty === "buyer" && (
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>Herkomst Vermogen</div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "14px" }}>Wettelijk verplicht vast te leggen o.g.v. Wwft artikel 3</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Financieringsvorm</label>
              <select value={currentForm.financing_type} onChange={(e) => setCurrentForm((f) => ({ ...f, financing_type: e.target.value }))} style={{ ...inp, width: "100%" }}>
                <option>Hypotheek</option>
                <option>Eigen middelen</option>
                <option>Combinatie</option>
                <option>Anders</option>
              </select>
            </div>

            {showsHypotheek && (
              <div>
                <label style={lbl}>Geldverstrekker</label>
                <input value={currentForm.bank} onChange={(e) => setCurrentForm((f) => ({ ...f, bank: e.target.value }))} placeholder="ING Bank" style={inp} />
              </div>
            )}

            {showsHypotheek && (
              <div>
                <label style={lbl}>Hypotheekbedrag</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#94a3b8" }}>€</span>
                  <input type="number" value={currentForm.mortgage_amount} onChange={(e) => setCurrentForm((f) => ({ ...f, mortgage_amount: e.target.value }))} placeholder="350000" style={{ ...inp, paddingLeft: "26px" }} />
                </div>
              </div>
            )}

            {showsEigenMiddelen && (
              <div style={{ gridColumn: showsHypotheek ? "1 / -1" : "auto" }}>
                <label style={lbl}>Eigen middelen</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#94a3b8" }}>€</span>
                  <input type="number" value={currentForm.own_funds} onChange={(e) => setCurrentForm((f) => ({ ...f, own_funds: e.target.value }))} placeholder="50000" style={{ ...inp, paddingLeft: "26px" }} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={lbl}>Herkomst eigen middelen</label>
            <textarea
              value={currentForm.own_funds_source}
              onChange={(e) => setCurrentForm((f) => ({ ...f, own_funds_source: e.target.value }))}
              placeholder="Bijv. spaartegoed, erfenis, verkoop vorig appartement..."
              rows={3}
              style={{ ...inp, resize: "vertical", lineHeight: "1.5", width: "100%" }}
            />
          </div>
        </div>
      )}

      {/* FIU card */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px", marginBottom: "14px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>FIU — Ongebruikelijke Transacties</div>
        {currentForm.risk_score === "laag" ? (
          <div style={{ fontSize: "12px", color: "#16a34a" }}>✓ Geen aanleiding voor FIU melding</div>
        ) : (
          <div>
            <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#854d0e", marginBottom: "6px" }}>
              ⚠️ Verhoogd risico — overweeg melding bij FIU-Nederland via fiu.nl
            </div>
            <a href="https://www.fiu.nl" target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#0284c7", textDecoration: "none", display: "inline-block" }}>
              FIU-Nederland →
            </a>
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ width: "100%", background: "#0284c7", border: "none", borderRadius: "10px", padding: "12px", fontSize: "14px", fontWeight: "700", color: "#fff", cursor: "pointer", opacity: saving ? 0.6 : 1, marginBottom: "8px", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}
      >
        {saving ? "Opslaan…" : "Risicobeoordeling opslaan"}
      </button>

      {/* Export button */}
      <button
        onClick={() => console.log("wwft export", { buyerEntry, sellerEntry, buyerForm, sellerForm })}
        style={{ width: "100%", background: "#fff", border: "1px solid #e8ecf0", borderRadius: "8px", padding: "10px", fontSize: "13px", color: "#64748b", cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}
      >
        Dossier exporteren
      </button>
    </div>
  );
}

interface Message {
  id: string;
  created_at: string;
  contact_id: string | null;
  content: string;
  status: "concept" | "gepland" | "verzonden" | "mislukt";
  trigger_event: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  concept:   { bg: "#fef9c3", color: "#854d0e", label: "Concept" },
  gepland:   { bg: "#dbeafe", color: "#1e40af", label: "Gepland" },
  verzonden: { bg: "#dcfce7", color: "#14532d", label: "Verzonden" },
  mislukt:   { bg: "#fee2e2", color: "#991b1b", label: "Mislukt" },
};

function WhatsAppSection({ deal, dealId }: { deal: DealWithContacts; dealId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

  const recipients = [
    deal.buyer_id && deal.buyer ? { id: deal.buyer_id, name: deal.buyer.name, label: "Koper" } : null,
    deal.seller_id && deal.seller ? { id: deal.seller_id, name: deal.seller.name, label: "Verkoper" } : null,
  ].filter(Boolean) as { id: string; name: string; label: string }[];

  const loadMessages = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    setMessages((data ?? []) as Message[]);
  }, [dealId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const selectedRecipient = recipients.find((r) => r.id === recipientId) ?? recipients[0];

  async function handleGenerateAI() {
    if (!selectedRecipient) return;
    setGeneratingAI(true);
    try {
      const res = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealAddress: deal.address ?? "",
          dealCity: deal.city ?? "",
          recipientName: selectedRecipient.name,
          triggerEvent: "Handmatig",
          agentName: "Uw makelaar",
        }),
      });
      const { message } = await res.json();
      setMessageText(message);
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleSave() {
    if (!messageText.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("messages").insert({
      owner_id: user.id,
      deal_id: dealId,
      contact_id: selectedRecipient?.id ?? null,
      channel: "whatsapp",
      content: messageText,
      status: "concept",
      trigger_event: null,
      scheduled_at: null,
    });
    setMessageText("");
    setShowCompose(false);
    await loadMessages();
    setSaving(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  const inpStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #e8ecf0", borderRadius: "8px",
    fontSize: "13px", color: "#0f172a", background: "#fff", outline: "none",
    boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: "640px" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          Opgeslagen ✓
        </div>
      )}

      {/* 1. Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>WhatsApp</span>
        <button onClick={() => setShowCompose(!showCompose)} style={{ padding: "7px 14px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
          + Bericht opstellen
        </button>
      </div>

      {/* 2. Compose form */}
      {showCompose && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>Nieuw bericht</div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "500", color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Ontvanger</label>
            <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} style={inpStyle}>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>{r.label}: {r.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "block", fontSize: "10px", fontWeight: "500", color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Bericht</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Typ je bericht of laat AI het genereren..."
              rows={4}
              style={{ ...inpStyle, resize: "vertical", lineHeight: "1.5" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
            <button onClick={handleGenerateAI} disabled={generatingAI} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #bae6fd", borderRadius: "6px", fontSize: "11px", color: "#0284c7", cursor: "pointer", fontWeight: "500", opacity: generatingAI ? 0.6 : 1 }}>
              {generatingAI ? "Genereren…" : "✦ AI genereer"}
            </button>
          </div>

          <button onClick={handleSave} disabled={saving || !messageText.trim()} style={{ width: "100%", background: "#0284c7", border: "none", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: "600", color: "#fff", cursor: "pointer", opacity: saving || !messageText.trim() ? 0.5 : 1, fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      )}

      {/* 3/4. Message list or empty state */}
      {messages.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "48px 24px", textAlign: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "16px" }}>Nog geen berichten voor deze deal</div>
          <button onClick={() => setShowCompose(true)} style={{ padding: "8px 16px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
            + Eerste bericht opstellen
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {messages.map((msg) => {
            const badge = STATUS_BADGE[msg.status] ?? STATUS_BADGE.concept;
            const recipient = recipients.find((r) => r.id === msg.contact_id);
            return (
              <div key={msg.id} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{recipient?.name ?? "Onbekend"}</div>
                    {msg.trigger_event && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{msg.trigger_event}</div>}
                  </div>
                  <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                </div>

                {/* WhatsApp bubble */}
                <div style={{ background: "#dcfce7", borderRadius: "4px 12px 12px 12px", padding: "10px 14px", fontSize: "12px", color: "#0f172a", maxWidth: "85%", lineHeight: "1.5" }}>
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type DocStatus = "wacht_op_ondertekening" | "ondertekend" | "ontvangen" | "ontbreekt";
type DocSource = "Realworks" | "Handmatig";

interface DocItem {
  name: string;
  source: DocSource;
  status: DocStatus;
  date?: string;
}

const HARDCODED_DOCS: DocItem[] = [
  { name: "Koopovereenkomst",              source: "Realworks", status: "wacht_op_ondertekening", date: "2026-05-01" },
  { name: "Lijst van Zaken",               source: "Realworks", status: "ondertekend",            date: "2026-04-28" },
  { name: "Financieringsvoorbehoud waiver", source: "Handmatig", status: "ontvangen",              date: "2026-04-30" },
  { name: "Energielabel",                  source: "Realworks", status: "ontbreekt" },
  { name: "VvE dossier",                   source: "Handmatig", status: "ontbreekt" },
];

const DOC_STATUS: Record<DocStatus, { bg: string; color: string; label: string }> = {
  wacht_op_ondertekening: { bg: "#fff7ed", color: "#c2410c", label: "Wacht op ondertekening" },
  ondertekend:            { bg: "#f0fdf4", color: "#15803d", label: "Ondertekend" },
  ontvangen:              { bg: "#eff6ff", color: "#1d4ed8", label: "Ontvangen" },
  ontbreekt:              { bg: "#fef2f2", color: "#b91c1c", label: "Ontbreekt" },
};

function DocumentenSection() {
  const docs = HARDCODED_DOCS;
  const complete = docs.filter((d) => d.status === "ondertekend" || d.status === "ontvangen").length;
  const pct = Math.round((complete / docs.length) * 100);

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          Documenten
        </span>
        <button style={{ padding: "6px 12px", background: "transparent", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
          + Document toevoegen
        </button>
      </div>

      {/* Summary bar */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>
            {complete} van {docs.length} documenten compleet
          </span>
          <span style={{ fontSize: "11px", fontWeight: "600", color: "#0284c7" }}>{pct}%</span>
        </div>
        <div style={{ height: "6px", background: "#e8ecf0", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#0284c7", borderRadius: "999px", transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* Document cards */}
      {docs.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>Geen documenten</div>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Documenten worden aangemaakt in Realworks en verschijnen hier automatisch.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {docs.map((doc) => {
            const badge = DOC_STATUS[doc.status];
            return (
              <div key={doc.name} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Icon */}
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {doc.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {/* Source pill */}
                    <span style={{
                      fontSize: "10px", fontWeight: "600", padding: "2px 7px", borderRadius: "999px",
                      background: doc.source === "Realworks" ? "#f0fdf4" : "#eff6ff",
                      color: doc.source === "Realworks" ? "#15803d" : "#1d4ed8",
                      border: `1px solid ${doc.source === "Realworks" ? "#bbf7d0" : "#bfdbfe"}`,
                    }}>
                      {doc.source}
                    </span>
                    {/* Status badge */}
                    <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 7px", borderRadius: "999px", background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    {/* Date */}
                    {doc.date && (
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                        {new Date(doc.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Upload button if missing */}
                {doc.status === "ontbreekt" && (
                  <button style={{ padding: "6px 12px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer", flexShrink: 0 }}>
                    Uploaden
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CallEntry {
  id: string;
  deal_id: string;
  contact_id: string | null;
  duration_seconds: number;
  summary: string | null;
  logged_at: string;
}

const DURATION_OPTIONS = [
  { label: "1 min",  seconds: 60 },
  { label: "2 min",  seconds: 120 },
  { label: "5 min",  seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "30 min", seconds: 1800 },
];

function fmtDuration(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return `${m} min`;
}

function nowLocalIso() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

function GesprekkenSection({ deal, dealId }: { deal: DealWithContacts; dealId: string }) {
  const supabase = createClient();
  const [calls, setCalls] = useState<CallEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [contactKey, setContactKey] = useState("koper");
  const [loggedAt, setLoggedAt] = useState(nowLocalIso);
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [note, setNote] = useState("");

  const contactOptions = [
    deal.buyer_id && deal.buyer ? { key: "koper",    id: deal.buyer_id,   name: deal.buyer.name,   role: "Koper" }    : null,
    deal.seller_id && deal.seller ? { key: "verkoper", id: deal.seller_id,  name: deal.seller.name,  role: "Verkoper" } : null,
    { key: "notaris", id: null, name: "Notaris", role: "Notaris" },
    { key: "bank",    id: null, name: "Bank",    role: "Bank" },
  ].filter(Boolean) as { key: string; id: string | null; name: string; role: string }[];

  const loadCalls = useCallback(async () => {
    const { data } = await supabase
      .from("calls")
      .select("*")
      .eq("deal_id", dealId)
      .order("logged_at", { ascending: false });
    setCalls((data as CallEntry[]) ?? []);
    setLoading(false);
  }, [dealId, supabase]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  function resolveContact(contactId: string | null) {
    if (contactId && contactId === deal.buyer_id)  return { name: deal.buyer?.name ?? "Koper",    role: "Koper" };
    if (contactId && contactId === deal.seller_id) return { name: deal.seller?.name ?? "Verkoper", role: "Verkoper" };
    return { name: "Externe partij", role: "Extern" };
  }

  const ROLE_PILL: Record<string, { bg: string; color: string }> = {
    Koper:    { bg: "#eff6ff", color: "#1d4ed8" },
    Verkoper: { bg: "#f0fdf4", color: "#15803d" },
    Notaris:  { bg: "#faf5ff", color: "#7c3aed" },
    Bank:     { bg: "#fff7ed", color: "#c2410c" },
    Extern:   { bg: "#f1f5f9", color: "#475569" },
  };

  async function handleSave() {
    const opt = contactOptions.find((o) => o.key === contactKey);
    setSaving(true);
    await supabase.from("calls").insert({
      deal_id: dealId,
      contact_id: opt?.id ?? null,
      duration_seconds: durationSeconds,
      summary: note.trim() || null,
      logged_at: new Date(loggedAt).toISOString(),
    });
    setSaving(false);
    setShowForm(false);
    setNote("");
    setLoggedAt(nowLocalIso());
    setDurationSeconds(300);
    setContactKey("koper");
    loadCalls();
  }

  function openForm() { setLoggedAt(nowLocalIso()); setShowForm(true); }

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          Gesprekslog
        </span>
        <button
          onClick={openForm}
          style={{ padding: "6px 12px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
        >
          + Gesprek loggen
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={lbl}>Contact</label>
              <select
                value={contactKey}
                onChange={(e) => setContactKey(e.target.value)}
                style={inp}
              >
                {contactOptions.map((o) => (
                  <option key={o.key} value={o.key}>{o.role}{o.key !== "notaris" && o.key !== "bank" ? ` — ${o.name}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Duur</label>
              <select
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                style={inp}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.seconds} value={d.seconds}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={lbl}>Datum &amp; tijd</label>
            <input
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              style={inp}
            />
          </div>
          <div style={{ marginBottom: "14px" }}>
            <label style={lbl}>Notitie</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Beschrijf het gesprek..."
              style={{ ...inp, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: "7px 14px", background: "transparent", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", fontWeight: "600", color: "#64748b", cursor: "pointer" }}
            >
              Annuleren
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "7px 14px", background: "#0284c7", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", color: "#fff", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        </div>
      )}

      {/* Call list */}
      {loading ? null : calls.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>Nog geen gesprekken gelogd</div>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 16px" }}>Log het eerste gesprek om de communicatie bij te houden.</p>
          <button
            onClick={openForm}
            style={{ padding: "7px 14px", background: "#0284c7", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", color: "#fff", cursor: "pointer" }}
          >
            + Eerste gesprek loggen
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {calls.map((call) => {
            const { name, role } = resolveContact(call.contact_id);
            const pill = ROLE_PILL[role] ?? ROLE_PILL.Extern;
            const dateStr = new Date(call.logged_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={call.id} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{name}</span>
                  <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 7px", borderRadius: "999px", background: pill.bg, color: pill.color }}>
                    {role}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: call.summary ? "8px" : "0" }}>
                  {fmtDuration(call.duration_seconds)} · {dateStr}
                </div>
                {call.summary && (
                  <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px", fontSize: "12px", color: "#475569", fontStyle: "italic", lineHeight: "1.5" }}>
                    {call.summary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CHECKLIST_ITEMS = [
  "Concept transportakte ontvangen",
  "Wwft dossier compleet",
  "VvE documenten compleet",
  "Waarborgsom gestort",
  "Hypotheekoffer getekend",
  "Bouwkundige keuring akkoord",
  "Eindopname gepland",
  "Meterstanden genoteerd",
  "Sleutels overgedragen",
  "Transportakte getekend bij notaris",
  "Nutsvoorzieningen overgedragen",
];

function OverdrachtSection({ deal }: { deal: DealWithContacts }) {
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST_ITEMS.map(() => false));
  const [meters, setMeters] = useState({ gas: "", water: "", elektriciteit: "", warmte: "" });
  const [metersSaved, setMetersSaved] = useState(false);

  const completedCount = checked.filter(Boolean).length;
  const total = CHECKLIST_ITEMS.length;
  const pct = Math.round((completedCount / total) * 100);
  const allDone = completedCount === total;

  function toggle(i: number) {
    setChecked((prev) => { const next = [...prev]; next[i] = !next[i]; return next; });
  }

  function saveMeta() { setMetersSaved(true); setTimeout(() => setMetersSaved(false), 2000); }

  const transferDateStr = deal.transfer_date
    ? new Date(deal.transfer_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          Overdracht
        </span>
        {transferDateStr ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#0284c7" }}>{transferDateStr}</span>
          </div>
        ) : (
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Datum nog niet ingesteld</span>
        )}
      </div>

      {/* Completion banner */}
      {allDone && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>🎉</span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#15803d" }}>Overdracht compleet</div>
            <div style={{ fontSize: "11px", color: "#16a34a" }}>Post-sale automations worden gestart</div>
          </div>
        </div>
      )}

      {/* Checklist card */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px" }}>
        <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>
          Overdrachtschieckllist
        </div>
        {/* Progress */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "#0f172a" }}>{completedCount} van {total} voltooid</span>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "#0284c7" }}>{pct}%</span>
          </div>
          <div style={{ height: "6px", background: "#e8ecf0", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#0284c7", borderRadius: "999px", transition: "width 0.25s ease" }} />
          </div>
        </div>
        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {CHECKLIST_ITEMS.map((item, i) => (
            <label
              key={item}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 6px", borderRadius: "8px", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                style={{ width: "15px", height: "15px", accentColor: "#0284c7", cursor: "pointer", flexShrink: 0 }}
              />
              <span style={{ fontSize: "13px", color: checked[i] ? "#94a3b8" : "#0f172a", textDecoration: checked[i] ? "line-through" : "none", transition: "color 0.15s" }}>
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Meterstanden card */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px" }}>
        <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px" }}>
          Meterstanden
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
          {(
            [
              { key: "gas",          label: "Gas (m³)" },
              { key: "water",        label: "Water (m³)" },
              { key: "elektriciteit", label: "Elektriciteit (kWh)" },
              { key: "warmte",       label: "Warmte (GJ)" },
            ] as { key: keyof typeof meters; label: string }[]
          ).map(({ key, label }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <input
                type="number"
                min="0"
                value={meters[key]}
                onChange={(e) => setMeters((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="0"
                style={inp}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={saveMeta}
            style={{ padding: "7px 16px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            Opslaan
          </button>
          {metersSaved && (
            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>✓ Opgeslagen</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatEuro(v: number) {
  return "€ " + v.toLocaleString("nl-NL");
}

function formatDate(d: string | null) {
  if (!d) return "Nog niet ingesteld";
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

const FUNDA_WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6"];
const FUNDA_DATA  = [380, 520, 290, 410, 480, 847];

const NEXT_STEPS = [
  { label: "Bod van koper bespreken",          deadline: "Vandaag",      bg: "#fee2e2", color: "#b91c1c" },
  { label: "Koopakte opstellen na akkoord",    deadline: "Deze week",    bg: "#fff7ed", color: "#c2410c" },
  { label: "Notariële overdracht plannen",     deadline: "18 december",  bg: "#f1f5f9", color: "#475569" },
  { label: "Weekrapport versturen",            deadline: "Maandag",      bg: "#eff6ff", color: "#1d4ed8" },
];

function VerkoperSection({ deal, dealId }: { deal: DealWithContacts; dealId: string }) {
  const supabase = createClient();
  const [feedbackText, setFeedbackText] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);

  const dagen = daysSince(deal.created_at);
  const maxVal = Math.max(...FUNDA_DATA);
  const CHART_H = 100;

  useEffect(() => {
    setLoadingFeedback(true);
    fetch("/api/generate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "seller-feedback",
        dealAddress: deal.address ?? "",
        stats: "8 bezichtigingen, gem. 3.8/5, 1 bod ontvangen",
      }),
    })
      .then((r) => r.json())
      .then(({ message }) => setFeedbackText(message))
      .finally(() => setLoadingFeedback(false));
  }, [deal.address]);

  async function handleWeekrapport() {
    setGeneratingReport(true);
    setShowModal(true);
    setReportText("");
    const sellerName = deal.seller?.name ?? "verkoper";
    const res = await fetch("/api/generate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "weekrapport",
        dealAddress: deal.address ?? "",
        dealCity: deal.city ?? "",
        sellerName,
        stats: "1.247 Funda views (+12%), 8 bezichtigingen, 1 bod ontvangen",
      }),
    });
    const { message } = await res.json();
    setReportText(message);
    setGeneratingReport(false);
  }

  async function handleSendReport() {
    if (!reportText.trim()) return;
    setSavingReport(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("messages").insert({
        owner_id: user.id,
        deal_id: dealId,
        contact_id: deal.seller_id ?? null,
        channel: "whatsapp",
        content: reportText,
        status: "concept",
        trigger_event: "Weekrapport verkoper",
        scheduled_at: null,
      });
    }
    setSavingReport(false);
    setReportSaved(true);
    setTimeout(() => { setReportSaved(false); setShowModal(false); }, 1800);
  }

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          Verkoper dashboard
        </span>
        <button
          onClick={handleWeekrapport}
          style={{ padding: "6px 14px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
        >
          Weekrapport versturen
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
        {[
          { label: "Funda Views",      value: "1.247",        sub: "+12% deze week",           subColor: "#16a34a" },
          { label: "Bezichtigingen",   value: "8",            sub: "2 nieuw",                  subColor: "#0284c7" },
          { label: "Dagen te koop",    value: String(dagen),  sub: "Vanaf aanmaakdatum",       subColor: "#94a3b8" },
          { label: "Boden",            value: "1",            sub: "Actief in onderhandeling", subColor: "#c2410c" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "10px", padding: "14px" }}>
            <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", marginBottom: "4px" }}>{s.value}</div>
            <div style={{ fontSize: "10px", fontWeight: "600", color: s.subColor }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Funda bar chart */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px" }}>
        <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "16px" }}>
          Funda views — afgelopen 6 weken
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: `${CHART_H + 20}px` }}>
          {FUNDA_DATA.map((v, i) => {
            const barH = Math.round((v / maxVal) * CHART_H);
            const isLast = i === FUNDA_DATA.length - 1;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: "600", color: isLast ? "#0284c7" : "#64748b" }}>{v}</span>
                <div style={{ width: "100%", height: `${barH}px`, background: isLast ? "#0284c7" : "#bfdbfe", borderRadius: "4px 4px 0 0" }} />
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>{FUNDA_WEEKS[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI feedback summary */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px" }}>
        <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>
          Bezichtigingen feedback — AI samenvatting
        </div>
        {loadingFeedback ? (
          <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>AI samenvatting wordt gegenereerd…</div>
        ) : feedbackText ? (
          <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "14px", fontSize: "13px", color: "#374151", fontStyle: "italic", lineHeight: "1.6" }}>
            {feedbackText}
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Geen samenvatting beschikbaar.</div>
        )}
      </div>

      {/* Volgende stappen */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px" }}>
        <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>
          Volgende stappen voor verkoper
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {NEXT_STEPS.map((step) => (
            <div key={step.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px" }}>
              <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: "500" }}>{step.label}</span>
              <span style={{ fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "999px", background: step.bg, color: step.color, flexShrink: 0, marginLeft: "12px" }}>
                {step.deadline}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekrapport modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "560px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>Weekrapport verkoper</span>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "18px", lineHeight: 1, padding: "2px 6px" }}
              >
                ×
              </button>
            </div>

            {generatingReport ? (
              <div style={{ padding: "32px", textAlign: "center", fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>
                Weekrapport wordt gegenereerd…
              </div>
            ) : (
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={14}
                style={{ width: "100%", padding: "12px", border: "1px solid #e8ecf0", borderRadius: "8px", fontSize: "12px", color: "#0f172a", lineHeight: "1.6", resize: "vertical", boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}
              />
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: "8px 16px", background: "transparent", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", fontWeight: "600", color: "#64748b", cursor: "pointer" }}
              >
                Sluiten
              </button>
              <button
                onClick={handleSendReport}
                disabled={savingReport || generatingReport || !reportText.trim()}
                style={{ padding: "8px 16px", background: reportSaved ? "#16a34a" : "#0284c7", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", color: "#fff", cursor: "pointer", opacity: savingReport || generatingReport || !reportText.trim() ? 0.6 : 1, transition: "background 0.2s" }}
              >
                {reportSaved ? "✓ Opgeslagen als concept" : savingReport ? "Opslaan…" : "Versturen via WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: "700", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function ContactCard({ title, contact, avatarColor }: { title: string; contact: { name: string; email: string | null; phone: string | null } | null; avatarColor: string }) {
  if (!contact) return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px", flex: 1 }}>
      <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>{title}</div>
      <p style={{ fontSize: "13px", color: "#94a3b8" }}>Niet ingesteld</p>
    </div>
  );

  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px", flex: 1 }}>
      <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <Avatar name={contact.name} color={avatarColor} />
        <span style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{contact.name}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
        {contact.phone && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            <span style={{ fontSize: "11px", color: "#94a3b8", width: "50px" }}>Telefoon</span>
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: "500" }}>{contact.phone}</span>
          </div>
        )}
        {contact.email && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            <span style={{ fontSize: "11px", color: "#94a3b8", width: "50px" }}>E-mail</span>
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: "500" }}>{contact.email}</span>
          </div>
        )}
      </div>
      <button style={{ padding: "6px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#16a34a", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
        WhatsApp
      </button>
    </div>
  );
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;

  const [deal, setDeal] = useState<DealWithContacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<SubNav>("overzicht");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("deals")
        .select(`*, buyer:contacts!deals_buyer_id_fkey(name,email,phone), seller:contacts!deals_seller_id_fkey(name,email,phone)`)
        .eq("id", dealId)
        .single();
      setDeal(data as DealWithContacts | null);
      setLoading(false);
    }
    load();
  }, [dealId]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>Laden…</span>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>Deal niet gevonden.</span>
      </div>
    );
  }

  const stageIdx = STAGES.findIndex((s) => s.id === deal.stage);
  const badge = STAGE_BADGE[deal.stage as DealStage] ?? STAGE_BADGE.lead;
  const days = daysSince(deal.created_at);
  const progress = Math.round(((stageIdx + 1) / STAGES.length) * 100);

  const ACTIONS = [
    { label: "Document genereren",    color: "#0284c7", bg: "#f0f9ff", border: "rgba(2,132,199,0.2)" },
    { label: "WhatsApp sturen",        color: "#16a34a", bg: "#f0fdf4", border: "rgba(22,163,74,0.2)" },
    { label: "Kadaster check",         color: "#7c3aed", bg: "#f5f3ff", border: "rgba(124,58,237,0.2)" },
    { label: "Voorwaarden toevoegen",  color: "#ef4444", bg: "#fff1f2", border: "rgba(239,68,68,0.2)" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
          </button>
          <span style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.4px" }}>{deal.address ?? deal.title}</span>
          {deal.city && <span style={{ fontSize: "14px", color: "#94a3b8" }}>{deal.city}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: badge.bg, color: badge.text }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: badge.dot }} />
            {STAGES.find((s) => s.id === deal.stage)?.label}
          </span>
          {(deal.agreed_price ?? deal.value) != null && (
            <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.4px" }}>
              {formatEuro(deal.agreed_price ?? deal.value ?? 0)}
            </span>
          )}
        </div>
      </div>

      {/* Stage progress strip */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf0", padding: "12px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {STAGES.map((s, i) => {
            const completed = i < stageIdx;
            const current = i === stageIdx;
            const future = i > stageIdx;
            return (
              <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {i > 0 && (
                  <div style={{ position: "absolute", left: 0, top: "4px", width: "50%", height: "1px", background: completed || current ? "#0284c7" : "#e2e8f0" }} />
                )}
                {i < STAGES.length - 1 && (
                  <div style={{ position: "absolute", right: 0, top: "4px", width: "50%", height: "1px", background: completed ? "#0284c7" : "#e2e8f0" }} />
                )}
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", zIndex: 1, background: future ? "#e2e8f0" : "#0284c7", boxShadow: current ? "0 0 0 3px rgba(2,132,199,0.15)" : "none", marginBottom: "6px" }} />
                <span style={{ fontSize: "9px", fontWeight: current ? "600" : "400", color: current ? "#0284c7" : completed ? "#64748b" : "#cbd5e1", textAlign: "center" }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left sub-nav */}
        <div style={{ width: "200px", flexShrink: 0, background: "#fff", borderRight: "1px solid #e8ecf0", padding: "16px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {SUB_NAV.map((item) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 10px", borderRadius: "8px", border: "none", cursor: "pointer",
                  background: active ? "#f0f9ff" : "transparent",
                  color: active ? "#0284c7" : "#64748b",
                  fontSize: "13px", fontWeight: active ? "600" : "400",
                  textAlign: "left", width: "100%",
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
          {activeNav === "overzicht" && (
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { label: "Koopsom",   value: deal.agreed_price ? formatEuro(deal.agreed_price) : "—" },
                  { label: "Looptijd",  value: `${days} dagen` },
                  { label: "Voortgang", value: `${progress}%` },
                  { label: "Status",    value: STAGES.find((s) => s.id === deal.stage)?.label ?? "—" },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "6px" }}>{stat.label}</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.3px" }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <ContactCard title="Koper" contact={deal.buyer} avatarColor="#0284c7" />
                <ContactCard title="Verkoper" contact={deal.seller} avatarColor="#16a34a" />
              </div>
              <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px 20px" }}>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "16px" }}>Dealgegevens</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {[
                    { label: "Adres",           value: deal.address ?? "—" },
                    { label: "Postcode + Stad",  value: [deal.postcode, deal.city].filter(Boolean).join(" ") || "—" },
                    { label: "Type object",      value: deal.property_type ?? "—" },
                    { label: "Overdrachtsdatum", value: formatDate(deal.transfer_date) },
                    { label: "Notaris",          value: deal.notary_name ?? "Nog niet ingesteld" },
                    { label: "Aangemaakt op",    value: formatDate(deal.created_at) },
                  ].map((field) => (
                    <div key={field.label}>
                      <div style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "3px" }}>{field.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: field.value === "Nog niet ingesteld" ? "#94a3b8" : "#0f172a" }}>{field.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px 20px" }}>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>Snelle acties</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {ACTIONS.map((a) => (
                    <button key={a.label} style={{ padding: "10px 12px", background: a.bg, border: `1px solid ${a.border}`, borderRadius: "8px", color: a.color, fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNav === "verkoper" && (
            <VerkoperSection deal={deal} dealId={dealId} />
          )}

          {activeNav === "documenten" && (
            <DocumentenSection />
          )}

          {activeNav === "gesprekken" && (
            <GesprekkenSection deal={deal} dealId={dealId} />
          )}

          {activeNav === "overdracht" && (
            <OverdrachtSection deal={deal} />
          )}

          {activeNav === "wwft" && (
            <WwftSection deal={deal} dealId={dealId} />
          )}

          {activeNav === "whatsapp" && (
            <WhatsAppSection deal={deal} dealId={dealId} />
          )}

          {activeNav !== "overzicht" && activeNav !== "verkoper" && activeNav !== "documenten" && activeNav !== "gesprekken" && activeNav !== "overdracht" && activeNav !== "wwft" && activeNav !== "whatsapp" && (
            <div style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "40px 32px", textAlign: "center", maxWidth: "360px", width: "100%" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                  {SUB_NAV.find((n) => n.id === activeNav)?.label} — komt binnenkort
                </div>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 20px" }}>Deze module is nog in ontwikkeling.</p>
                <button style={{ padding: "8px 16px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                  + Toevoegen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

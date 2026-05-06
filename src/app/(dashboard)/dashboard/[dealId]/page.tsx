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

type SubNav = "overzicht" | "documenten" | "voorwaarden" | "wwft" | "whatsapp" | "gesprekken" | "overdracht";

const SUB_NAV: { id: SubNav; label: string; icon: React.ReactNode }[] = [
  {
    id: "overzicht", label: "Overzicht",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
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

const TRIGGER_OPTIONS = [
  "Handmatig",
  "Na bezichtiging",
  "Bod ontvangen",
  "Financieringsvoorbehoud follow-up",
  "Document ondertekening herinnering",
  "Overdracht herinnering",
  "Na overdracht",
];

const AUTO_TRIGGERS = [
  { emoji: "🏠", label: "Welkomstbericht bij aanmaken deal" },
  { emoji: "⏰", label: "Bezichtiging herinnering (24u van tevoren)" },
  { emoji: "📝", label: "Follow-up na bezichtiging (2u na bezoek)" },
  { emoji: "📋", label: "Document ondertekening herinnering (3 dagen)" },
  { emoji: "🔑", label: "Overdracht herinnering (3 dagen voor datum)" },
];

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  concept:  { bg: "#fef9c3", color: "#854d0e", label: "Concept" },
  gepland:  { bg: "#dbeafe", color: "#1e40af", label: "Gepland" },
  verzonden:{ bg: "#dcfce7", color: "#14532d", label: "Verzonden" },
  mislukt:  { bg: "#fee2e2", color: "#991b1b", label: "Mislukt" },
};

function fmtDateTime(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function WhatsAppSection({ deal, dealId }: { deal: DealWithContacts; dealId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"alle" | "concept" | "gepland" | "verzonden">("alle");
  const [triggerToggles, setTriggerToggles] = useState(AUTO_TRIGGERS.map(() => true));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [recipientId, setRecipientId] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("Handmatig");
  const [messageText, setMessageText] = useState("");
  const [sendMode, setSendMode] = useState<"nu" | "inplannen">("nu");
  const [scheduledAt, setScheduledAt] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

  const recipients = [
    deal.buyer_id && deal.buyer ? { id: deal.buyer_id, name: deal.buyer.name, phone: deal.buyer.phone ?? "", label: "Koper" } : null,
    deal.seller_id && deal.seller ? { id: deal.seller_id, name: deal.seller.name, phone: deal.seller.phone ?? "", label: "Verkoper" } : null,
  ].filter(Boolean) as { id: string; name: string; phone: string; label: string }[];

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
          triggerEvent,
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
      contact_id: (selectedRecipient?.id ?? null),
      channel: "whatsapp",
      content: messageText,
      status: "concept",
      trigger_event: triggerEvent,
      scheduled_at: sendMode === "inplannen" && scheduledAt ? scheduledAt : null,
    });

    setMessageText("");
    setTriggerEvent("Handmatig");
    setSendMode("nu");
    setScheduledAt("");
    setShowCompose(false);
    await loadMessages();
    setSaving(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  const filtered = activeFilter === "alle" ? messages : messages.filter((m) => m.status === activeFilter);

  const inpStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #e8ecf0", borderRadius: "8px",
    fontSize: "13px", color: "#0f172a", background: "#fff", outline: "none",
    boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: "680px", position: "relative" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          Opgeslagen ✓
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>WhatsApp Automation</span>
        <button onClick={() => setShowCompose(!showCompose)} style={{ padding: "7px 14px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
          + Bericht opstellen
        </button>
      </div>

      {/* Compose form */}
      {showCompose && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>Nieuw bericht</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: "500", color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Ontvanger</label>
              <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} style={inpStyle}>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}: {r.name} {r.phone ? `(${r.phone})` : ""}</option>
                ))}
                <option value="notaris">Notaris</option>
                <option value="bank">Bank</option>
                <option value="anders">Anders</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: "500", color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Trigger event</label>
              <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} style={inpStyle}>
                {TRIGGER_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
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

          <button onClick={handleGenerateAI} disabled={generatingAI} style={{ padding: "5px 12px", background: "#fff", border: "1px solid #e8ecf0", borderRadius: "6px", fontSize: "11px", color: "#0284c7", cursor: "pointer", marginBottom: "14px", opacity: generatingAI ? 0.6 : 1 }}>
            {generatingAI ? "Genereren…" : "✦ AI genereer bericht"}
          </button>

          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            {(["nu", "inplannen"] as const).map((m) => (
              <button key={m} onClick={() => setSendMode(m)} style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid", fontSize: "12px", fontWeight: "500", cursor: "pointer", background: sendMode === m ? "#0284c7" : "#fff", color: sendMode === m ? "#fff" : "#64748b", borderColor: sendMode === m ? "#0284c7" : "#e8ecf0" }}>
                {m === "nu" ? "Nu versturen" : "Inplannen"}
              </button>
            ))}
          </div>

          {sendMode === "inplannen" && (
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "10px", fontWeight: "500", color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Versturen op</label>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={inpStyle} />
            </div>
          )}

          <button onClick={handleSave} disabled={saving || !messageText.trim()} style={{ width: "100%", background: "#0284c7", border: "none", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: "600", color: "#fff", cursor: "pointer", opacity: saving || !messageText.trim() ? 0.5 : 1, fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
            {saving ? "Opslaan…" : "Opslaan in wachtrij"}
          </button>
        </div>
      )}

      {/* Automation triggers banner */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>
          Automatische triggers — actief voor deze deal
        </div>
        {AUTO_TRIGGERS.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: i < AUTO_TRIGGERS.length - 1 ? "1px solid #f8fafc" : "none" }}>
            <div
              onClick={() => setTriggerToggles((prev) => prev.map((v, idx) => idx === i ? !v : v))}
              style={{ width: "32px", height: "18px", borderRadius: "9px", background: triggerToggles[i] ? "#0284c7" : "#e2e8f0", cursor: "pointer", flexShrink: 0, position: "relative", transition: "background 0.2s" }}
            >
              <div style={{ position: "absolute", top: "3px", left: triggerToggles[i] ? "17px" : "3px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: "12px", color: "#0f172a", flex: 1 }}>{t.emoji} {t.label}</span>
            <span style={{ fontSize: "10px", color: triggerToggles[i] ? "#16a34a" : "#94a3b8" }}>{triggerToggles[i] ? "Actief" : "Uit"}</span>
          </div>
        ))}
      </div>

      {/* Message list header + filter */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>Berichten wachtrij</span>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["alle", "concept", "gepland", "verzonden"] as const).map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: "4px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: activeFilter === f ? "600" : "400", color: activeFilter === f ? "#0284c7" : "#64748b", background: activeFilter === f ? "#f0f9ff" : "#f8fafc", border: activeFilter === f ? "1px solid #0284c7" : "1px solid #e8ecf0", cursor: "pointer" }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {messages.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          <div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "12px", marginBottom: "16px" }}>Nog geen berichten voor deze deal</div>
          <button onClick={() => setShowCompose(true)} style={{ padding: "8px 16px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
            + Eerste bericht opstellen
          </button>
        </div>
      ) : (
        <div>
          {filtered.map((msg) => {
            const badge = STATUS_BADGE[msg.status] ?? STATUS_BADGE.concept;
            const recipient = recipients.find((r) => r.id === msg.contact_id);
            const expanded = expandedIds.has(msg.id);
            const isLong = msg.content.length > 120;
            return (
              <div key={msg.id} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{recipient?.name ?? "Onbekend"}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{msg.trigger_event ?? "Handmatig"}</div>
                  </div>
                  <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: badge.bg, color: badge.color }}>{badge.label}</span>
                </div>

                <div style={{ background: "#dcfce7", borderRadius: "4px 12px 12px 12px", padding: "10px 14px", fontSize: "12px", color: "#0f172a", maxWidth: "85%", marginBottom: "8px", lineHeight: "1.5" }}>
                  {isLong && !expanded ? msg.content.slice(0, 120) + "…" : msg.content}
                  {isLong && (
                    <button onClick={() => setExpandedIds((s) => { const n = new Set(s); expanded ? n.delete(msg.id) : n.add(msg.id); return n; })} style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#0284c7", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      {expanded ? "Minder tonen" : "Meer tonen"}
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {msg.status === "gepland" && msg.scheduled_at ? `Gepland voor ${fmtDateTime(msg.scheduled_at)}` :
                     msg.status === "verzonden" && msg.sent_at ? `Verzonden op ${fmtDateTime(msg.sent_at)}` :
                     "Concept — nog niet gepland"}
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(msg.status === "concept" || msg.status === "gepland") && (
                      <>
                        <button style={{ padding: "5px 10px", background: "#fff", border: "1px solid #e8ecf0", borderRadius: "6px", fontSize: "11px", color: "#64748b", cursor: "pointer" }}>Bewerken</button>
                        <button onClick={() => console.log("Versturen via 360dialog:", msg.id)} style={{ padding: "5px 10px", background: "#0284c7", border: "none", borderRadius: "6px", fontSize: "11px", color: "#fff", cursor: "pointer", fontWeight: "600" }}>Nu versturen</button>
                      </>
                    )}
                    {msg.status === "verzonden" && (
                      <button onClick={() => console.log("Opnieuw sturen:", msg.id)} style={{ padding: "5px 10px", background: "#fff", border: "1px solid #e8ecf0", borderRadius: "6px", fontSize: "11px", color: "#64748b", cursor: "pointer" }}>Opnieuw sturen</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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

          {activeNav === "wwft" && (
            <WwftSection deal={deal} dealId={dealId} />
          )}

          {activeNav === "whatsapp" && (
            <WhatsAppSection deal={deal} dealId={dealId} />
          )}

          {activeNav !== "overzicht" && activeNav !== "wwft" && activeNav !== "whatsapp" && (
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

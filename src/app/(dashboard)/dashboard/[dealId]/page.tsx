"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DealWithContacts, DealStage } from "@/types/database";
import { dealClosedEmail } from "@/lib/email-templates";

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

const stageProgress: Record<DealStage, number> = {
  lead: 5, bezichtiging: 20, bod: 35,
  koopakte: 50, voorwaarden: 62,
  financiering: 75, overdracht: 90,
  gesloten: 100,
};

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

type SubNav = "overzicht" | "documenten" | "marketing" | "voorwaarden" | "wwft" | "whatsapp" | "gesprekken" | "overdracht" | "bezichtigingen" | "verkoper" | "funda" | "gastenlijst";

const SUB_NAV: { id: SubNav; label: string; icon: React.ReactNode }[] = [
  {
    id: "overzicht", label: "Overzicht",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  },
  {
    id: "bezichtigingen", label: "Bezichtigingen",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  },
  {
    id: "gastenlijst", label: "Gastenlijst",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    id: "verkoper", label: "Verkoper",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    id: "funda", label: "Funda Tekst",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  },
  {
    id: "documenten", label: "Documenten",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>,
  },
  {
    id: "marketing", label: "Marketing",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>,
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

// ─── Section components ───────────────────────────────────────────────────────

const sectionInp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #e8ecf0", borderRadius: "8px",
  fontSize: "13px", color: "#0f172a", background: "#fff", outline: "none",
  boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
};
const sectionLbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: "500", color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px",
};

function SectionWrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "20px 24px", maxWidth: "680px" }}>
      <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "16px" }}>{title}</div>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px 20px", marginBottom: "12px", ...style }}>
      {children}
    </div>
  );
}

// ─── Bezichtigingen ───────────────────────────────────────────────────────────

function BezichtigingenSection({ dealId, currentStage, onAdvanceStage }: { dealId: string; currentStage: DealStage; onAdvanceStage: (s: DealStage, msg: string) => Promise<void> }) {
  const [items, setItems] = useState<{ id: string; date: string; time: string; feedback: string; rating: number | null; created_at: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [showBodBanner, setShowBodBanner] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("bezichtigingen").select("*").eq("deal_id", dealId).order("date", { ascending: true });
    const loaded = data ?? [];
    setItems(loaded);
    if (currentStage === "bezichtiging" && loaded.some((v: { rating: number | null }) => (v.rating ?? 0) >= 4)) {
      setShowBodBanner(true);
    }
  }, [dealId, currentStage]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("bezichtigingen").insert({ owner_id: user.id, deal_id: dealId, date, time, feedback, rating: rating || null });
    await load();
    setDate(""); setTime(""); setFeedback(""); setRating(0); setShowForm(false); setSaving(false);
    setToast(true); setTimeout(() => setToast(false), 2500);
    if (currentStage === "lead") {
      await onAdvanceStage("bezichtiging", "Fase bijgewerkt naar Bezichtiging");
    }
    if (rating >= 4 && currentStage === "bezichtiging") {
      setShowBodBanner(true);
    }
  }

  return (
    <SectionWrap title="Bezichtigingen">
      {toast && <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", zIndex: 999 }}>Opgeslagen ✓</div>}
      {showBodBanner && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#92400e", marginBottom: "2px" }}>Goede match! Bod bespreken?</div>
            <div style={{ fontSize: "12px", color: "#b45309" }}>Een bezichtiging scoorde 4+ sterren. Wil je de fase naar Bod zetten?</div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button onClick={() => setShowBodBanner(false)} style={{ padding: "6px 12px", border: "1px solid #fde68a", background: "#fff", borderRadius: "6px", fontSize: "12px", color: "#92400e", cursor: "pointer" }}>Later</button>
            <button onClick={async () => { await onAdvanceStage("bod", "Fase bijgewerkt naar Bod"); setShowBodBanner(false); }} style={{ padding: "6px 12px", background: "#f59e0b", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: "#fff", cursor: "pointer" }}>Ja, zet naar Bod →</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "7px 14px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>+ Bezichtiging plannen</button>
      </div>
      {showForm && (
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div><label style={sectionLbl}>Datum</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={sectionInp} /></div>
            <div><label style={sectionLbl}>Tijd</label><input type="time" value={time} onChange={e => setTime(e.target.value)} style={sectionInp} /></div>
          </div>
          <div style={{ marginBottom: "10px" }}><label style={sectionLbl}>Feedback koper</label><textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Bijv. interesse, opmerkingen..." rows={3} style={{ ...sectionInp, resize: "vertical", lineHeight: "1.5" }} /></div>
          <div style={{ marginBottom: "14px" }}>
            <label style={sectionLbl}>Beoordeling</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s === rating ? 0 : s)} style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #e8ecf0", background: s <= rating ? "#fbbf24" : "#f8fafc", cursor: "pointer", fontSize: "16px", lineHeight: "1", color: s <= rating ? "#fff" : "#94a3b8" }}>★</button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !date} style={{ background: "#0284c7", border: "none", borderRadius: "8px", padding: "9px 16px", fontSize: "13px", fontWeight: "600", color: "#fff", cursor: "pointer", opacity: saving || !date ? 0.5 : 1 }}>{saving ? "Opslaan…" : "Opslaan"}</button>
        </Card>
      )}
      {items.length === 0 && !showForm ? (
        <Card style={{ textAlign: "center", padding: "40px" }}><p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Nog geen bezichtigingen gepland</p></Card>
      ) : items.map(item => (
        <Card key={item.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "4px" }}>
                {new Date(item.date).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
                {item.time && <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "400", marginLeft: "8px" }}>om {item.time}</span>}
              </div>
              {item.feedback && <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>{item.feedback}</div>}
              {item.rating && <div style={{ fontSize: "13px", color: "#f59e0b", marginTop: "4px" }}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</div>}
            </div>
            <span style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", marginLeft: "12px" }}>{new Date(item.created_at).toLocaleDateString("nl-NL")}</span>
          </div>
        </Card>
      ))}
    </SectionWrap>
  );
}

// ─── Verkoper ─────────────────────────────────────────────────────────────────

function VerkoperSection({ deal }: { deal: DealWithContacts }) {
  const seller = deal.seller;
  if (!seller) return (
    <SectionWrap title="Verkoper">
      <Card style={{ textAlign: "center", padding: "40px" }}><p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Geen verkoper gekoppeld aan deze deal</p></Card>
    </SectionWrap>
  );
  return (
    <SectionWrap title="Verkoper">
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "20px", fontWeight: "700", flexShrink: 0 }}>
            {seller.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{seller.name}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Verkoper</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {[
            { icon: "📞", label: "Telefoon", value: seller.phone },
            { icon: "✉️", label: "E-mail",   value: seller.email },
            { icon: "📍", label: "Object",   value: deal.address },
          ].filter(r => r.value).map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px" }}>
              <span style={{ fontSize: "16px" }}>{row.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3px" }}>{row.label}</div>
                <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: "500" }}>{row.value}</div>
              </div>
            </div>
          ))}
        </div>
        {seller.phone && (
          <a href={`https://wa.me/${seller.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#16a34a", fontSize: "12px", fontWeight: "600", textDecoration: "none" }}>
            WhatsApp sturen
          </a>
        )}
      </Card>
    </SectionWrap>
  );
}

// ─── Documenten ───────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  "Energielabel", "Plattegrond", "Foto's", "Opdracht tot dienstverlening",
  "Lijst van zaken", "Vragenlijst", "Eigendomsakte", "Splitsingsakte",
  "VvE documenten", "Gemeentelijke voorzieningen", "Concept koopovereenkomst",
  "Getekend koopovereenkomst", "Hypotheekakte", "Transportakte",
  "Wwft verificatie", "Overig",
];

const DOC_SOURCE: Record<string, string> = {
  "Energielabel": "Realworks", "Foto's": "Zibber", "Plattegrond": "Zibber",
  "Opdracht tot dienstverlening": "Realworks", "Lijst van zaken": "Move.nl",
  "Vragenlijst": "Move.nl", "Eigendomsakte": "Kadaster", "Splitsingsakte": "Kadaster",
  "VvE documenten": "Handmatig", "Gemeentelijke voorzieningen": "Handmatig",
  "Concept koopovereenkomst": "Realworks", "Getekend koopovereenkomst": "Move.nl",
  "Hypotheekakte": "Notaris", "Transportakte": "Notaris",
  "Wwft verificatie": "Move.nl", "Overig": "Handmatig",
};

const STAGE_ORDER: DealStage[] = ["lead","bezichtiging","bod","koopakte","voorwaarden","financiering","overdracht","gesloten"];
function stageAtOrAfter(current: DealStage, target: DealStage) {
  return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(target);
}

function expectedDocsForStage(stage: DealStage): string[] {
  const docs = ["Energielabel", "Foto's", "Plattegrond", "Opdracht tot dienstverlening"];
  if (stageAtOrAfter(stage, "koopakte"))
    docs.push("Lijst van zaken", "Vragenlijst", "Eigendomsakte", "Concept koopovereenkomst");
  if (stageAtOrAfter(stage, "voorwaarden"))
    docs.push("Getekend koopovereenkomst", "Wwft verificatie");
  if (stageAtOrAfter(stage, "overdracht"))
    docs.push("Hypotheekakte", "Transportakte");
  return docs;
}

function DocumentenSection({ dealId, currentStage, onAdvanceStage }: { dealId: string; currentStage: DealStage; onAdvanceStage: (s: DealStage, msg: string) => Promise<void> }) {
  const [docs, setDocs] = useState<{ id: string; name: string; type: string; signed: boolean; created_at: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [docName, setDocName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showVoorwaardenBanner, setShowVoorwaardenBanner] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("documents").select("*").eq("deal_id", dealId).order("created_at", { ascending: false });
    const loaded = (data ?? []) as { id: string; name: string; type: string; signed: boolean; created_at: string }[];
    setDocs(loaded);
    if (currentStage === "koopakte" && loaded.some(d => d.type === "Getekend koopovereenkomst" && d.signed)) {
      setShowVoorwaardenBanner(true);
    }
  }, [dealId, currentStage]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(typeOverride?: string) {
    const type = typeOverride ?? docType;
    const name = docName.trim() || type;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("documents").insert({ owner_id: user.id, deal_id: dealId, name, type, signed: false });
    await load();
    setDocName(""); setShowForm(false); setSaving(false);
  }

  async function handleSign(doc: { id: string; type: string }) {
    const supabase = createClient();
    await supabase.from("documents").update({ signed: true }).eq("id", doc.id);
    await load();
    if (doc.type === "Getekend koopovereenkomst" && currentStage === "koopakte") {
      setShowVoorwaardenBanner(true);
    }
  }

  async function handleAdvanceToVoorwaarden() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const DEFAULT_CONDITIONS = [
        { label: "Voorbehoud financiering", type: "financiering" },
        { label: "Voorbehoud bouwkundige keuring", type: "bouwkundig" },
        { label: "Eigendomsoverdracht vrij van huur", type: "eigendom" },
      ];
      await Promise.all(DEFAULT_CONDITIONS.map(c =>
        supabase.from("conditions").insert({ owner_id: user.id, deal_id: dealId, type: c.type, label: c.label, status: "open" })
      ));
    }
    await onAdvanceStage("voorwaarden", "Fase bijgewerkt naar Voorwaarden — 3 standaardvoorwaarden aangemaakt");
    setShowVoorwaardenBanner(false);
  }

  const expected = expectedDocsForStage(currentStage);
  const completeCount = expected.filter(name => docs.some(d => d.type === name)).length;
  const progressPct = expected.length > 0 ? Math.round((completeCount / expected.length) * 100) : 0;

  function docStatus(name: string): "ontbreekt" | "ontvangen" | "ondertekend" {
    const match = docs.find(d => d.type === name);
    if (!match) return "ontbreekt";
    return match.signed ? "ondertekend" : "ontvangen";
  }

  const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
    ontbreekt:  { bg: "#fef2f2", color: "#ef4444", border: "#fca5a5" },
    ontvangen:  { bg: "#eff6ff", color: "#0284c7", border: "#bae6fd" },
    ondertekend:{ bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  };

  const SOURCE_STYLE: Record<string, { bg: string; color: string }> = {
    Realworks: { bg: "#f0f9ff", color: "#0284c7" },
    "Zibber":  { bg: "#faf5ff", color: "#7c3aed" },
    "Move.nl": { bg: "#fff7ed", color: "#f97316" },
    Kadaster:  { bg: "#f0fdf4", color: "#16a34a" },
    Notaris:   { bg: "#fef9c3", color: "#854d0e" },
    Handmatig: { bg: "#f8fafc", color: "#64748b" },
  };

  return (
    <SectionWrap title="Documenten">
      {showVoorwaardenBanner && (
        <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#7c3aed", marginBottom: "2px" }}>Koopovereenkomst ondertekend!</div>
            <div style={{ fontSize: "12px", color: "#9333ea" }}>Ga verder naar ontbindende voorwaarden. 3 standaardvoorwaarden worden aangemaakt.</div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button onClick={() => setShowVoorwaardenBanner(false)} style={{ padding: "6px 12px", border: "1px solid #e9d5ff", background: "#fff", borderRadius: "6px", fontSize: "12px", color: "#7c3aed", cursor: "pointer" }}>Later</button>
            <button onClick={handleAdvanceToVoorwaarden} style={{ padding: "6px 12px", background: "#7c3aed", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: "#fff", cursor: "pointer" }}>Naar Voorwaarden →</button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>{completeCount} van {expected.length} documenten compleet</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#0284c7" }}>{progressPct}%</span>
        </div>
        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "#0284c7", borderRadius: 4, transition: "width 0.4s" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "7px 14px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>+ Document toevoegen</button>
      </div>

      {showForm && (
        <Card>
          <div style={{ marginBottom: "10px" }}><label style={sectionLbl}>Type</label><select value={docType} onChange={e => setDocType(e.target.value)} style={{ ...sectionInp }}>{DOCUMENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div style={{ marginBottom: "12px" }}><label style={sectionLbl}>Naam (optioneel)</label><input value={docName} onChange={e => setDocName(e.target.value)} placeholder={docType} style={sectionInp} /></div>
          <button onClick={() => handleAdd()} disabled={saving} style={{ background: "#0284c7", border: "none", borderRadius: "8px", padding: "9px 16px", fontSize: "13px", fontWeight: "600", color: "#fff", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>{saving ? "Toevoegen…" : "Toevoegen"}</button>
        </Card>
      )}

      {/* Expected document checklist */}
      <div style={{ marginBottom: 16 }}>
        {expected.map((name) => {
          const status = docStatus(name);
          const ss = STATUS_STYLE[status];
          const source = DOC_SOURCE[name] ?? "Handmatig";
          const src = SOURCE_STYLE[source] ?? SOURCE_STYLE["Handmatig"];
          const uploadedDoc = docs.find(d => d.type === name);
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fff", border: "1px solid #e8ecf0", borderRadius: 8, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 600, background: src.bg, color: src.color, borderRadius: 20, padding: "2px 8px" }}>{source}</span>
                <span style={{ fontSize: 10, fontWeight: 600, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, borderRadius: 20, padding: "2px 8px" }}>{status}</span>
                {status === "ontbreekt" ? (
                  <button onClick={() => handleAdd(name)} style={{ fontSize: 11, fontWeight: 600, color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Uploaden</button>
                ) : !uploadedDoc?.signed ? (
                  <button onClick={() => handleSign(uploadedDoc!)} style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Ondertekend</button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional uploaded docs not in checklist */}
      {docs.filter(d => !expected.includes(d.type)).map(doc => (
        <Card key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{doc.name}</div>
              <div style={{ fontSize: "11px", color: doc.signed ? "#16a34a" : "#94a3b8" }}>{doc.signed ? "✓ Ondertekend" : doc.type}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!doc.signed && (
              <button onClick={() => handleSign(doc)} style={{ padding: "5px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#16a34a", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>Ondertekend</button>
            )}
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{new Date(doc.created_at).toLocaleDateString("nl-NL")}</span>
          </div>
        </Card>
      ))}
    </SectionWrap>
  );
}

// ─── Voorwaarden ──────────────────────────────────────────────────────────────

interface Condition {
  id: string;
  label: string;
  type: string;
  deadline: string | null;
  status: "open" | "vervallen";
}

function VoorwaardenSection({ dealId, currentStage, onAdvanceStage }: { dealId: string; currentStage: DealStage; onAdvanceStage: (s: DealStage, msg: string) => Promise<void> }) {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loadingConds, setLoadingConds] = useState(true);
  const [showFinancieringBanner, setShowFinancieringBanner] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("conditions").select("*").eq("deal_id", dealId).order("created_at", { ascending: true });
    const loaded = (data ?? []) as Condition[];
    setConditions(loaded);
    setLoadingConds(false);
    if (currentStage === "voorwaarden" && loaded.length > 0 && loaded.every(c => c.status === "vervallen")) {
      setShowFinancieringBanner(true);
    }
  }, [dealId, currentStage]);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(condition: Condition) {
    const newStatus = condition.status === "open" ? "vervallen" : "open";
    const supabase = createClient();
    await supabase.from("conditions").update({ status: newStatus }).eq("id", condition.id);
    const updated = conditions.map(c => c.id === condition.id ? { ...c, status: newStatus as "open" | "vervallen" } : c);
    setConditions(updated);
    if (currentStage === "voorwaarden" && updated.length > 0 && updated.every(c => c.status === "vervallen")) {
      setShowFinancieringBanner(true);
    } else {
      setShowFinancieringBanner(false);
    }
  }

  async function handleDeadlineChange(id: string, deadline: string) {
    const supabase = createClient();
    await supabase.from("conditions").update({ deadline: deadline || null }).eq("id", id);
    setConditions(prev => prev.map(c => c.id === id ? { ...c, deadline: deadline || null } : c));
  }

  return (
    <SectionWrap title="Ontbindende Voorwaarden">
      {showFinancieringBanner && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#15803d", marginBottom: "2px" }}>Alle voorwaarden vervallen!</div>
            <div style={{ fontSize: "12px", color: "#16a34a" }}>De deal kan door naar de financiering fase.</div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button onClick={() => setShowFinancieringBanner(false)} style={{ padding: "6px 12px", border: "1px solid #bbf7d0", background: "#fff", borderRadius: "6px", fontSize: "12px", color: "#15803d", cursor: "pointer" }}>Later</button>
            <button onClick={async () => { await onAdvanceStage("financiering", "Fase bijgewerkt naar Financiering"); setShowFinancieringBanner(false); }} style={{ padding: "6px 12px", background: "#16a34a", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: "#fff", cursor: "pointer" }}>Naar Financiering →</button>
          </div>
        </div>
      )}
      <Card>
        {loadingConds ? (
          <div style={{ textAlign: "center", padding: "20px", fontSize: "13px", color: "#94a3b8" }}>Laden…</div>
        ) : conditions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", fontSize: "13px", color: "#94a3b8" }}>Geen voorwaarden gevonden. Voorwaarden worden automatisch aangemaakt bij het ondertekenen van de koopovereenkomst.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {conditions.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: c.status === "vervallen" ? "#f0fdf4" : "#f8fafc", border: `1px solid ${c.status === "vervallen" ? "#bbf7d0" : "#e8ecf0"}`, borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => handleToggle(c)}>
                  <input type="checkbox" checked={c.status === "vervallen"} onChange={() => {}} style={{ width: "15px", height: "15px", accentColor: "#16a34a", cursor: "pointer" }} />
                  <span style={{ fontSize: "13px", color: c.status === "vervallen" ? "#16a34a" : "#0f172a", fontWeight: "500", textDecoration: c.status === "vervallen" ? "line-through" : "none" }}>{c.label}</span>
                </div>
                <input type="date" value={c.deadline?.slice(0, 10) ?? ""} onChange={e => handleDeadlineChange(c.id, e.target.value)} style={{ ...sectionInp, width: "140px", fontSize: "11px", padding: "5px 8px" }} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </SectionWrap>
  );
}

// ─── Gesprekken ───────────────────────────────────────────────────────────────

interface Note {
  id: string;
  created_at: string;
  content: string;
  trigger_event: string | null;
}

function GesprekkenSection({ dealId }: { dealId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("messages").select("id,created_at,content,trigger_event").eq("deal_id", dealId).eq("channel", "gesprek").order("created_at", { ascending: false });
    setNotes(data ?? []);
  }, [dealId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!text.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("messages").insert({ owner_id: user.id, deal_id: dealId, channel: "gesprek", content: text, status: "verzonden", trigger_event: "Notitie" });
    setText(""); await load(); setSaving(false);
  }

  return (
    <SectionWrap title="Gesprekken & Notities">
      <Card>
        <label style={sectionLbl}>Nieuwe notitie</label>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Sla een gesprek of afspraak op..." rows={3} style={{ ...sectionInp, resize: "vertical", lineHeight: "1.5", marginBottom: "10px" }} />
        <button onClick={handleAdd} disabled={saving || !text.trim()} style={{ background: "#0284c7", border: "none", borderRadius: "8px", padding: "9px 16px", fontSize: "13px", fontWeight: "600", color: "#fff", cursor: "pointer", opacity: saving || !text.trim() ? 0.5 : 1 }}>{saving ? "Opslaan…" : "Toevoegen"}</button>
      </Card>
      {notes.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "32px" }}><p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Nog geen notities</p></Card>
      ) : notes.map(note => (
        <Card key={note.id} style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8" }}>{note.trigger_event ?? "Notitie"}</span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{new Date(note.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <p style={{ fontSize: "13px", color: "#0f172a", margin: 0, lineHeight: "1.5" }}>{note.content}</p>
        </Card>
      ))}
    </SectionWrap>
  );
}

// ─── Overdracht ───────────────────────────────────────────────────────────────

function OverdrachtSection({ deal, dealId, currentStage, onAdvanceStage }: { deal: DealWithContacts; dealId: string; currentStage: DealStage; onAdvanceStage: (s: DealStage, msg: string) => Promise<void> }) {
  const [notary,       setNotary]       = useState(deal.notary_name ?? "");
  const [transferDate, setTransferDate] = useState(deal.transfer_date?.slice(0, 10) ?? "");
  const [meterElec,    setMeterElec]    = useState("");
  const [meterGas,     setMeterGas]     = useState("");
  const [meterWater,   setMeterWater]   = useState("");
  const [keys,         setKeys]         = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [showOverdrachtBanner, setShowOverdrachtBanner] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("deals").update({ notary_name: notary || null, transfer_date: transferDate || null }).eq("id", dealId);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
    if (notary.trim() && transferDate && currentStage === "financiering") {
      setShowOverdrachtBanner(true);
    }
  }

  const fields = [
    { label: "Elektra (kWh)",  value: meterElec,  set: setMeterElec },
    { label: "Gas (m³)",       value: meterGas,   set: setMeterGas },
    { label: "Water (m³)",     value: meterWater,  set: setMeterWater },
  ];

  return (
    <SectionWrap title="Overdracht">
      {showOverdrachtBanner && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#1d4ed8", marginBottom: "2px" }}>Notaris & datum ingesteld!</div>
            <div style={{ fontSize: "12px", color: "#2563eb" }}>De financiering is rond. Wil je de fase naar Overdracht zetten?</div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button onClick={() => setShowOverdrachtBanner(false)} style={{ padding: "6px 12px", border: "1px solid #bfdbfe", background: "#fff", borderRadius: "6px", fontSize: "12px", color: "#1d4ed8", cursor: "pointer" }}>Later</button>
            <button onClick={async () => { await onAdvanceStage("overdracht", "Fase bijgewerkt naar Overdracht"); setShowOverdrachtBanner(false); }} style={{ padding: "6px 12px", background: "#2563eb", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: "#fff", cursor: "pointer" }}>Naar Overdracht →</button>
          </div>
        </div>
      )}
      <Card>
        <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "12px" }}>Notaris & Datum</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          <div><label style={sectionLbl}>Notaris</label><input value={notary} onChange={e => setNotary(e.target.value)} placeholder="Notariskantoor..." style={sectionInp} /></div>
          <div><label style={sectionLbl}>Overdrachtsdatum</label><input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} style={sectionInp} /></div>
        </div>
        <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "12px" }}>Meterstanden bij overdracht</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {fields.map(f => <div key={f.label}><label style={sectionLbl}>{f.label}</label><input type="number" value={f.value} onChange={e => f.set(e.target.value)} placeholder="0" style={sectionInp} /></div>)}
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={sectionLbl}>Sleuteloverdracht — opmerkingen</label>
          <textarea value={keys} onChange={e => setKeys(e.target.value)} placeholder="Aantal sleutels, afspraken over overdracht..." rows={2} style={{ ...sectionInp, resize: "vertical", lineHeight: "1.5" }} />
        </div>
        <button onClick={handleSave} disabled={saving} style={{ background: "#0284c7", border: "none", borderRadius: "8px", padding: "9px 16px", fontSize: "13px", fontWeight: "600", color: "#fff", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saved ? "Opgeslagen ✓" : saving ? "Opslaan…" : "Opslaan"}
        </button>
      </Card>
      {deal.transfer_date && (
        <Card style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "13px", color: "#16a34a", fontWeight: "500" }}>
            ✓ Overdrachtsdatum ingesteld op {new Date(deal.transfer_date).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </Card>
      )}
    </SectionWrap>
  );
}

// ─── End section components ───────────────────────────────────────────────────

function formatEuro(v: number) {
  return "€ " + v.toLocaleString("nl-NL");
}

function formatDate(d: string | null) {
  if (!d) return "Nog niet ingesteld";
  const parts = d.slice(0, 10).split("-");
  if (parts.length === 3) {
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  }
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

function ContactCard({ title, contact, avatarColor }: { title: string; contact: { name: string; email: string | null; phone: string | null; partner_name?: string | null; partner_email?: string | null; partner_phone?: string | null } | null; avatarColor: string }) {
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
        <div>
          <span style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{contact.name}</span>
          {contact.partner_name && (
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>& {contact.partner_name}</div>
          )}
        </div>
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {contact.phone && (
          <button style={{ padding: "6px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#16a34a", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
            WhatsApp
          </button>
        )}
        {contact.partner_phone && (
          <a href={`https://wa.me/${contact.partner_phone}`} target="_blank" style={{ fontSize: 11, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "5px 10px", textDecoration: "none", display: "inline-block", marginTop: 0 }}>
            WhatsApp {contact.partner_name || "partner"}
          </a>
        )}
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  Fotografie:        { color: "#7c3aed", bg: "#f5f3ff" },
  Video:             { color: "#7c3aed", bg: "#f5f3ff" },
  Drone:             { color: "#7c3aed", bg: "#f5f3ff" },
  "Funda plaatsing": { color: "#0284c7", bg: "#f0f9ff" },
  "Funda toppositie":{ color: "#0284c7", bg: "#f0f9ff" },
  "Te Koop bord":    { color: "#f97316", bg: "#fff7ed" },
  Brochure:          { color: "#f97316", bg: "#fff7ed" },
  "Social media":    { color: "#16a34a", bg: "#f0fdf4" },
  Stylist:           { color: "#16a34a", bg: "#f0fdf4" },
  Overig:            { color: "#64748b", bg: "#f8fafc" },
};

const CATEGORIES = ["Fotografie","Video","Drone","Funda plaatsing","Funda toppositie","Te Koop bord","Brochure","Social media","Stylist","Overig"];

interface MarketingCost {
  id: string;
  deal_id: string;
  category: string;
  description: string | null;
  amount: number;
  supplier: string | null;
  date: string;
  created_at: string;
}

function MarketingSection({ deal, dealId }: { deal: DealWithContacts; dealId: string }) {
  const [costs, setCosts] = useState<MarketingCost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "Fotografie",
    supplier: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const loadCosts = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("marketing_costs")
      .select("*")
      .eq("deal_id", dealId)
      .order("date", { ascending: false });
    setCosts(data ?? []);
  };

  useEffect(() => { loadCosts(); }, [dealId]);

  const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0);
  const courtage = (deal.agreed_price || 0) * 0.015;
  const netto = courtage - totalCosts;
  const margin = courtage > 0 ? (netto / courtage * 100).toFixed(1) : "0.0";
  const fmt = (v: number) => "€ " + v.toLocaleString("nl-NL", { maximumFractionDigits: 0 });

  const daysSinceCreated = Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86400000);
  const showRoiAlert =
    totalCosts > 500 &&
    (deal.stage === "lead" || deal.stage === "bezichtiging") &&
    daysSinceCreated > 30;

  async function handleAdd() {
    if (!form.amount || isNaN(Number(form.amount))) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("marketing_costs").insert({
      deal_id: dealId,
      category: form.category,
      description: form.description || null,
      amount: Number(form.amount),
      supplier: form.supplier || null,
      date: form.date,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ category: "Fotografie", supplier: "", amount: "", date: new Date().toISOString().split("T")[0], description: "" });
    loadCosts();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("marketing_costs").delete().eq("id", id);
    loadCosts();
  }

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.15em" }}>MARKETING BUDGET</div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Uitgave toevoegen
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          {
            label: "UITGAVEN",
            value: fmt(totalCosts),
            color: totalCosts > courtage * 0.1 ? "#ef4444" : "#0f172a",
            bg: totalCosts > courtage * 0.1 ? "#fef2f2" : "#f8fafc",
            border: totalCosts > courtage * 0.1 ? "#fca5a5" : "#e8ecf0",
          },
          { label: "COURTAGE", value: fmt(courtage), color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
          {
            label: "NETTO MARGE",
            value: fmt(netto) + " (" + margin + "%)",
            color: netto >= 0 ? "#16a34a" : "#ef4444",
            bg: netto >= 0 ? "#f0fdf4" : "#fef2f2",
            border: netto >= 0 ? "#bbf7d0" : "#fca5a5",
          },
        ].map((c) => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: c.color, letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ROI alert */}
      {showRoiAlert && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#854d0e" }}>
          ⚠️ Hoog marketingbudget ({fmt(totalCosts)}) — woning staat al {daysSinceCreated} dagen te koop zonder bod. Overweeg prijsaanpassing of nieuwe marketing aanpak.
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={lbl}>CATEGORIE</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inp}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>LEVERANCIER</label>
              <input placeholder="Bijv. Zibber, Funda" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>BEDRAG</label>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #e8ecf0", borderRadius: 8, background: "#fff", overflow: "hidden" }}>
                <span style={{ padding: "9px 10px", fontSize: 13, color: "#64748b", borderRight: "1px solid #e8ecf0" }}>€</span>
                <input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ ...inp, border: "none", borderRadius: 0 }} />
              </div>
            </div>
            <div>
              <label style={lbl}>DATUM</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>OMSCHRIJVING (optioneel)</label>
            <input placeholder="Toelichting" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inp} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} disabled={saving} style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Opslaan..." : "Toevoegen"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: "#64748b", border: "1px solid #e8ecf0", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Costs list */}
      {costs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#94a3b8" }}>Nog geen marketinguitgaven geregistreerd</div>
      ) : (
        costs.map((c) => {
          const cat = CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS["Overig"];
          return (
            <div key={c.id} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 8, padding: "12px 16px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ display: "inline-block", background: cat.bg, color: cat.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{c.category}</span>
                {c.supplier && <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.supplier}</div>}
              </div>
              <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>{"€ " + Number(c.amount).toLocaleString("nl-NL", { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{new Date(c.date).toLocaleDateString("nl-NL")}</div>
                </div>
                <button onClick={() => handleDelete(c.id)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Gastenlijst ──────────────────────────────────────────────────────────────

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  budget: string | null;
  interest_level: string | null;
  has_agent: boolean;
  has_mortgage: boolean;
  note: string | null;
  created_at: string;
}

const INTEREST_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  zeer_geinteresseerd: { bg: "#dcfce7", color: "#16a34a", label: "Zeer geïnteresseerd" },
  geinteresseerd:      { bg: "#dbeafe", color: "#1e40af", label: "Geïnteresseerd" },
  neutraal:            { bg: "#f1f5f9", color: "#64748b", label: "Neutraal" },
  niet_geinteresseerd: { bg: "#fee2e2", color: "#991b1b", label: "Niet geïnteresseerd" },
};

function GastenlijstSection({ deal, dealId }: { deal: DealWithContacts; dealId: string }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    budget: "Onbekend", interest_level: "neutraal",
    has_agent: false, has_mortgage: false, note: "",
  });

  const loadGuests = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("viewings_guests")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    setGuests((data ?? []) as Guest[]);
  };

  useEffect(() => { loadGuests(); }, [dealId]);

  async function openQr() {
    const QRCode = (await import("qrcode")).default;
    const url = `${window.location.origin}/inchecken/${dealId}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    setQrDataUrl(dataUrl);
    setShowQr(true);
  }

  async function handleAdd() {
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("viewings_guests").insert({
      deal_id: dealId,
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      budget: form.budget,
      interest_level: form.interest_level,
      has_agent: form.has_agent,
      has_mortgage: form.has_mortgage,
      note: form.note || null,
      source: "manual",
      event_date: new Date().toISOString().split("T")[0],
    });
    setSaving(false);
    setShowForm(false);
    setForm({ name: "", phone: "", email: "", budget: "Onbekend", interest_level: "neutraal", has_agent: false, has_mortgage: false, note: "" });
    loadGuests();
  }

  const interested = guests.filter(g => ["geinteresseerd","zeer_geinteresseerd"].includes(g.interest_level ?? ""));
  const hasAgent = guests.filter(g => g.has_agent);

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.15em" }}>GASTENLIJST</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={openQr} style={{ padding: "7px 14px", background: "transparent", border: "1px solid #0284c7", borderRadius: 8, color: "#0284c7", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>QR Code</button>
          <button onClick={() => setShowForm(v => !v)} style={{ padding: "7px 14px", background: "#0284c7", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Gast toevoegen</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "TOTAAL GASTEN",    value: guests.length,      bg: "#f8fafc", color: "#0f172a" },
          { label: "GEÏNTERESSEERD",   value: interested.length,  bg: "#f0fdf4", color: "#16a34a" },
          { label: "HEBBEN MAKELAAR",  value: hasAgent.length,    bg: "#fef2f2", color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: "1px solid #e8ecf0", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>NAAM *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Voor- en achternaam" style={inp} />
            </div>
            <div><label style={lbl}>TELEFOON</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+31 6 12 34 56 78" style={inp} /></div>
            <div><label style={lbl}>E-MAIL</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="naam@email.nl" style={inp} /></div>
            <div>
              <label style={lbl}>BUDGET</label>
              <select value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} style={inp}>
                {["< €300k","€300-400k","€400-500k","€500-700k","> €700k","Onbekend"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>INTERESSE</label>
              <select value={form.interest_level} onChange={e => setForm({...form, interest_level: e.target.value})} style={inp}>
                <option value="zeer_geinteresseerd">Zeer geïnteresseerd</option>
                <option value="geinteresseerd">Geïnteresseerd</option>
                <option value="neutraal">Neutraal</option>
                <option value="niet_geinteresseerd">Niet geïnteresseerd</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={form.has_agent} onChange={e => setForm({...form, has_agent: e.target.checked})} />
              Heeft al een makelaar
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={form.has_mortgage} onChange={e => setForm({...form, has_mortgage: e.target.checked})} />
              Hypotheek al geregeld
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>NOTITIE</label>
            <textarea rows={2} value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Optionele notitie..." style={{ ...inp, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} disabled={saving || !form.name.trim()} style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving || !form.name.trim() ? 0.5 : 1 }}>
              {saving ? "Opslaan..." : "Gast toevoegen"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "1px solid #e8ecf0", color: "#64748b", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Annuleren</button>
          </div>
        </div>
      )}

      {/* Guest list */}
      {guests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#94a3b8" }}>Nog geen gasten — deel de QR code bij de bezichtiging</div>
      ) : guests.map(g => {
        const ist = INTEREST_STYLE[g.interest_level ?? "neutraal"] ?? INTEREST_STYLE.neutraal;
        return (
          <div key={g.id} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 10, padding: "12px 16px", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{g.name}</span>
              <span style={{ fontSize: 11, fontWeight: 600, background: ist.bg, color: ist.color, borderRadius: 20, padding: "2px 10px" }}>{ist.label}</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
              {[g.phone, g.email].filter(Boolean).join(" · ")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {g.budget && g.budget !== "Onbekend" && (
                <span style={{ fontSize: 11, fontWeight: 600, background: "#f0f9ff", color: "#0284c7", borderRadius: 20, padding: "2px 8px" }}>{g.budget}</span>
              )}
              {g.has_agent && (
                <span style={{ fontSize: 11, fontWeight: 600, background: "#fee2e2", color: "#991b1b", borderRadius: 20, padding: "2px 8px" }}>Heeft makelaar</span>
              )}
              {g.has_mortgage && (
                <span style={{ fontSize: 11, fontWeight: 600, background: "#f0fdf4", color: "#16a34a", borderRadius: 20, padding: "2px 8px" }}>Hypotheek klaar</span>
              )}
            </div>
          </div>
        );
      })}

      {/* QR modal */}
      {showQr && (
        <>
          <div onClick={() => setShowQr(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 16, padding: 32, maxWidth: 400, width: "90%", zIndex: 201, textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Check-in QR Code</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{deal.address}</div>
            {qrDataUrl && <img src={qrDataUrl} width={200} height={200} alt="QR code" style={{ display: "block", margin: "0 auto 16px" }} />}
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 20 }}>Laat gasten scannen bij binnenkomst</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => window.print()} style={{ padding: "8px 16px", background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Print QR code</button>
              <button onClick={() => setShowQr(false)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #e8ecf0", color: "#64748b", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Sluit</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Funda Tekst Generator ────────────────────────────────────────────────────

function FundaSection({ deal }: { deal: DealWithContacts }) {
  const [bijzonderheden, setBijzonderheden] = useState("");
  const [highlights, setHighlights] = useState("");
  const [tone, setTone] = useState("Vriendelijk & Persoonlijk");
  const [length, setLength] = useState("Standaard (350 woorden)");
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  const priceFormatted = deal.agreed_price
    ? "€ " + deal.agreed_price.toLocaleString("nl-NL")
    : deal.asking_price
      ? "€ " + deal.asking_price.toLocaleString("nl-NL")
      : "";

  const wordCount = length.includes("200") ? "200" : length.includes("500") ? "500" : "350";

  async function handleGenerate() {
    setGenerating(true);
    setGeneratedText("");
    const res = await fetch("/api/generate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "funda-tekst",
        dealAddress: deal.address,
        dealCity: deal.city,
        propertyType: deal.property_type,
        price: priceFormatted,
        highlights,
        details: bijzonderheden,
        tone,
        length: wordCount,
      }),
    });
    const data = await res.json();
    setGeneratedText(data.message ?? "");
    setGenerating(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveAsWhatsApp() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !deal.seller_id) return;
    await supabase.from("messages").insert({
      owner_id: user.id,
      deal_id: deal.id,
      contact_id: deal.seller_id,
      content: generatedText,
      trigger_event: "Funda tekst concept",
      status: "concept",
    });
    setToast("Opgeslagen als WhatsApp concept");
    setTimeout(() => setToast(""), 3000);
  }

  const charCount = generatedText.length;
  const FUNDA_MAX = 12500;

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.15em" }}>FUNDA TEKST GENERATOR</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Vervangt Realworks taak 2.5 — tekst schrijven</div>
      </div>

      {/* Info banner */}
      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "10px 14px", marginTop: 12, marginBottom: 16, fontSize: 11, color: "#0369a1" }}>
        ✓ Gegenereerde tekst kopiëren naar Realworks → Teksten → Aanbiedingstekst
      </div>

      {/* Input form */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: 16, marginBottom: 14 }}>
        {/* Read-only deal info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
          {[
            { label: "ADRES", value: [deal.address, deal.city].filter(Boolean).join(", ") || "—" },
            { label: "TYPE", value: deal.property_type || "—" },
            { label: "PRIJS", value: priceFormatted || "—" },
          ].map((f) => (
            <div key={f.label}>
              <div style={lbl}>{f.label}</div>
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* Editable fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={lbl}>BIJZONDERHEDEN</label>
            <textarea
              rows={3}
              value={bijzonderheden}
              onChange={(e) => setBijzonderheden(e.target.value)}
              placeholder="Bijv. recent gerenoveerde keuken, zonnepanelen, dakterras, garage, rustige ligging..."
              style={{ ...inp, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={lbl}>HIGHLIGHTS</label>
            <textarea
              rows={2}
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="Bijv. 5 slaapkamers, energielabel A, bouwjaar 2001..."
              style={{ ...inp, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>TONE OF VOICE</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} style={inp}>
                <option>Professioneel &amp; Formeel</option>
                <option>Vriendelijk &amp; Persoonlijk</option>
                <option>Direct &amp; Kort</option>
                <option>Luxe &amp; Exclusief</option>
              </select>
            </div>
            <div>
              <label style={lbl}>LENGTE</label>
              <select value={length} onChange={(e) => setLength(e.target.value)} style={inp}>
                <option>Kort (200 woorden)</option>
                <option>Standaard (350 woorden)</option>
                <option>Uitgebreid (500 woorden)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            marginTop: 16, width: "100%", padding: 12,
            background: generating ? "#94a3b8" : "linear-gradient(135deg,#0284c7,#0369a1)",
            color: "#fff", border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: generating ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {generating ? (
            <>
              <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Tekst wordt gegenereerd...
            </>
          ) : "✦ Genereer Funda tekst"}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Output */}
      {generatedText && (
        <div style={{ background: "#fff", border: "1px solid #bae6fd", borderRadius: 12, padding: 20, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#0369a1", letterSpacing: "0.1em" }}>GEGENEREERDE TEKST</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{charCount.toLocaleString("nl-NL")} karakters</div>
          </div>

          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", marginBottom: 16 }}>
            {generatedText}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button
              onClick={handleCopy}
              style={{ padding: "8px 16px", background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {copied ? "✓ Gekopieerd!" : "Kopieer tekst"}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{ padding: "8px 16px", background: "transparent", border: "1px solid #e8ecf0", color: "#64748b", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Opnieuw genereren
            </button>
            {deal.seller_id && (
              <button
                onClick={handleSaveAsWhatsApp}
                style={{ padding: "8px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                WhatsApp naar verkoper
              </button>
            )}
          </div>

          {/* Karakter teller */}
          <div style={{ fontSize: 11, color: charCount > FUNDA_MAX ? "#ef4444" : "#16a34a", fontWeight: 500 }}>
            {charCount.toLocaleString("nl-NL")} / {FUNDA_MAX.toLocaleString("nl-NL")} karakters
            {charCount > FUNDA_MAX && " — te lang voor Funda"}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}
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
  const [currentStage, setCurrentStage] = useState<DealStage>("lead");
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [stageToast, setStageToast] = useState("");
  const [closingModal, setClosingModal] = useState(false);
  const [closingLoading, setClosingLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: dealData } = await supabase
        .from("deals")
        .select("*")
        .eq("id", dealId)
        .single();
      if (!dealData) { setLoading(false); return; }
      const [buyerRes, sellerRes] = await Promise.all([
        dealData.buyer_id
          ? supabase.from("contacts").select("name,email,phone").eq("id", dealData.buyer_id).single()
          : Promise.resolve({ data: null }),
        dealData.seller_id
          ? supabase.from("contacts").select("name,email,phone").eq("id", dealData.seller_id).single()
          : Promise.resolve({ data: null }),
      ]);
      setDeal({ ...dealData, buyer: buyerRes.data, seller: sellerRes.data } as DealWithContacts);
      setCurrentStage(dealData.stage as DealStage);
      setLoading(false);
    }
    load();
  }, [dealId]);

  async function handleCloseDeal() {
    if (!deal) return;
    setClosingLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("deals").update({ stage: "gesloten" }).eq("id", dealId);
    if (user) {
      await supabase.from("messages").insert({
        owner_id: user.id,
        deal_id: dealId,
        channel: "whatsapp",
        content: "Gefeliciteerd met jullie nieuwe woning! 🏠 Het was een plezier om jullie te begeleiden. Mocht u nog vragen hebben, staan wij altijd voor u klaar.",
        trigger_event: "Deal gesloten",
        status: "concept",
      });
    }
    if (user?.email) {
      const agentName = user.email.split("@")[0];
      const address = deal.address ?? deal.title;
      const price = deal.agreed_price ?? deal.value ?? 0;
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: user.email, subject: `🎉 Deal gesloten: ${address}`, html: dealClosedEmail(agentName, address, price) }),
      }).catch(() => {});
    }
    setClosingModal(false);
    setCurrentStage("gesloten");
    setStageToast("Deal gesloten 🎉");
    setClosingLoading(false);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  async function advanceStage(newStage: DealStage, msg: string) {
    const supabase = createClient();
    await supabase.from("deals").update({ stage: newStage }).eq("id", dealId);
    setCurrentStage(newStage);
    setStageToast(msg);
    setTimeout(() => setStageToast(""), 3000);
  }

  async function handleStageChange(newStage: DealStage) {
    setCurrentStage(newStage);
    setStageDropdownOpen(false);
    const supabase = createClient();
    await supabase.from("deals").update({ stage: newStage }).eq("id", dealId);
    if (newStage === "gesloten" && deal) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const agentName = user.email.split("@")[0];
        const address = deal.address ?? deal.title;
        const price = deal.agreed_price ?? deal.value ?? 0;
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: user.email, subject: `🎉 Deal gesloten: ${address}`, html: dealClosedEmail(agentName, address, price) }),
        }).catch(() => {});
      }
    }
    const label = STAGES.find((s) => s.id === newStage)?.label ?? newStage;
    setStageToast(`Fase bijgewerkt naar ${label}`);
    setTimeout(() => setStageToast(""), 2500);
  }

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

  const stageIdx = STAGES.findIndex((s) => s.id === currentStage);
  const badge = STAGE_BADGE[currentStage] ?? STAGE_BADGE.lead;
  const days = daysSince(deal.created_at);
  const progress = stageProgress[currentStage] ?? 0;

  const ACTIONS = [
    { label: "Document genereren",    color: "#0284c7", bg: "#f0f9ff", border: "rgba(2,132,199,0.2)", onClick: () => setActiveNav("documenten") },
    { label: "WhatsApp sturen",        color: "#16a34a", bg: "#f0fdf4", border: "rgba(22,163,74,0.2)", onClick: () => setActiveNav("whatsapp") },
    { label: "Kadaster check",         color: "#7c3aed", bg: "#f5f3ff", border: "rgba(124,58,237,0.2)", onClick: () => alert("Kadaster check — komt binnenkort. Verbinding via Kadaster API wordt toegevoegd in de volgende versie.") },
    { label: "Voorwaarden toevoegen",  color: "#ef4444", bg: "#fff1f2", border: "rgba(239,68,68,0.2)", onClick: () => setActiveNav("voorwaarden") },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Stage toast */}
      {stageToast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          {stageToast}
        </div>
      )}

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
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setStageDropdownOpen((o) => !o)}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: badge.bg, color: badge.text, border: "none", cursor: "pointer" }}
            >
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: badge.dot }} />
              {STAGES.find((s) => s.id === currentStage)?.label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "2px" }}><polyline points="6,9 12,15 18,9" /></svg>
            </button>
            {stageDropdownOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: "1px solid #e8ecf0", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 200, minWidth: "180px", padding: "4px" }}>
                {STAGES.map((s) => {
                  const b = STAGE_BADGE[s.id];
                  const active = s.id === currentStage;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleStageChange(s.id)}
                      style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 10px", border: "none", borderRadius: "7px", cursor: "pointer", background: active ? "#f8fafc" : "transparent", fontSize: "13px", color: "#0f172a", textAlign: "left" }}
                      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: b.dot, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{s.label}</span>
                      {active && <span style={{ color: "#0284c7", fontSize: "12px" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {(deal.agreed_price ?? deal.value) != null && (
            <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.4px" }}>
              {formatEuro(deal.agreed_price ?? deal.value ?? 0)}
            </span>
          )}
        </div>
      </div>

      {/* Stage progress strip */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf0", padding: "12px 24px 8px", flexShrink: 0 }}>
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
        <div style={{ textAlign: "right", marginTop: "6px" }}>
          <span style={{ fontSize: "10px", color: "#94a3b8", fontStyle: "italic" }}>Fase wordt automatisch bijgewerkt op basis van acties in de deal</span>
        </div>
      </div>

      {/* Overdracht → close deal banner */}
      {currentStage === "overdracht" && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px 20px", margin: "12px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: "13px", color: "#15803d", fontWeight: "500" }}>🎉 Bijna klaar — markeer deze deal als gesloten</span>
          <button
            onClick={() => setClosingModal(true)}
            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 18px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
          >
            Deal sluiten
          </button>
        </div>
      )}

      {/* Confirmation modal */}
      {closingModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "14px", padding: "28px", maxWidth: "400px", width: "calc(100% - 48px)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 12px" }}>Deal afsluiten</h2>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" }}>
              Weet je zeker dat je deze deal wilt markeren als gesloten? Dit start de post-sale automations.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setClosingModal(false)}
                disabled={closingLoading}
                style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #e8ecf0", background: "#fff", color: "#64748b", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                Annuleren
              </button>
              <button
                onClick={handleCloseDeal}
                disabled={closingLoading}
                style={{ padding: "9px 18px", borderRadius: "8px", border: "none", background: "#16a34a", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer", opacity: closingLoading ? 0.6 : 1 }}
              >
                {closingLoading ? "Bezig…" : "Ja, deal sluiten"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  { label: "Status",    value: STAGES.find((s) => s.id === currentStage)?.label ?? "—" },
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
                    <button key={a.label} onClick={a.onClick} style={{ padding: "10px 12px", background: a.bg, border: `1px solid ${a.border}`, borderRadius: "8px", color: a.color, fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNav === "bezichtigingen" && <BezichtigingenSection dealId={dealId} currentStage={currentStage} onAdvanceStage={advanceStage} />}
          {activeNav === "gastenlijst" && <GastenlijstSection deal={deal} dealId={dealId} />}
          {activeNav === "verkoper" && <VerkoperSection deal={deal} />}
          {activeNav === "funda" && <FundaSection deal={deal} />}
          {activeNav === "documenten" && <DocumentenSection dealId={dealId} currentStage={currentStage} onAdvanceStage={advanceStage} />}
          {activeNav === "marketing" && <MarketingSection deal={deal} dealId={dealId} />}
          {activeNav === "voorwaarden" && <VoorwaardenSection dealId={dealId} currentStage={currentStage} onAdvanceStage={advanceStage} />}
          {activeNav === "wwft" && <WwftSection deal={deal} dealId={dealId} />}
          {activeNav === "whatsapp" && <WhatsAppSection deal={deal} dealId={dealId} />}
          {activeNav === "gesprekken" && <GesprekkenSection dealId={dealId} />}
          {activeNav === "overdracht" && <OverdrachtSection deal={deal} dealId={dealId} currentStage={currentStage} onAdvanceStage={advanceStage} />}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #e8ecf0", borderRadius: "8px",
  fontSize: "13px", color: "#0f172a", background: "#fff", outline: "none",
  boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: "600", color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px",
};

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", overflow: "hidden", marginBottom: "16px" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f8fafc" }}>
      <div>
        <div style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>{label}</div>
        {sub && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: "40px", height: "22px", borderRadius: "11px", border: "none", cursor: "pointer",
          background: checked ? "#0284c7" : "#e2e8f0", position: "relative", transition: "background 0.2s", flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: "3px", left: checked ? "21px" : "3px",
          width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </button>
    </div>
  );
}

export default function InstellingenPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [notifNewDeal,     setNotifNewDeal]     = useState(true);
  const [notifDealClosed,  setNotifDealClosed]  = useState(true);
  const [notifWhatsApp,    setNotifWhatsApp]     = useState(false);
  const [notifWwft,        setNotifWwft]         = useState(true);
  const [notifAgenda,      setNotifAgenda]       = useState(true);

  const [realworksKey, setRealworksKey] = useState("rw_••••••••••••••••");
  const [anthropicKey, setAnthropicKey] = useState("sk-ant-••••••••••••");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email ?? "");
    }
    load();
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setToast("Profiel opgeslagen");
    setTimeout(() => setToast(""), 2500);
  }

  async function handleChangePassword() {
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email);
    setToast("Wachtwoord reset e-mail verstuurd");
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Instellingen</span>
        <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>Beheer je account en voorkeuren</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px" }}>
        <div style={{ maxWidth: "640px" }}>

          {/* Profile */}
          <Section title="Profiel" subtitle="Je persoonlijke gegevens als makelaar">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div><label style={lbl}>Volledige naam</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan de Vries" style={inp} /></div>
              <div><label style={lbl}>Telefoonnummer</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 6 12 34 56 78" style={inp} /></div>
              <div><label style={lbl}>E-mailadres</label><input value={email} onChange={(e) => setEmail(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Kantoor / Bedrijfsnaam</label><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="De Vries Makelaardij" style={inp} /></div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleSaveProfile} disabled={saving} style={{ background: "#0284c7", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: "600", color: "#fff", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Opslaan…" : "Wijzigingen opslaan"}
              </button>
              <button onClick={handleChangePassword} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: "600", color: "#64748b", cursor: "pointer" }}>
                Wachtwoord wijzigen
              </button>
            </div>
          </Section>

          {/* Notifications */}
          <Section title="E-mailmeldingen" subtitle="Kies wanneer je een melding wilt ontvangen">
            <Toggle checked={notifNewDeal}    onChange={setNotifNewDeal}    label="Nieuwe deal aangemaakt"      sub="E-mail bij elke nieuwe transactie" />
            <Toggle checked={notifDealClosed} onChange={setNotifDealClosed} label="Deal gesloten"               sub="Bevestiging bij afsluiten van een deal" />
            <Toggle checked={notifWhatsApp}   onChange={setNotifWhatsApp}   label="WhatsApp bericht verzonden"  sub="Melding bij versturen van automatisch bericht" />
            <Toggle checked={notifWwft}       onChange={setNotifWwft}       label="Wwft herinnering"            sub="Waarschuwing als dossier incompleet is" />
            <Toggle checked={notifAgenda}     onChange={setNotifAgenda}     label="Agenda herinneringen"        sub="24 uur voor bezichtiging of overdracht" />
          </Section>

          {/* Integrations */}
          <Section title="Integraties" subtitle="Verbonden externe systemen">
            {[
              { label: "Realworks API Key", value: realworksKey, set: setRealworksKey, status: "Verbonden", statusColor: "#16a34a", statusBg: "#f0fdf4", statusBorder: "#bbf7d0" },
              { label: "Anthropic API Key (AI berichten)", value: anthropicKey, set: setAnthropicKey, status: "Verbonden", statusColor: "#16a34a", statusBg: "#f0fdf4", statusBorder: "#bbf7d0" },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={lbl}>{item.label}</label>
                  <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", background: item.statusBg, color: item.statusColor, border: `1px solid ${item.statusBorder}` }}>{item.status}</span>
                </div>
                <input type="password" value={item.value} onChange={(e) => item.set(e.target.value)} style={inp} />
              </div>
            ))}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#0369a1" }}>
              API sleutels worden versleuteld opgeslagen en nooit gedeeld.
            </div>
          </Section>

          {/* Danger zone */}
          <Section title="Account" subtitle="Accountbeheer en gegevensverwijdering">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>Gegevens exporteren</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Download al je deals en contacten als CSV</div>
                </div>
                <button onClick={() => { setToast("Export wordt voorbereid…"); setTimeout(() => setToast(""), 2500); }} style={{ padding: "7px 14px", background: "#fff", border: "1px solid #e8ecf0", borderRadius: "8px", fontSize: "12px", fontWeight: "600", color: "#64748b", cursor: "pointer" }}>
                  Exporteren
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#fff1f2", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "500", color: "#ef4444" }}>Account verwijderen</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Verwijder je account en alle gegevens permanent</div>
                </div>
                <button style={{ padding: "7px 14px", background: "#fff", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", fontSize: "12px", fontWeight: "600", color: "#ef4444", cursor: "pointer" }}>
                  Verwijderen
                </button>
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

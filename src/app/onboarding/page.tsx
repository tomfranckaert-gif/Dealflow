"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #e8ecf0",
  borderRadius: "9px",
  fontSize: "14px",
  color: "#0f172a",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "DM Sans, Helvetica Neue, sans-serif",
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: "700",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.7px",
  marginBottom: "6px",
};

const btnBlue: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  background: "#0284c7",
  border: "none",
  borderRadius: "9px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#fff",
  cursor: "pointer",
};

const FEATURES = [
  "✓ Pipeline",
  "✓ Wwft dossier",
  "✓ WhatsApp automation",
  "✓ AI documenten",
  "✓ Overdracht",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [officeName, setOfficeName] = useState("");

  // Step 2
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("agents").select("name, office_name").eq("id", user.id).single();
      if (data?.name) setName(data.name as string);
      if (data?.office_name) setOfficeName(data.office_name as string);
    }
    init();
  }, [router, supabase]);

  async function handleStep1() {
    if (!name.trim() || !officeName.trim()) return;
    setSaving(true);
    await supabase.from("agents").upsert({ id: userId, name: name.trim(), office_name: officeName.trim() });
    setSaving(false);
    setStep(2);
  }

  async function handleConnect() {
    setSaving(true);
    if (apiKey.trim()) {
      await supabase.from("agents").upsert({ id: userId, realworks_api_key: apiKey.trim() });
    }
    setSaving(false);
    setStep(3);
  }

  function handleFinish() {
    localStorage.setItem("onboarding_complete", "true");
    document.cookie = "onboarding_complete=true; path=/; max-age=31536000";
    router.push("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", padding: "0 16px" }}>
      <div style={{ maxWidth: "520px", margin: "60px auto", padding: "40px", border: "1px solid #e8ecf0", borderRadius: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "11px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "20px" }}>
            T
          </div>
          <span style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.2px" }}>Transactly</span>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "36px" }}>
          {[1, 2, 3].map((dot) => (
            <div
              key={dot}
              style={{ width: dot === step ? "24px" : "8px", height: "8px", borderRadius: "999px", background: dot === step ? "#0284c7" : dot < step ? "#bfdbfe" : "#e8ecf0", transition: "all 0.25s ease" }}
            />
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
              Welkom bij Transactly 👋
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 28px", lineHeight: 1.6 }}>
              Laten we je account instellen. Dit duurt minder dan 2 minuten.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={lbl}>Jouw naam</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jan de Boer"
                  style={inp}
                  autoFocus
                />
              </div>
              <div>
                <label style={lbl}>Kantoor naam</label>
                <input
                  type="text"
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  placeholder="Bijv. De Boer Makelaardij"
                  style={inp}
                />
              </div>
            </div>
            <button
              onClick={handleStep1}
              disabled={saving || !name.trim() || !officeName.trim()}
              style={{ ...btnBlue, opacity: saving || !name.trim() || !officeName.trim() ? 0.5 : 1, cursor: saving || !name.trim() || !officeName.trim() ? "default" : "pointer" }}
            >
              {saving ? "Opslaan…" : "Volgende →"}
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
              Koppel je Realworks account
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 }}>
              Zodat Transactly automatisch je woningen en contacten ophaalt.
            </p>

            {/* Realworks logo + steps */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "16px", background: "#f8fafc", borderRadius: "12px", marginBottom: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "20px", flexShrink: 0 }}>
                R
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  "Log in op mijn.realworks.nl",
                  "Ga naar Instellingen → Marketplace",
                  "Kopieer je Developer ID",
                ].map((text, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "10px", fontWeight: "700", flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Plak hier je Developer ID..."
                style={inp}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setStep(3)}
                style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #e8ecf0", borderRadius: "9px", fontSize: "14px", fontWeight: "600", color: "#64748b", cursor: "pointer" }}
              >
                Overslaan
              </button>
              <button
                onClick={handleConnect}
                disabled={saving}
                style={{ flex: 2, padding: "12px", background: "#0284c7", border: "none", borderRadius: "9px", fontSize: "14px", fontWeight: "700", color: "#fff", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Opslaan…" : "Verbinden & Doorgaan"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            {/* Checkmark */}
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 24px rgba(2,132,199,0.25)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>

            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
              Je bent klaar!
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 }}>
              Transactly is ingesteld en klaar voor gebruik.
            </p>

            {/* Feature pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "32px" }}>
              {FEATURES.map((f) => (
                <span
                  key={f}
                  style={{ background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "600" }}
                >
                  {f}
                </span>
              ))}
            </div>

            <button
              onClick={handleFinish}
              style={{ width: "100%", padding: "14px", background: "#0284c7", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(2,132,199,0.2)" }}
            >
              Eerste deal aanmaken →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

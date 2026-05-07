"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: "6px",
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #e8ecf0",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#0f172a",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "DM Sans, Helvetica Neue, sans-serif",
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8ecf0",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "16px",
};

const cardHeader: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: "700",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: "16px",
};

export default function InstellingenPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [office, setOffice] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [realworksKey, setRealworksKey] = useState<string | null>(null);
  const [showRealworksForm, setShowRealworksForm] = useState(false);
  const [realworksDraft, setRealworksDraft] = useState("");
  const [realworksSaving, setRealworksSaving] = useState(false);
  const [realworksRemoving, setRealworksRemoving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserEmail(user.email ?? "");
      setUserId(user.id);

      const { data: agent } = await supabase
        .from("agents")
        .select("name, office_name, realworks_api_key")
        .eq("id", user.id)
        .single();

      if (agent) {
        setName(agent.name ?? "");
        setOffice(agent.office_name ?? "");
        setRealworksKey(agent.realworks_api_key ?? null);
      }
    }
    load();
  }, [router, supabase]);

  async function handleProfileSave() {
    setProfileSaving(true);
    await supabase
      .from("agents")
      .update({ name, office_name: office })
      .eq("id", userId);
    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  async function handleRealworksSave() {
    if (!realworksDraft.trim()) return;
    setRealworksSaving(true);
    await supabase
      .from("agents")
      .update({ realworks_api_key: realworksDraft.trim() })
      .eq("id", userId);
    setRealworksKey(realworksDraft.trim());
    setRealworksDraft("");
    setShowRealworksForm(false);
    setRealworksSaving(false);
  }

  async function handleRealworksRemove() {
    setRealworksRemoving(true);
    await supabase
      .from("agents")
      .update({ realworks_api_key: null })
      .eq("id", userId);
    setRealworksKey(null);
    setRealworksRemoving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "28px 32px" }}>
      <div style={{ maxWidth: "600px" }}>
        {/* Page title */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.3px" }}>
            Instellingen
          </h1>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
            Beheer je account en koppelingen
          </p>
        </div>

        {/* PROFIEL */}
        <div style={card}>
          <div style={cardHeader}>Profiel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
            <div>
              <label style={lbl}>Naam</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jouw naam"
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Kantoor</label>
              <input
                type="text"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                placeholder="Naam van je kantoor"
                style={inp}
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleProfileSave}
              disabled={profileSaving}
              style={{ padding: "8px 16px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: profileSaving ? "default" : "pointer", opacity: profileSaving ? 0.7 : 1 }}
            >
              {profileSaving ? "Opslaan…" : "Opslaan"}
            </button>
            {profileSaved && (
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#16a34a" }}>✓ Opgeslagen</span>
            )}
          </div>
        </div>

        {/* KOPPELINGEN */}
        <div style={card}>
          <div style={cardHeader}>Koppelingen</div>
          <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 20px", lineHeight: 1.5 }}>
            Verbind Transactly met je bestaande software
          </p>

          {/* Realworks row */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Logo placeholder */}
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "15px", flexShrink: 0 }}>
                R
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Realworks CRM</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Synchroniseer deals en contacten</div>
              </div>
              {realworksKey ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 9px", borderRadius: "999px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                    Verbonden
                  </span>
                  <button
                    onClick={handleRealworksRemove}
                    disabled={realworksRemoving}
                    style={{ padding: "5px 10px", background: "transparent", border: "1px solid #e8ecf0", borderRadius: "6px", fontSize: "11px", fontWeight: "600", color: "#64748b", cursor: "pointer" }}
                  >
                    {realworksRemoving ? "…" : "Verwijderen"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRealworksForm((v) => !v)}
                  style={{ padding: "6px 14px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer", flexShrink: 0 }}
                >
                  Verbinden
                </button>
              )}
            </div>

            {/* Inline Realworks form */}
            {showRealworksForm && !realworksKey && (
              <div style={{ marginTop: "12px", padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e8ecf0" }}>
                <input
                  type="text"
                  value={realworksDraft}
                  onChange={(e) => setRealworksDraft(e.target.value)}
                  placeholder="Plak hier je Realworks API key"
                  style={inp}
                />
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "6px 0 12px", lineHeight: 1.5 }}>
                  Vind je key via Realworks → Instellingen → Marketplace
                </p>
                <button
                  onClick={handleRealworksSave}
                  disabled={realworksSaving || !realworksDraft.trim()}
                  style={{ padding: "7px 14px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer", opacity: realworksSaving || !realworksDraft.trim() ? 0.6 : 1 }}
                >
                  {realworksSaving ? "Opslaan…" : "Opslaan"}
                </button>
              </div>
            )}
          </div>

          <div style={{ height: "1px", background: "#f1f5f9", margin: "16px 0" }} />

          {/* Move.nl row */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>
                M
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Move.nl</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Client portal voor koper/verkoper</div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 9px", borderRadius: "999px", background: "#f1f5f9", color: "#475569", flexShrink: 0 }}>
                Via Realworks
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "#94a3b8", margin: "8px 0 0 48px", lineHeight: 1.5 }}>
              Move.nl is automatisch beschikbaar via je Realworks koppeling
            </p>
          </div>

          <div style={{ height: "1px", background: "#f1f5f9", margin: "16px 0" }} />

          {/* Kadaster row */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>
              K
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Kadaster API</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Automatische eigendomscheck</div>
            </div>
            <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 9px", borderRadius: "999px", background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", flexShrink: 0 }}>
              In ontwikkeling
            </span>
          </div>
        </div>

        {/* ACCOUNT */}
        <div style={card}>
          <div style={cardHeader}>Account</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>E-mail</span>
              <span style={{ fontSize: "13px", color: "#64748b" }}>{userEmail}</span>
            </div>
            <div style={{ height: "1px", background: "#f1f5f9" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>Plan</span>
              <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 9px", borderRadius: "999px", background: "#eff6ff", color: "#1d4ed8" }}>
                Pro plan
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{ padding: "8px 16px", background: "transparent", border: "1px solid #e8ecf0", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#64748b", cursor: "pointer" }}
          >
            Uitloggen
          </button>
        </div>
      </div>
    </div>
  );
}

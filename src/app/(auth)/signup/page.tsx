"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
  }

  const inp: React.CSSProperties = { width: "100%", background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: "500", color: "#0f172a", marginBottom: "6px" };

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "22px", margin: "0 auto 16px" }}>T</div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px" }}>Controleer je e-mail</h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>We hebben een bevestigingslink gestuurd naar <strong>{email}</strong>.</p>
          <Link href="/login" style={{ color: "#0284c7", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>Terug naar inloggen</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "22px", margin: "0 auto 12px" }}>T</div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", margin: "0 0 4px" }}>Account aanmaken</h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Begin met het beheren van je pipeline</p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#ef4444", marginBottom: "16px" }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label style={lbl}>E-mailadres</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inp} placeholder="jij@voorbeeld.nl" />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={lbl}>Wachtwoord</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={inp} placeholder="Min. 8 tekens" />
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", cursor: "pointer", opacity: loading ? 0.6 : 1, fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
              {loading ? "Aanmaken…" : "Account aanmaken"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "13px", color: "#64748b", marginTop: "16px" }}>
          Al een account?{" "}
          <Link href="/login" style={{ color: "#0284c7", fontWeight: "600", textDecoration: "none" }}>Inloggen</Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  }

  const inp: React.CSSProperties = { width: "100%", background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: "500", color: "#0f172a", marginBottom: "6px" };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/logo.png" alt="Transactly" style={{ width: "48px", height: "48px", objectFit: "contain", margin: "0 auto 8px", display: "block" }} />
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", margin: "0 0 4px" }}>Welkom terug</h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Log in op je Transactly account</p>
        </div>

        {/* Card */}
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
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inp} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", cursor: "pointer", opacity: loading ? 0.6 : 1, fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
              {loading ? "Inloggen…" : "Inloggen"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "13px", color: "#64748b", marginTop: "16px" }}>
          Nog geen account?{" "}
          <Link href="/signup" style={{ color: "#0284c7", fontWeight: "600", textDecoration: "none" }}>Registreren</Link>
        </p>
      </div>
    </div>
  );
}

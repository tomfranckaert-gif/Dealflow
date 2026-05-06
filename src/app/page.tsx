import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "26px", margin: "0 auto 20px" }}>T</div>
        <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", margin: "0 0 12px" }}>Transactly.nl</h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: "0 0 32px", lineHeight: 1.6 }}>Het makelaarsplatform voor vastgoedtransacties van A tot Z.</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <Link href="/login" style={{ background: "#0284c7", color: "#fff", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>Inloggen</Link>
          <Link href="/signup" style={{ background: "#f8fafc", border: "1px solid #e8ecf0", color: "#64748b", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>Aan de slag</Link>
        </div>
      </div>
    </main>
  );
}

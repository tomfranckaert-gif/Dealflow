import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "26px", margin: "0 auto" }}>
          T
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", margin: "16px 0 0" }}>
          Transactly
        </h1>
        <p style={{ fontSize: "20px", color: "#64748b", margin: "8px 0 0", fontWeight: "400" }}>
          Van lead tot sleutel
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "32px" }}>
          <Link
            href="/login"
            style={{ padding: "10px 24px", border: "1px solid #e8ecf0", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#0f172a", textDecoration: "none", background: "#fff" }}
          >
            Inloggen
          </Link>
          <Link
            href="/dashboard"
            style={{ padding: "10px 24px", background: "#0284c7", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#ffffff", textDecoration: "none" }}
          >
            Aan de slag
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function MarktkaartPage() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>Marktkaart</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Marktkaart</h1>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Komt binnenkort beschikbaar</p>
        </div>
      </div>
    </div>
  );
}

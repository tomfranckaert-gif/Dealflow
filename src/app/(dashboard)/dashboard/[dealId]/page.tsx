import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DealDetailPage({ params }: { params: { dealId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", padding: "0 24px", gap: "12px", flexShrink: 0 }}>
        <Link href="/dashboard" style={{ color: "#94a3b8", textDecoration: "none", display: "flex" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
        </Link>
        <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Deal detail</span>
      </div>
      <div style={{ flex: 1, padding: "24px", background: "#f8fafc" }}>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>Deal detail pagina — binnenkort beschikbaar.</p>
      </div>
    </div>
  );
}

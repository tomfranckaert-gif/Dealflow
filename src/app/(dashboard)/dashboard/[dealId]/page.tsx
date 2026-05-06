import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DealDetailPage({ params }: { params: { dealId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", padding: "40px 24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Link
          href="/dashboard"
          style={{ color: "#c9a84c", fontFamily: "Georgia, serif", fontSize: "14px", textDecoration: "none" }}
        >
          ← Terug naar dashboard
        </Link>
        <p style={{ color: "#4a5568", fontFamily: "Georgia, serif", marginTop: "40px" }}>
          Deal detail pagina — binnenkort beschikbaar.
        </p>
      </div>
    </div>
  );
}

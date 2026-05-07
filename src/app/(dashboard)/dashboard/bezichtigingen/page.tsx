"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Viewing {
  id: string;
  deal_id: string;
  date: string;
  time: string | null;
  feedback: string | null;
  created_at: string;
  deal_address: string;
}

export default function BezichtigingenOverviewPage() {
  const router = useRouter();
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: items } = await supabase
      .from("bezichtigingen")
      .select("id, deal_id, date, time, feedback, created_at")
      .eq("owner_id", user.id)
      .order("date", { ascending: true });

    if (!items || items.length === 0) { setLoading(false); return; }

    const dealIds = Array.from(new Set(items.map((i) => i.deal_id)));
    const { data: deals } = await supabase.from("deals").select("id, address, title").in("id", dealIds);
    const dealMap = new Map((deals ?? []).map((d) => [d.id, d.address ?? d.title]));

    setViewings(items.map((item) => ({ ...item, deal_address: dealMap.get(item.deal_id) ?? "Onbekend" })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const upcoming = viewings.filter((v) => new Date(v.date) >= now);
  const past = viewings.filter((v) => new Date(v.date) < now);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <span style={{ fontSize: "13px", color: "#94a3b8" }}>Laden…</span>
    </div>
  );

  function ViewingCard({ v }: { v: Viewing }) {
    return (
      <div
        onClick={() => router.push(`/dashboard/${v.deal_id}`)}
        style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px", cursor: "pointer", marginBottom: "8px" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e8ecf0")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "3px" }}>{v.deal_address}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              {new Date(v.date).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {v.time && <span style={{ marginLeft: "6px" }}>om {v.time}</span>}
            </div>
            {v.feedback && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px", fontStyle: "italic" }}>{v.feedback}</div>}
          </div>
          <span style={{ fontSize: "11px", color: "#0284c7", fontWeight: "500", whiteSpace: "nowrap", marginLeft: "12px" }}>Open →</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Bezichtigingen</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>Alle bezichtigingen over alle deals</span>
        </div>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>{upcoming.length} aankomend · {past.length} afgelopen</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px" }}>
        {viewings.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "64px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>👁</div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>Nog geen bezichtigingen</div>
            <div style={{ fontSize: "13px", color: "#94a3b8" }}>Plan bezichtigingen vanuit een deal</div>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>Aankomend</div>
                {upcoming.map((v) => <ViewingCard key={v.id} v={v} />)}
              </div>
            )}
            {past.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>Afgelopen</div>
                {past.map((v) => <ViewingCard key={v.id} v={v} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

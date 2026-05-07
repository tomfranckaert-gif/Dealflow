"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface ClosedBuyer {
  contactId: string;
  name: string;
  phone: string | null;
  email: string | null;
  dealId: string;
  address: string;
  closedAt: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function addMonths(d: string, m: number) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + m);
  return date.toISOString();
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #818cf8, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "18px", fontWeight: "700", flexShrink: 0 }}>
      {initial}
    </div>
  );
}

export default function RelatiesPage() {
  const [buyers, setBuyers] = useState<ClosedBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [reviewSent, setReviewSent] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: deals } = await supabase
      .from("deals")
      .select("id, address, title, created_at, updated_at, buyer_id")
      .eq("owner_id", user.id)
      .eq("stage", "gesloten")
      .not("buyer_id", "is", null);

    if (!deals || deals.length === 0) { setLoading(false); return; }

    const buyerIds = Array.from(new Set(deals.map((d) => d.buyer_id as string)));
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, name, phone, email")
      .in("id", buyerIds);

    if (!contacts) { setLoading(false); return; }

    const result: ClosedBuyer[] = deals.map((deal) => {
      const contact = contacts.find((c) => c.id === deal.buyer_id);
      return {
        contactId: deal.buyer_id as string,
        name: contact?.name ?? "Onbekend",
        phone: contact?.phone ?? null,
        email: contact?.email ?? null,
        dealId: deal.id,
        address: deal.address ?? deal.title ?? "Onbekend adres",
        closedAt: deal.updated_at ?? deal.created_at,
      };
    });

    setBuyers(result);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReviewRequest(buyer: ClosedBuyer) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("messages").insert({
      owner_id: user.id,
      deal_id: buyer.dealId,
      contact_id: buyer.contactId,
      channel: "whatsapp",
      content: `Hi ${buyer.name.split(" ")[0]}, we hopen dat je blij bent met je nieuwe woning! Zou je een review willen achterlaten op Funda?`,
      trigger_event: "Review verzoek",
      status: "concept",
      scheduled_at: null,
    });
    setReviewSent((prev) => new Set(prev).add(buyer.contactId));
    setToast("Review verzoek aangemaakt");
    setTimeout(() => setToast(""), 2500);
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>Laden…</span>
      </div>
    );
  }

  const STATS = [
    { label: "Tevreden klanten", value: buyers.length, sub: "Gesloten deals" },
    { label: "Reviews ontvangen", value: 0, sub: "Via Funda" },
    { label: "Doorverwijzingen", value: 0, sub: "Dit jaar" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Relaties & Referrals</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>Blijf in contact met vorige klanten</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "18px 20px" }}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>{s.label}</div>
              <div style={{ fontSize: "26px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", marginBottom: "4px" }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Contact cards */}
        {buyers.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "64px 24px", textAlign: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 14px" }}>
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>Nog geen gesloten deals</div>
            <div style={{ fontSize: "13px", color: "#94a3b8" }}>Sluit je eerste deal om relaties te beheren</div>
          </div>
        ) : (
          <div>
            {buyers.map((buyer) => {
              const nextContact = addMonths(buyer.closedAt, 3);
              const alreadySent = reviewSent.has(buyer.contactId);
              return (
                <div key={buyer.dealId} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px", marginBottom: "10px" }}>
                  {/* Main row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Avatar name={buyer.name} />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "3px" }}>{buyer.name}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>Koper van {buyer.address}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>Gesloten op {formatDate(buyer.closedAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {buyer.phone && (
                        <a
                          href={`https://wa.me/${buyer.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: "6px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#16a34a", fontSize: "11px", fontWeight: "600", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                        >
                          WhatsApp
                        </a>
                      )}
                      <button
                        onClick={() => !alreadySent && handleReviewRequest(buyer)}
                        style={{ padding: "6px 12px", background: alreadySent ? "#f0fdf4" : "#fff", border: `1px solid ${alreadySent ? "#bbf7d0" : "#e8ecf0"}`, borderRadius: "6px", color: alreadySent ? "#16a34a" : "#64748b", fontSize: "11px", fontWeight: "600", cursor: alreadySent ? "default" : "pointer" }}
                      >
                        {alreadySent ? "✓ Verzonden" : "Review vragen"}
                      </button>
                    </div>
                  </div>

                  {/* Bottom strip */}
                  <div style={{ borderTop: "1px solid #f8fafc", paddingTop: "10px", marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      Volgende contactmoment: <span style={{ color: "#0f172a", fontWeight: "500" }}>{formatDate(nextContact)}</span>
                    </span>
                    <button
                      style={{ padding: "5px 10px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", color: "#0284c7", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
                      onClick={() => {
                        setToast("Marktupdate concept aangemaakt");
                        setTimeout(() => setToast(""), 2500);
                      }}
                    >
                      Stuur marktupdate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

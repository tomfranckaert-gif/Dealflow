"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  created_at: string;
  content: string;
  status: "concept" | "gepland" | "verzonden" | "mislukt";
  trigger_event: string | null;
  deal_id: string;
  contact_id: string | null;
  deal_address: string;
  contact_name: string;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  concept:   { bg: "#fef9c3", color: "#854d0e", label: "Concept" },
  gepland:   { bg: "#dbeafe", color: "#1e40af", label: "Gepland" },
  verzonden: { bg: "#dcfce7", color: "#14532d", label: "Verzonden" },
  mislukt:   { bg: "#fee2e2", color: "#991b1b", label: "Mislukt" },
};

export default function WhatsAppOverviewPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Map<string, { address: string; dealId: string; messages: Message[] }>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: messages } = await supabase
      .from("messages")
      .select("id, created_at, content, status, trigger_event, deal_id, contact_id")
      .eq("owner_id", user.id)
      .eq("channel", "whatsapp")
      .order("created_at", { ascending: false });

    if (!messages || messages.length === 0) { setLoading(false); return; }

    const dealIds = Array.from(new Set(messages.map((m) => m.deal_id).filter(Boolean)));
    const contactIds = Array.from(new Set(messages.map((m) => m.contact_id).filter(Boolean)));

    const [dealsRes, contactsRes] = await Promise.all([
      supabase.from("deals").select("id, address, title").in("id", dealIds),
      contactIds.length > 0
        ? supabase.from("contacts").select("id, name").in("id", contactIds)
        : Promise.resolve({ data: [] }),
    ]);

    const dealMap = new Map((dealsRes.data ?? []).map((d) => [d.id, d.address ?? d.title]));
    const contactMap = new Map((contactsRes.data ?? []).map((c) => [c.id, c.name]));

    const grouped = new Map<string, { address: string; dealId: string; messages: Message[] }>();
    for (const msg of messages) {
      if (!msg.deal_id) continue;
      const address = dealMap.get(msg.deal_id) ?? "Onbekend adres";
      const contact_name = msg.contact_id ? (contactMap.get(msg.contact_id) ?? "Onbekend") : "—";
      if (!grouped.has(msg.deal_id)) grouped.set(msg.deal_id, { address, dealId: msg.deal_id, messages: [] });
      grouped.get(msg.deal_id)!.messages.push({ ...msg, deal_address: address, contact_name });
    }
    setGroups(grouped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <span style={{ fontSize: "13px", color: "#94a3b8" }}>Laden…</span>
    </div>
  );

  const totalMessages = Array.from(groups.values()).reduce((s, g) => s + g.messages.length, 0);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>WhatsApp</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>Alle berichten over alle deals</span>
        </div>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>{totalMessages} berichten · {groups.size} deals</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {groups.size === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "64px 24px", textAlign: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 14px" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>Nog geen WhatsApp berichten</div>
            <div style={{ fontSize: "13px", color: "#94a3b8" }}>Stuur berichten vanuit een deal</div>
          </div>
        ) : Array.from(groups.values()).map((group) => (
          <div key={group.dealId}>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", cursor: "pointer" }}
              onClick={() => router.push(`/dashboard/${group.dealId}`)}
            >
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{group.address}</span>
              <span style={{ fontSize: "11px", color: "#0284c7", fontWeight: "500" }}>Open deal →</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {group.messages.map((msg) => {
                const badge = STATUS_BADGE[msg.status] ?? STATUS_BADGE.concept;
                return (
                  <div key={msg.id} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{msg.contact_name}</span>
                        {msg.trigger_event && <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "8px" }}>{msg.trigger_event}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>{new Date(msg.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
                        <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: "600", background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </div>
                    </div>
                    <div style={{ background: "#dcfce7", borderRadius: "4px 10px 10px 10px", padding: "8px 12px", fontSize: "12px", color: "#0f172a", maxWidth: "85%", lineHeight: "1.5" }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

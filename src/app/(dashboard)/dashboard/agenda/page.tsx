"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AgendaItem {
  id: string;
  date: Date;
  type: "bezichtiging" | "overdracht" | "deadline";
  label: string;
  dealAddress: string;
  dealId: string;
}

function groupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Verlopen";
  if (diff === 0) return "Vandaag";
  if (diff <= 7) return "Deze week";
  if (diff <= 14) return "Volgende week";
  return "Later";
}

const GROUP_ORDER = ["Vandaag", "Deze week", "Volgende week", "Later", "Verlopen"];

const TYPE_STYLE: Record<string, { icon: string; bg: string; color: string; border: string }> = {
  bezichtiging: { icon: "👁", bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd" },
  overdracht:   { icon: "🔑", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  deadline:     { icon: "⏰", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
};

export default function AgendaPage() {
  const router = useRouter();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const all: AgendaItem[] = [];

    const [dealsRes, bezRes] = await Promise.all([
      supabase.from("deals").select("id, address, title, transfer_date").eq("owner_id", user.id).not("transfer_date", "is", null),
      supabase.from("bezichtigingen").select("id, deal_id, date, time").eq("owner_id", user.id),
    ]);

    const dealMap = new Map<string, string>();

    for (const deal of dealsRes.data ?? []) {
      dealMap.set(deal.id, deal.address ?? deal.title);
      if (deal.transfer_date) {
        all.push({ id: `overdracht-${deal.id}`, date: new Date(deal.transfer_date), type: "overdracht", label: "Overdrachtsdatum", dealAddress: deal.address ?? deal.title, dealId: deal.id });
      }
    }

    for (const b of bezRes.data ?? []) {
      const address = dealMap.get(b.deal_id) ?? "Onbekend adres";
      const dateStr = b.time ? `${b.date}T${b.time}` : b.date;
      all.push({ id: b.id, date: new Date(dateStr), type: "bezichtiging", label: `Bezichtiging${b.time ? ` om ${b.time}` : ""}`, dealAddress: address, dealId: b.deal_id });
    }

    all.sort((a, b) => a.date.getTime() - b.date.getTime());
    setItems(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const g = groupLabel(item.date);
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(item);
  }

  const totalUpcoming = items.filter((i) => i.date >= new Date()).length;

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <span style={{ fontSize: "13px", color: "#94a3b8" }}>Laden…</span>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Agenda</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>Aankomende events over alle deals</span>
        </div>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>{totalUpcoming} aankomend</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {items.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "64px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📅</div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>Geen aankomende events</div>
            <div style={{ fontSize: "13px", color: "#94a3b8" }}>Plan bezichtigingen of stel overdrachtsdatums in vanuit een deal</div>
          </div>
        ) : GROUP_ORDER.filter((g) => grouped.has(g)).map((groupName) => (
          <div key={groupName}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>{groupName}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {grouped.get(groupName)!.map((item) => {
                const style = TYPE_STYLE[item.type];
                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/dashboard/${item.dealId}`)}
                    style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e8ecf0")}
                  >
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: style.bg, border: `1px solid ${style.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                      {style.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "2px" }}>{item.label}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.dealAddress}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: style.color }}>
                        {item.date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                      </div>
                      {item.date.getHours() + item.date.getMinutes() > 0 && (
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{item.date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</div>
                      )}
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

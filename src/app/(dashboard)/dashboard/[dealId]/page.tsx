"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DealWithContacts, DealStage } from "@/types/database";

const STAGES: { id: DealStage; label: string }[] = [
  { id: "lead",         label: "Lead" },
  { id: "bezichtiging", label: "Bezichtiging" },
  { id: "bod",          label: "Bod" },
  { id: "koopakte",     label: "Koopakte" },
  { id: "voorwaarden",  label: "Voorwaarden" },
  { id: "financiering", label: "Financiering" },
  { id: "overdracht",   label: "Overdracht" },
  { id: "gesloten",     label: "Gesloten" },
];

const STAGE_BADGE: Record<DealStage, { bg: string; text: string; dot: string }> = {
  lead:         { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" },
  bezichtiging: { bg: "#fef9c3", text: "#854d0e", dot: "#eab308" },
  bod:          { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  koopakte:     { bg: "#ede9fe", text: "#5b21b6", dot: "#8b5cf6" },
  voorwaarden:  { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  financiering: { bg: "#ffedd5", text: "#9a3412", dot: "#f97316" },
  overdracht:   { bg: "#dcfce7", text: "#14532d", dot: "#22c55e" },
  gesloten:     { bg: "#f1f5f9", text: "#374151", dot: "#6b7280" },
};

type SubNav = "overzicht" | "documenten" | "voorwaarden" | "wwft" | "whatsapp" | "gesprekken" | "overdracht";

const SUB_NAV: { id: SubNav; label: string; icon: React.ReactNode }[] = [
  {
    id: "overzicht", label: "Overzicht",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  },
  {
    id: "documenten", label: "Documenten",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>,
  },
  {
    id: "voorwaarden", label: "Voorwaarden",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  },
  {
    id: "wwft", label: "Wwft",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  },
  {
    id: "whatsapp", label: "WhatsApp",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  },
  {
    id: "gesprekken", label: "Gesprekken",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  {
    id: "overdracht", label: "Overdracht",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17,1 21,5 17,9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7,23 3,19 7,15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>,
  },
];

function formatEuro(v: number) {
  return "€ " + v.toLocaleString("nl-NL");
}

function formatDate(d: string | null) {
  if (!d) return "Nog niet ingesteld";
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: "700", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function ContactCard({ title, contact, avatarColor }: { title: string; contact: { name: string; email: string | null; phone: string | null } | null; avatarColor: string }) {
  if (!contact) return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px", flex: 1 }}>
      <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>{title}</div>
      <p style={{ fontSize: "13px", color: "#94a3b8" }}>Niet ingesteld</p>
    </div>
  );

  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px", flex: 1 }}>
      <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <Avatar name={contact.name} color={avatarColor} />
        <span style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{contact.name}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
        {contact.phone && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            <span style={{ fontSize: "11px", color: "#94a3b8", width: "50px" }}>Telefoon</span>
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: "500" }}>{contact.phone}</span>
          </div>
        )}
        {contact.email && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            <span style={{ fontSize: "11px", color: "#94a3b8", width: "50px" }}>E-mail</span>
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: "500" }}>{contact.email}</span>
          </div>
        )}
      </div>
      <button style={{ padding: "6px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#16a34a", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
        WhatsApp
      </button>
    </div>
  );
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;

  const [deal, setDeal] = useState<DealWithContacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<SubNav>("overzicht");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("deals")
        .select(`*, buyer:contacts!deals_buyer_id_fkey(name,email,phone), seller:contacts!deals_seller_id_fkey(name,email,phone)`)
        .eq("id", dealId)
        .single();
      setDeal(data as DealWithContacts | null);
      setLoading(false);
    }
    load();
  }, [dealId]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>Laden…</span>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>Deal niet gevonden.</span>
      </div>
    );
  }

  const stageIdx = STAGES.findIndex((s) => s.id === deal.stage);
  const badge = STAGE_BADGE[deal.stage as DealStage] ?? STAGE_BADGE.lead;
  const days = daysSince(deal.created_at);
  const progress = Math.round(((stageIdx + 1) / STAGES.length) * 100);

  const ACTIONS = [
    { label: "Document genereren", color: "#0284c7", bg: "#f0f9ff", border: "rgba(2,132,199,0.2)" },
    { label: "WhatsApp sturen",    color: "#16a34a", bg: "#f0fdf4", border: "rgba(22,163,74,0.2)" },
    { label: "Kadaster check",     color: "#7c3aed", bg: "#f5f3ff", border: "rgba(124,58,237,0.2)" },
    { label: "Voorwaarden toevoegen", color: "#ef4444", bg: "#fff1f2", border: "rgba(239,68,68,0.2)" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
          </button>
          <span style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.4px" }}>{deal.address ?? deal.title}</span>
          {deal.city && <span style={{ fontSize: "14px", color: "#94a3b8" }}>{deal.city}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: badge.bg, color: badge.text }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: badge.dot }} />
            {STAGES.find((s) => s.id === deal.stage)?.label}
          </span>
          {(deal.agreed_price ?? deal.value) != null && (
            <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.4px" }}>
              {formatEuro(deal.agreed_price ?? deal.value ?? 0)}
            </span>
          )}
        </div>
      </div>

      {/* Stage progress strip */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf0", padding: "12px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {STAGES.map((s, i) => {
            const completed = i < stageIdx;
            const current = i === stageIdx;
            const future = i > stageIdx;
            return (
              <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {/* Connecting line left */}
                {i > 0 && (
                  <div style={{ position: "absolute", left: 0, top: "4px", width: "50%", height: "1px", background: completed || current ? "#0284c7" : "#e2e8f0", transform: "translateY(0)" }} />
                )}
                {/* Connecting line right */}
                {i < STAGES.length - 1 && (
                  <div style={{ position: "absolute", right: 0, top: "4px", width: "50%", height: "1px", background: completed ? "#0284c7" : "#e2e8f0" }} />
                )}
                {/* Dot */}
                <div style={{
                  width: "9px", height: "9px", borderRadius: "50%", zIndex: 1,
                  background: future ? "#e2e8f0" : "#0284c7",
                  boxShadow: current ? "0 0 0 3px rgba(2,132,199,0.15)" : "none",
                  marginBottom: "6px",
                }} />
                {/* Label */}
                <span style={{
                  fontSize: "9px",
                  fontWeight: current ? "600" : "400",
                  color: current ? "#0284c7" : completed ? "#64748b" : "#cbd5e1",
                  textAlign: "center",
                  letterSpacing: "0.1px",
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left sub-nav */}
        <div style={{ width: "200px", flexShrink: 0, background: "#fff", borderRight: "1px solid #e8ecf0", padding: "16px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {SUB_NAV.map((item) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 10px", borderRadius: "8px", border: "none", cursor: "pointer",
                  background: active ? "#f0f9ff" : "transparent",
                  color: active ? "#0284c7" : "#64748b",
                  fontSize: "13px", fontWeight: active ? "600" : "400",
                  textAlign: "left", width: "100%", position: "relative",
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
          {activeNav === "overzicht" ? (
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Row 1: 4 stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { label: "Koopsom",   value: deal.agreed_price ? formatEuro(deal.agreed_price) : "—" },
                  { label: "Looptijd",  value: `${days} dagen` },
                  { label: "Voortgang", value: `${progress}%` },
                  { label: "Status",    value: STAGES.find((s) => s.id === deal.stage)?.label ?? "—" },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "6px" }}>{stat.label}</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.3px" }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Row 2: Koper + Verkoper */}
              <div style={{ display: "flex", gap: "12px" }}>
                <ContactCard title="Koper" contact={deal.buyer} avatarColor="#0284c7" />
                <ContactCard title="Verkoper" contact={deal.seller} avatarColor="#16a34a" />
              </div>

              {/* Row 3: Deal details */}
              <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px 20px" }}>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "16px" }}>Dealgegevens</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {[
                    { label: "Adres",              value: deal.address ?? "—" },
                    { label: "Postcode + Stad",     value: [deal.postcode, deal.city].filter(Boolean).join(" ") || "—" },
                    { label: "Type object",         value: deal.property_type ?? "—" },
                    { label: "Overdrachtsdatum",    value: formatDate(deal.transfer_date) },
                    { label: "Notaris",             value: deal.notary_name ?? "Nog niet ingesteld" },
                    { label: "Aangemaakt op",       value: formatDate(deal.created_at) },
                  ].map((field) => (
                    <div key={field.label}>
                      <div style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "3px" }}>{field.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: field.value === "Nog niet ingesteld" ? "#94a3b8" : "#0f172a" }}>{field.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 4: Quick actions */}
              <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px 20px" }}>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>Snelle acties</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {ACTIONS.map((a) => (
                    <button key={a.label} style={{ padding: "10px 12px", background: a.bg, border: `1px solid ${a.border}`, borderRadius: "8px", color: a.color, fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "40px 32px", textAlign: "center", maxWidth: "360px", width: "100%" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                  {SUB_NAV.find((n) => n.id === activeNav)?.label} — komt binnenkort
                </div>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 20px" }}>Deze module is nog in ontwikkeling.</p>
                <button style={{ padding: "8px 16px", background: "#0284c7", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                  + Toevoegen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

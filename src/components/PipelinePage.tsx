"use client";

import { useState } from "react";
import Link from "next/link";
import type { DealWithContacts, DealStage } from "@/types/database";

const STAGES: { id: DealStage; label: string; short: string; bg: string; text: string; dot: string }[] = [
  { id: "lead",         label: "Lead",         short: "Lead",  bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" },
  { id: "bezichtiging", label: "Bezichtiging", short: "Bezic", bg: "#fef9c3", text: "#854d0e", dot: "#eab308" },
  { id: "bod",          label: "Bod",           short: "Bod",   bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  { id: "koopakte",     label: "Koopakte",      short: "Koop",  bg: "#ede9fe", text: "#5b21b6", dot: "#8b5cf6" },
  { id: "voorwaarden",  label: "Voorwaarden",   short: "Vw",    bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  { id: "financiering", label: "Financiering",  short: "Fin",   bg: "#ffedd5", text: "#9a3412", dot: "#f97316" },
  { id: "overdracht",   label: "Overdracht",    short: "Over",  bg: "#dcfce7", text: "#14532d", dot: "#22c55e" },
  { id: "gesloten",     label: "Gesloten",      short: "Ges",   bg: "#f1f5f9", text: "#374151", dot: "#6b7280" },
];

function stageMeta(id: DealStage) {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

function stageIndex(id: DealStage) {
  return STAGES.findIndex((s) => s.id === id);
}

function formatEuro(v: number) {
  return "€ " + v.toLocaleString("nl-NL");
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function isUrgent(deal: DealWithContacts) {
  if (!deal.transfer_date) return false;
  const days = Math.floor((new Date(deal.transfer_date).getTime() - Date.now()) / 86400000);
  return days >= 0 && days <= 7;
}

function StageBadge({ stage }: { stage: DealStage }) {
  const m = stageMeta(stage);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: m.bg, color: m.text }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

function DealCard({ deal, selected, onClick }: { deal: DealWithContacts; selected: boolean; onClick: () => void }) {
  const urgent = isUrgent(deal);
  const days = daysSince(deal.created_at);
  const progress = ((stageIndex(deal.stage as DealStage) + 1) / STAGES.length) * 100;

  return (
    <div
      onClick={onClick}
      style={{
        background: "#ffffff",
        border: selected ? "1px solid #0284c7" : "1px solid #e8ecf0",
        boxShadow: selected ? "0 0 0 3px rgba(2,132,199,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
        borderRadius: "12px",
        padding: "14px 16px",
        cursor: "pointer",
        marginBottom: "8px",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = "#cbd5e1"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = "#e8ecf0"; }}
    >
      {/* Row 1: address + price */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          {urgent && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />}
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {deal.address ?? deal.title}
          </span>
        </div>
        {(deal.agreed_price ?? deal.value) != null && (
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.3px", whiteSpace: "nowrap", marginLeft: "12px" }}>
            {formatEuro(deal.agreed_price ?? deal.value ?? 0)}
          </span>
        )}
      </div>

      {/* Row 2: buyer + type */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "13px", color: "#64748b" }}>{deal.buyer?.name ?? deal.contact_name ?? "—"}</span>
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>{deal.property_type ?? ""}</span>
      </div>

      {/* Row 3: badge + days */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <StageBadge stage={deal.stage as DealStage} />
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>{days} dagen</span>
      </div>

      {/* Row 4: progress bar */}
      <div style={{ height: "3px", background: "#f1f5f9", borderRadius: "2px" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: urgent ? "#ef4444" : "#0284c7", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function DetailPanel({ deal, onClose }: { deal: DealWithContacts; onClose: () => void }) {
  const days = daysSince(deal.created_at);
  const stageIdx = stageIndex(deal.stage as DealStage);

  const ACTIONS = [
    { label: "Document genereren", color: "#0284c7", bg: "#f0f9ff", border: "rgba(2,132,199,0.2)" },
    { label: "WhatsApp sturen",    color: "#16a34a", bg: "#f0fdf4", border: "rgba(22,163,74,0.2)" },
    { label: "Kadaster check",     color: "#7c3aed", bg: "#f5f3ff", border: "rgba(124,58,237,0.2)" },
    { label: "Voorwaarden",        color: "#ef4444", bg: "#fff1f2", border: "rgba(239,68,68,0.2)" },
  ];

  const ACTIVITY = [
    { text: "Deal aangemaakt",           time: `${days}d geleden`,  color: "#0284c7" },
    { text: "Bezichtiging ingepland",    time: `${Math.max(days-2,0)}d geleden`, color: "#eab308" },
    { text: "Bod ingediend",             time: `${Math.max(days-4,0)}d geleden`, color: "#3b82f6" },
    { text: "Koopakte in voorbereiding", time: "gisteren",           color: "#8b5cf6" },
  ].slice(0, stageIdx + 1 > 3 ? 4 : stageIdx + 1);

  return (
    <div style={{ flex: 1, background: "#f8fafc", overflowY: "auto", padding: "20px 24px" }}>
      {/* Header card */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "16px 20px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", margin: "0 0 4px" }}>{deal.address ?? deal.title}</h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>{[deal.city, deal.property_type].filter(Boolean).join(" · ")}</p>
          </div>
          <button onClick={onClose} style={{ background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Stage progress */}
        <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "2px", marginBottom: "6px", position: "relative" }}>
          {STAGES.map((s, i) => (
            <div key={s.id} style={{ position: "absolute", left: `${(i / STAGES.length) * 100}%`, width: `${100 / STAGES.length}%`, height: "100%", background: i <= stageIdx ? "#0284c7" : "transparent", borderRadius: i === 0 ? "2px 0 0 2px" : i === STAGES.length - 1 ? "0 2px 2px 0" : "0" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {STAGES.map((s, i) => (
            <span key={s.id} style={{ fontSize: "9px", color: i <= stageIdx ? "#0284c7" : "#94a3b8", fontWeight: i === stageIdx ? "600" : "400" }}>{s.short}</span>
          ))}
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        {[
          { label: "Koopsom",    value: deal.agreed_price ? formatEuro(deal.agreed_price) : "—", icon: "💶" },
          { label: "Koper",      value: deal.buyer?.name ?? "—", icon: "👤" },
          { label: "Looptijd",   value: `${days} dagen`, icon: "📅" },
          { label: "Voortgang",  value: `${Math.round(((stageIdx + 1) / STAGES.length) * 100)}%`, icon: "📊" },
        ].map((item) => (
          <div key={item.label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{item.icon} {item.label}</div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Snelle acties</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {ACTIONS.map((a) => (
            <button key={a.label} style={{ padding: "8px 10px", background: a.bg, border: `1px solid ${a.border}`, borderRadius: "8px", color: a.color, fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity feed */}
      <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", padding: "14px 16px" }}>
        <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Activiteit</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ACTIVITY.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: a.color, flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "#0f172a", flex: 1 }}>{a.text}</span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Props {
  deals: DealWithContacts[];
}

export default function PipelinePage({ deals }: Props) {
  const [activeFilter, setActiveFilter] = useState<DealStage | "alle">("alle");
  const [selectedDeal, setSelectedDeal] = useState<DealWithContacts | null>(null);

  const filtered = activeFilter === "alle" ? deals : deals.filter((d) => d.stage === activeFilter);
  const totalValue = deals.filter((d) => d.stage !== "gesloten").reduce((s, d) => s + (d.agreed_price ?? d.value ?? 0), 0);
  const activeCount = deals.filter((d) => d.stage !== "gesloten").length;
  const wonCount = deals.filter((d) => d.stage === "gesloten").length;
  const urgentCount = deals.filter(isUrgent).length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Pipeline</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>Beheer je vastgoedtransacties</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: "8px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input placeholder="Zoeken..." style={{ border: "none", background: "transparent", fontSize: "13px", color: "#0f172a", outline: "none", width: "140px" }} />
          </div>
          <Link href="/dashboard/new-deal" style={{ background: "#0284c7", color: "#fff", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: "600", textDecoration: "none", whiteSpace: "nowrap" }}>
            + Nieuwe deal
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", flexShrink: 0 }}>
        {[
          { label: "Actieve deals",    value: activeCount,             sub: "In behandeling" },
          { label: "Pipeline waarde",  value: formatEuro(totalValue),  sub: "Excl. gesloten" },
          { label: "Gesloten",         value: wonCount,                sub: "Dit jaar" },
          { label: "Urgente deadlines",value: urgentCount,             sub: "Binnen 7 dagen" },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: "16px 24px", borderRight: i < 3 ? "1px solid #e8ecf0" : "none" }}>
            <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", marginBottom: "2px" }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: filter + cards */}
        <div style={{ width: selectedDeal ? "380px" : "100%", minWidth: selectedDeal ? "380px" : undefined, display: "flex", flexDirection: "column", borderRight: selectedDeal ? "1px solid #e8ecf0" : "none", transition: "width 0.2s", overflow: "hidden" }}>
          {/* Filter pills */}
          <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", gap: "6px", overflowX: "auto", flexShrink: 0 }}>
            {[{ id: "alle", label: "Alle", count: deals.length }, ...STAGES.map((s) => ({ id: s.id, label: s.label, count: deals.filter((d) => d.stage === s.id).length }))].map((f) => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as DealStage | "alle")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: active ? "600" : "400", color: active ? "#0284c7" : "#64748b", background: active ? "#f0f9ff" : "#f8fafc", border: active ? "1px solid #0284c7" : "1px solid #e8ecf0", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.1s" }}
                >
                  {f.label}
                  <span style={{ fontSize: "11px", color: active ? "#0284c7" : "#94a3b8" }}>{f.count}</span>
                </button>
              );
            })}
          </div>

          {/* Deal list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "16px" }}>Nog geen deals — maak je eerste deal aan</p>
                <Link href="/dashboard/new-deal" style={{ background: "#0284c7", color: "#fff", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
                  + Nieuwe deal aanmaken
                </Link>
              </div>
            ) : (
              filtered.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  selected={selectedDeal?.id === deal.id}
                  onClick={() => setSelectedDeal(selectedDeal?.id === deal.id ? null : deal)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        {selectedDeal && <DetailPanel deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
      </div>
    </div>
  );
}

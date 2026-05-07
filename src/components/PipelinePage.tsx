"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 60) return `${diff}m geleden`;
  if (diff < 1440) return `${Math.floor(diff / 60)}u geleden`;
  return `${Math.floor(diff / 1440)}d geleden`;
}

interface Alert {
  id: string;
  type: "deadline" | "actie" | "update" | "stale";
  title: string;
  subtitle: string;
  timeAgo: string;
  borderColor: string;
  icon: string;
}

function buildAlerts(deals: DealWithContacts[]): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  for (const deal of deals) {
    const name = deal.address ?? deal.title ?? "Deal";

    // Voorwaarden + transfer_date deadline alerts
    if (deal.stage === "voorwaarden" && deal.transfer_date) {
      const daysLeft = Math.floor((new Date(deal.transfer_date).getTime() - now) / 86400000);
      if (daysLeft >= 0 && daysLeft < 3) {
        alerts.push({
          id: `deadline-${deal.id}`,
          type: "deadline",
          title: "Deadline nadert",
          subtitle: `${name} — nog ${daysLeft === 0 ? "vandaag" : `${daysLeft} dag${daysLeft === 1 ? "" : "en"}`}`,
          timeAgo: timeAgo(deal.updated_at ?? deal.created_at),
          borderColor: "#ef4444",
          icon: "🔴",
        });
        continue;
      }
      if (daysLeft >= 3 && daysLeft <= 7) {
        alerts.push({
          id: `actie-${deal.id}`,
          type: "actie",
          title: "Actie vereist",
          subtitle: `${name} — voorwaarden vervallen over ${daysLeft} dagen`,
          timeAgo: timeAgo(deal.updated_at ?? deal.created_at),
          borderColor: "#f59e0b",
          icon: "🟡",
        });
        continue;
      }
    }

    // Voorwaarden stage > 14 days with no transfer_date
    if (deal.stage === "voorwaarden") {
      const daysIn = Math.floor((now - new Date(deal.created_at).getTime()) / 86400000);
      if (daysIn > 14) {
        alerts.push({
          id: `vw-stale-${deal.id}`,
          type: "actie",
          title: "Actie vereist",
          subtitle: `${name} staat al ${daysIn} dagen in Voorwaarden`,
          timeAgo: timeAgo(deal.created_at),
          borderColor: "#f59e0b",
          icon: "🟡",
        });
      }
    }

    // No activity > 7 days (any non-closed deal)
    if (deal.stage !== "gesloten") {
      const daysSinceActivity = Math.floor((now - new Date(deal.updated_at ?? deal.created_at).getTime()) / 86400000);
      if (daysSinceActivity > 7) {
        alerts.push({
          id: `stale-${deal.id}`,
          type: "update",
          title: "Deal update",
          subtitle: `${name} — geen activiteit in ${daysSinceActivity} dagen`,
          timeAgo: timeAgo(deal.updated_at ?? deal.created_at),
          borderColor: "#0284c7",
          icon: "🔵",
        });
      }
    }
  }

  return alerts;
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

function DealCard({ deal, onClick }: { deal: DealWithContacts; onClick: () => void }) {
  const urgent = isUrgent(deal);
  const days = daysSince(deal.created_at);
  const progress = ((stageIndex(deal.stage as DealStage) + 1) / STAGES.length) * 100;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      style={{
        background: "#ffffff",
        border: "1px solid #e8ecf0",
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.04)",
        borderRadius: "12px",
        padding: "14px 16px",
        cursor: "pointer",
        marginBottom: "8px",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { setHovered(true); e.currentTarget.style.borderColor = "#cbd5e1"; }}
      onMouseLeave={(e) => { setHovered(false); e.currentTarget.style.borderColor = "#e8ecf0"; }}
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


interface Props {
  deals: DealWithContacts[];
}

export default function PipelinePage({ deals }: Props) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<DealStage | "alle">("alle");
  const [search, setSearch] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [read, setRead] = useState(false);

  const alerts = buildAlerts(deals);
  const hasAlerts = alerts.length > 0 && !read;

  const filtered = deals.filter((deal) => {
    const stageMatch = activeFilter === "alle" || deal.stage === activeFilter;
    if (!stageMatch) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      deal.address?.toLowerCase().includes(q) ||
      deal.city?.toLowerCase().includes(q) ||
      deal.buyer?.name?.toLowerCase().includes(q) ||
      deal.stage?.toLowerCase().includes(q)
    );
  });
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
            <input
              placeholder="Zoeken..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: "13px", color: "#0f172a", outline: "none", width: "140px" }}
            />
          </div>
          {/* Bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setBellOpen((o) => !o)}
              style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", color: "#64748b" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {hasAlerts && (
                <span style={{ position: "absolute", top: "4px", right: "4px", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", border: "2px solid #fff" }} />
              )}
            </button>

            {bellOpen && (
              <>
                {/* Click-away overlay */}
                <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setBellOpen(false)} />
                {/* Dropdown */}
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "320px", background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", zIndex: 50, overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Meldingen</span>
                    {alerts.length > 0 && (
                      <button
                        onClick={() => { setRead(true); setBellOpen(false); }}
                        style={{ fontSize: "11px", color: "#0284c7", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Alles als gelezen markeren
                      </button>
                    )}
                  </div>

                  {/* Alert list */}
                  {alerts.length === 0 ? (
                    <div style={{ padding: "32px 16px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
                      Geen nieuwe meldingen
                    </div>
                  ) : (
                    <div style={{ maxHeight: "340px", overflowY: "auto" }}>
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 16px", borderLeft: `3px solid ${alert.borderColor}`, borderBottom: "1px solid #f8fafc" }}
                        >
                          <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>{alert.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a", marginBottom: "2px" }}>{alert.title}</div>
                            <div style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{alert.subtitle}</div>
                          </div>
                          <span style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0, marginTop: "2px" }}>{alert.timeAgo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
                {search ? (
                  <>
                    <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "16px" }}>
                      Geen deals gevonden voor &lsquo;{search}&rsquo;
                    </p>
                    <button
                      onClick={() => setSearch("")}
                      style={{ background: "#f8fafc", border: "1px solid #e8ecf0", color: "#64748b", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                    >
                      ✕ Zoekopdracht wissen
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "16px" }}>Nog geen deals — maak je eerste deal aan</p>
                    <Link href="/dashboard/new-deal" style={{ background: "#0284c7", color: "#fff", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
                      + Nieuwe deal aanmaken
                    </Link>
                  </>
                )}
              </div>
            ) : (
              filtered.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => router.push(`/dashboard/${deal.id}`)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

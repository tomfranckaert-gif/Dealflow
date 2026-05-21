"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 60) return `${diff}m geleden`;
  if (diff < 1440) return `${Math.floor(diff / 60)}u geleden`;
  return `${Math.floor(diff / 1440)}d geleden`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 12) return "Goedemorgen";
  if (hour >= 12 && hour <= 17) return "Goedemiddag";
  if (hour >= 18 && hour <= 23) return "Goedenavond";
  return "Goedenacht";
}

interface Alert {
  id: string;
  type: "deadline" | "actie" | "update" | "stale" | "wwft" | "overdracht";
  title: string;
  subtitle: string;
  timeAgo: string;
  borderColor: string;
  icon: string;
  deal?: { id: string; address?: string | null; city?: string | null };
  action?: string;
  daysLeft?: number;
  cta: string;
}

function getAlertUrl(alert: Alert): string {
  if (!alert.deal?.id) return "/dashboard";
  const base = `/dashboard/${alert.deal.id}`;
  switch (alert.action) {
    case "whatsapp":    return `${base}?section=whatsapp`;
    case "voorwaarden": return `${base}?section=voorwaarden`;
    case "wwft":        return `${base}?section=wwft`;
    case "documents":   return `${base}?section=documenten`;
    case "transfer":    return `${base}?section=overdracht`;
    case "deal":
    default:            return base;
  }
}

function buildAlerts(deals: DealWithContacts[]): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  const daysUntilFn = (dateStr: string) =>
    Math.ceil((new Date(dateStr).getTime() - now) / 86400000);

  for (const deal of deals) {
    const name = deal.address ?? deal.title ?? "Deal";
    const dealRef = { id: deal.id, address: deal.address, city: deal.city };

    // Voorwaarden + transfer_date deadline alerts
    if (deal.stage === "voorwaarden" && deal.transfer_date) {
      const daysLeft = Math.floor((new Date(deal.transfer_date).getTime() - now) / 86400000);
      if (daysLeft >= 0 && daysLeft < 3) {
        alerts.push({
          id: `deadline-${deal.id}`,
          type: "deadline",
          title: "Voorwaarden vervallen binnenkort",
          subtitle: `Controleer en verwerk alle ontbindende voorwaarden`,
          timeAgo: timeAgo(deal.created_at),
          borderColor: "#ef4444",
          icon: "🔴",
          deal: dealRef,
          action: "voorwaarden",
          daysLeft,
          cta: "Voorwaarden bekijken",
        });
        continue;
      }
      if (daysLeft >= 3 && daysLeft <= 7) {
        alerts.push({
          id: `actie-${deal.id}`,
          type: "actie",
          title: `Voorwaarden verlopen over ${daysLeft} dagen`,
          subtitle: `Zorg dat alle ontbindende voorwaarden zijn afgehandeld`,
          timeAgo: timeAgo(deal.created_at),
          borderColor: "#f59e0b",
          icon: "🟡",
          deal: dealRef,
          action: "voorwaarden",
          daysLeft,
          cta: "Voorwaarden afhandelen",
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
          title: "Voorwaarden al lang open",
          subtitle: `Deal staat al ${daysIn} dagen in fase Voorwaarden`,
          timeAgo: timeAgo(deal.created_at),
          borderColor: "#f59e0b",
          icon: "🟡",
          deal: dealRef,
          action: "voorwaarden",
          cta: "Voorwaarden verwerken",
        });
      }
    }

    // No activity > 7 days (any non-closed deal)
    if (deal.stage !== "gesloten") {
      const daysSinceActivity = Math.floor((now - new Date(deal.created_at).getTime()) / 86400000);
      if (daysSinceActivity > 7) {
        alerts.push({
          id: `stale-${deal.id}`,
          type: "update",
          title: "Geen activiteit",
          subtitle: `Laatste activiteit ${daysSinceActivity} dagen geleden — neem contact op`,
          timeAgo: timeAgo(deal.created_at),
          borderColor: "#0284c7",
          icon: "🔵",
          deal: dealRef,
          action: "whatsapp",
          cta: "WhatsApp sturen",
        });
      }
    }

    // Waarborgsom alert
    if (deal.transfer_date) {
      const stage = deal.stage?.toLowerCase();
      if (["koopakte", "voorwaarden", "financiering"].includes(stage)) {
        const transferDate = new Date(deal.transfer_date);
        const waarborgsomDate = new Date(transferDate);
        waarborgsomDate.setMonth(waarborgsomDate.getMonth() - 4);
        const daysUntilWaarborgsom = Math.ceil((waarborgsomDate.getTime() - now) / 86400000);
        if (daysUntilWaarborgsom <= 7 && daysUntilWaarborgsom >= -3) {
          alerts.push({
            id: `waarborgsom-${deal.id}`,
            type: "deadline",
            title: daysUntilWaarborgsom <= 0 ? "Waarborgsom — controleer betaling" : "Waarborgsom verwacht",
            subtitle: daysUntilWaarborgsom <= 0
              ? `Controleer of de waarborgsom is gestort`
              : `Verwacht over ${daysUntilWaarborgsom} dagen`,
            timeAgo: timeAgo(deal.created_at),
            borderColor: daysUntilWaarborgsom <= 2 ? "#ef4444" : "#f97316",
            icon: "🏦",
            deal: dealRef,
            action: "documents",
            daysLeft: daysUntilWaarborgsom > 0 ? daysUntilWaarborgsom : 0,
            cta: "Documenten bekijken",
          });
        }
      }
    }

    // Inspectie reminder — 14 days before transport
    if (deal.transfer_date) {
      const stage = deal.stage?.toLowerCase();
      if (["financiering", "overdracht"].includes(stage)) {
        const days = daysUntilFn(deal.transfer_date);
        if (days <= 14 && days > 7) {
          alerts.push({
            id: `inspectie-${deal.id}`,
            type: "actie",
            title: "Inspectie inplannen",
            subtitle: `Transport over ${days} dagen — plan de pre-oplevering in`,
            timeAgo: timeAgo(deal.created_at),
            borderColor: "#f59e0b",
            icon: "🔍",
            deal: dealRef,
            action: "transfer",
            daysLeft: days,
            cta: "Overdracht plannen",
          });
        }
      }
    }

    // Wwft incomplete — flag all koopakte+ deals
    if (["koopakte", "voorwaarden", "financiering", "overdracht"].includes(deal.stage?.toLowerCase() ?? "")) {
      alerts.push({
        id: `wwft-${deal.id}`,
        type: "wwft",
        title: "Wwft dossier controleren",
        subtitle: `Identiteitsverificatie vereist voor koopakte fase`,
        timeAgo: timeAgo(deal.created_at),
        borderColor: "#7c3aed",
        icon: "🛡",
        deal: dealRef,
        action: "wwft",
        cta: "Wwft invullen",
      });
    }

    // Overdracht without transfer_date
    if (deal.stage?.toLowerCase() === "overdracht" && !deal.transfer_date) {
      alerts.push({
        id: `transfer-missing-${deal.id}`,
        type: "overdracht",
        title: "Overdrachtsdatum niet ingesteld",
        subtitle: `Stel datum in om de notaris te kunnen informeren`,
        timeAgo: timeAgo(deal.created_at),
        borderColor: "#f97316",
        icon: "📅",
        deal: dealRef,
        action: "transfer",
        cta: "Datum instellen",
      });
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
  const days = daysSince(deal.created_at);
  const progress = ((stageIndex(deal.stage as DealStage) + 1) / STAGES.length) * 100;
  const [hovered, setHovered] = useState(false);

  // Urgent: voorwaarden expiring ≤7d, stage stuck >21d, or no activity >10d
  const voorwaardenExpiring =
    deal.stage === "voorwaarden" && deal.transfer_date != null && daysUntil(deal.transfer_date) <= 7;
  const stageStuck = days > 21;
  const noActivity = days > 10 && deal.stage !== "gesloten";
  const showUrgentDot = voorwaardenExpiring || stageStuck || noActivity;

  // Price: prefer agreed, fall back to asking, then value
  const price = deal.agreed_price ?? deal.asking_price ?? deal.value ?? null;
  const isAgreed = deal.agreed_price != null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        border: `1px solid ${hovered ? "#cbd5e1" : "#e8ecf0"}`,
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
        borderRadius: "12px",
        padding: "14px 16px",
        cursor: "pointer",
        marginBottom: "8px",
        transition: "all 0.15s",
        opacity: deal.stage === "gesloten" ? 0.6 : 1,
      }}
    >
      {/* Row 1: address + price */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0, flex: 1 }}>
          {showUrgentDot && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 0 2px rgba(239,68,68,0.3)", flexShrink: 0 }} />
          )}
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {deal.address ?? deal.title}
          </span>
        </div>
        {price != null && (
          <div style={{ flexShrink: 0, marginLeft: 12, textAlign: "right" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>
              {formatEuro(price)}
            </div>
            {!isAgreed && (
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Vraagprijs</div>
            )}
          </div>
        )}
      </div>

      {/* Row 2: buyer + seller */}
      <div style={{ marginBottom: "5px" }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>{deal.buyer?.name ?? deal.contact_name ?? "—"}</div>
        {deal.seller?.name && (
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Verkoper: {deal.seller.name}</div>
        )}
      </div>

      {/* Row 3: property type + surface */}
      {(deal.property_type || deal.surface) && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: "8px" }}>
          {deal.property_type ?? ""}
          {deal.surface ? ` · ${deal.surface}m²` : ""}
        </div>
      )}

      {/* Row 4: stage badge + transfer date + days */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StageBadge stage={deal.stage as DealStage} />
          {deal.transfer_date && (
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: daysUntil(deal.transfer_date) <= 14 ? "#ef4444" : "#64748b",
            }}>
              Overdracht: {new Date(deal.transfer_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>{days}d</span>
      </div>

      {/* Row 5: progress bar */}
      <div style={{ height: "3px", background: "#f1f5f9", borderRadius: "2px" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: showUrgentDot ? "#ef4444" : "#0284c7", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}


interface Props {
  deals: DealWithContacts[];
}

export default function PipelinePage({ deals }: Props) {
  const router = useRouter();
  const alertsRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<DealStage | "alle">("alle");
  const [search, setSearch] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [read, setRead] = useState(false);
  const [agentName, setAgentName] = useState("Makelaar");
  const [today, setToday] = useState("");
  const [tip, setTip] = useState("");
  const [tipLoading, setTipLoading] = useState(true);
  const [viewings, setViewings] = useState<any[]>([]);
  useEffect(() => {
    setToday(new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("agents").select("name").eq("id", user.id).single().then(({ data: agent }) => {
        setAgentName(agent?.name || user?.email?.split("@")[0] || "Makelaar");
      });
    });
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    supabase
      .from("viewings")
      .select("*, deals(*)")
      .gte("scheduled_at", todayStr)
      .lt("scheduled_at", tomorrowStr)
      .order("scheduled_at", { ascending: true })
      .then(({ data }) => setViewings(data ?? []));
  }, []);

  const fetchTip = async () => {
    setTipLoading(true);
    const res = await fetch("/api/generate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "daily-tip", dealCount: deals.length, urgentCount: 0, stage: "Voorwaarden" }),
    });
    const data = await res.json();
    setTip(data.message);
    setTipLoading(false);
  };

  useEffect(() => { fetchTip(); }, []);

  const mockSearchers = [
    { name: "Ahmed Al-Hassan", budget: 500000, type: "appartement", city: "Amsterdam" },
    { name: "Familie Bakker",  budget: 750000, type: "eengezinswoning", city: "Amsterdam" },
    { name: "Ingrid de Wit",   budget: 400000, type: "appartement", city: "Amsterdam" },
  ];

  const matches = mockSearchers.flatMap((searcher) =>
    deals
      .filter((d) =>
        d.stage?.toLowerCase() !== "gesloten" &&
        (d.agreed_price || 0) <= searcher.budget &&
        d.property_type?.toLowerCase() === searcher.type &&
        d.city?.toLowerCase() === searcher.city.toLowerCase()
      )
      .map((deal) => ({ searcher, deal }))
  );

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

  const greeting = getGreeting();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Page header — fixed */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf0", padding: "16px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>
              {greeting}, {agentName} 👋
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4, textTransform: "capitalize" }}>
              {today}
            </div>
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
                  <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setBellOpen(false)} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "320px", background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", zIndex: 50, overflow: "hidden" }}>
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
                    {alerts.length === 0 ? (
                      <div style={{ padding: "32px 16px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
                        Geen nieuwe meldingen
                      </div>
                    ) : (
                      <div style={{ maxHeight: "340px", overflowY: "auto" }}>
                        {alerts.map((alert) => (
                          <div
                            key={alert.id}
                            onClick={() => { router.push(getAlertUrl(alert)); setBellOpen(false); }}
                            style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 16px", borderLeft: `3px solid ${alert.borderColor}`, borderBottom: "1px solid #f8fafc", cursor: "pointer", transition: "background 0.1s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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

        {/* AI daily tip */}
        <div style={{
          background: "linear-gradient(135deg,#f0f9ff,#f5f3ff)",
          border: "1px solid #c7d2fe",
          borderRadius: 10, padding: "14px 18px",
          display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 10, color: "#6366f1", letterSpacing: "0.1em", marginBottom: 4 }}>
              ✦ AI TIP VOOR VANDAAG
            </div>
            <div style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>
              {tipLoading ? "Tip wordt geladen..." : tip}
            </div>
          </div>
          <button onClick={fetchTip} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>↻</button>
        </div>
      </div>

      {/* Stats row — fixed below topbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", flexShrink: 0 }}>
        {[
          {
            label: "Actieve deals",     value: activeCount,            sub: "In behandeling",
            onClick: () => router.push("/dashboard"),
          },
          {
            label: "Pipeline waarde",   value: formatEuro(totalValue), sub: "Excl. gesloten",
            onClick: null as (() => void) | null,
          },
          {
            label: "Gesloten",          value: wonCount,               sub: "Dit jaar",
            onClick: () => router.push("/dashboard/statistieken"),
          },
          {
            label: "Urgente deadlines", value: urgentCount,            sub: "Binnen 7 dagen",
            onClick: () => alertsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          },
        ].map((s, i) => (
          <div
            key={s.label}
            onClick={s.onClick ?? undefined}
            style={{ padding: "16px 24px", borderRight: i < 3 ? "1px solid #e8ecf0" : "none", cursor: s.onClick ? "pointer" : "default", transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={(e) => { if (s.onClick) { e.currentTarget.style.borderColor = "#0284c7"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; } }}
            onMouseLeave={(e) => { if (s.onClick) { e.currentTarget.style.borderColor = i < 3 ? "#e8ecf0" : ""; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; } }}
          >
            <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", marginBottom: "2px" }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Scrollable content — everything below topbar + stats row */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

        {/* KRITIEK alerts */}
        <div ref={alertsRef} style={{ background: "#f8fafc", padding: "0 24px" }}>
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12, color: alerts.length > 0 ? "#ef4444" : "#16a34a" }}>
              {alerts.length > 0 ? `KRITIEK — ${alerts.length} ACTIE${alerts.length === 1 ? "" : "S"} VEREIST` : "KRITIEK — ALLES OP SCHEMA"}
            </div>
            {alerts.length === 0 ? (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>Alles op schema</div>
                  <div style={{ fontSize: 11, color: "#16a34a", opacity: 0.8 }}>Geen urgente acties voor vandaag</div>
                </div>
              </div>
            ) : (
              alerts.map((alert) => {
                const base = `/dashboard/${alert.deal?.id}`;
                const sectionParam = alert.action === "voorwaarden" ? "voorwaarden"
                  : alert.action === "wwft" ? "wwft"
                  : alert.action === "documents" ? "documenten"
                  : alert.action === "transfer" ? "overdracht"
                  : alert.action === "whatsapp" ? "whatsapp"
                  : "";
                const href = alert.deal?.id ? (sectionParam ? `${base}?section=${sectionParam}` : base) : "/dashboard";
                return (
                  <div
                    key={alert.id}
                    onClick={() => router.push(href)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderLeft: `4px solid ${alert.borderColor}`, background: "#fff", border: `1px solid #e8ecf0`, borderRadius: 8, marginBottom: 6, cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{alert.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{alert.title}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {alert.deal?.address ?? ""}{alert.deal?.city ? ` · ${alert.deal.city}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{alert.subtitle}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      {alert.daysLeft !== undefined && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: alert.daysLeft <= 1 ? "#ef4444" : alert.daysLeft <= 3 ? "#f97316" : "#eab308", background: alert.daysLeft <= 1 ? "#fef2f2" : alert.daysLeft <= 3 ? "#fff7ed" : "#fefce8", padding: "2px 8px", borderRadius: 20 }}>
                          {alert.daysLeft <= 0 ? "VERLOPEN" : alert.daysLeft === 1 ? "Morgen" : `${alert.daysLeft} dagen`}
                        </div>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 600, color: alert.borderColor, background: `${alert.borderColor}18`, border: `1px solid ${alert.borderColor}30`, padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>
                        {alert.cta} →
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Agenda vandaag */}
        <div style={{ background: "#f8fafc", padding: "0 24px" }}>
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.15em" }}>
                AGENDA VANDAAG
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {new Date().toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
              </div>
            </div>
            {viewings.length > 0 ? (
              viewings.map((v, i) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < viewings.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", width: 44, flexShrink: 0 }}>
                    {new Date(v.scheduled_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: v.status === "bevestigd" ? "#16a34a" : "#f97316" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#0f172a" }}>{v.deals?.address || "Onbekend adres"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{v.status}</div>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/${v.deal_id}`)}
                    style={{ fontSize: 11, color: "#0284c7", background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    Openen →
                  </button>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
                Geen afspraken vandaag 🎉
              </div>
            )}
          </div>
        </div>

        {/* Financieel overzicht */}
        {(() => {
          const courtage_pct = 0.015;
          const overdrachtDeals = deals.filter((d) => d.stage?.toLowerCase() === "overdracht");
          const totalCourtage = deals
            .filter((d) => d.stage?.toLowerCase() !== "gesloten")
            .reduce((sum, d) => sum + ((d.agreed_price || 0) * courtage_pct), 0);
          const overdrachtCourtage = overdrachtDeals.reduce((sum, d) => sum + ((d.agreed_price || 0) * courtage_pct), 0);
          const activeDeals = deals.filter((d) => d.stage?.toLowerCase() !== "gesloten");
          return (
            <div style={{ background: "#f8fafc", padding: "0 24px" }}>
              <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 14 }}>
                  FINANCIEEL OVERZICHT
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "OVERDRACHTEN", value: overdrachtDeals.length.toString(), sub: "€ " + overdrachtCourtage.toLocaleString("nl-NL", { maximumFractionDigits: 0 }) + " verwacht", bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a" },
                    { label: "OPENSTAANDE FACTUREN", value: "€ 0", sub: "Gesynchroniseerd via WeFact", bg: "#fef9c3", border: "#fde047", color: "#854d0e" },
                    { label: "VERWACHT DEZE MAAND", value: "€ " + totalCourtage.toLocaleString("nl-NL", { maximumFractionDigits: 0 }), sub: activeDeals.length + " actieve deals", bg: "#f0f9ff", border: "#bae6fd", color: "#0284c7" },
                  ].map((card, i) => (
                    <div key={i} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 9, color: card.color, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>{card.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: card.color, marginBottom: 2 }}>{card.value}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{card.sub}</div>
                    </div>
                  ))}
                </div>
                {overdrachtDeals.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
                      AANKOMENDE OVERDRACHTEN
                    </div>
                    {overdrachtDeals.map((d, i) => {
                      const days = d.transfer_date ? Math.ceil((new Date(d.transfer_date).getTime() - Date.now()) / 86400000) : null;
                      const courtage = (d.agreed_price || 0) * courtage_pct;
                      return (
                        <div key={d.id} onClick={() => router.push(`/dashboard/${d.id}`)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px", fontSize: 12, borderBottom: i < overdrachtDeals.length - 1 ? "1px solid #f8fafc" : "none", alignItems: "center", cursor: "pointer", borderRadius: 6, transition: "background 0.1s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                          <div>
                            <span style={{ color: "#0f172a", fontWeight: 500 }}>{d.address}</span>
                            {d.transfer_date && (
                              <span style={{ color: "#94a3b8", marginLeft: 8 }}>
                                {new Date(d.transfer_date).toLocaleDateString("nl-NL")}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <span style={{ color: "#16a34a", fontWeight: 600 }}>{"€ " + courtage.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}</span>
                            {days !== null && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: days <= 7 ? "#ef4444" : days <= 14 ? "#f97316" : "#94a3b8" }}>
                                over {days}d
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Filter pills — sticky within scroll container */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, padding: "12px 16px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", gap: "6px", overflowX: "auto" }}>
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
        <div style={{ padding: "12px 16px" }}>
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

          {/* Match alerts */}
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px", marginBottom: 16, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.15em" }}>MATCH ALERTS</div>
              <div style={{ fontSize: 11, background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 20, padding: "2px 10px" }}>
                {matches.length} matches
              </div>
            </div>
            {matches.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {matches.map((m, i) => (
                  <div key={i} style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{m.searcher.name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{"zoekt " + m.searcher.type + " tot € " + m.searcher.budget.toLocaleString("nl-NL")}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", marginBottom: 6 }}>{m.deal.address}</div>
                      <button
                        onClick={() => {
                          const msg = encodeURIComponent(
                            `Goedemorgen ${m.searcher.name.split(" ")[0]}! 👋\n\nIk heb een woning die perfect bij jou past:\n\n📍 ${m.deal.address}${m.deal.city ? `, ${m.deal.city}` : ""}\n💶 ${m.deal.agreed_price ? "€ " + m.deal.agreed_price.toLocaleString("nl-NL") : "Prijs op aanvraag"}\n🏠 ${m.deal.property_type ?? ""}\n\nHeb je interesse in een bezichtiging?`
                          );
                          window.open(`https://wa.me/?text=${msg}`, "_blank");
                        }}
                        style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#fff", border: "1px solid #ddd6fe", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                      >
                        WhatsApp sturen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>
                Geen matches op dit moment
              </div>
            )}
            <div style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic", marginTop: 12 }}>
              Zoekopdrachten worden gesynchroniseerd via Realworks koppeling
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

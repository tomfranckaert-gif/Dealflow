import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Deal, DealStage } from "@/types/database";

const STAGE_BADGE: Record<DealStage, { bg: string; text: string; dot: string; label: string }> = {
  lead:         { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8",  label: "Lead" },
  bezichtiging: { bg: "#fef9c3", text: "#854d0e", dot: "#eab308",  label: "Bezichtiging" },
  bod:          { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6",  label: "Bod" },
  koopakte:     { bg: "#ede9fe", text: "#5b21b6", dot: "#8b5cf6",  label: "Koopakte" },
  voorwaarden:  { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444",  label: "Voorwaarden" },
  financiering: { bg: "#ffedd5", text: "#9a3412", dot: "#f97316",  label: "Financiering" },
  overdracht:   { bg: "#dcfce7", text: "#14532d", dot: "#22c55e",  label: "Overdracht" },
  gesloten:     { bg: "#f1f5f9", text: "#374151", dot: "#6b7280",  label: "Gesloten" },
};

function formatEuro(v: number) {
  return "€ " + v.toLocaleString("nl-NL");
}

function todayNL() {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 60) return `${diff}m geleden`;
  if (diff < 1440) return `${Math.floor(diff / 60)}u geleden`;
  return `${Math.floor(diff / 1440)}d geleden`;
}

function StagePill({ stage }: { stage: DealStage }) {
  const b = STAGE_BADGE[stage] ?? STAGE_BADGE.lead;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: b.bg, color: b.text }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: b.dot }} />
      {b.label}
    </span>
  );
}

export default async function OverzichtPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // --- Fetch all deals ---
  const { data: deals = [] } = await supabase
    .from("deals")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const allDeals = (deals ?? []) as Deal[];
  const now = Date.now();
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  // --- KPIs ---
  const active = allDeals.filter((d) => d.stage !== "gesloten");
  const pipelineValue = active.reduce((s, d) => s + (d.agreed_price ?? d.value ?? 0), 0);
  const closedThisYear = allDeals.filter((d) => d.stage === "gesloten" && d.created_at >= startOfYear).length;
  const avgDays = active.length
    ? Math.round(active.reduce((s, d) => s + (now - new Date(d.created_at).getTime()) / 86400000, 0) / active.length)
    : 0;

  // --- Deals needing attention today ---
  const attention = allDeals.filter((d) => {
    if (d.stage === "gesloten") return false;
    // voorwaarden deadline within 7 days
    if (d.stage === "voorwaarden" && d.transfer_date) {
      const daysLeft = Math.floor((new Date(d.transfer_date).getTime() - now) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 7) return true;
    }
    // created today
    if (d.created_at >= startOfToday) return true;
    return false;
  }).slice(0, 5);

  // --- Recent messages ---
  const { data: messages = [] } = await supabase
    .from("messages")
    .select("id, created_at, content, deal_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Build deal address lookup
  const dealMap = new Map(allDeals.map((d) => [d.id, d.address ?? d.title ?? "Deal"]));

  const recentActivity = ((messages ?? []) as { id: string; created_at: string; content: string; deal_id: string }[]).map((m) => ({
    id: m.id,
    icon: "💬",
    description: m.content.slice(0, 60) + (m.content.length > 60 ? "…" : ""),
    dealName: dealMap.get(m.deal_id) ?? "—",
    dealId: m.deal_id,
    time: timeAgo(m.created_at),
  }));

  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px",
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>Overzicht</span>
        <span style={{ fontSize: "13px", color: "#94a3b8", textTransform: "capitalize" }}>{todayNL()}</span>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "Actieve deals",     value: active.length,           sub: "In behandeling" },
            { label: "Pipeline waarde",   value: formatEuro(pipelineValue), sub: "Excl. gesloten" },
            { label: "Gesloten dit jaar", value: closedThisYear,          sub: "Afgerond" },
            { label: "Gem. looptijd",     value: `${avgDays} dagen`,      sub: "Actieve deals" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ ...card, padding: "16px 18px" }}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>{kpi.label}</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px", marginBottom: "2px" }}>{kpi.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Two-column row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* Mijn deals vandaag */}
          <div style={card}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Mijn deals vandaag</span>
              <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "8px" }}>vereisen aandacht</span>
            </div>
            {attention.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
                Geen urgente deals vandaag
              </div>
            ) : (
              <div>
                {attention.map((deal, i) => (
                  <div key={deal.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: i < attention.length - 1 ? "1px solid #f8fafc" : "none" }}>
                    <div style={{ minWidth: 0, marginRight: "12px" }}>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {deal.address ?? deal.title}
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        <StagePill stage={deal.stage as DealStage} />
                      </div>
                    </div>
                    <Link href={`/dashboard/${deal.id}`} style={{ fontSize: "12px", color: "#0284c7", fontWeight: "600", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                      Bekijk deal →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recente activiteit */}
          <div style={card}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Recente activiteit</span>
            </div>
            {recentActivity.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
                Nog geen activiteit
              </div>
            ) : (
              <div>
                {recentActivity.map((item, i) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 18px", borderBottom: i < recentActivity.length - 1 ? "1px solid #f8fafc" : "none" }}>
                    <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{item.dealName}</div>
                    </div>
                    <span style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Snelle acties */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Nieuwe deal", href: "/dashboard/new-deal", icon: "➕", color: "#0284c7", bg: "#f0f9ff", border: "rgba(2,132,199,0.2)" },
            { label: "Document genereren", href: "/dashboard", icon: "📄", color: "#7c3aed", bg: "#f5f3ff", border: "rgba(124,58,237,0.2)" },
            { label: "WhatsApp opstellen", href: "/dashboard", icon: "💬", color: "#16a34a", bg: "#f0fdf4", border: "rgba(22,163,74,0.2)" },
          ].map((a) => (
            <Link key={a.label} href={a.href} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "14px 18px", borderRadius: "12px",
              background: a.bg, border: `1px solid ${a.border}`,
              color: a.color, fontSize: "13px", fontWeight: "600",
              textDecoration: "none",
            }}>
              <span style={{ fontSize: "18px" }}>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}

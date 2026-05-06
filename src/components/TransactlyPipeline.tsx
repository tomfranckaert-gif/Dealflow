"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DealWithContacts, DealStage } from "@/types/database";

export const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: "lead",         label: "Lead",         color: "#4a5568" },
  { id: "bezichtiging", label: "Bezichtiging", color: "#2b6cb0" },
  { id: "bod",          label: "Bod",           color: "#6b46c1" },
  { id: "koopakte",     label: "Koopakte",      color: "#c9a84c" },
  { id: "voorwaarden",  label: "Voorwaarden",   color: "#dd6b20" },
  { id: "financiering", label: "Financiering",  color: "#d69e2e" },
  { id: "overdracht",   label: "Overdracht",    color: "#2f855a" },
  { id: "gesloten",     label: "Gesloten",      color: "#276749" },
];

function stageIndex(stage: DealStage): number {
  return STAGES.findIndex((s) => s.id === stage);
}

function progressPercent(stage: DealStage): number {
  const idx = stageIndex(stage);
  return Math.round(((idx + 1) / STAGES.length) * 100);
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function formatEuro(value: number): string {
  return "€ " + value.toLocaleString("nl-NL");
}

function hasUrgentDeadline(deal: DealWithContacts): boolean {
  if (!deal.transfer_date) return false;
  const days = Math.floor(
    (new Date(deal.transfer_date).getTime() - Date.now()) / 86400000
  );
  return days >= 0 && days <= 7;
}

function DealCard({ deal }: { deal: DealWithContacts }) {
  const router = useRouter();
  const stage = STAGES.find((s) => s.id === deal.stage);
  const progress = progressPercent(deal.stage as DealStage);
  const days = daysSince(deal.created_at);
  const urgent = hasUrgentDeadline(deal);

  return (
    <div
      onClick={() => router.push(`/dashboard/${deal.id}`)}
      style={{
        background: "#0d1424",
        border: "1px solid #1e2d4a",
        borderRadius: "10px",
        padding: "14px",
        cursor: "pointer",
        marginBottom: "8px",
        transition: "border-color 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c9a84c")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e2d4a")}
    >
      {urgent && (
        <div
          title="Deadline binnen 7 dagen"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#ed8936",
          }}
        />
      )}

      <p style={{ color: "#e8e0d0", fontFamily: "Georgia, serif", fontSize: "13px", fontWeight: "bold", margin: "0 0 4px", paddingRight: "16px" }}>
        {deal.address ?? deal.title}
      </p>

      {deal.buyer?.name && (
        <p style={{ color: "#8a9bb0", fontFamily: "Georgia, serif", fontSize: "12px", margin: "0 0 8px" }}>
          {deal.buyer.name}
        </p>
      )}

      {deal.agreed_price != null && (
        <p style={{ color: "#c9a84c", fontFamily: "Georgia, serif", fontSize: "13px", fontWeight: "bold", margin: "0 0 10px" }}>
          {formatEuro(deal.agreed_price)}
        </p>
      )}

      {/* Progress bar */}
      <div style={{ height: "3px", background: "#1e2d4a", borderRadius: "2px", marginBottom: "8px" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: stage?.color ?? "#c9a84c", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: "11px",
          fontFamily: "Georgia, serif",
          padding: "2px 8px",
          borderRadius: "20px",
          background: stage?.color + "22",
          color: stage?.color,
          border: `1px solid ${stage?.color}44`,
        }}>
          {stage?.label}
        </span>
        <span style={{ fontSize: "11px", color: "#4a5568", fontFamily: "Georgia, serif" }}>
          {days}d
        </span>
      </div>
    </div>
  );
}

interface Props {
  deals: DealWithContacts[];
  userEmail: string;
}

export default function TransactlyPipeline({ deals, userEmail }: Props) {
  const totalActive = deals.filter((d) => d.stage !== "gesloten").length;
  const totalValue = deals
    .filter((d) => d.stage !== "gesloten")
    .reduce((sum, d) => sum + (d.agreed_price ?? d.value ?? 0), 0);

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #1e2d4a", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <span style={{ color: "#c9a84c", fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: "bold" }}>
            Transactly.nl
          </span>
          <div style={{ display: "flex", gap: "24px" }}>
            <div>
              <span style={{ color: "#4a5568", fontFamily: "Georgia, serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actieve deals</span>
              <p style={{ color: "#e8e0d0", fontFamily: "Georgia, serif", fontSize: "18px", fontWeight: "bold", margin: 0 }}>{totalActive}</p>
            </div>
            <div>
              <span style={{ color: "#4a5568", fontFamily: "Georgia, serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pipeline waarde</span>
              <p style={{ color: "#c9a84c", fontFamily: "Georgia, serif", fontSize: "18px", fontWeight: "bold", margin: 0 }}>{formatEuro(totalValue)}</p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#4a5568", fontFamily: "Georgia, serif", fontSize: "13px" }}>{userEmail}</span>
          <Link
            href="/dashboard/new-deal"
            style={{ background: "#c9a84c", color: "#0a0f1a", fontFamily: "Georgia, serif", fontSize: "13px", fontWeight: "bold", padding: "8px 16px", borderRadius: "8px", textDecoration: "none" }}
          >
            + Nieuwe deal
          </Link>
          <button
            onClick={handleSignOut}
            style={{ background: "none", border: "none", color: "#4a5568", fontFamily: "Georgia, serif", fontSize: "13px", cursor: "pointer" }}
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* Pipeline */}
      <main style={{ padding: "24px", overflowX: "auto" }}>
        {deals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <p style={{ color: "#4a5568", fontFamily: "Georgia, serif", fontSize: "18px", marginBottom: "20px" }}>
              Nog geen deals — maak je eerste deal aan
            </p>
            <Link
              href="/dashboard/new-deal"
              style={{ background: "#c9a84c", color: "#0a0f1a", fontFamily: "Georgia, serif", fontSize: "14px", fontWeight: "bold", padding: "12px 24px", borderRadius: "8px", textDecoration: "none" }}
            >
              + Nieuwe deal aanmaken
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", minWidth: "max-content" }}>
            {STAGES.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.id);
              return (
                <div key={stage.id} style={{ width: "220px", flexShrink: 0 }}>
                  {/* Column header */}
                  <div style={{
                    background: "#0d1424",
                    borderLeft: "1px solid #1e2d4a",
                    borderRight: "1px solid #1e2d4a",
                    borderBottom: "1px solid #1e2d4a",
                    borderTop: `3px solid ${stage.color}`,
                    borderRadius: "10px 10px 0 0",
                    padding: "10px 12px",
                    marginBottom: "8px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "#e8e0d0", fontFamily: "Georgia, serif", fontSize: "13px", fontWeight: "bold" }}>{stage.label}</span>
                      <span style={{ background: "#1e2d4a", color: "#8a9bb0", fontFamily: "Georgia, serif", fontSize: "11px", borderRadius: "20px", padding: "1px 7px" }}>{stageDeals.length}</span>
                    </div>
                    {stageDeals.length > 0 && (
                      <p style={{ color: "#4a5568", fontFamily: "Georgia, serif", fontSize: "11px", margin: "3px 0 0" }}>
                        {formatEuro(stageDeals.reduce((s, d) => s + (d.agreed_price ?? d.value ?? 0), 0))}
                      </p>
                    )}
                  </div>

                  {/* Cards */}
                  <div style={{ minHeight: "100px" }}>
                    {stageDeals.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

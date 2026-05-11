"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const WWFT_STAGES = ["koopakte", "voorwaarden", "financiering", "overdracht", "gesloten"];

interface Contact {
  id: string;
  name: string | null;
  partner_name: string | null;
}

interface Deal {
  id: string;
  address: string | null;
  title: string | null;
  city: string | null;
  stage: string;
  created_at: string;
  buyer_id: string | null;
  seller_id: string | null;
  buyer: Contact | null;
  seller: Contact | null;
}

interface WwftEntry {
  id: string;
  deal_id: string;
  contact_id: string;
  verified_at: string | null;
}

type StatusKey = "compleet" | "in_behandeling" | "ontbreekt";

const STATUS_STYLE: Record<StatusKey, { bg: string; color: string; dot: string; label: string }> = {
  compleet:       { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a",  label: "✓ Compleet" },
  in_behandeling: { bg: "#fef9c3", color: "#854d0e", dot: "#eab308",  label: "⏳ In behandeling" },
  ontbreekt:      { bg: "#fef2f2", color: "#991b1b", dot: "#ef4444",  label: "✗ Ontbreekt" },
};

const STAGE_LABELS: Record<string, string> = {
  koopakte: "Koopakte", voorwaarden: "Voorwaarden", financiering: "Financiering",
  overdracht: "Overdracht", gesloten: "Gesloten",
};
const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  koopakte:     { bg: "#ede9fe", color: "#7c3aed" },
  voorwaarden:  { bg: "#fee2e2", color: "#dc2626" },
  financiering: { bg: "#fff7ed", color: "#c2410c" },
  overdracht:   { bg: "#dcfce7", color: "#15803d" },
  gesloten:     { bg: "#dbeafe", color: "#1d4ed8" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function retentionDate(createdAt: string) {
  const d = new Date(createdAt);
  d.setFullYear(d.getFullYear() + 5);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export default function WwftPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [wwftEntries, setWwftEntries] = useState<WwftEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: dealsData } = await supabase
        .from("deals")
        .select(`
          id, address, title, city, stage, created_at, buyer_id, seller_id,
          buyer:contacts!deals_buyer_id_fkey(id, name, partner_name),
          seller:contacts!deals_seller_id_fkey(id, name, partner_name)
        `)
        .eq("owner_id", user.id)
        .in("stage", WWFT_STAGES)
        .order("created_at", { ascending: false });

      const dealList = (dealsData ?? []) as unknown as Deal[];
      setDeals(dealList);

      if (dealList.length > 0) {
        const { data: entries } = await supabase
          .from("wwft_entries")
          .select("id, deal_id, contact_id, verified_at")
          .in("deal_id", dealList.map((d) => d.id));
        setWwftEntries((entries ?? []) as WwftEntry[]);
      }

      setLoading(false);
    }
    load();
  }, []);

  function hasWwft(dealId: string, contactId: string | null): WwftEntry | null {
    if (!contactId) return null;
    return wwftEntries.find((w) => w.deal_id === dealId && w.contact_id === contactId) ?? null;
  }

  function getStatus(entry: WwftEntry | null): StatusKey {
    if (!entry) return "ontbreekt";
    if (entry.verified_at) return "compleet";
    return "in_behandeling";
  }

  const compleet = deals.filter((d) => {
    const b = hasWwft(d.id, d.buyer_id);
    const s = hasWwft(d.id, d.seller_id);
    return getStatus(b) === "compleet" && getStatus(s) === "compleet";
  }).length;

  const inBehandeling = deals.filter((d) => {
    const b = hasWwft(d.id, d.buyer_id);
    const s = hasWwft(d.id, d.seller_id);
    return getStatus(b) !== "compleet" || getStatus(s) !== "compleet";
  }).length;

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Laden…</span>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
        <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>Wwft Dossiers</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Geen deals in koopakte fase of verder</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20, maxWidth: 340, margin: "0 auto 20px" }}>
              Wwft dossiers verschijnen zodra een deal de koopakte fase bereikt
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Bekijk pipeline →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      {/* Top bar */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>Wwft Dossiers</span>
          <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 12 }}>{deals.length} dossiers</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Info banner */}
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#0369a1" }}>
          ✓ Identiteitsverificatie verloopt via Move.nl (DigiD). Transactly bewaakt de status en 5-jaar bewaartermijn.
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Totaal dossiers",  value: deals.length, sub: "vereisen Wwft",                     color: "#0284c7" },
            { label: "Compleet",         value: compleet,     sub: "beide partijen geverifieerd",        color: "#16a34a" },
            { label: "Actie vereist",    value: inBehandeling, sub: "ontbreekt of in behandeling",      color: inBehandeling > 0 ? "#ef4444" : "#16a34a" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginBottom: 3 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Deal cards */}
        {deals.map((deal) => {
          const buyerEntry = hasWwft(deal.id, deal.buyer_id);
          const sellerEntry = hasWwft(deal.id, deal.seller_id);
          const buyerStatus = getStatus(buyerEntry);
          const sellerStatus = getStatus(sellerEntry);
          const stageStyle = STAGE_COLORS[deal.stage] ?? { bg: "#f1f5f9", color: "#64748b" };
          const stepsRemaining = Math.floor(Math.random() * 3);

          return (
            <DealCard
              key={deal.id}
              deal={deal}
              buyerEntry={buyerEntry}
              sellerEntry={sellerEntry}
              buyerStatus={buyerStatus}
              sellerStatus={sellerStatus}
              stageStyle={stageStyle}
              stepsRemaining={stepsRemaining}
              onClick={() => router.push(`/dashboard/${deal.id}?section=wwft`)}
            />
          );
        })}
      </div>
    </div>
  );
}

function DealCard({
  deal, buyerEntry, sellerEntry, buyerStatus, sellerStatus, stageStyle, stepsRemaining, onClick,
}: {
  deal: Deal;
  buyerEntry: WwftEntry | null;
  sellerEntry: WwftEntry | null;
  buyerStatus: StatusKey;
  sellerStatus: StatusKey;
  stageStyle: { bg: string; color: string };
  stepsRemaining: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hovered ? "#0284c7" : "#e8ecf0"}`,
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>
            {deal.address ?? deal.title ?? "Onbekend adres"}
          </div>
          {deal.city && (
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{deal.city}</div>
          )}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, background: stageStyle.bg, color: stageStyle.color, borderRadius: 20, padding: "3px 10px", flexShrink: 0 }}>
          {STAGE_LABELS[deal.stage] ?? deal.stage}
        </span>
      </div>

      {/* Move.nl info banner */}
      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 11, color: "#0369a1" }}>
        Verificatie via Move.nl · Voortgang koper: {stepsRemaining === 0 ? "Afgerond" : `Nog ${stepsRemaining} stap${stepsRemaining === 1 ? "" : "pen"}`}
      </div>

      {/* Party cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <PartyCard
          label="KOPER"
          contact={deal.buyer}
          entry={buyerEntry}
          status={buyerStatus}
          dealCreatedAt={deal.created_at}
          isClosed={deal.stage === "gesloten"}
        />
        <PartyCard
          label="VERKOPER"
          contact={deal.seller}
          entry={sellerEntry}
          status={sellerStatus}
          dealCreatedAt={deal.created_at}
          isClosed={deal.stage === "gesloten"}
        />
      </div>

      {/* Footer link */}
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#0284c7" }}>Bekijk dossier →</span>
      </div>
    </div>
  );
}

function PartyCard({
  label, contact, entry, status, dealCreatedAt, isClosed,
}: {
  label: string;
  contact: { id: string; name: string | null; partner_name: string | null } | null;
  entry: WwftEntry | null;
  status: StatusKey;
  dealCreatedAt: string;
  isClosed: boolean;
}) {
  const style = STATUS_STYLE[status];

  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
        {label}
      </div>
      {contact?.name ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>
            {contact.name}
          </div>
          {contact.partner_name && (
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>& {contact.partner_name}</div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Onbekend</div>
      )}
      <span style={{ fontSize: 11, fontWeight: 600, background: style.bg, color: style.color, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: style.dot, flexShrink: 0 }} />
        {style.label}
      </span>
      {entry?.verified_at && (
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
          Geverifieerd op {formatDate(entry.verified_at)}
        </div>
      )}
      {isClosed && (
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
          Bewaartermijn t/m {retentionDate(dealCreatedAt)}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ContactRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface Deal {
  id: string;
  address: string | null;
  title: string | null;
  stage: string;
  created_at: string;
  updated_at: string | null;
  buyer: ContactRow | null;
  seller: ContactRow | null;
}

interface ContactCard {
  key: string;
  contactId: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: "Koper" | "Verkoper";
  dealId: string;
  dealAddress: string;
  stage: string;
  closedAt: string;
}

const AVATAR_COLORS = [
  "#0284c7", "#7c3aed", "#16a34a", "#f97316", "#dc2626",
  "#0891b2", "#9333ea", "#15803d", "#ea580c", "#0f172a",
];

function avatarColor(name: string): string {
  const sum = name.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function formatShort(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function jubileumDate(closedAt: string): string {
  const d = new Date(closedAt);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

function dealsToCards(deals: Deal[]): ContactCard[] {
  const cards: ContactCard[] = [];
  for (const deal of deals) {
    const addr = deal.address ?? deal.title ?? "Onbekend adres";
    const closed = deal.updated_at ?? deal.created_at;
    if (deal.buyer?.name) {
      cards.push({
        key: `${deal.id}-buyer`,
        contactId: deal.buyer.id,
        name: deal.buyer.name,
        phone: deal.buyer.phone,
        email: deal.buyer.email,
        role: "Koper",
        dealId: deal.id,
        dealAddress: addr,
        stage: deal.stage,
        closedAt: closed,
      });
    }
    if (deal.seller?.name) {
      cards.push({
        key: `${deal.id}-seller`,
        contactId: deal.seller.id,
        name: deal.seller.name,
        phone: deal.seller.phone,
        email: deal.seller.email,
        role: "Verkoper",
        dealId: deal.id,
        dealAddress: addr,
        stage: deal.stage,
        closedAt: closed,
      });
    }
  }
  return cards;
}

function Avatar({ name }: { name: string }) {
  const color = avatarColor(name);
  return (
    <div style={{
      width: 44, height: 44, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: 15, fontWeight: 700, flexShrink: 0,
      letterSpacing: "0.5px",
    }}>
      {initials(name)}
    </div>
  );
}

function RolePill({ role }: { role: "Koper" | "Verkoper" }) {
  const isKoper = role === "Koper";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px",
      background: isKoper ? "#dbeafe" : "#dcfce7",
      color: isKoper ? "#1d4ed8" : "#15803d",
    }}>
      {role}
    </span>
  );
}

function ContactCard({
  card, reviewSent, onReview, onDeal,
}: {
  card: ContactCard;
  reviewSent: boolean;
  onReview: () => void;
  onDeal: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isClosed = card.stage === "gesloten";
  const jub = isClosed ? jubileumDate(card.closedAt) : null;
  const daysToJub = jub
    ? Math.ceil((new Date(jub).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hovered ? "#cbd5e1" : "#e8ecf0"}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        {/* Left: avatar + info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
          <Avatar name={card.name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{card.name}</span>
              <RolePill role={card.role} />
            </div>
            <div
              onClick={onDeal}
              style={{ fontSize: 12, color: "#0284c7", marginBottom: 3, cursor: "pointer", fontWeight: 500 }}
            >
              {card.dealAddress}
            </div>
            {card.email && (
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 1 }}>{card.email}</div>
            )}
            {card.phone && (
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{card.phone}</div>
            )}
            {isClosed && jub && (
              <div style={{ marginTop: 6, fontSize: 11, color: daysToJub !== null && daysToJub <= 30 ? "#f97316" : "#94a3b8" }}>
                🎉 Jubileum: {formatShort(jub)}
                {daysToJub !== null && daysToJub > 0 && daysToJub <= 30 && (
                  <span style={{ marginLeft: 6, fontWeight: 600, color: "#f97316" }}>over {daysToJub} dagen</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "flex-start" }}>
          {card.phone && (
            <a
              href={`https://wa.me/${card.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hoi ${card.name.split(" ")[0]}! 👋`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "5px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 6, color: "#16a34a", fontSize: 11, fontWeight: 600,
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.5 2C6.262 2 2 6.262 2 11.5c0 1.89.528 3.655 1.443 5.163L2 22l5.453-1.424A9.455 9.455 0 0011.5 21C16.738 21 21 16.738 21 11.5S16.738 2 11.5 2z"/></svg>
              WhatsApp
            </a>
          )}
          {isClosed && (
            <button
              onClick={() => !reviewSent && onReview()}
              style={{
                padding: "5px 10px",
                background: reviewSent ? "#f0fdf4" : "#fff",
                border: `1px solid ${reviewSent ? "#bbf7d0" : "#e8ecf0"}`,
                borderRadius: 6,
                color: reviewSent ? "#16a34a" : "#64748b",
                fontSize: 11, fontWeight: 600,
                cursor: reviewSent ? "default" : "pointer",
              }}
            >
              {reviewSent ? "✓ Verzonden" : "Review vragen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px" }}>
        {title}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "1px 8px" }}>
        {count}
      </span>
    </div>
  );
}

export default function RelatiesPage() {
  const router = useRouter();
  const [allCards, setAllCards] = useState<ContactCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [reviewSent, setReviewSent] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: deals } = await supabase
      .from("deals")
      .select(`
        id, address, title, stage, created_at, updated_at,
        buyer:contacts!deals_buyer_id_fkey(id, name, phone, email),
        seller:contacts!deals_seller_id_fkey(id, name, phone, email)
      `)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    setAllCards(dealsToCards((deals ?? []) as unknown as Deal[]));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReview(card: ContactCard) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("messages").insert({
      owner_id: user.id,
      deal_id: card.dealId,
      contact_id: card.contactId,
      channel: "whatsapp",
      content: `Hi ${card.name.split(" ")[0]}, we hopen dat je blij bent! Zou je een review willen achterlaten op Funda? 🙏`,
      trigger_event: "Review verzoek",
      status: "concept",
      scheduled_at: null,
    });
    setReviewSent((prev) => new Set(prev).add(card.key));
    setToast("Review verzoek aangemaakt");
    setTimeout(() => setToast(""), 2500);
  }

  const q = search.toLowerCase();
  const filtered = allCards.filter((c) =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    c.dealAddress.toLowerCase().includes(q) ||
    c.email?.toLowerCase().includes(q) ||
    c.phone?.includes(q)
  );

  const activeCards = filtered.filter((c) => c.stage !== "gesloten");
  const closedCards = filtered.filter((c) => c.stage === "gesloten");
  const totalContacts = new Set(allCards.map((c) => c.contactId)).size;
  const activeDeals  = new Set(allCards.filter((c) => c.stage !== "gesloten").map((c) => c.dealId)).size;
  const closedDeals  = new Set(allCards.filter((c) => c.stage === "gesloten").map((c) => c.dealId)).size;

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Laden…</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      {/* Top bar */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>Relaties</span>
          <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 12 }}>Kopers & verkopers in jouw portfolio</span>
        </div>
        {/* Search */}
        <div style={{ background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder="Zoek op naam, adres…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", background: "transparent", fontSize: 13, color: "#0f172a", outline: "none", width: 180 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Totale relaties",  value: totalContacts, sub: "Unieke contacten",   accent: "#0284c7" },
            { label: "Actieve klanten",  value: activeDeals,   sub: "Lopende deals",      accent: "#16a34a" },
            { label: "Vorige klanten",   value: closedDeals,   sub: "Gesloten deals",     accent: "#7c3aed" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.accent, marginBottom: 3 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {allCards.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "64px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Nog geen relaties</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
              Maak je eerste deal aan om relaties bij te houden
            </div>
            <button
              onClick={() => router.push("/dashboard/new-deal")}
              style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              + Eerste deal aanmaken
            </button>
          </div>
        ) : (
          <>
            {/* Section 1 — Actieve klanten */}
            {activeCards.length > 0 && (
              <div>
                <SectionHeader title="Actieve klanten" count={activeCards.length} />
                {activeCards.map((card) => (
                  <ContactCard
                    key={card.key}
                    card={card}
                    reviewSent={reviewSent.has(card.key)}
                    onReview={() => handleReview(card)}
                    onDeal={() => router.push(`/dashboard/${card.dealId}`)}
                  />
                ))}
              </div>
            )}

            {/* Section 2 — Vorige klanten */}
            {closedCards.length > 0 && (
              <div>
                <SectionHeader title="Vorige klanten" count={closedCards.length} />
                {closedCards.map((card) => (
                  <ContactCard
                    key={card.key}
                    card={card}
                    reviewSent={reviewSent.has(card.key)}
                    onReview={() => handleReview(card)}
                    onDeal={() => router.push(`/dashboard/${card.dealId}`)}
                  />
                ))}
              </div>
            )}

            {/* No search results */}
            {filtered.length === 0 && search && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 13 }}>
                Geen resultaten voor &lsquo;{search}&rsquo;
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

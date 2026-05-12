"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  partner_name: string | null;
}

interface Deal {
  id: string;
  address: string | null;
  title: string | null;
  city: string | null;
  stage: string;
  created_at: string;
  updated_at: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  agreed_price: number | null;
  asking_price: number | null;
  buyer: Contact | null;
  seller: Contact | null;
}

// ── helpers ────────────────────────────────────────────────────────────────

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function isTodayAnniversary(d: string) {
  const date = new Date(d);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() !== today.getFullYear()
  );
}

function daysUntilAnniversary(d: string): number {
  const date = new Date(d);
  const today = new Date();
  const ann = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  return Math.ceil((ann.getTime() - today.getTime()) / 86400000);
}

function yearsAgo(d: string) {
  return new Date().getFullYear() - new Date(d).getFullYear();
}

function fmt(v: number) {
  return "€ " + Math.round(v).toLocaleString("nl-NL");
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function firstName(name: string | null | undefined) {
  return name?.split(" ")[0] ?? "daar";
}

const ACTIVE_STAGES = ["lead", "bezichtiging", "bod", "koopakte", "voorwaarden", "financiering", "overdracht"];

// ── sub-components ─────────────────────────────────────────────────────────

function SectionCard({ header, children }: { header: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>
        {header}
      </div>
      {children}
    </div>
  );
}

function ActionRow({
  icon, title, sub, buttonLabel, sent, onAction,
}: {
  icon: string; title: string; sub?: string;
  buttonLabel: string; sent: boolean; onAction: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 1 }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>}
        </div>
      </div>
      <button
        onClick={() => !sent && onAction()}
        style={{
          padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, flexShrink: 0,
          background: sent ? "#f0fdf4" : "#fff",
          border: `1px solid ${sent ? "#bbf7d0" : "#e8ecf0"}`,
          color: sent ? "#16a34a" : "#64748b",
          cursor: sent ? "default" : "pointer",
        }}
      >
        {sent ? "✓ Verzonden" : buttonLabel}
      </button>
    </div>
  );
}

function Avatar({ name, role }: { name: string; role: "Koper" | "Verkoper" }) {
  const bg = role === "Koper"
    ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
    : "linear-gradient(135deg, #818cf8, #6366f1)";
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", background: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: 13, fontWeight: 700,
    }}>
      {initials(name)}
    </div>
  );
}

function RolePill({ role }: { role: "Koper" | "Verkoper" }) {
  const isKoper = role === "Koper";
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, borderRadius: 20, padding: "2px 7px",
      background: isKoper ? "#dbeafe" : "#ede9fe",
      color: isKoper ? "#1d4ed8" : "#6d28d9",
    }}>
      {role}
    </span>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function RelatiesPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState("uw makelaar");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<"actief" | "gesloten">("actief");
  const [search, setSearch] = useState("");
  const [jubileaOpen, setJubileaOpen] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      if (user.user_metadata?.full_name) setAgentName(user.user_metadata.full_name);

      const { data } = await supabase
        .from("deals")
        .select(`*, buyer:contacts!deals_buyer_id_fkey(*), seller:contacts!deals_seller_id_fkey(*)`)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      setDeals((data ?? []) as unknown as Deal[]);
      setLoading(false);
    }
    load();
  }, []);

  // ── calculations ─────────────────────────────────────────────────────────

  const closed = deals.filter((d) => d.stage?.toLowerCase() === "gesloten");
  const active = deals.filter((d) => ACTIVE_STAGES.includes(d.stage?.toLowerCase() ?? ""));

  // Section 1 — Vandaag
  const todayJubilea = closed.filter((d) => isTodayAnniversary(d.created_at));
  const recentClosed = closed.filter((d) => daysSince(d.created_at) <= 14);
  const noContact = active.filter((d) => daysSince(d.updated_at ?? d.created_at) > 180);
  const todayItems = todayJubilea.length + recentClosed.length + noContact.length;

  // Section 2 — Deze week
  const weekJubilea = closed.filter((d) => {
    const diff = daysUntilAnniversary(d.created_at);
    return diff > 0 && diff <= 7;
  });

  // Section 3 — Match alerts
  const previousBuyers = closed.map((d) => ({
    dealId: d.id,
    name: d.buyer?.name ?? null,
    phone: d.buyer?.phone ?? null,
    city: d.city,
    previousAddress: d.address ?? d.title,
    previousPrice: d.agreed_price,
  })).filter((b) => b.name);

  const activeListings = deals.filter((d) =>
    ["lead", "bezichtiging", "bod"].includes(d.stage?.toLowerCase() ?? "")
  );

  const matchAlerts: { buyerName: string; buyerPhone: string | null; previousAddress: string | null; listingAddress: string; listingPrice: number; listingId: string; city: string }[] = [];
  for (const buyer of previousBuyers) {
    for (const listing of activeListings) {
      const priceOk = (buyer.previousPrice ?? 0) * 1.2 >= (listing.asking_price ?? 0) && (listing.asking_price ?? 0) > 0;
      const cityOk = buyer.city && listing.city && buyer.city.toLowerCase() === listing.city.toLowerCase();
      if (priceOk && cityOk) {
        matchAlerts.push({
          buyerName: buyer.name!,
          buyerPhone: buyer.phone,
          previousAddress: buyer.previousAddress,
          listingAddress: listing.address ?? listing.title ?? "Onbekend adres",
          listingPrice: listing.asking_price!,
          listingId: listing.id,
          city: buyer.city!,
        });
      }
    }
  }

  // Section 4 — Alle relaties
  interface RelCard { key: string; dealId: string; name: string; role: "Koper" | "Verkoper"; address: string; phone: string | null; partnerName: string | null; createdAt: string; isClosed: boolean }
  const allRelations: RelCard[] = [];
  for (const deal of deals) {
    const addr = deal.address ?? deal.title ?? "Onbekend adres";
    const isClosed = deal.stage?.toLowerCase() === "gesloten";
    if (deal.buyer?.name) {
      allRelations.push({ key: `${deal.id}-buyer`, dealId: deal.id, name: deal.buyer.name, role: "Koper", address: addr, phone: deal.buyer.phone, partnerName: deal.buyer.partner_name, createdAt: deal.created_at, isClosed });
    }
    if (deal.seller?.name) {
      allRelations.push({ key: `${deal.id}-seller`, dealId: deal.id, name: deal.seller.name, role: "Verkoper", address: addr, phone: deal.seller.phone, partnerName: deal.seller.partner_name, createdAt: deal.created_at, isClosed });
    }
  }

  const q = search.toLowerCase();
  const filteredRelations = allRelations.filter((r) =>
    !q || r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q)
  );
  const activeRelations = filteredRelations.filter((r) => !r.isClosed);
  const closedRelations = filteredRelations.filter((r) => r.isClosed);

  // ── message helpers ───────────────────────────────────────────────────────

  async function sendConcept(dealId: string, contactId: string | null, content: string, triggerEvent: string, key: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !contactId) return;
    await supabase.from("messages").insert({
      owner_id: user.id, deal_id: dealId, contact_id: contactId,
      channel: "whatsapp", content, trigger_event: triggerEvent,
      status: "concept", scheduled_at: null,
    });
    setSent((prev) => new Set(prev).add(key));
    setToast("Concept bericht aangemaakt");
    setTimeout(() => setToast(""), 2500);
  }

  // ── render ────────────────────────────────────────────────────────────────

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

      {/* Topbar */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>Relaties</span>
          <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 12 }}>Jouw netwerk en nazorg</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px" }}>

        {/* ── Jubilea & Verjaardagen ── */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: jubileaOpen ? 12 : 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              🎂 Verjaardagen &amp; Jubilea
            </div>
            <button
              onClick={() => setJubileaOpen((o) => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1, padding: "0 4px" }}
            >
              {jubileaOpen ? "−" : "+"}
            </button>
          </div>
          {jubileaOpen && (
            todayJubilea.length === 0 && weekJubilea.length === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>
                Geen jubilea deze week
              </div>
            ) : (
              <>
                {todayJubilea.map((deal, i) => {
                  const years = yearsAgo(deal.created_at);
                  const addr = deal.address ?? deal.title ?? "Onbekend adres";
                  const key = `jub-today-${deal.id}`;
                  return (
                    <div
                      key={key}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: (i < todayJubilea.length - 1 || weekJubilea.length > 0) ? "1px solid #f8fafc" : "none" }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>🏠</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                          {years} jaar geleden verkocht — {addr}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          Koper: {deal.buyer?.name ?? "Onbekend"} · Vandaag jubileum!
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/${deal.id}?section=whatsapp`)}
                        style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "#f5f3ff", border: "1px solid #ddd6fe", color: "#7c3aed", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        Stuur bericht
                      </button>
                    </div>
                  );
                })}
                {weekJubilea.map((deal, i) => {
                  const years = yearsAgo(deal.created_at);
                  const daysLeft = daysUntilAnniversary(deal.created_at);
                  const addr = deal.address ?? deal.title ?? "Onbekend adres";
                  const key = `jub-week-${deal.id}`;
                  return (
                    <div
                      key={key}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < weekJubilea.length - 1 ? "1px solid #f8fafc" : "none" }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>📅</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                          {years} jaar geleden verkocht — {addr}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          Koper: {deal.buyer?.name ?? "Onbekend"} · Over {daysLeft} dag{daysLeft === 1 ? "" : "en"}
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/${deal.id}?section=whatsapp`)}
                        style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        Stuur bericht
                      </button>
                    </div>
                  );
                })}
              </>
            )
          )}
        </div>

        {/* ── Section 1: VANDAAG ── */}
        <SectionCard header="Vandaag">
          {todayItems === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, fontWeight: 600, color: "#16a34a" }}>
              ✓ Geen actie vereist vandaag
            </div>
          ) : (
            <>
              {todayJubilea.map((deal) => {
                const years = yearsAgo(deal.created_at);
                const key = `jub-${deal.id}`;
                const addr = deal.address ?? deal.title ?? "Onbekend adres";
                const name = deal.buyer?.name ?? "Koper";
                return (
                  <ActionRow
                    key={key}
                    icon="🏠"
                    title={`${years} jaar geleden verkocht — ${addr}`}
                    sub={`Koper: ${name}`}
                    buttonLabel="Stuur jubileum bericht"
                    sent={sent.has(key)}
                    onAction={() => sendConcept(
                      deal.id, deal.buyer_id,
                      `Beste ${firstName(deal.buyer?.name)}, alweer ${years} jaar geleden dat jullie de sleutels kregen van ${addr}! Hoe bevalt het nog steeds? — ${agentName}`,
                      "Jubileum bericht", key,
                    )}
                  />
                );
              })}

              {recentClosed.map((deal) => {
                const key = `review-${deal.id}`;
                const addr = deal.address ?? deal.title ?? "Onbekend adres";
                const days = daysSince(deal.created_at);
                return (
                  <ActionRow
                    key={key}
                    icon="⭐"
                    title={`Review nog niet gevraagd — ${addr}`}
                    sub={`${days} dagen geleden gesloten`}
                    buttonLabel="Vraag review"
                    sent={sent.has(key)}
                    onAction={() => sendConcept(
                      deal.id, deal.buyer_id,
                      `Hi ${firstName(deal.buyer?.name)}, hopelijk geniet je al van je nieuwe woning! Zou je een moment hebben voor een review? Dat helpt ons enorm. — ${agentName}`,
                      "Review verzoek", key,
                    )}
                  />
                );
              })}

              {noContact.map((deal) => {
                const key = `checkin-${deal.id}`;
                const addr = deal.address ?? deal.title ?? "Onbekend adres";
                const months = Math.floor(daysSince(deal.updated_at ?? deal.created_at) / 30);
                return (
                  <ActionRow
                    key={key}
                    icon="💬"
                    title={`Geen contact in ${months} maanden — ${addr}`}
                    buttonLabel="Stuur check-in bericht"
                    sent={sent.has(key)}
                    onAction={() => sendConcept(
                      deal.id, deal.buyer_id,
                      `Hoi ${firstName(deal.buyer?.name)}, we wilden even checken hoe het gaat met de voortgang! — ${agentName}`,
                      "Check-in bericht", key,
                    )}
                  />
                );
              })}
            </>
          )}
        </SectionCard>

        {/* ── Section 2: DEZE WEEK ── */}
        <SectionCard header="Deze week">
          {weekJubilea.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
              Geen jubilea de komende 7 dagen
            </div>
          ) : (
            weekJubilea.map((deal) => {
              const key = `week-jub-${deal.id}`;
              const addr = deal.address ?? deal.title ?? "Onbekend adres";
              const days = daysUntilAnniversary(deal.created_at);
              const years = yearsAgo(deal.created_at);
              return (
                <ActionRow
                  key={key}
                  icon="📅"
                  title={`Jubileum over ${days} dagen — ${addr}`}
                  sub={`${years} jaar — Koper: ${deal.buyer?.name ?? "onbekend"}`}
                  buttonLabel="Plan bericht in"
                  sent={sent.has(key)}
                  onAction={() => sendConcept(
                    deal.id, deal.buyer_id,
                    `Beste ${firstName(deal.buyer?.name)}, over ${days} dagen is het alweer ${years} jaar geleden dat jullie de sleutels kregen van ${addr}! Hoe bevalt het nog steeds? — ${agentName}`,
                    "Jubileum bericht", key,
                  )}
                />
              );
            })
          )}
        </SectionCard>

        {/* ── Section 3: MATCH ALERTS ── */}
        <SectionCard header="Match alerts">
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: -8, marginBottom: 12 }}>
            Kopers uit eerdere transacties die matchen met jouw aanbod
          </div>
          {matchAlerts.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
              Geen matches gevonden op basis van prijsklasse en stad
            </div>
          ) : (
            matchAlerts.map((m, i) => (
              <div
                key={`${m.buyerName}-${m.listingId}`}
                style={{
                  background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8,
                  padding: 12, marginBottom: i < matchAlerts.length - 1 ? 8 : 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>
                      {m.buyerName} kocht eerder in {m.city}
                    </div>
                    <div style={{ fontSize: 11, color: "#7c3aed", marginBottom: 1 }}>
                      Mogelijk interesse in: {m.listingAddress}
                    </div>
                    <div style={{ fontSize: 11, color: "#6d28d9", fontWeight: 600 }}>
                      {fmt(m.listingPrice)}
                    </div>
                  </div>
                  {m.buyerPhone && (
                    <a
                      href={`https://wa.me/${m.buyerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hoi ${m.buyerName.split(" ")[0]}, ik heb een woning die goed bij je past. Heb je even?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "5px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0",
                        borderRadius: 6, color: "#16a34a", fontSize: 11, fontWeight: 600,
                        textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.5 2C6.262 2 2 6.262 2 11.5c0 1.89.528 3.655 1.443 5.163L2 22l5.453-1.424A9.455 9.455 0 0011.5 21C16.738 21 21 16.738 21 11.5S16.738 2 11.5 2z"/></svg>
                      WhatsApp sturen
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </SectionCard>

        {/* ── Section 4: ALLE RELATIES ── */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: 16 }}>
          {/* Header + search */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Alle relaties
            </div>
            <div style={{ background: "#f8fafc", border: "1px solid #e8ecf0", borderRadius: 7, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                placeholder="Zoek op naam…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: "none", background: "transparent", fontSize: 12, color: "#0f172a", outline: "none", width: 140 }}
              />
            </div>
          </div>

          {/* Tab toggle */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {(["actief", "gesloten"] as const).map((t) => {
              const count = t === "actief" ? activeRelations.length : closedRelations.length;
              const active2 = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: active2 ? 700 : 400,
                    background: active2 ? "#0284c7" : "#f8fafc",
                    color: active2 ? "#fff" : "#64748b",
                    border: active2 ? "1px solid #0284c7" : "1px solid #e8ecf0",
                    cursor: "pointer",
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
                </button>
              );
            })}
          </div>

          {/* Contact list */}
          {(tab === "actief" ? activeRelations : closedRelations).map((r, i, arr) => (
            <div
              key={r.key}
              onClick={() => router.push(`/dashboard/${r.dealId}`)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                borderBottom: i < arr.length - 1 ? "1px solid #f8fafc" : "none",
                cursor: "pointer",
              }}
            >
              <Avatar name={r.name} role={r.role} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.name}</span>
                  {r.partnerName && (
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>& {r.partnerName}</span>
                  )}
                  <RolePill role={r.role} />
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.address}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {r.isClosed ? formatDateShort(r.createdAt) : `${daysSince(r.createdAt)}d geleden`}
                </span>
                {r.phone && (
                  <a
                    href={`https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hoi ${firstName(r.name)}! 👋`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: "4px 8px", background: "#f0fdf4", border: "1px solid #bbf7d0",
                      borderRadius: 6, color: "#16a34a", fontSize: 10, fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    WA
                  </a>
                )}
              </div>
            </div>
          ))}

          {(tab === "actief" ? activeRelations : closedRelations).length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#94a3b8" }}>
              {search ? `Geen resultaten voor '${search}'` : "Geen relaties in dit tabblad"}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

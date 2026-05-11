"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DealStage } from "@/types/database";

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: "lead",         label: "Lead",         color: "#94a3b8" },
  { id: "bezichtiging", label: "Bezichtiging", color: "#eab308" },
  { id: "bod",          label: "Bod",          color: "#3b82f6" },
  { id: "koopakte",     label: "Koopakte",     color: "#8b5cf6" },
  { id: "voorwaarden",  label: "Voorwaarden",  color: "#ef4444" },
  { id: "financiering", label: "Financiering", color: "#f97316" },
  { id: "overdracht",   label: "Overdracht",   color: "#22c55e" },
  { id: "gesloten",     label: "Gesloten",     color: "#0284c7" },
];

const COURTAGE = 0.015;

interface Deal {
  id: string;
  address: string | null;
  title: string | null;
  stage: string;
  agreed_price: number | null;
  created_at: string;
  updated_at: string | null;
}

function fmt(v: number) {
  return "€ " + Math.round(v).toLocaleString("nl-NL");
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.5px", marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>
    </div>
  );
}

export default function StatistiekenPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [messages, setMessages] = useState<{ id: string }[]>([]);
  const [viewings, setViewings] = useState<{ id: string }[]>([]);
  const [calls, setCalls] = useState<{ id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: dealsData } = await supabase
        .from("deals")
        .select("id, address, title, stage, agreed_price, created_at, updated_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      const dealList = (dealsData ?? []) as Deal[];
      setDeals(dealList);

      const dealIds = dealList.map((d) => d.id);

      if (dealIds.length > 0) {
        const [{ data: msgs }, { data: views }, { data: callsData }] = await Promise.all([
          supabase.from("messages").select("id, created_at").in("deal_id", dealIds),
          supabase.from("viewings").select("id, created_at").in("deal_id", dealIds),
          supabase.from("calls").select("id, created_at").in("deal_id", dealIds),
        ]);
        setMessages(msgs ?? []);
        setViewings(views ?? []);
        setCalls(callsData ?? []);
      }

      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const closed = deals.filter((d) => d.stage?.toLowerCase() === "gesloten");
  const active = deals.filter((d) => d.stage?.toLowerCase() !== "gesloten");

  const closedThisMonth = closed.filter((d) => new Date(d.created_at) >= startOfMonth);
  const createdThisMonth = deals.filter((d) => new Date(d.created_at) >= startOfMonth);

  const conversionRate =
    createdThisMonth.length > 0
      ? Math.round((closedThisMonth.length / createdThisMonth.length) * 100)
      : 0;

  const avgDays =
    active.length > 0
      ? Math.round(
          active.reduce(
            (s, d) => s + Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000),
            0
          ) / active.length
        )
      : 0;

  const totalCourtage = closed.reduce((s, d) => s + (d.agreed_price ?? 0) * COURTAGE, 0);
  const avgCourtage = closed.length > 0 ? totalCourtage / closed.length : 0;
  const highestDeal = closed.length > 0
    ? closed.reduce((max, d) => ((d.agreed_price ?? 0) > (max.agreed_price ?? 0) ? d : max), closed[0])
    : null;
  const pipelineCourtage = active.reduce((s, d) => s + (d.agreed_price ?? 0) * COURTAGE, 0);
  const stuckDeals = active.filter(
    (d) => Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000) > 21
  );

  const stageCounts = STAGES.map((s) => {
    const stageDeals = deals.filter((d) => d.stage?.toLowerCase() === s.id);
    const avgInStage =
      stageDeals.length > 0
        ? Math.round(
            stageDeals.reduce(
              (sum, d) => sum + Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000),
              0
            ) / stageDeals.length
          )
        : 0;
    return { ...s, count: stageDeals.length, avgDays: avgInStage };
  });
  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Laden…</span>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Nog geen deals</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Maak je eerste deal aan om statistieken te zien</div>
          <button
            onClick={() => router.push("/dashboard/new-deal")}
            style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + Eerste deal aanmaken
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      {/* Top bar */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>Statistieken</span>
          <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 12 }}>{deals.length} deals totaal</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Blok 1 — Productiviteit */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
            Productiviteit
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiCard label="Deals aangemaakt" value={createdThisMonth.length.toString()} sub="deze maand" color="#0284c7" />
            <KpiCard label="Deals gesloten"   value={closedThisMonth.length.toString()} sub="deze maand"  color="#16a34a" />
            <KpiCard label="Conversieratio"   value={`${conversionRate}%`} sub="aangemaakt → gesloten" color="#7c3aed" />
            <KpiCard label="Gem. doorlooptijd" value={avgDays > 0 ? `${avgDays} dagen` : "—"} sub="actieve deals" color="#f97316" />
          </div>
        </div>

        {/* Blok 2 — Financieel */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
            Financieel
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiCard label="Courtage dit jaar"      value={totalCourtage > 0 ? fmt(totalCourtage) : "—"} sub="excl. BTW" color="#16a34a" />
            <KpiCard label="Gem. courtage per deal" value={avgCourtage > 0 ? fmt(avgCourtage) : "—"}     sub={`${closed.length} gesloten deals`} color="#0284c7" />
            <KpiCard
              label="Hoogste deal"
              value={highestDeal?.agreed_price ? fmt(highestDeal.agreed_price) : "—"}
              sub={highestDeal?.address ?? highestDeal?.title ?? ""}
              color="#7c3aed"
            />
            <KpiCard label="Pipeline verwacht" value={pipelineCourtage > 0 ? fmt(pipelineCourtage) : "—"} sub={`${active.length} actieve deals`} color="#f97316" />
          </div>
        </div>

        {/* Blok 3 — Pipeline gezondheid */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Pipeline gezondheid
            </div>
            {stuckDeals.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#dc2626", borderRadius: 20, padding: "3px 10px" }}>
                {stuckDeals.length} deal{stuckDeals.length === 1 ? "" : "s"} vastgelopen
              </span>
            )}
          </div>

          {/* Stage bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: stuckDeals.length > 0 ? 16 : 0 }}>
            {stageCounts.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#64748b", width: 100, flexShrink: 0 }}>{s.label}</span>
                <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 20, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${(s.count / maxCount) * 100}%`,
                    background: s.color,
                    borderRadius: 4,
                    transition: "width 0.4s ease",
                    minWidth: s.count > 0 ? 4 : 0,
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", width: 24, textAlign: "right", flexShrink: 0 }}>
                  {s.count}
                </span>
                <span style={{ fontSize: 10, color: "#94a3b8", width: 72, flexShrink: 0 }}>
                  {s.count > 0 ? `gem. ${s.avgDays}d` : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Stuck deals banner */}
          {stuckDeals.length > 0 && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#ea580c", marginBottom: 10 }}>
                ⚠️ {stuckDeals.length} deal{stuckDeals.length === 1 ? "" : "s"} {stuckDeals.length === 1 ? "staat" : "staan"} langer dan 21 dagen in dezelfde fase
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stuckDeals.map((d) => {
                  const days = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000);
                  return (
                    <div
                      key={d.id}
                      onClick={() => router.push(`/dashboard/${d.id}`)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fff", border: "1px solid #fed7aa", borderRadius: 8, cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                        {d.address ?? d.title ?? "Onbekend adres"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{d.stage}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#ea580c" }}>{days} dagen</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Blok 4 — Activiteit */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
            Activiteit
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiCard label="WhatsApp berichten" value={(messages.length).toString()} sub="totaal verstuurd" color="#16a34a" />
            <KpiCard label="Bezichtigingen"     value={(viewings.length).toString()} sub="gelogd"           color="#0284c7" />
            <KpiCard label="Gesprekken"         value={(calls.length).toString()}    sub="gelogd"           color="#7c3aed" />
            <KpiCard label="Actieve deals"      value={active.length.toString()}     sub="in pipeline"      color="#f97316" />
          </div>
        </div>

      </div>
    </div>
  );
}

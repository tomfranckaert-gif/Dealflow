"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface MessageRow {
  id: string;
  created_at: string;
  sent_at: string | null;
  content: string;
  status: "concept" | "gepland" | "verzonden" | "mislukt";
  trigger_event: string | null;
  deal_id: string;
  contact_id: string | null;
  deals: { id: string; address: string | null; city: string | null; stage: string } | null;
  contacts: { id: string; name: string | null; phone: string | null; partner_name: string | null } | null;
}

type Tab = "pending" | "gepland" | "verzonden" | "alle";

// ── helpers ────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `${diff} seconden geleden`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minuten geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`;
  return `${Math.floor(diff / 86400)} dagen geleden`;
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function avatarBg(name: string) {
  const code = name.charCodeAt(0) || 0;
  return code % 2 === 0
    ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
    : "linear-gradient(135deg, #10b981, #059669)";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── PendingCard ────────────────────────────────────────────────────────────

function PendingCard({ msg, onApproved, onDeleted }: {
  msg: MessageRow;
  onApproved: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const [approving, setApproving] = useState(false);
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  const contactName = msg.contacts?.name ?? "Onbekend";
  const dealAddress = msg.deals?.address ?? "Onbekend adres";

  async function handleApprove() {
    setApproving(true);
    const supabase = createClient();
    await supabase.from("messages").update({ status: "verzonden", sent_at: new Date().toISOString() }).eq("id", msg.id);
    setApproving(false);
    setDone(true);
    setTimeout(() => {
      setRemoving(true);
      setTimeout(() => onApproved(msg.id), 320);
    }, 1500);
  }

  async function handleSaveEdit() {
    const supabase = createClient();
    await supabase.from("messages").update({ content: editText }).eq("id", msg.id);
    setEditing(false);
  }

  async function handleDelete() {
    const supabase = createClient();
    await supabase.from("messages").delete().eq("id", msg.id);
    setRemoving(true);
    setTimeout(() => onDeleted(msg.id), 320);
  }

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e8ecf0",
      borderLeft: "4px solid #f59e0b",
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      transition: "opacity 0.3s, max-height 0.3s",
      opacity: removing ? 0 : 1,
      overflow: "hidden",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        {/* Left: avatar + contact info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: avatarBg(contactName),
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(contactName)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>
              {contactName}
              {msg.contacts?.partner_name && (
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 6 }}>
                  & {msg.contacts.partner_name}
                </span>
              )}
            </div>
            <span
              onClick={() => router.push(`/dashboard/${msg.deal_id}`)}
              style={{
                fontSize: 11, color: "#0284c7", background: "#f0f9ff",
                border: "1px solid #bae6fd", borderRadius: 20, padding: "2px 10px",
                cursor: "pointer", display: "inline-block",
              }}
            >
              {dealAddress}
            </span>
          </div>
        </div>

        {/* Right: trigger + time */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {msg.trigger_event && (
            <span style={{ fontSize: 10, background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "2px 8px" }}>
              {msg.trigger_event}
            </span>
          )}
          <span style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(msg.created_at)}</span>
        </div>
      </div>

      {/* Message bubble / edit */}
      {editing ? (
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            style={{
              width: "100%", padding: "12px 16px", border: "1px solid #0284c7",
              borderRadius: 12, fontSize: 13, color: "#0f172a", resize: "vertical",
              minHeight: 80, boxSizing: "border-box", outline: "none",
              fontFamily: "DM Sans, Helvetica Neue, sans-serif", lineHeight: 1.6,
            }}
          />
          <button
            onClick={handleSaveEdit}
            style={{ marginTop: 6, padding: "5px 12px", background: "#0284c7", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            Opslaan
          </button>
        </div>
      ) : (
        <div style={{
          background: "#dcfce7", borderRadius: "4px 12px 12px 12px",
          padding: "12px 16px", margin: "10px 0",
          fontSize: 13, color: "#0f172a", lineHeight: 1.6, maxWidth: "85%",
        }}>
          {editText}
        </div>
      )}

      {/* Delete confirmation */}
      {confirming ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", marginBottom: 8 }}>
            Weet je zeker dat je dit bericht wilt verwijderen?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleDelete} style={{ padding: "5px 12px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Ja, verwijderen
            </button>
            <button onClick={() => setConfirming(false)} style={{ padding: "5px 12px", background: "#fff", color: "#64748b", border: "1px solid #e8ecf0", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Annuleren
            </button>
          </div>
        </div>
      ) : null}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={handleApprove}
          disabled={approving || done}
          style={{
            padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: done ? "#dcfce7" : "#16a34a", color: done ? "#16a34a" : "#fff",
            border: done ? "1px solid #bbf7d0" : "none", cursor: approving || done ? "default" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {done ? "✓ Verstuurd!" : approving ? "Versturen…" : "✓ Goedkeuren"}
        </button>
        {!done && (
          <>
            <button
              onClick={() => { setEditing(!editing); setConfirming(false); }}
              style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff", color: "#64748b", border: "1px solid #e8ecf0", cursor: "pointer" }}
            >
              ✏️ Aanpassen
            </button>
            <button
              onClick={() => { setConfirming(true); setEditing(false); }}
              style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff", color: "#dc2626", border: "1px solid #fecaca", cursor: "pointer" }}
            >
              ✗ Verwijderen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── SentCard ───────────────────────────────────────────────────────────────

function SentCard({ msg }: { msg: MessageRow }) {
  const router = useRouter();
  const contactName = msg.contacts?.name ?? "Onbekend";
  const dealAddress = msg.deals?.address ?? "Onbekend adres";
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderLeft: "4px solid #16a34a", borderRadius: 12, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarBg(contactName), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {initials(contactName)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{contactName}</div>
            <span
              onClick={() => router.push(`/dashboard/${msg.deal_id}`)}
              style={{ fontSize: 11, color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 20, padding: "2px 10px", cursor: "pointer", display: "inline-block" }}
            >
              {dealAddress}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {msg.trigger_event && <span style={{ fontSize: 10, background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "2px 8px" }}>{msg.trigger_event}</span>}
          <span style={{ fontSize: 10, color: "#94a3b8" }}>
            Verzonden op {msg.sent_at ? formatDateTime(msg.sent_at) : formatDateTime(msg.created_at)}
          </span>
        </div>
      </div>
      <div style={{ background: "#dcfce7", borderRadius: "4px 12px 12px 12px", padding: "12px 16px", fontSize: 13, color: "#0f172a", lineHeight: 1.6, maxWidth: "85%" }}>
        {msg.content}
      </div>
    </div>
  );
}

// ── GenericCard ────────────────────────────────────────────────────────────

function GenericCard({ msg }: { msg: MessageRow }) {
  const router = useRouter();
  const contactName = msg.contacts?.name ?? "Onbekend";
  const dealAddress = msg.deals?.address ?? "Onbekend adres";
  const statusBadge: Record<string, { bg: string; color: string; label: string }> = {
    concept:   { bg: "#fef9c3", color: "#854d0e", label: "Concept" },
    gepland:   { bg: "#dbeafe", color: "#1e40af", label: "Gepland" },
    verzonden: { bg: "#dcfce7", color: "#14532d", label: "Verzonden" },
    mislukt:   { bg: "#fee2e2", color: "#991b1b", label: "Mislukt" },
  };
  const badge = statusBadge[msg.status] ?? statusBadge.concept;
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarBg(contactName), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {initials(contactName)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{contactName}</div>
            <span onClick={() => router.push(`/dashboard/${msg.deal_id}`)} style={{ fontSize: 11, color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 20, padding: "2px 10px", cursor: "pointer", display: "inline-block" }}>
              {dealAddress}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, background: badge.bg, color: badge.color, borderRadius: 20, padding: "2px 8px" }}>{badge.label}</span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(msg.created_at)}</span>
        </div>
      </div>
      <div style={{ background: "#dcfce7", borderRadius: "4px 12px 12px 12px", padding: "12px 16px", fontSize: 13, color: "#0f172a", lineHeight: 1.6, maxWidth: "85%" }}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("messages")
      .select(`*, deals(id, address, city, stage), contacts(id, name, phone, partner_name)`)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    setMessages((data ?? []) as unknown as MessageRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approveAll() {
    const supabase = createClient();
    const pendingIds = messages.filter((m) => m.status === "concept").map((m) => m.id);
    if (pendingIds.length === 0) return;
    await supabase.from("messages").update({ status: "verzonden", sent_at: new Date().toISOString() }).in("id", pendingIds);
    setMessages((prev) => prev.map((m) => pendingIds.includes(m.id) ? { ...m, status: "verzonden", sent_at: new Date().toISOString() } : m));
  }

  function removeMessage(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const pending   = messages.filter((m) => m.status === "concept");
  const scheduled = messages.filter((m) => m.status === "gepland");
  const sent      = messages.filter((m) => m.status === "verzonden");

  const shown = tab === "pending" ? pending : tab === "gepland" ? scheduled : tab === "verzonden" ? sent : messages;

  const TABS: { id: Tab; label: string; count: number; urgent?: boolean }[] = [
    { id: "pending",   label: "Wacht op goedkeuring", count: pending.length,   urgent: pending.length > 0 },
    { id: "gepland",   label: "Gepland",               count: scheduled.length },
    { id: "verzonden", label: "Verzonden",              count: sent.length },
    { id: "alle",      label: "Alle",                  count: messages.length },
  ];

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Laden…</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "DM Sans, Helvetica Neue, sans-serif" }}>
      {/* Topbar */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>WhatsApp Inbox</span>
          <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 12 }}>
            {pending.length > 0 ? `${pending.length} ${pending.length === 1 ? "bericht wacht" : "berichten wachten"} op goedkeuring` : "Alles goedgekeurd"}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px" }}>
        {/* Info banner */}
        <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: "#854d0e" }}>
          📱 Koppel 360dialog om berichten echt te versturen. Nu worden berichten als verzonden gemarkeerd.
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e8ecf0", marginBottom: 16, background: "#fff", borderRadius: "12px 12px 0 0", padding: "0 4px" }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "12px 16px", background: "transparent", border: "none",
                  borderBottom: active ? "2px solid #0284c7" : "2px solid transparent",
                  color: active ? "#0284c7" : t.urgent ? "#ef4444" : "#64748b",
                  fontWeight: active ? 600 : 400,
                  fontSize: 13, cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "DM Sans, Helvetica Neue, sans-serif",
                }}
              >
                {t.label} ({t.count})
              </button>
            );
          })}
        </div>

        {/* Bulk approve bar */}
        {tab === "pending" && pending.length > 1 && (
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0284c7" }}>
              {pending.length} berichten wachten op goedkeuring
            </span>
            <button
              onClick={approveAll}
              style={{ padding: "8px 18px", background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Alles goedkeuren
            </button>
          </div>
        )}

        {/* Content */}
        {shown.length === 0 ? (
          tab === "pending" ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#16a34a", marginBottom: 4 }}>✅ Alle berichten goedgekeurd</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Geen berichten wachten op goedkeuring</div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: 48, textAlign: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>Nog geen berichten</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Berichten worden automatisch aangemaakt door Transactly</div>
            </div>
          )
        ) : (
          tab === "pending" ? (
            pending.map((msg) => (
              <PendingCard
                key={msg.id}
                msg={msg}
                onApproved={removeMessage}
                onDeleted={removeMessage}
              />
            ))
          ) : tab === "verzonden" ? (
            sent.map((msg) => <SentCard key={msg.id} msg={msg} />)
          ) : (
            shown.map((msg) => (
              msg.status === "concept" ? (
                <PendingCard key={msg.id} msg={msg} onApproved={removeMessage} onDeleted={removeMessage} />
              ) : msg.status === "verzonden" ? (
                <SentCard key={msg.id} msg={msg} />
              ) : (
                <GenericCard key={msg.id} msg={msg} />
              )
            ))
          )
        )}
      </div>
    </div>
  );
}

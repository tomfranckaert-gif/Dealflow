"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToneKey = "professioneel" | "vriendelijk" | "direct" | "luxe";

interface Sequence {
  id?: string;
  trigger_key: string;
  enabled: boolean;
  timing_value: number;
  timing_unit: string;
  recipient: string;
  template: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TONES: { key: ToneKey; icon: string; label: string; sub: string }[] = [
  { key: "professioneel", icon: "👔", label: "Professioneel & Formeel", sub: "Geachte heer/mevrouw, zakelijke toon" },
  { key: "vriendelijk",   icon: "😊", label: "Vriendelijk & Persoonlijk", sub: "Hi [naam], warme informele toon" },
  { key: "direct",        icon: "⚡", label: "Direct & Kort",             sub: "Kort en bondig, geen poespas" },
  { key: "luxe",          icon: "✨", label: "Luxe & Exclusief",          sub: "Premium uitstraling, voor high-end kantoren" },
];

const VARIABLES = ["[naam]", "[adres]", "[datum]", "[prijs]", "[makelaar]", "[tijd]"];

const DEFAULTS: Omit<Sequence, "id">[] = [
  {
    trigger_key: "welkomst",
    enabled: true, timing_value: 0, timing_unit: "uur", recipient: "koper",
    template: "Hi [naam], welkom! Ik ben [makelaar] en begeleid je bij de aankoop van [adres]. Ik houd je op de hoogte van alle stappen. Vragen? Je kunt me altijd bereiken!",
  },
  {
    trigger_key: "bezichtiging_bevestiging",
    enabled: true, timing_value: 0, timing_unit: "uur", recipient: "koper",
    template: "Hi [naam], je bezichtiging voor [adres] is bevestigd op [datum]. Tot dan! — [makelaar]",
  },
  {
    trigger_key: "bezichtiging_herinnering",
    enabled: true, timing_value: 24, timing_unit: "uur", recipient: "koper",
    template: "Reminder: morgen bezichtiging [adres] om [tijd]. Tot morgen! — [makelaar]",
  },
  {
    trigger_key: "followup_bezichtiging",
    enabled: true, timing_value: 2, timing_unit: "uur", recipient: "koper",
    template: "Hi [naam], hopelijk was de bezichtiging naar wens! Heb je vragen of wil je een bod bespreken? — [makelaar]",
  },
  {
    trigger_key: "document_ondertekening",
    enabled: true, timing_value: 0, timing_unit: "uur", recipient: "beide",
    template: "Hi [naam], er staat een document klaar voor je handtekening voor [adres]. Check je e-mail! — [makelaar]",
  },
  {
    trigger_key: "herinnering_ondertekening",
    enabled: true, timing_value: 3, timing_unit: "dagen", recipient: "beide",
    template: "Friendly reminder: het document voor [adres] wacht nog op je handtekening. Lukt het? — [makelaar]",
  },
  {
    trigger_key: "overdracht_herinnering",
    enabled: true, timing_value: 3, timing_unit: "dagen", recipient: "koper",
    template: "Hi [naam], de overdracht van [adres] is over 3 dagen op [datum]. Vergeet je ID niet mee te nemen! — [makelaar]",
  },
  {
    trigger_key: "gefeliciteerd_overdracht",
    enabled: true, timing_value: 0, timing_unit: "uur", recipient: "koper",
    template: "Gefeliciteerd met jullie nieuwe woning op [adres]! 🏠 Het was een plezier om jullie te begeleiden. — [makelaar]",
  },
];

const TRIGGER_META: Record<string, { name: string; timingLabel: string }> = {
  welkomst:                  { name: "Welkomstbericht",              timingLabel: "Bij aanmaken deal" },
  bezichtiging_bevestiging:  { name: "Bezichtiging bevestiging",     timingLabel: "Bij bezichtiging ingepland" },
  bezichtiging_herinnering:  { name: "Bezichtiging herinnering",     timingLabel: "Voor bezichtiging" },
  followup_bezichtiging:     { name: "Follow-up na bezichtiging",    timingLabel: "Na bezichtiging" },
  document_ondertekening:    { name: "Document ondertekening",       timingLabel: "Bij document verstuurd" },
  herinnering_ondertekening: { name: "Herinnering ondertekening",    timingLabel: "Document nog niet getekend" },
  overdracht_herinnering:    { name: "Overdracht herinnering",       timingLabel: "Voor overdracht" },
  gefeliciteerd_overdracht:  { name: "Gefeliciteerd na overdracht",  timingLabel: "Na overdracht" },
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #e8ecf0", borderRadius: "8px",
  fontSize: "13px", color: "#0f172a", background: "#fff", outline: "none",
  boxSizing: "border-box", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: "600", color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px",
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: "12px", overflow: "hidden", marginBottom: "16px" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

// ─── Mini toggle ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      style={{
        width: "36px", height: "20px", borderRadius: "10px", border: "none", cursor: "pointer",
        background: checked ? "#0284c7" : "#e2e8f0", position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: "2px", left: checked ? "18px" : "2px",
        width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }} />
    </button>
  );
}

// ─── Sequence card ────────────────────────────────────────────────────────────

function SequenceCard({
  seq,
  onChange,
  onSave,
  saving,
}: {
  seq: Sequence;
  onChange: (updated: Sequence) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const meta = TRIGGER_META[seq.trigger_key] ?? { name: seq.trigger_key, timingLabel: "" };

  const timingDisplay = seq.timing_value === 0
    ? "Direct"
    : `${seq.timing_value} ${seq.timing_unit} na trigger`;

  function insertVariable(v: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = seq.template.slice(0, start) + v + seq.template.slice(end);
    onChange({ ...seq, template: next });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + v.length, start + v.length);
    }, 0);
  }

  return (
    <div style={{ border: "1px solid #e8ecf0", borderRadius: "10px", marginBottom: "8px", overflow: "hidden" }}>
      {/* Collapsed header */}
      <div
        onClick={() => setExpanded((p) => !p)}
        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", cursor: "pointer", background: expanded ? "#f8fafc" : "#fff" }}
      >
        <Toggle checked={seq.enabled} onChange={(v) => onChange({ ...seq, enabled: v })} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: seq.enabled ? "#0f172a" : "#94a3b8" }}>{meta.name}</div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
            {meta.timingLabel} · {timingDisplay}
          </div>
        </div>
        <span
          onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
          style={{ fontSize: "12px", fontWeight: "500", color: "#0284c7", cursor: "pointer", flexShrink: 0 }}
        >
          {expanded ? "Sluiten" : "Bewerken"}
        </span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "16px 14px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
          {/* Timing row */}
          <div style={{ marginBottom: "14px" }}>
            <label style={lbl}>Timing</label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: "#64748b" }}>Verstuur</span>
              <input
                type="number"
                min={0}
                value={seq.timing_value}
                onChange={(e) => onChange({ ...seq, timing_value: parseInt(e.target.value) || 0 })}
                style={{ ...inp, width: "64px" }}
              />
              <select
                value={seq.timing_unit}
                onChange={(e) => onChange({ ...seq, timing_unit: e.target.value })}
                style={{ ...inp, width: "90px" }}
              >
                <option value="uur">uur</option>
                <option value="dagen">dagen</option>
              </select>
              <span style={{ fontSize: "13px", color: "#64748b" }}>na trigger</span>
            </div>
          </div>

          {/* Recipient */}
          <div style={{ marginBottom: "14px" }}>
            <label style={lbl}>Ontvanger</label>
            <select
              value={seq.recipient}
              onChange={(e) => onChange({ ...seq, recipient: e.target.value })}
              style={inp}
            >
              <option value="koper">Koper</option>
              <option value="verkoper">Verkoper</option>
              <option value="beide">Koper & Verkoper</option>
              <option value="notaris">Notaris</option>
            </select>
          </div>

          {/* Template */}
          <div style={{ marginBottom: "10px" }}>
            <label style={lbl}>Berichttemplate</label>
            <textarea
              ref={textareaRef}
              value={seq.template}
              onChange={(e) => onChange({ ...seq, template: e.target.value })}
              rows={4}
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>

          {/* Variable pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
            {VARIABLES.map((v) => (
              <button
                key={v}
                onClick={() => insertVariable(v)}
                style={{
                  padding: "3px 10px", background: "#f0f9ff", border: "1px solid #bae6fd",
                  borderRadius: "20px", fontSize: "11px", fontWeight: "600", color: "#0284c7",
                  cursor: "pointer", fontFamily: "DM Sans, Helvetica Neue, sans-serif",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            style={{
              background: "#0284c7", border: "none", borderRadius: "8px", padding: "8px 16px",
              fontSize: "12px", fontWeight: "600", color: "#fff", cursor: "pointer", opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Preview helpers ──────────────────────────────────────────────────────────

function fillPreview(template: string, officeName: string) {
  const today = new Date();
  const datum = today.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  return template
    .replace(/\[naam\]/g, "Thomas")
    .replace(/\[adres\]/g, "Keizersgracht 412")
    .replace(/\[makelaar\]/g, officeName || "De Boer Makelaardij")
    .replace(/\[datum\]/g, datum)
    .replace(/\[prijs\]/g, "€ 475.000")
    .replace(/\[tijd\]/g, "14:00");
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WhatsAppInstellingenPage() {
  const [tone, setTone]             = useState<ToneKey>("vriendelijk");
  const [officeName, setOfficeName] = useState("");
  const [signature, setSignature]   = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [sequences, setSequences]   = useState<Sequence[]>([]);
  const [savingSeq, setSavingSeq]   = useState<string | null>(null);
  const [agentId, setAgentId]       = useState<string | null>(null);

  const [toast, setToast]           = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load agent profile
    const { data: agent } = await supabase
      .from("agents")
      .select("id, whatsapp_tone, whatsapp_office_name, whatsapp_signature")
      .eq("user_id", user.id)
      .single();

    if (agent) {
      setAgentId(agent.id);
      if (agent.whatsapp_tone) setTone(agent.whatsapp_tone as ToneKey);
      if (agent.whatsapp_office_name) setOfficeName(agent.whatsapp_office_name);
      if (agent.whatsapp_signature) setSignature(agent.whatsapp_signature);

      // Load sequences
      const { data: seqs } = await supabase
        .from("whatsapp_sequences")
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: true });

      if (seqs && seqs.length > 0) {
        setSequences(seqs as Sequence[]);
      } else {
        // Insert defaults
        const inserts = DEFAULTS.map((d) => ({ ...d, agent_id: agent.id }));
        const { data: inserted } = await supabase
          .from("whatsapp_sequences")
          .insert(inserts)
          .select("*");
        if (inserted) setSequences(inserted as Sequence[]);
        else setSequences(DEFAULTS.map((d) => ({ ...d })));
      }
    } else {
      setSequences(DEFAULTS.map((d) => ({ ...d })));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save profile ─────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    setSavingProfile(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && agentId) {
      await supabase.from("agents").update({
        whatsapp_tone: tone,
        whatsapp_office_name: officeName,
        whatsapp_signature: signature,
      }).eq("id", agentId);
    }
    setSavingProfile(false);
    showToast("Instellingen opgeslagen");
  }

  // ── Save sequence ─────────────────────────────────────────────────────────────

  async function handleSaveSequence(seq: Sequence) {
    setSavingSeq(seq.trigger_key);
    const supabase = createClient();
    if (seq.id) {
      await supabase.from("whatsapp_sequences").update({
        enabled: seq.enabled,
        timing_value: seq.timing_value,
        timing_unit: seq.timing_unit,
        recipient: seq.recipient,
        template: seq.template,
        updated_at: new Date().toISOString(),
      }).eq("id", seq.id);
    } else if (agentId) {
      const { data } = await supabase.from("whatsapp_sequences").insert({
        agent_id: agentId,
        trigger_key: seq.trigger_key,
        enabled: seq.enabled,
        timing_value: seq.timing_value,
        timing_unit: seq.timing_unit,
        recipient: seq.recipient,
        template: seq.template,
      }).select().single();
      if (data) {
        setSequences((prev) => prev.map((s) => s.trigger_key === seq.trigger_key ? { ...s, id: data.id } : s));
      }
    }
    setSavingSeq(null);
    showToast("Sequentie opgeslagen");
  }

  function updateSequence(triggerKey: string, updated: Sequence) {
    setSequences((prev) => prev.map((s) => s.trigger_key === triggerKey ? updated : s));
  }

  // ── Preview ──────────────────────────────────────────────────────────────────

  const previewTemplate = sequences.find((s) => s.trigger_key === "welkomst")?.template ?? DEFAULTS[0].template;
  const previewText = fillPreview(previewTemplate, officeName);
  const now = new Date();
  const previewTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      {/* Top bar */}
      <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.5px" }}>WhatsApp Instellingen</span>
        <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "12px" }}>Stel in welke berichten automatisch worden verstuurd en in welke tone of voice</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px 24px" }}>
        <div style={{ maxWidth: "680px" }}>

          {/* ── Section 1: Tone of Voice ── */}
          <Section title="Tone of Voice" subtitle="Hoe communiceert jouw kantoor?">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {TONES.map((t) => {
                const selected = tone === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTone(t.key)}
                    style={{
                      border: `1px solid ${selected ? "#0284c7" : "#e8ecf0"}`,
                      background: selected ? "#f0f9ff" : "#fff",
                      borderRadius: "10px", padding: "14px 16px", cursor: "pointer",
                      textAlign: "left", transition: "border-color 0.15s, background 0.15s",
                      fontFamily: "DM Sans, Helvetica Neue, sans-serif",
                    }}
                  >
                    <div style={{ fontSize: "20px", marginBottom: "6px" }}>{t.icon}</div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: selected ? "#0284c7" : "#0f172a", marginBottom: "3px" }}>{t.label}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.4 }}>{t.sub}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={lbl}>Kantoor naam in berichten</label>
                <input value={officeName} onChange={(e) => setOfficeName(e.target.value)} placeholder="De Boer Makelaardij" style={inp} />
              </div>
              <div>
                <label style={lbl}>Handtekening</label>
                <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Met vriendelijke groet, Marco" style={inp} />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              style={{
                background: "#0284c7", border: "none", borderRadius: "8px", padding: "9px 18px",
                fontSize: "13px", fontWeight: "600", color: "#fff", cursor: "pointer",
                opacity: savingProfile ? 0.6 : 1,
              }}
            >
              {savingProfile ? "Opslaan…" : "Opslaan"}
            </button>
          </Section>

          {/* ── Section 2: Sequences ── */}
          <Section title="Automatische berichten" subtitle="Pas aan welke berichten automatisch worden verstuurd en wanneer">
            {sequences.length === 0
              ? DEFAULTS.map((d) => (
                  <SequenceCard
                    key={d.trigger_key}
                    seq={d}
                    onChange={(u) => updateSequence(d.trigger_key, u)}
                    onSave={() => handleSaveSequence(d)}
                    saving={savingSeq === d.trigger_key}
                  />
                ))
              : sequences.map((seq) => (
                  <SequenceCard
                    key={seq.trigger_key}
                    seq={seq}
                    onChange={(u) => updateSequence(seq.trigger_key, u)}
                    onSave={() => handleSaveSequence(seq)}
                    saving={savingSeq === seq.trigger_key}
                  />
                ))
            }
          </Section>

          {/* ── Section 3: Preview ── */}
          <Section title="Voorbeeld bericht" subtitle="Zo ziet een bericht eruit met jouw tone of voice instellingen">
            <div style={{ background: "#f0fdf4", padding: "20px", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                {/* Avatar */}
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: "700", flexShrink: 0, marginBottom: "20px" }}>
                  T
                </div>
                <div>
                  {/* Bubble */}
                  <div style={{
                    background: "#fff", borderRadius: "4px 12px 12px 12px", padding: "14px 18px",
                    maxWidth: "320px", fontSize: "13px", color: "#0f172a", lineHeight: 1.5,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", whiteSpace: "pre-wrap",
                  }}>
                    {previewText}
                  </div>
                  {/* Timestamp */}
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", paddingLeft: "4px" }}>
                    {previewTime} ✓✓
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: "12px", fontSize: "12px", color: "#94a3b8" }}>
              Gebaseerd op het welkomstbericht · variabelen ingevuld met voorbeelddata
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

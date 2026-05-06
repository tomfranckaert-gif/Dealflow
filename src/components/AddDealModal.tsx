"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Deal, DealStage } from "@/types/database";

const STAGES: { value: DealStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "bezichtiging", label: "Bezichtiging" },
  { value: "bod", label: "Bod" },
  { value: "koopakte", label: "Koopakte" },
  { value: "voorwaarden", label: "Voorwaarden" },
  { value: "financiering", label: "Financiering" },
  { value: "overdracht", label: "Overdracht" },
  { value: "gesloten", label: "Gesloten" },
];

interface Props {
  defaultStage?: DealStage;
  onClose: () => void;
  onCreated: (deal: Deal) => void;
}

export default function AddDealModal({ defaultStage = "lead", onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: "",
    company: "",
    value: "",
    stage: defaultStage,
    contact_name: "",
    contact_email: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("deals")
      .insert({
        title: form.title,
        company: form.company,
        value: form.value ? parseFloat(form.value) : null,
        stage: form.stage,
        owner_id: user.id,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    onCreated(data as Deal);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nieuwe deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800 p-3 text-sm text-red-300">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Dealnaam *</label>
              <input required value={form.title} onChange={(e) => set("title", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="bv. Website herontwerp" />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Bedrijf *</label>
              <input required value={form.company} onChange={(e) => set("company", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="bv. Acme BV" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Waarde (€)</label>
              <input type="number" min="0" value={form.value} onChange={(e) => set("value", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="0" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Fase</label>
              <select value={form.stage} onChange={(e) => set("stage", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none">
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Contactpersoon</label>
              <input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="Jane Smith" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">E-mailadres</label>
              <input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="jane@acme.com" />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Notities</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none resize-none"
                placeholder="Aanvullende notities..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-700 py-2 text-sm text-gray-300 hover:border-gray-500 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {loading ? "Aanmaken…" : "Deal aanmaken"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

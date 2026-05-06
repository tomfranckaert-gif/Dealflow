"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Deal, DealStage } from "@/types/database";

const STAGES: { value: DealStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

interface Props {
  deal: Deal;
  onClose: () => void;
  onUpdated: (deal: Deal) => void;
  onDeleted: (id: string) => void;
}

export default function DealSlideOver({ deal, onClose, onUpdated, onDeleted }: Props) {
  const [form, setForm] = useState({
    title: deal.title,
    company: deal.company,
    value: deal.value?.toString() ?? "",
    stage: deal.stage,
    contact_name: deal.contact_name ?? "",
    contact_email: deal.contact_email ?? "",
    notes: deal.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("deals")
      .update({
        title: form.title,
        company: form.company,
        value: form.value ? parseFloat(form.value) : null,
        stage: form.stage as DealStage,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        notes: form.notes || null,
      })
      .eq("id", deal.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    onUpdated(data as Deal);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Delete this deal?")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("deals").delete().eq("id", deal.id);
    onDeleted(deal.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border-l border-gray-700 h-full overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Edit Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800 p-3 text-sm text-red-300">{error}</div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Deal title *</label>
            <input required value={form.title} onChange={(e) => set("title", e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Company *</label>
            <input required value={form.company} onChange={(e) => set("company", e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Value ($)</label>
              <input type="number" min="0" value={form.value} onChange={(e) => set("value", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Stage</label>
              <select value={form.stage} onChange={(e) => set("stage", e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none">
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Contact name</label>
            <input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Contact email</label>
            <input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={4}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 disabled:opacity-50 transition-colors">
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800 text-xs text-gray-500">
          Created {new Date(deal.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

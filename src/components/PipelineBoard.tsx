"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import type { Deal, DealStage } from "@/types/database";
import DealCard from "./DealCard";
import AddDealModal from "./AddDealModal";
import DealSlideOver from "./DealSlideOver";

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: "lead", label: "Lead", color: "border-gray-600" },
  { id: "qualified", label: "Gekwalificeerd", color: "border-blue-600" },
  { id: "proposal", label: "Offerte", color: "border-yellow-600" },
  { id: "negotiation", label: "Onderhandeling", color: "border-orange-600" },
  { id: "closed_won", label: "Gewonnen", color: "border-green-600" },
  { id: "closed_lost", label: "Verloren", color: "border-red-600" },
];

function StageColumn({
  stage,
  deals,
  onAddClick,
  onCardClick,
}: {
  stage: (typeof STAGES)[0];
  deals: Deal[];
  onAddClick: (stage: DealStage) => void;
  onCardClick: (deal: Deal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className={`flex flex-col rounded-xl border-t-2 ${stage.color} bg-gray-900/50 border border-gray-800 border-t-0 min-w-[220px] w-full`}>
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-200">{stage.label}</span>
          <span className="text-xs bg-gray-800 text-gray-400 rounded-full px-2 py-0.5">{deals.length}</span>
        </div>
        {total > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">€{total.toLocaleString("nl-NL")}</p>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-2 min-h-[120px] transition-colors ${isOver ? "bg-indigo-950/30" : ""}`}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={onCardClick} />
          ))}
        </SortableContext>
      </div>

      <button
        onClick={() => onAddClick(stage.id)}
        className="m-2 rounded-lg border border-dashed border-gray-700 py-2 text-xs text-gray-500 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
      >
        + Deal toevoegen
      </button>
    </div>
  );
}

interface Props {
  initialDeals: Deal[];
  userEmail: string;
}

export default function PipelineBoard({ initialDeals, userEmail }: Props) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [addStage, setAddStage] = useState<DealStage | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function dealsByStage(stage: DealStage) {
    return deals.filter((d) => d.stage === stage);
  }

  function handleDragStart({ active }: { active: { id: string | number } }) {
    setActiveDeal(deals.find((d) => d.id === active.id) ?? null);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDeal(null);
    if (!over) return;

    const draggedDeal = deals.find((d) => d.id === active.id);
    if (!draggedDeal) return;

    const targetStage = STAGES.find((s) => s.id === over.id)?.id
      ?? deals.find((d) => d.id === over.id)?.stage;

    if (!targetStage || targetStage === draggedDeal.stage) return;

    setDeals((prev) =>
      prev.map((d) => (d.id === draggedDeal.id ? { ...d, stage: targetStage } : d))
    );

    const supabase = createClient();
    await supabase.from("deals").update({ stage: targetStage }).eq("id", draggedDeal.id);
  }

  function handleDealCreated(deal: Deal) {
    setDeals((prev) => [deal, ...prev]);
  }

  function handleDealUpdated(updated: Deal) {
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function handleDealDeleted(id: string) {
    setDeals((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const totalPipelineValue = deals
    .filter((d) => d.stage !== "closed_lost")
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <>
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Dealflow</h1>
            <div className="hidden sm:flex items-center gap-1 text-sm text-gray-400">
              <span>Pipeline:</span>
              <span className="text-indigo-400 font-medium">€{totalPipelineValue.toLocaleString("nl-NL")}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-gray-400">{userEmail}</span>
            <button
              onClick={() => setAddStage("lead")}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              + Nieuwe deal
            </button>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Uitloggen
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-w-max">
              {STAGES.map((stage) => (
                <div key={stage.id} className="w-[220px]">
                  <StageColumn
                    stage={stage}
                    deals={dealsByStage(stage.id)}
                    onAddClick={setAddStage}
                    onCardClick={setSelectedDeal}
                  />
                </div>
              ))}
            </div>

            <DragOverlay>
              {activeDeal && (
                <div className="rounded-lg border border-indigo-500 bg-gray-800 p-3 shadow-2xl rotate-1 w-[204px]">
                  <p className="font-medium text-white text-sm truncate">{activeDeal.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{activeDeal.company}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </main>
      </div>

      {addStage && (
        <AddDealModal
          defaultStage={addStage}
          onClose={() => setAddStage(null)}
          onCreated={handleDealCreated}
        />
      )}

      {selectedDeal && (
        <DealSlideOver
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdated={handleDealUpdated}
          onDeleted={handleDealDeleted}
        />
      )}
    </>
  );
}

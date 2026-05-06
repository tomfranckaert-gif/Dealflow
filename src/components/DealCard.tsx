"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Deal } from "@/types/database";

interface Props {
  deal: Deal;
  onClick: (deal: Deal) => void;
}

export default function DealCard({ deal, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(deal)}
      className="rounded-lg border border-gray-700 bg-gray-800 p-3 cursor-pointer hover:border-indigo-500 transition-colors select-none"
    >
      <p className="font-medium text-white text-sm truncate">{deal.title}</p>
      <p className="text-xs text-gray-400 mt-0.5 truncate">{deal.company}</p>
      {deal.value != null && (
        <p className="text-xs text-indigo-400 mt-2 font-medium">
          €{deal.value.toLocaleString("nl-NL")}
        </p>
      )}
      {deal.contact_name && (
        <p className="text-xs text-gray-500 mt-1 truncate">{deal.contact_name}</p>
      )}
    </div>
  );
}

import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";
import { PRIORITY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/task";

const STYLES: Record<Priority, { icon: LucideIcon; className: string }> = {
  alta: { icon: ArrowUp, className: "bg-red-50 text-red-700 ring-red-200" },
  media: {
    icon: Minus,
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  baja: {
    icon: ArrowDown,
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

/** Icono + texto + color: la prioridad no depende solo del color. */
export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const { icon: Icon, className: tone } = STYLES[priority];
  return (
    <span
      data-priority={priority}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      <span>
        <span className="sr-only">Prioridad </span>
        {PRIORITY_LABELS[priority]}
      </span>
    </span>
  );
}

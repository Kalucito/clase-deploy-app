import { AlertCircle, CalendarDays } from "lucide-react";
import { formatDueDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Vencida: color + icono + texto "Vencida" (CA-09.1, no solo color). */
export function DueDate({
  dueDate,
  overdue,
  className,
}: {
  dueDate: string;
  overdue: boolean;
  className?: string;
}) {
  const Icon = overdue ? AlertCircle : CalendarDays;
  return (
    <span
      data-overdue={overdue}
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        overdue ? "font-medium text-red-700" : "text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      <span className="sr-only">Vencimiento </span>
      <time dateTime={dueDate}>{formatDueDate(dueDate)}</time>
      {overdue && <span>· Vencida</span>}
    </span>
  );
}

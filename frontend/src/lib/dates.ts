import type { Task } from "@/types/task";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Hoy como `YYYY-MM-DD` según la fecha LOCAL del navegador (D4). */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * D4 / RN-15: vencida si `dueDate < hoy` y estado ≠ hecho. Compara cadenas
 * `YYYY-MM-DD` (orden lexicográfico = cronológico) sin crear `Date` en UTC.
 */
export function isOverdue(
  task: Pick<Task, "dueDate" | "status">,
  today: string = todayLocal(),
): boolean {
  if (!task.dueDate || task.status === "hecho") return false;
  return task.dueDate < today;
}

/** `2026-11-20` → "20 nov 2026" (interpretado como fecha local, sin desfase UTC). */
export function formatDueDate(dueDate: string): string {
  const [y, m, d] = dueDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Timestamp ISO → "7 nov 2026, 11:03" en hora local. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

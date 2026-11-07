import { STATUSES } from "@/lib/constants";
import type { Task, TaskStatus } from "@/types/task";

export type TasksByStatus = Record<TaskStatus, Task[]>;

/** Agrupa por estado, cada columna ordenada por `position` (RN-17). */
export function groupByStatus(tasks: readonly Task[]): TasksByStatus {
  const groups = Object.fromEntries(
    STATUSES.map((s) => [s, [] as Task[]]),
  ) as unknown as TasksByStatus;
  for (const task of tasks) groups[task.status].push(task);
  for (const status of STATUSES) {
    groups[status].sort((a, b) => a.position - b.position);
  }
  return groups;
}

/**
 * Replica la lógica de `PATCH /tasks/:id/move` del backend (plan §4.4/§6.3):
 * `position` es el índice final en la columna destino, se acota al rango
 * válido y se reasignan posiciones contiguas solo en las columnas afectadas.
 * Función pura: devuelve una lista nueva (o la misma si no hay cambios).
 */
export function applyMove(
  tasks: readonly Task[],
  id: string,
  status: TaskStatus,
  position: number,
): Task[] {
  const moving = tasks.find((t) => t.id === id);
  if (!moving) return tasks as Task[];

  const groups = groupByStatus(tasks);
  const from = moving.status;
  const sourceWithout = groups[from].filter((t) => t.id !== id);
  const destBase = from === status ? sourceWithout : groups[status];
  const index = Math.max(0, Math.min(Math.trunc(position), destBase.length));

  if (from === status && index === moving.position) return tasks as Task[];

  const dest = [...destBase];
  dest.splice(index, 0, { ...moving, status });

  const updates = new Map<string, Task>();
  const assign = (list: Task[]) =>
    list.forEach((t, i) => updates.set(t.id, { ...t, position: i }));
  assign(dest);
  if (from !== status) assign(sourceWithout);

  return tasks.map((t) => updates.get(t.id) ?? t);
}

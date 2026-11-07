import type { Priority, TaskStatus } from '../generated/prisma/enums';

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  labels: { name: string }[];
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  labels: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** `DATE` de Postgres llega como medianoche UTC: se formatea en UTC (sin desfase). */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** La relación M–N implícita no conserva orden: se ordena alfabéticamente (estable). */
function sortedLabelNames(labels: { name: string }[]): string[] {
  return labels
    .map((l) => l.name)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

export function serializeTask(row: TaskRow): TaskResponse {
  return {
    id: row.id,
    title: row.title,
    description:
      row.description === null || row.description === ''
        ? null
        : row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate ? formatDate(row.dueDate) : null,
    labels: sortedLabelNames(row.labels),
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

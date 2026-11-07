import { STATUSES } from "@/lib/constants";
import type { Priority, Task, TaskStatus } from "@/types/task";

export interface Filters {
  search: string;
  priorities: Priority[];
  labels: string[];
  statuses: TaskStatus[];
}

export const EMPTY_FILTERS: Filters = {
  search: "",
  priorities: [],
  labels: [],
  statuses: [],
};

/** Minúsculas y sin acentos: "Acción" ≈ "accion" (RN-11). */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Búsqueda efectiva: solo espacios equivale a vacía (CL-20). */
export function normalizedSearch(search: string): string {
  return normalizeText(search.trim());
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    normalizedSearch(filters.search) !== "" ||
    filters.priorities.length > 0 ||
    filters.labels.length > 0 ||
    filters.statuses.length > 0
  );
}

/**
 * RN-11/RN-12/D3: búsqueda por subcadena en título y descripción; AND entre
 * tipos de filtro; OR dentro de prioridad, estado y etiquetas (etiquetas sin
 * distinguir mayúsculas).
 */
export function applyFilters(tasks: readonly Task[], filters: Filters): Task[] {
  const query = normalizedSearch(filters.search);
  const labels = new Set(filters.labels.map((l) => l.trim().toLowerCase()));

  return tasks.filter((task) => {
    if (query !== "") {
      const haystack = `${normalizeText(task.title)}\n${normalizeText(task.description ?? "")}`;
      if (!haystack.includes(query)) return false;
    }
    if (
      filters.priorities.length > 0 &&
      !filters.priorities.includes(task.priority)
    )
      return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status))
      return false;
    if (
      labels.size > 0 &&
      !task.labels.some((l) => labels.has(l.toLowerCase()))
    )
      return false;
    return true;
  });
}

/** D2: sin selección de estado se ven las 4 columnas; si no, solo las elegidas (en orden fijo). */
export function visibleStatuses(filters: Filters): TaskStatus[] {
  if (filters.statuses.length === 0) return [...STATUSES];
  return STATUSES.filter((s) => filters.statuses.includes(s));
}

/** CA-08.8: quita del filtro las etiquetas que ya no existen. Devuelve el mismo objeto si no cambia. */
export function pruneLabels(
  filters: Filters,
  availableLabels: readonly string[],
): Filters {
  const available = new Set(availableLabels.map((l) => l.toLowerCase()));
  const kept = filters.labels.filter((l) => available.has(l.toLowerCase()));
  return kept.length === filters.labels.length
    ? filters
    : { ...filters, labels: kept };
}

export interface ColumnCount {
  visible: number;
  total: number;
}

/** RN-13: "visibles de total real" por columna. */
export function columnCounts(
  allTasks: readonly Task[],
  filteredTasks: readonly Task[],
): Record<TaskStatus, ColumnCount> {
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, { visible: 0, total: 0 }]),
  ) as Record<TaskStatus, ColumnCount>;
  for (const t of allTasks) counts[t.status].total += 1;
  for (const t of filteredTasks) counts[t.status].visible += 1;
  return counts;
}

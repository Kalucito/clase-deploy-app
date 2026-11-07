import type { Priority, TaskStatus } from "@/types/task";

/** Las 4 columnas fijas, en el orden de RN-01. Única definición en el frontend. */
export const COLUMNS: ReadonlyArray<{ status: TaskStatus; title: string }> = [
  { status: "pendiente", title: "Pendiente" },
  { status: "en_progreso", title: "En progreso" },
  { status: "en_revision", title: "En revisión" },
  { status: "hecho", title: "Hecho" },
];

export const STATUSES: ReadonlyArray<TaskStatus> = COLUMNS.map((c) => c.status);

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  en_revision: "En revisión",
  hecho: "Hecho",
};

export const PRIORITIES: ReadonlyArray<Priority> = ["baja", "media", "alta"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

// Deben coincidir con backend/src/common/constants.ts (los proyectos son independientes).
export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const MAX_LABELS_PER_TASK = 10;
export const LABEL_MIN_LENGTH = 1;
export const LABEL_MAX_LENGTH = 20;

/** Scope compartido: las mutaciones de movimiento se ejecutan de a una y en orden. */
export const BOARD_MOVES_SCOPE = "board-moves";

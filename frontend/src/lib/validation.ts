import { z } from "zod";
import {
  DESCRIPTION_MAX_LENGTH,
  LABEL_MAX_LENGTH,
  LABEL_MIN_LENGTH,
  MAX_LABELS_PER_TASK,
  PRIORITIES,
  STATUSES,
  TITLE_MAX_LENGTH,
} from "@/lib/constants";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/api/tasks";
import type { Priority, Task, TaskStatus } from "@/types/task";

/** `YYYY-MM-DD` que además sea una fecha de calendario real (rechaza 2026-02-31). */
export function isCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d
  );
}

export function hasDuplicateLabels(labels: readonly string[]): boolean {
  const seen = new Set<string>();
  for (const l of labels) {
    const key = l.trim().toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

/** Mismas reglas que los DTOs del backend (que sigue siendo la fuente de verdad, RN-09). */
export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio")
    .max(
      TITLE_MAX_LENGTH,
      `El título no puede superar los ${TITLE_MAX_LENGTH} caracteres`,
    ),
  description: z
    .string()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres`,
    ),
  status: z.enum(STATUSES as [TaskStatus, ...TaskStatus[]], {
    error: "El estado no es válido",
  }),
  priority: z.enum(PRIORITIES as [Priority, ...Priority[]], {
    error: "La prioridad no es válida",
  }),
  /** Vacío = sin vencimiento. */
  dueDate: z
    .string()
    .refine(
      (v) => v === "" || isCalendarDate(v),
      "La fecha de vencimiento no es válida",
    ),
  labels: z
    .array(
      z
        .string()
        .trim()
        .min(
          LABEL_MIN_LENGTH,
          `Cada etiqueta debe tener entre ${LABEL_MIN_LENGTH} y ${LABEL_MAX_LENGTH} caracteres`,
        )
        .max(
          LABEL_MAX_LENGTH,
          `Cada etiqueta debe tener entre ${LABEL_MIN_LENGTH} y ${LABEL_MAX_LENGTH} caracteres`,
        ),
    )
    .max(
      MAX_LABELS_PER_TASK,
      `Una tarea no puede tener más de ${MAX_LABELS_PER_TASK} etiquetas`,
    )
    .refine((l) => !hasDuplicateLabels(l), "Las etiquetas no pueden repetirse"),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const emptyFormValues: TaskFormValues = {
  title: "",
  description: "",
  status: "pendiente",
  priority: "media",
  dueDate: "",
  labels: [],
};

export function valuesFromTask(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? "",
    labels: [...task.labels],
  };
}

export function toCreateInput(values: TaskFormValues): CreateTaskInput {
  return {
    title: values.title.trim(),
    description: values.description === "" ? null : values.description,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate === "" ? null : values.dueDate,
    labels: values.labels.map((l) => l.trim()),
  };
}

/** Parche con los campos que cambiaron; `null` vacía descripción/vencimiento (CA-04.4). */
export function toUpdateInput(
  values: TaskFormValues,
  original: Task,
): UpdateTaskInput {
  const next = toCreateInput(values);
  const patch: UpdateTaskInput = {};
  if (next.title !== original.title) patch.title = next.title;
  if (next.description !== original.description)
    patch.description = next.description;
  if (next.status !== original.status) patch.status = next.status;
  if (next.priority !== original.priority) patch.priority = next.priority;
  if (next.dueDate !== original.dueDate) patch.dueDate = next.dueDate;
  const sameLabels =
    next.labels!.length === original.labels.length &&
    [...next.labels!].sort().join("\u0000") ===
      [...original.labels].sort().join("\u0000");
  if (!sameLabels) patch.labels = next.labels;
  return patch;
}

/** Mapea `details[].field` del backend a campos del formulario. */
export const FORM_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "dueDate",
  "labels",
] as const;
export type FormField = (typeof FORM_FIELDS)[number];
export function isFormField(field: string): field is FormField {
  return (FORM_FIELDS as readonly string[]).includes(field);
}

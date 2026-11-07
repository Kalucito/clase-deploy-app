export type TaskStatus = "pendiente" | "en_progreso" | "en_revision" | "hecho";
export type Priority = "baja" | "media" | "alta";

/** Recurso `Task` del contrato de la API (plan §6.1). */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  /** `YYYY-MM-DD` o null. */
  dueDate: string | null;
  labels: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** Cuerpo de error unificado del backend (plan §5.4). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: ApiErrorDetail[];
}

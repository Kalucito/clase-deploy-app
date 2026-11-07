import type { Priority, Task, TaskStatus } from "@/types/task";
import { request } from "./client";

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  labels?: string[];
}

/** Parche parcial: `null` vacía description/dueDate. */
export type UpdateTaskInput = Partial<CreateTaskInput>;

export interface MoveTaskInput {
  status: TaskStatus;
  /** Índice final en la columna destino. */
  position: number;
}

export const listTasks = () => request<Task[]>("/tasks");

export const getTask = (id: string) => request<Task>(`/tasks/${id}`);

export const createTask = (input: CreateTaskInput) =>
  request<Task>("/tasks", { method: "POST", body: input });

export const updateTask = (id: string, input: UpdateTaskInput) =>
  request<Task>(`/tasks/${id}`, { method: "PATCH", body: input });

export const deleteTask = (id: string) =>
  request<void>(`/tasks/${id}`, { method: "DELETE" });

export const moveTask = (id: string, input: MoveTaskInput) =>
  request<Task>(`/tasks/${id}/move`, { method: "PATCH", body: input });

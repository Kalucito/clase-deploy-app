import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  deleteTask,
  updateTask,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/lib/api/tasks";
import { LABELS_KEY } from "./useLabels";
import { TASKS_KEY } from "./useTasks";

/** Refresca tareas y etiquetas; se espera para que el modal cierre con el tablero ya actualizado. */
function useRefreshBoard() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: TASKS_KEY }),
      qc.invalidateQueries({ queryKey: LABELS_KEY }),
    ]);
}

/** Crear: NO optimista (el modal ya muestra "guardando" y los errores van junto al formulario). */
export function useCreateTask() {
  const refresh = useRefreshBoard();
  return useMutation({
    retry: false,
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: refresh,
  });
}

export function useUpdateTask() {
  const refresh = useRefreshBoard();
  return useMutation({
    retry: false,
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: refresh,
  });
}

export function useDeleteTask() {
  const refresh = useRefreshBoard();
  return useMutation({
    retry: false,
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: refresh,
  });
}

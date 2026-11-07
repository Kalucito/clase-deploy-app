import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { moveTask } from "@/lib/api/tasks";
import { applyMove } from "@/lib/board";
import { BOARD_MOVES_SCOPE } from "@/lib/constants";
import type { Task, TaskStatus } from "@/types/task";
import { TASKS_KEY } from "./useTasks";

export interface MoveVariables {
  id: string;
  status: TaskStatus;
  /** Índice final en la columna destino. */
  position: number;
}

const MOVE_KEY = ["move-task"] as const;

export function moveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNotFound) return "La tarea ya no existe";
    if (error.isNetwork)
      return "No se pudo mover la tarea: no hay conexión con el servidor";
  }
  return "No se pudo mover la tarea. Intentá nuevamente.";
}

/**
 * Movimiento/reordenamiento optimista (plan §7.5): aplica `applyMove` a la caché
 * al instante, revierte exacto si falla (RN-07) y reconcilia con el servidor al
 * final. Las mutaciones comparten `scope`: se ejecutan de a una y en orden.
 */
export function useMoveTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: MOVE_KEY,
    scope: { id: BOARD_MOVES_SCOPE },
    retry: false,
    mutationFn: ({ id, status, position }: MoveVariables) =>
      moveTask(id, { status, position }),

    onMutate: async ({ id, status, position }) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<Task[]>(TASKS_KEY);
      if (previous) {
        qc.setQueryData<Task[]>(
          TASKS_KEY,
          applyMove(previous, id, status, position),
        );
      }
      return { previous };
    },

    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(TASKS_KEY, context.previous);
      toast.error(moveErrorMessage(error));
    },

    onSettled: () => {
      // Con varios movimientos en cola, se reconcilia solo al terminar el último.
      if (qc.isMutating({ mutationKey: MOVE_KEY }) <= 1) {
        return qc.invalidateQueries({ queryKey: TASKS_KEY });
      }
    },
  });
}

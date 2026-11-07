"use client";

import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteTask } from "@/hooks/useTaskMutations";
import { ApiError } from "@/lib/api/client";
import type { Task } from "@/types/task";

interface DeleteTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tarea eliminada (o ya inexistente: idempotente, CA-05.5). */
  onDeleted: () => void;
}

/** Confirmación explícita mostrando el título (CA-05.1, RN-08). El borrado es definitivo. */
export function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onDeleted,
}: DeleteTaskDialogProps) {
  const del = useDeleteTask();
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const busy = del.isPending;

  async function confirm() {
    // Doble clic: una sola operación efectiva (CL-18).
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      await del.mutateAsync(task.id);
      onDeleted();
    } catch (e) {
      if (e instanceof ApiError && e.isNotFound) {
        // Ya la borró otro visitante: el resultado buscado se cumplió.
        onDeleted();
      } else {
        setError(
          e instanceof ApiError && e.isNetwork
            ? "No se pudo conectar con el servidor. La tarea no se eliminó."
            : "No se pudo eliminar la tarea. Intentá nuevamente.",
        );
      }
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar la tarea?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar{" "}
            <strong className="break-words font-medium text-foreground">
              “{task.title}”
            </strong>
            . Esta acción es definitiva y no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? "Eliminando…" : "Eliminar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

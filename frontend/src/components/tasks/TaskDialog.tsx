"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateTask } from "@/hooks/useTaskMutations";
import { ApiError } from "@/lib/api/client";
import {
  emptyFormValues,
  isFormField,
  taskFormSchema,
  toCreateInput,
  type TaskFormValues,
} from "@/lib/validation";
import type { Task } from "@/types/task";
import { TaskForm } from "./TaskForm";

export type TaskDialogState = { mode: "create" };

interface TaskDialogProps {
  state: TaskDialogState | null;
  onClose: () => void;
  /** Se invoca tras crear con éxito (antes de cerrar). */
  onCreated?: (task: Task) => void;
}

export function TaskDialog({ state, onClose, onCreated }: TaskDialogProps) {
  if (!state) return null;
  return <TaskDialogInner onClose={onClose} onCreated={onCreated} />;
}

function TaskDialogInner({
  onClose,
  onCreated,
}: Omit<TaskDialogProps, "state">) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: emptyFormValues,
  });
  const create = useCreateTask();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const submitting = useRef(false);
  const saving = create.isPending;
  // Se lee en el render para que react-hook-form suscriba el cambio de `isDirty`.
  const { isDirty } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const task = await create.mutateAsync(toCreateInput(values));
      onCreated?.(task);
      onClose();
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 400 &&
        error.details.length > 0
      ) {
        let mapped = false;
        for (const d of error.details) {
          if (isFormField(d.field)) {
            form.setError(d.field, { message: d.message });
            mapped = true;
          }
        }
        if (!mapped) setServerError(error.message);
      } else {
        setServerError(
          error instanceof ApiError
            ? error.message
            : "No se pudo guardar la tarea. Intentá nuevamente.",
        );
      }
    }
  });

  // Doble clic / doble Enter: una sola operación efectiva (CL-18).
  function handleSubmit() {
    if (submitting.current) return;
    submitting.current = true;
    void submit().finally(() => {
      submitting.current = false;
    });
  }

  // Esc, clic fuera y "Cancelar" pasan por acá (CA-11.3, CL-22).
  function requestClose() {
    if (saving) return;
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && requestClose()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
            <DialogDescription>
              Completá los datos de la tarea.
            </DialogDescription>
          </DialogHeader>

          <TaskForm
            form={form}
            idPrefix="task"
            disabled={saving}
            onSubmit={handleSubmit}
          >
            {serverError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </p>
            )}
          </TaskForm>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="task-form" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tenés cambios sin guardar. Si cerrás ahora, se pierden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onClose();
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

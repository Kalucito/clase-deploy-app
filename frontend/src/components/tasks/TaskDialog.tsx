"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import { LABELS_KEY } from "@/hooks/useLabels";
import { TASKS_KEY } from "@/hooks/useTasks";
import { useCreateTask, useUpdateTask } from "@/hooks/useTaskMutations";
import { ApiError } from "@/lib/api/client";
import { getTask } from "@/lib/api/tasks";
import { formatDateTime } from "@/lib/dates";
import {
  emptyFormValues,
  isFormField,
  taskFormSchema,
  toCreateInput,
  toUpdateInput,
  valuesFromTask,
  type TaskFormValues,
} from "@/lib/validation";
import type { Task } from "@/types/task";
import { TaskForm } from "./TaskForm";

export type TaskDialogState = { mode: "create" } | { mode: "edit"; task: Task };

interface TaskDialogProps {
  state: TaskDialogState | null;
  onClose: () => void;
  /** Se invoca tras crear con éxito (antes de cerrar). */
  onCreated?: (task: Task) => void;
}

export function TaskDialog({ state, onClose, onCreated }: TaskDialogProps) {
  if (!state) return null;
  // `key` reinicia el formulario al abrir otra tarea.
  return (
    <TaskDialogInner
      key={state.mode === "edit" ? state.task.id : "create"}
      state={state}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}

function TaskDialogInner({
  state,
  onClose,
  onCreated,
}: {
  state: TaskDialogState;
  onClose: () => void;
  onCreated?: (task: Task) => void;
}) {
  const editing = state.mode === "edit" ? state.task : null;
  const qc = useQueryClient();
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: editing ? valuesFromTask(editing) : emptyFormValues,
  });
  const create = useCreateTask();
  const update = useUpdateTask();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const submitting = useRef(false);
  const saving = create.isPending || update.isPending;
  // Se lee en el render para que react-hook-form suscriba el cambio de `isDirty`.
  const { isDirty } = form.formState;

  // La tarea fue eliminada por otro visitante (CA-03.2, CA-04.5, CL-12).
  function handleGone() {
    toast.error("La tarea ya no existe");
    void qc.invalidateQueries({ queryKey: TASKS_KEY });
    void qc.invalidateQueries({ queryKey: LABELS_KEY });
    onClose();
  }

  // Al abrir una tarea se confirma que sigue existiendo.
  const existence = useQuery({
    queryKey: ["task", editing?.id],
    queryFn: () => getTask(editing!.id),
    enabled: editing !== null,
    retry: false,
    staleTime: 0,
  });
  const existenceError = existence.error;
  useEffect(() => {
    if (existenceError instanceof ApiError && existenceError.isNotFound)
      handleGone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existenceError]);

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (editing) {
        const patch = toUpdateInput(values, editing);
        // Sin cambios reales no hace falta pedirle nada al servidor.
        if (Object.keys(patch).length > 0) {
          await update.mutateAsync({ id: editing.id, input: patch });
        }
      } else {
        const task = await create.mutateAsync(toCreateInput(values));
        onCreated?.(task);
      }
      onClose();
    } catch (error) {
      if (editing && error instanceof ApiError && error.isNotFound) {
        handleGone();
        return;
      }
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
            <DialogTitle>
              {editing ? "Editar tarea" : "Nueva tarea"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Modificá los datos de la tarea."
                : "Completá los datos de la tarea."}
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

          {editing && (
            <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="inline font-medium">Creada: </dt>
                <dd className="inline">{formatDateTime(editing.createdAt)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Última modificación: </dt>
                <dd className="inline">{formatDateTime(editing.updatedAt)}</dd>
              </div>
            </dl>
          )}

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

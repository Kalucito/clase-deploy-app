"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TaskDialog,
  type TaskDialogState,
} from "@/components/tasks/TaskDialog";
import { useMoveTask } from "@/hooks/useMoveTask";
import { useTasks } from "@/hooks/useTasks";
import { AppShell } from "./AppShell";
import { Board } from "./Board";

/** Pantalla principal. Los datos se piden desde el navegador a la API (no en SSR). */
export function BoardPage() {
  const { data, isPending, isError, refetch } = useTasks();
  const { mutate: moveTask } = useMoveTask();
  const [dialog, setDialog] = useState<TaskDialogState | null>(null);
  const tasks = data ?? [];

  return (
    <AppShell
      actions={
        <Button onClick={() => setDialog({ mode: "create" })}>
          <Plus aria-hidden /> Nueva tarea
        </Button>
      }
    >
      <Board
        tasks={tasks}
        isLoading={isPending}
        // Si ya hay datos y falla un refresco, se siguen mostrando los datos.
        isError={isError && data === undefined}
        onRetry={() => void refetch()}
        onMoveTask={moveTask}
        onCreateFirst={() => setDialog({ mode: "create" })}
        onOpenTask={(task) => setDialog({ mode: "edit", task })}
      />
      <TaskDialog state={dialog} onClose={() => setDialog(null)} />
    </AppShell>
  );
}

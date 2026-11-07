"use client";

import { useMoveTask } from "@/hooks/useMoveTask";
import { useTasks } from "@/hooks/useTasks";
import { AppShell } from "./AppShell";
import { Board } from "./Board";

/** Pantalla principal. Los datos se piden desde el navegador a la API (no en SSR). */
export function BoardPage() {
  const { data, isPending, isError, refetch } = useTasks();
  const { mutate: moveTask } = useMoveTask();
  const tasks = data ?? [];

  return (
    <AppShell>
      <Board
        tasks={tasks}
        isLoading={isPending}
        // Si ya hay datos y falla un refresco, se siguen mostrando los datos.
        isError={isError && data === undefined}
        onRetry={() => void refetch()}
        onMoveTask={moveTask}
      />
    </AppShell>
  );
}

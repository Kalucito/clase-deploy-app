"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TaskDialog,
  type TaskDialogState,
} from "@/components/tasks/TaskDialog";
import { FilterBar } from "@/components/filters/FilterBar";
import { useFilters } from "@/hooks/useFilters";
import { useLabels } from "@/hooks/useLabels";
import { useMoveTask } from "@/hooks/useMoveTask";
import { applyFilters, hasActiveFilters } from "@/lib/filters";
import { useTasks } from "@/hooks/useTasks";
import { AppShell } from "./AppShell";
import { Board } from "./Board";

/** Pantalla principal. Los datos se piden desde el navegador a la API (no en SSR). */
export function BoardPage() {
  const { data, isPending, isError, refetch } = useTasks();
  const { mutate: moveTask } = useMoveTask();
  const [dialog, setDialog] = useState<TaskDialogState | null>(null);
  const { data: labels } = useLabels();
  const f = useFilters();
  const tasks = data ?? [];
  const filtersActive = hasActiveFilters(f.filters);
  const visibleTasks = applyFilters(tasks, f.filters);

  return (
    <AppShell
      filters={
        <FilterBar
          filters={f.filters}
          availableLabels={labels ?? []}
          clearCount={f.clearCount}
          onSearchChange={f.setSearch}
          onPrioritiesChange={f.setPriorities}
          onLabelsChange={f.setLabels}
          onStatusesChange={f.setStatuses}
          onClear={f.clear}
        />
      }
      actions={
        <Button onClick={() => setDialog({ mode: "create" })}>
          <Plus aria-hidden /> Nueva tarea
        </Button>
      }
    >
      <Board
        tasks={visibleTasks}
        dndDisabled={filtersActive}
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

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TaskDialog,
  type TaskDialogState,
} from "@/components/tasks/TaskDialog";
import { FilterBar } from "@/components/filters/FilterBar";
import { useFilters } from "@/hooks/useFilters";
import { useLabels } from "@/hooks/useLabels";
import type { Task } from "@/types/task";
import { useMoveTask } from "@/hooks/useMoveTask";
import {
  applyFilters,
  columnCounts,
  hasActiveFilters,
  pruneLabels,
  visibleStatuses,
} from "@/lib/filters";
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
  const counts = columnCounts(tasks, visibleTasks);
  const columnTotals = filtersActive
    ? Object.fromEntries(Object.entries(counts).map(([s, c]) => [s, c.total]))
    : undefined;

  // CA-08.8: si una etiqueta seleccionada deja de existir, se quita del filtro.
  const { filters, setFilters } = f;
  useEffect(() => {
    if (!labels) return;
    const pruned = pruneLabels(filters, labels);
    if (pruned !== filters) setFilters(pruned);
  }, [labels, filters, setFilters]);

  // CL-21: la tarea se crea pero no coincide con los filtros activos.
  function handleCreated(task: Task) {
    if (
      hasActiveFilters(f.filters) &&
      applyFilters([task], f.filters).length === 0
    ) {
      toast.info(
        "La tarea se creó, pero queda oculta por los filtros activos.",
      );
    }
  }

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
        totalCount={tasks.length}
        columnTotals={columnTotals}
        visibleStatuses={visibleStatuses(f.filters)}
        onClearFilters={f.clear}
        isLoading={isPending}
        // Si ya hay datos y falla un refresco, se siguen mostrando los datos.
        isError={isError && data === undefined}
        onRetry={() => void refetch()}
        onMoveTask={moveTask}
        onCreateFirst={() => setDialog({ mode: "create" })}
        onOpenTask={(task) => setDialog({ mode: "edit", task })}
      />
      <TaskDialog
        state={dialog}
        onClose={() => setDialog(null)}
        onCreated={handleCreated}
      />
    </AppShell>
  );
}

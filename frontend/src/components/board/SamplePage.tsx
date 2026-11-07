"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { STATUSES } from "@/lib/constants";
import type { Priority, Task } from "@/types/task";
import { AppShell } from "./AppShell";
import { Board } from "./Board";

const PRIORITIES: Priority[] = ["baja", "media", "alta"];

/** Provisional (etapa 6): datos en memoria solo para validar el diseño. Se reemplaza en T-27. */
function sampleTasks(): Task[] {
  const tasks: Task[] = [];
  STATUSES.forEach((status, s) => {
    const n = status === "pendiente" ? 200 : 3 + s;
    for (let i = 0; i < n; i++) {
      tasks.push({
        id: `${status}-${i}`,
        title:
          i === 1
            ? "<b>Título</b> muy largo ".repeat(6)
            : `Tarea ${status} ${i + 1}`,
        description: null,
        status,
        priority: PRIORITIES[i % 3],
        dueDate: i % 4 === 0 ? "2026-01-15" : i % 4 === 1 ? "2027-03-10" : null,
        labels:
          i % 2 === 0 ? ["frontend", "demo", "etiqueta-larga-de-20-c"] : [],
        position: i,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      });
    }
  });
  return tasks;
}

export function SamplePage() {
  const tasks = useMemo(() => sampleTasks(), []);
  return (
    <AppShell actions={<Button>Nueva tarea</Button>}>
      <Board tasks={tasks} />
    </AppShell>
  );
}

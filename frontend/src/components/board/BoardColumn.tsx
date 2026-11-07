import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";

interface BoardColumnProps {
  status: TaskStatus;
  title: string;
  /** Tareas visibles de la columna, ya ordenadas por posición. */
  tasks: Task[];
  /** Total real de la columna; si difiere de `tasks.length` se muestra "n de total" (RN-13). */
  totalCount?: number;
  onOpenTask?: (task: Task) => void;
  today?: string;
  /** Reemplaza la lista por defecto (lo usa el DnD en la etapa 8). */
  children?: ReactNode;
  className?: string;
}

export function BoardColumn({
  status,
  title,
  tasks,
  totalCount,
  onOpenTask,
  today,
  children,
  className,
}: BoardColumnProps) {
  const headingId = `column-${status}-title`;
  const counter =
    totalCount !== undefined && totalCount !== tasks.length
      ? `${tasks.length} de ${totalCount}`
      : String(tasks.length);
  const isEmpty = (totalCount ?? tasks.length) === 0;

  return (
    <section
      aria-labelledby={headingId}
      data-status={status}
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl bg-muted/50 p-2",
        className,
      )}
    >
      <header className="flex items-center justify-between px-2 py-1.5">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        <span
          aria-label={`${counter} tareas`}
          data-testid={`count-${status}`}
          className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {counter}
        </span>
      </header>

      {/* Scroll vertical interno: la columna no ensancha ni alarga la página (CL-19). */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        {children ?? (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskCard task={task} onOpen={onOpenTask} today={today} />
              </li>
            ))}
          </ul>
        )}
        {isEmpty && (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Sin tareas
          </p>
        )}
      </div>
    </section>
  );
}

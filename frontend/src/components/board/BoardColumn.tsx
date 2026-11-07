import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/task";
import { SortableTaskCard } from "./SortableTaskCard";

interface BoardColumnProps {
  status: TaskStatus;
  title: string;
  /** Tareas visibles de la columna, ya ordenadas por posición. */
  tasks: Task[];
  /** Total real de la columna; si difiere de `tasks.length` se muestra "n de total" (RN-13). */
  totalCount?: number;
  onOpenTask?: (task: Task) => void;
  today?: string;
  /** Las tarjetas no se pueden arrastrar (filtros activos, D1). */
  dndDisabled?: boolean;
  /** Hay un arrastre en curso y la tarjeta está sobre esta columna (CA-06.2). */
  isDropTarget?: boolean;
  className?: string;
}

export function BoardColumn({
  status,
  title,
  tasks,
  totalCount,
  onOpenTask,
  today,
  dndDisabled = false,
  isDropTarget = false,
  className,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: status, disabled: dndDisabled });
  const headingId = `column-${status}-title`;
  const counter =
    totalCount !== undefined && totalCount !== tasks.length
      ? `${tasks.length} de ${totalCount}`
      : String(tasks.length);
  const isEmpty = (totalCount ?? tasks.length) === 0;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      data-status={status}
      data-drop-target={isDropTarget || undefined}
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl bg-muted/50 p-2 transition-colors",
        isDropTarget && "bg-primary/10 ring-2 ring-primary/40",
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
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          disabled={dndDisabled}
        >
          <ul className="flex min-h-12 flex-col gap-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <SortableTaskCard
                  task={task}
                  disabled={dndDisabled}
                  onOpen={onOpenTask}
                  today={today}
                />
              </li>
            ))}
          </ul>
        </SortableContext>
        {isEmpty && (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Sin tareas
          </p>
        )}
      </div>
    </section>
  );
}

import type { HTMLAttributes, KeyboardEvent, Ref } from "react";
import { DueDate } from "@/components/tasks/DueDate";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { isOverdue, todayLocal } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

interface TaskCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onClick" | "children"
> {
  task: Task;
  onOpen?: (task: Task) => void;
  /** Hoy como YYYY-MM-DD; inyectable para pruebas. */
  today?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Tarjeta de tarea. Todo el contenido se renderiza como texto (React lo
 * escapa): nunca se interpreta HTML (CL-04).
 */
export function TaskCard({
  task,
  onOpen,
  today,
  className,
  ref,
  onKeyDown,
  ...rest
}: TaskCardProps) {
  const overdue = isOverdue(task, today ?? todayLocal());

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpen?.(task);
    }
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={`Tarea: ${task.title}`}
      data-task-id={task.id}
      onClick={() => onOpen?.(task)}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-2 rounded-lg border bg-card p-3 text-left text-card-foreground shadow-xs outline-none transition-shadow hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...rest}
    >
      <p
        className="line-clamp-2 break-words text-sm font-medium leading-snug"
        title={task.title}
      >
        {task.title}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && <DueDate dueDate={task.dueDate} overdue={overdue} />}
      </div>
      {task.labels.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="Etiquetas">
          {task.labels.map((label) => (
            <li
              key={label}
              className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

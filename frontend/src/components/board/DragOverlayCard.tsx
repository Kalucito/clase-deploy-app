import { TaskCard } from "./TaskCard";
import type { Task } from "@/types/task";

/** Copia flotante de la tarjeta durante el arrastre: no interactiva. */
export function DragOverlayCard({
  task,
  today,
}: {
  task: Task;
  today?: string;
}) {
  return (
    <TaskCard
      task={task}
      today={today}
      tabIndex={-1}
      aria-hidden
      className="rotate-1 cursor-grabbing shadow-lg ring-2 ring-primary/30"
    />
  );
}

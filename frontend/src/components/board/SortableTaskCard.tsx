import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";

interface SortableTaskCardProps {
  task: Task;
  disabled?: boolean;
  onOpen?: (task: Task) => void;
  today?: string;
}

/** Tarjeta arrastrable. El original queda atenuado mientras se arrastra (CA-06.2). */
export function SortableTaskCard({
  task,
  disabled = false,
  onOpen,
  today,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled,
  });

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      onOpen={onOpen}
      today={today}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "touch-manipulation",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    />
  );
}

import { groupByStatus } from "@/lib/board";
import { COLUMNS } from "@/lib/constants";
import type { Task } from "@/types/task";
import { BoardColumn } from "./BoardColumn";
import { BoardError } from "./BoardError";
import { BoardSkeleton } from "./BoardSkeleton";
import { EmptyBoard } from "./EmptyBoard";

interface BoardProps {
  tasks: Task[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onCreateFirst?: () => void;
  onOpenTask?: (task: Task) => void;
  today?: string;
}

/** Las 4 columnas fijas, siempre en el orden de RN-01. */
export function Board({
  tasks,
  isLoading = false,
  isError = false,
  onRetry,
  onCreateFirst,
  onOpenTask,
  today,
}: BoardProps) {
  if (isLoading) return <BoardSkeleton />;
  if (isError) return <BoardError onRetry={() => onRetry?.()} />;
  // Vacío = ninguna tarea en ninguna columna (CA-01.5/01.6).
  if (tasks.length === 0) return <EmptyBoard onCreate={onCreateFirst} />;

  const groups = groupByStatus(tasks);
  return (
    <div
      data-testid="board"
      className="flex h-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 lg:snap-none lg:overflow-visible"
    >
      {COLUMNS.map(({ status, title }) => (
        <div
          key={status}
          className="h-full min-w-[85%] snap-start sm:min-w-[45%] lg:min-w-0 lg:flex-1"
        >
          <BoardColumn
            status={status}
            title={title}
            tasks={groups[status]}
            onOpenTask={onOpenTask}
            today={today}
          />
        </div>
      ))}
    </div>
  );
}

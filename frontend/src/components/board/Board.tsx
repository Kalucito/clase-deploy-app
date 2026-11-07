import { groupByStatus } from "@/lib/board";
import { COLUMNS } from "@/lib/constants";
import type { Task } from "@/types/task";
import { BoardColumn } from "./BoardColumn";

interface BoardProps {
  tasks: Task[];
  onOpenTask?: (task: Task) => void;
  today?: string;
}

/** Las 4 columnas fijas, siempre en el orden de RN-01. */
export function Board({ tasks, onOpenTask, today }: BoardProps) {
  const groups = groupByStatus(tasks);
  return (
    <div
      data-testid="board"
      className="flex h-full gap-4 overflow-x-auto lg:overflow-visible"
    >
      {COLUMNS.map(({ status, title }) => (
        <div
          key={status}
          className="h-full min-w-[80%] sm:min-w-[45%] lg:min-w-0 lg:flex-1"
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

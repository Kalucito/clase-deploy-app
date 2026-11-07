import { DndContext, DragOverlay, type Announcements } from "@dnd-kit/core";
import { useBoardDnd, boardCollisionDetection } from "@/hooks/useBoardDnd";
import type { MoveVariables } from "@/hooks/useMoveTask";
import { Info } from "lucide-react";
import { COLUMNS } from "@/lib/constants";
import type { Task, TaskStatus } from "@/types/task";
import { BoardColumn } from "./BoardColumn";
import { BoardError } from "./BoardError";
import { BoardSkeleton } from "./BoardSkeleton";
import { DragOverlayCard } from "./DragOverlayCard";
import { EmptyBoard } from "./EmptyBoard";
import { NoResults } from "./NoResults";

interface BoardProps {
  tasks: Task[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onCreateFirst?: () => void;
  onOpenTask?: (task: Task) => void;
  /** Se invoca una sola vez por movimiento efectivo (nunca si se suelta en el mismo lugar). */
  onMoveTask?: (move: MoveVariables) => void;
  /** Deshabilita el arrastre (filtros activos, D1). */
  dndDisabled?: boolean;
  /** Total de tareas del tablero sin filtrar: distingue "vacío" de "sin resultados". */
  totalCount?: number;
  /** Total real por columna, para el contador "n de total" (RN-13). */
  columnTotals?: Partial<Record<TaskStatus, number>>;
  /** Columnas visibles (D2); por defecto las 4. */
  visibleStatuses?: readonly TaskStatus[];
  onClearFilters?: () => void;
  today?: string;
}

const noop = () => {};

const announcements: Announcements = {
  onDragStart: ({ active }) => `Levantaste la tarea ${active.id}.`,
  onDragOver: ({ over }) =>
    over ? "Moviendo la tarea." : "La tarea está fuera de una columna.",
  onDragEnd: ({ over }) =>
    over
      ? "Soltaste la tarea."
      : "Soltaste la tarea fuera de una columna; no se movió.",
  onDragCancel: () => "Movimiento cancelado.",
};

const screenReaderInstructions = {
  draggable:
    "Para mover una tarea, presioná la barra espaciadora. Usá las flechas para elegir la posición y presioná espacio otra vez para soltarla. Esc cancela.",
};

/** Las 4 columnas fijas, siempre en el orden de RN-01. */
export function Board({
  tasks,
  isLoading = false,
  isError = false,
  onRetry,
  onCreateFirst,
  onOpenTask,
  onMoveTask = noop,
  dndDisabled = false,
  totalCount,
  columnTotals,
  visibleStatuses,
  onClearFilters,
  today,
}: BoardProps) {
  const dnd = useBoardDnd({ tasks, disabled: dndDisabled, onMove: onMoveTask });

  if (isLoading) return <BoardSkeleton />;
  if (isError) return <BoardError onRetry={() => onRetry?.()} />;
  // Vacío = ninguna tarea en ninguna columna (CA-01.5/01.6).
  const overall = totalCount ?? tasks.length;
  if (overall === 0) return <EmptyBoard onCreate={onCreateFirst} />;
  // Hay tareas pero los filtros no dejan ver ninguna (CA-08.7).
  if (tasks.length === 0)
    return <NoResults onClear={() => onClearFilters?.()} />;

  const byId = new Map(tasks.map((t) => [t.id, t]));

  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={boardCollisionDetection}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDragEnd={dnd.onDragEnd}
      onDragCancel={dnd.onDragCancel}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      <div className="flex h-full flex-col">
        {dndDisabled && (
          <p
            role="status"
            className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Info aria-hidden className="size-3.5" />
            Limpiá los filtros para mover tareas
          </p>
        )}
        <div
          data-testid="board"
          className="flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 lg:snap-none lg:overflow-visible"
        >
          {COLUMNS.filter(
            ({ status }) =>
              !visibleStatuses || visibleStatuses.includes(status),
          ).map(({ status, title }) => {
            // Durante el arrastre se muestra el estado local; si no, el de la caché.
            const columnTasks = dnd.columns[status]
              .map((id) => byId.get(id))
              .filter((t): t is Task => t !== undefined);
            return (
              <div
                key={status}
                className="h-full min-w-[85%] snap-start sm:min-w-[45%] lg:min-w-0 lg:flex-1"
              >
                <BoardColumn
                  status={status}
                  title={title}
                  tasks={columnTasks}
                  totalCount={columnTotals?.[status]}
                  onOpenTask={onOpenTask}
                  today={today}
                  dndDisabled={dndDisabled}
                  isDropTarget={dnd.isDragging && dnd.activeStatus === status}
                />
              </div>
            );
          })}
        </div>
      </div>
      <DragOverlay>
        {dnd.activeTask ? (
          <DragOverlayCard task={dnd.activeTask} today={today} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

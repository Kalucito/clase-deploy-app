import {
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import { groupByStatus } from "@/lib/board";
import { STATUSES } from "@/lib/constants";
import type { Task, TaskStatus } from "@/types/task";
import type { MoveVariables } from "./useMoveTask";

/** IDs de tarea por columna: estado local del arrastre en curso (plan §7.5). */
export type Columns = Record<TaskStatus, string[]>;

export function isStatus(id: UniqueIdentifier): id is TaskStatus {
  return (STATUSES as readonly string[]).includes(String(id));
}

export function columnsFromTasks(tasks: readonly Task[]): Columns {
  const groups = groupByStatus(tasks);
  return Object.fromEntries(
    STATUSES.map((s) => [s, groups[s].map((t) => t.id)]),
  ) as Columns;
}

export function findContainer(
  columns: Columns,
  id: UniqueIdentifier,
): TaskStatus | undefined {
  if (isStatus(id)) return id;
  return STATUSES.find((s) => columns[s].includes(String(id)));
}

/**
 * Colisiones: con puntero, solo cuenta lo que está bajo el cursor (soltar fuera
 * de las columnas no devuelve nada → cancela, CA-06.6) y las tarjetas tienen
 * prioridad sobre la columna. Con teclado no hay puntero: se usa la esquina más cercana.
 */
export const boardCollisionDetection: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) return closestCorners(args);
  const hits = pointerWithin(args);
  const cards = hits.filter((h) => !isStatus(h.id));
  return cards.length > 0 ? cards : hits;
};

/**
 * Teclado: ←/→ saltan a la columna vecina (aunque esté vacía) y caen al comienzo
 * de su lista; ↑/↓ reordenan dentro de la columna con el comportamiento estándar.
 */
export const boardKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  args,
) => {
  if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
    event.preventDefault();
    const { droppableRects, collisionRect } = args.context;
    if (!collisionRect) return undefined;
    const centerX = collisionRect.left + collisionRect.width / 2;
    const rects = STATUSES.map((s) => droppableRects.get(s));
    const current = rects.findIndex(
      (r) => r && centerX >= r.left && centerX <= r.right,
    );
    if (current === -1) return undefined;
    const next = current + (event.code === "ArrowRight" ? 1 : -1);
    const target = rects[next];
    if (!target) return undefined;
    return { x: target.left + 8, y: target.top + 56 };
  }
  return sortableKeyboardCoordinates(event, args);
};

interface UseBoardDndOptions {
  tasks: Task[];
  /** Con filtros activos el arrastre está deshabilitado (D1, RN-14). */
  disabled?: boolean;
  onMove: (move: MoveVariables) => void;
}

export function useBoardDnd({
  tasks,
  disabled = false,
  onMove,
}: UseBoardDndOptions) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
      // Enter queda libre para abrir la tarjeta; Espacio levanta/suelta.
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter"],
      },
    }),
  );

  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const baseColumns = useMemo(() => columnsFromTasks(tasks), [tasks]);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const columns = dragColumns ?? baseColumns;
  const activeTask = activeId ? (byId.get(activeId) ?? null) : null;
  const activeStatus =
    activeId && dragColumns ? findContainer(dragColumns, activeId) : undefined;

  const reset = useCallback(() => {
    setActiveId(null);
    setDragColumns(null);
  }, []);

  const onDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      if (disabled) return;
      setActiveId(String(active.id));
      setDragColumns(baseColumns);
    },
    [baseColumns, disabled],
  );

  // Mueve entre columnas SOLO en el estado local: sin tocar caché ni red.
  const onDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      if (!over || !dragColumns) return;
      const from = findContainer(dragColumns, active.id);
      const to = findContainer(dragColumns, over.id);
      if (!from || !to || from === to) return;

      const id = String(active.id);
      const dest = [...dragColumns[to]];
      let index = dest.length;
      if (!isStatus(over.id)) {
        const overIndex = dest.indexOf(String(over.id));
        const translated = active.rect.current.translated;
        const below = translated
          ? translated.top > over.rect.top + over.rect.height / 2
          : false;
        index = overIndex + (below ? 1 : 0);
      }
      dest.splice(index, 0, id);
      setDragColumns({
        ...dragColumns,
        [from]: dragColumns[from].filter((x) => x !== id),
        [to]: dest,
      });
    },
    [dragColumns],
  );

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const cols = dragColumns;
      // Fuera de una columna → se cancela sin llamadas (CA-06.6).
      if (!over || !cols) return reset();

      const id = String(active.id);
      let final = cols;
      const from = findContainer(cols, id);
      const to = findContainer(cols, over.id);
      if (from && to && from === to && !isStatus(over.id)) {
        const oldIndex = cols[from].indexOf(id);
        const newIndex = cols[to].indexOf(String(over.id));
        if (oldIndex !== newIndex) {
          final = {
            ...cols,
            [from]: arrayMove(cols[from], oldIndex, newIndex),
          };
        }
      }

      const status = findContainer(final, id);
      const original = byId.get(id);
      if (status && original) {
        const position = final[status].indexOf(id);
        const originalIndex = baseColumns[original.status].indexOf(id);
        const unchanged =
          original.status === status && originalIndex === position;
        if (!unchanged) onMove({ id, status, position });
      }

      // La caché se actualiza de forma optimista en un microtask de `onMove`;
      // se suelta el estado local después para evitar un parpadeo.
      setActiveId(null);
      setTimeout(() => setDragColumns(null), 0);
    },
    [baseColumns, byId, dragColumns, onMove, reset],
  );

  return {
    sensors,
    columns,
    activeTask,
    activeStatus,
    isDragging: activeId !== null,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel: reset,
  };
}

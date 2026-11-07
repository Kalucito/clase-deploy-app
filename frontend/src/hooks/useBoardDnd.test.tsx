import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";
import type { Task, TaskStatus } from "@/types/task";
import { boardKeyboardCoordinates, useBoardDnd } from "./useBoardDnd";

function task(id: string, status: TaskStatus, position: number): Task {
  return {
    id,
    title: id,
    description: null,
    status,
    priority: "media",
    dueDate: null,
    labels: [],
    position,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

const TASKS: Task[] = [
  task("a", "pendiente", 0),
  task("b", "pendiente", 1),
  task("c", "pendiente", 2),
  task("x", "hecho", 0),
  task("y", "hecho", 1),
];

const start = (id: string) => ({ active: { id } }) as unknown as DragStartEvent;
const end = (id: string, overId: string | null) =>
  ({
    active: { id },
    over: overId ? { id: overId } : null,
  }) as unknown as DragEndEvent;
const over = (id: string, overId: string, below = false) =>
  ({
    active: { id, rect: { current: { translated: { top: below ? 100 : 0 } } } },
    over: { id: overId, rect: { top: 10, height: 40 } },
  }) as unknown as DragOverEvent;

function setup(opts: { disabled?: boolean; tasks?: Task[] } = {}) {
  const onMove = vi.fn();
  const hook = renderHook(() =>
    useBoardDnd({
      tasks: opts.tasks ?? TASKS,
      disabled: opts.disabled,
      onMove,
    }),
  );
  return { onMove, hook };
}

const flush = () => act(() => new Promise((r) => setTimeout(r, 5)));

describe("useBoardDnd", () => {
  it("columns refleja las tareas agrupadas y ordenadas", () => {
    const { hook } = setup();
    expect(hook.result.current.columns.pendiente).toEqual(["a", "b", "c"]);
    expect(hook.result.current.columns.hecho).toEqual(["x", "y"]);
    expect(hook.result.current.columns.en_progreso).toEqual([]);
  });

  describe("entre columnas", () => {
    it("soltar sobre una tarjeta de otra columna: índice de esa tarjeta", async () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("a")));
      act(() => hook.result.current.onDragOver(over("a", "y")));
      expect(hook.result.current.columns.hecho).toEqual(["x", "a", "y"]);
      expect(hook.result.current.columns.pendiente).toEqual(["b", "c"]);
      // Tras reubicarse, al soltar `over` es la propia tarjeta (su nuevo lugar).
      act(() => hook.result.current.onDragEnd(end("a", "a")));
      expect(onMove).toHaveBeenCalledExactlyOnceWith({
        id: "a",
        status: "hecho",
        position: 1,
      });
      await flush();
      expect(hook.result.current.isDragging).toBe(false);
      expect(hook.result.current.columns.pendiente).toEqual(["a", "b", "c"]);
    });

    it("soltar por debajo de la mitad de la tarjeta: después de ella", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("a")));
      act(() => hook.result.current.onDragOver(over("a", "y", true)));
      act(() => hook.result.current.onDragEnd(end("a", "a")));
      expect(onMove).toHaveBeenCalledWith({
        id: "a",
        status: "hecho",
        position: 2,
      });
    });

    it("soltar sobre una columna vacía: posición 0", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("b")));
      act(() => hook.result.current.onDragOver(over("b", "en_progreso")));
      act(() => hook.result.current.onDragEnd(end("b", "en_progreso")));
      expect(onMove).toHaveBeenCalledWith({
        id: "b",
        status: "en_progreso",
        position: 0,
      });
    });

    it("soltar sobre el área de una columna con tareas: al final", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("a")));
      act(() => hook.result.current.onDragOver(over("a", "hecho")));
      act(() => hook.result.current.onDragEnd(end("a", "hecho")));
      expect(onMove).toHaveBeenCalledWith({
        id: "a",
        status: "hecho",
        position: 2,
      });
    });

    it("el estado local no llama al backend mientras se arrastra", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("a")));
      act(() => hook.result.current.onDragOver(over("a", "x")));
      expect(onMove).not.toHaveBeenCalled();
    });
  });

  describe("misma columna (reordenar)", () => {
    it("hacia abajo: índice final del destino", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("a")));
      act(() => hook.result.current.onDragEnd(end("a", "c")));
      expect(onMove).toHaveBeenCalledWith({
        id: "a",
        status: "pendiente",
        position: 2,
      });
    });

    it("hacia arriba: índice final del destino", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("c")));
      act(() => hook.result.current.onDragEnd(end("c", "a")));
      expect(onMove).toHaveBeenCalledWith({
        id: "c",
        status: "pendiente",
        position: 0,
      });
    });

    it("un lugar abajo / arriba", () => {
      const down = setup();
      act(() => down.hook.result.current.onDragStart(start("a")));
      act(() => down.hook.result.current.onDragEnd(end("a", "b")));
      expect(down.onMove).toHaveBeenCalledWith({
        id: "a",
        status: "pendiente",
        position: 1,
      });

      const up = setup();
      act(() => up.hook.result.current.onDragStart(start("b")));
      act(() => up.hook.result.current.onDragEnd(end("b", "a")));
      expect(up.onMove).toHaveBeenCalledWith({
        id: "b",
        status: "pendiente",
        position: 0,
      });
    });

    it("soltar sobre sí misma (mismo lugar): sin llamada (CA-07.2)", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("b")));
      act(() => hook.result.current.onDragEnd(end("b", "b")));
      expect(onMove).not.toHaveBeenCalled();
    });

    it("soltar en el área de su propia columna: sin llamada", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("b")));
      act(() => hook.result.current.onDragEnd(end("b", "pendiente")));
      expect(onMove).not.toHaveBeenCalled();
    });

    it("sacar la tarjeta a otra columna y volver al mismo lugar: sin llamada", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("b")));
      act(() => hook.result.current.onDragOver(over("b", "x")));
      act(() => hook.result.current.onDragOver(over("b", "a", true)));
      expect(hook.result.current.columns.pendiente).toEqual(["a", "b", "c"]);
      act(() => hook.result.current.onDragEnd(end("b", "b")));
      expect(onMove).not.toHaveBeenCalled();
    });
  });

  describe("cancelación y fuera de columnas", () => {
    it("soltar fuera de una columna (over null): sin llamada y restaura (CA-06.6)", async () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("a")));
      act(() => hook.result.current.onDragOver(over("a", "x")));
      act(() => hook.result.current.onDragEnd(end("a", null)));
      expect(onMove).not.toHaveBeenCalled();
      expect(hook.result.current.isDragging).toBe(false);
      expect(hook.result.current.columns.pendiente).toEqual(["a", "b", "c"]);
      expect(hook.result.current.columns.hecho).toEqual(["x", "y"]);
    });

    it("Esc (onDragCancel) descarta el estado local sin llamada", () => {
      const { hook, onMove } = setup();
      act(() => hook.result.current.onDragStart(start("a")));
      act(() => hook.result.current.onDragOver(over("a", "x")));
      act(() => hook.result.current.onDragCancel());
      expect(onMove).not.toHaveBeenCalled();
      expect(hook.result.current.columns.pendiente).toEqual(["a", "b", "c"]);
    });
  });

  describe("deshabilitado (D1, RN-14)", () => {
    it("no inicia el arrastre ni llama al backend", () => {
      const { hook, onMove } = setup({ disabled: true });
      act(() => hook.result.current.onDragStart(start("a")));
      expect(hook.result.current.isDragging).toBe(false);
      act(() => hook.result.current.onDragEnd(end("a", "hecho")));
      expect(onMove).not.toHaveBeenCalled();
    });
  });

  it("expone la tarea activa y su columna actual mientras se arrastra", () => {
    const { hook } = setup();
    act(() => hook.result.current.onDragStart(start("a")));
    expect(hook.result.current.activeTask?.id).toBe("a");
    act(() => hook.result.current.onDragOver(over("a", "x")));
    expect(hook.result.current.activeStatus).toBe("hecho");
  });
});

describe("boardKeyboardCoordinates", () => {
  const rect = (left: number) => ({
    left,
    right: left + 100,
    top: 0,
    bottom: 500,
    width: 100,
    height: 500,
  });
  const args = (x: number) =>
    ({
      context: {
        collisionRect: { left: x, width: 20, top: 100, height: 40 },
        droppableRects: new Map([
          ["pendiente", rect(0)],
          ["en_progreso", rect(110)],
          ["en_revision", rect(220)],
          ["hecho", rect(330)],
        ]),
      },
    }) as unknown as Parameters<typeof boardKeyboardCoordinates>[1];
  const key = (code: string) =>
    ({ code, preventDefault: () => {} }) as KeyboardEvent;

  it("→ salta a la columna siguiente (aunque esté vacía)", () => {
    expect(boardKeyboardCoordinates(key("ArrowRight"), args(10))).toEqual({
      x: 118,
      y: 56,
    });
  });
  it("← salta a la columna anterior", () => {
    expect(boardKeyboardCoordinates(key("ArrowLeft"), args(230))).toEqual({
      x: 118,
      y: 56,
    });
  });
  it("en los extremos no se mueve", () => {
    expect(
      boardKeyboardCoordinates(key("ArrowLeft"), args(10)),
    ).toBeUndefined();
    expect(
      boardKeyboardCoordinates(key("ArrowRight"), args(340)),
    ).toBeUndefined();
  });
});

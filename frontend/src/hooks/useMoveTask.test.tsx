import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { listTasks, moveTask } from "@/lib/api/tasks";
import { makeTestClient, wrapperFor } from "@/test-utils";
import type { Task, TaskStatus } from "@/types/task";
import { useMoveTask } from "./useMoveTask";
import { TASKS_KEY } from "./useTasks";

vi.mock("@/lib/api/tasks", () => ({ moveTask: vi.fn(), listTasks: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const moveMock = vi.mocked(moveTask);
const listMock = vi.mocked(listTasks);

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

const initial = (): Task[] => [
  task("a", "pendiente", 0),
  task("b", "pendiente", 1),
  task("c", "pendiente", 2),
  task("x", "hecho", 0),
];

const titles = (qc: QueryClient, status: TaskStatus) =>
  (qc.getQueryData<Task[]>(TASKS_KEY) ?? [])
    .filter((t) => t.status === status)
    .sort((p, q) => p.position - q.position)
    .map((t) => t.id);

function setup() {
  const qc = makeTestClient();
  qc.setQueryData(TASKS_KEY, initial());
  const hook = renderHook(() => useMoveTask(), { wrapper: wrapperFor(qc) });
  return { qc, ...hook };
}

beforeEach(() => {
  moveMock.mockReset();
  listMock.mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("useMoveTask", () => {
  it("éxito: aplica el movimiento al instante y reconcilia con el servidor", async () => {
    let resolve!: (t: Task) => void;
    moveMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const serverState = [
      task("b", "pendiente", 0),
      task("c", "pendiente", 1),
      task("a", "hecho", 0),
      task("x", "hecho", 1),
    ];
    listMock.mockResolvedValue(serverState);
    const { qc, result } = setup();
    // La caché tiene observador solo si hay query activa: se registra una para que invalide.
    qc.setQueryDefaults(TASKS_KEY, { queryFn: listTasks });

    act(() => result.current.mutate({ id: "a", status: "hecho", position: 0 }));
    // Optimista: antes de que responda el servidor.
    await waitFor(() => expect(titles(qc, "hecho")).toEqual(["a", "x"]));
    expect(titles(qc, "pendiente")).toEqual(["b", "c"]);

    resolve(task("a", "hecho", 0));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(moveMock).toHaveBeenCalledWith("a", {
      status: "hecho",
      position: 0,
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("error 500: restaura la caché EXACTAMENTE y muestra el toast", async () => {
    moveMock.mockRejectedValue(
      new ApiError(500, "Ocurrió un error inesperado. Intentá nuevamente."),
    );
    const { qc, result } = setup();
    const before = qc.getQueryData<Task[]>(TASKS_KEY);

    act(() => result.current.mutate({ id: "a", status: "hecho", position: 1 }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(qc.getQueryData(TASKS_KEY)).toEqual(before);
    expect(toast.error).toHaveBeenCalledWith(
      "No se pudo mover la tarea. Intentá nuevamente.",
    );
  });

  it("error de red: rollback exacto y mensaje de conexión", async () => {
    moveMock.mockRejectedValue(
      new ApiError(0, "No se pudo conectar con el servidor"),
    );
    const { qc, result } = setup();
    const before = qc.getQueryData<Task[]>(TASKS_KEY);

    act(() =>
      result.current.mutate({ id: "c", status: "pendiente", position: 0 }),
    );
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(qc.getQueryData(TASKS_KEY)).toEqual(before);
    expect(toast.error).toHaveBeenCalledWith(
      "No se pudo mover la tarea: no hay conexión con el servidor",
    );
  });

  it("404: informa 'La tarea ya no existe' (CL-12)", async () => {
    moveMock.mockRejectedValue(new ApiError(404, "La tarea no existe"));
    const { result } = setup();
    act(() => result.current.mutate({ id: "a", status: "hecho", position: 0 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("La tarea ya no existe");
  });

  it("no usa reintentos: una sola llamada aunque falle", async () => {
    moveMock.mockRejectedValue(new ApiError(500, "x"));
    const { result } = setup();
    act(() => result.current.mutate({ id: "a", status: "hecho", position: 0 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(moveMock).toHaveBeenCalledTimes(1);
  });
});

describe("useMoveTask — serialización", () => {
  function twoHooks() {
    const qc = makeTestClient();
    qc.setQueryData(TASKS_KEY, initial());
    const wrapper = wrapperFor(qc);
    // Dos usos del hook = dos arrastres independientes que comparten el scope.
    const h1 = renderHook(() => useMoveTask(), { wrapper });
    const h2 = renderHook(() => useMoveTask(), { wrapper });
    return { qc, first: h1.result, second: h2.result };
  }

  it("la segunda mutación no empieza hasta que termina la primera", async () => {
    let resolveFirst!: (t: Task) => void;
    moveMock
      .mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce(task("b", "hecho", 0));
    const { first, second } = twoHooks();

    act(() => first.current.mutate({ id: "a", status: "hecho", position: 0 }));
    await waitFor(() => expect(moveMock).toHaveBeenCalledTimes(1));
    act(() => second.current.mutate({ id: "b", status: "hecho", position: 0 }));

    // Con la primera en vuelo, la segunda queda en espera (sin llamada al servidor).
    await new Promise((r) => setTimeout(r, 50));
    expect(moveMock).toHaveBeenCalledTimes(1);

    resolveFirst(task("a", "hecho", 0));
    await waitFor(() => expect(moveMock).toHaveBeenCalledTimes(2));
    expect(moveMock.mock.calls.map((c) => c[0])).toEqual(["a", "b"]);
    await waitFor(() => expect(second.current.isSuccess).toBe(true));
  });

  it("si la primera falla, la segunda igualmente se ejecuta y la caché queda coherente", async () => {
    let rejectFirst!: (e: Error) => void;
    moveMock
      .mockReturnValueOnce(new Promise((_, rej) => (rejectFirst = rej)))
      .mockResolvedValueOnce(task("b", "hecho", 0));
    listMock.mockResolvedValue([
      task("a", "pendiente", 0),
      task("c", "pendiente", 1),
      task("b", "hecho", 0),
      task("x", "hecho", 1),
    ]);
    const { qc, first, second } = twoHooks();
    qc.setQueryDefaults(TASKS_KEY, { queryFn: listTasks });

    act(() => first.current.mutate({ id: "a", status: "hecho", position: 0 }));
    await waitFor(() => expect(moveMock).toHaveBeenCalledTimes(1));
    act(() => second.current.mutate({ id: "b", status: "hecho", position: 0 }));

    rejectFirst(new ApiError(500, "x"));
    await waitFor(() => expect(second.current.isSuccess).toBe(true));

    expect(moveMock).toHaveBeenCalledTimes(2);
    // Posiciones contiguas en cada columna, sin duplicados.
    const data = qc.getQueryData<Task[]>(TASKS_KEY) ?? [];
    for (const s of ["pendiente", "hecho"] as const) {
      const pos = data
        .filter((t) => t.status === s)
        .map((t) => t.position)
        .sort();
      expect(pos).toEqual(pos.map((_, i) => i));
    }
  });
});

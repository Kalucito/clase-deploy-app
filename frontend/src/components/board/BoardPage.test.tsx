import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { listTasks } from "@/lib/api/tasks";
import { makeTestClient, wrapperFor } from "@/test-utils";
import type { Task } from "@/types/task";
import { BoardPage } from "./BoardPage";

vi.mock("@/lib/api/tasks", () => ({ listTasks: vi.fn() }));
const listTasksMock = vi.mocked(listTasks);

function task(id: string, status: Task["status"], position: number): Task {
  return {
    id,
    title: `Tarea ${id}`,
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

function renderPage() {
  const Wrapper = wrapperFor(makeTestClient());
  return render(<BoardPage />, { wrapper: Wrapper });
}

beforeEach(() => {
  listTasksMock.mockReset();
});

describe("BoardPage", () => {
  it("muestra el esqueleto mientras carga y luego las tareas", async () => {
    let resolve!: (t: Task[]) => void;
    listTasksMock.mockReturnValue(new Promise((r) => (resolve = r)));
    renderPage();
    expect(
      screen.getByRole("status", { name: "Cargando tablero" }),
    ).toBeInTheDocument();
    resolve([task("a", "pendiente", 0), task("b", "hecho", 0)]);
    expect(await screen.findByText("Tarea a")).toBeInTheDocument();
    expect(screen.getByText("Tarea b")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Cargando tablero" }),
    ).not.toBeInTheDocument();
  });

  it("base vacía → estado vacío", async () => {
    listTasksMock.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText("Todavía no hay tareas"),
    ).toBeInTheDocument();
  });

  it("error → BoardError y 'Reintentar' recupera", async () => {
    listTasksMock.mockRejectedValueOnce(
      new ApiError(0, "No se pudo conectar con el servidor"),
    );
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar el tablero",
    );

    listTasksMock.mockResolvedValue([task("a", "pendiente", 0)]);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Tarea a")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(listTasksMock).toHaveBeenCalledTimes(2);
  });
});

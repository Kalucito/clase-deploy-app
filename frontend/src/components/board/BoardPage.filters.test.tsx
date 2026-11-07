import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import { toast } from "sonner";
import { LABELS_KEY } from "@/hooks/useLabels";
import { listLabels } from "@/lib/api/labels";
import { createTask, listTasks } from "@/lib/api/tasks";
import { makeTestClient, wrapperFor } from "@/test-utils";
import type { Priority, Task, TaskStatus } from "@/types/task";
import { BoardPage } from "./BoardPage";

vi.mock("@/lib/api/tasks", () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  moveTask: vi.fn(),
  getTask: vi.fn(),
}));
vi.mock("@/lib/api/labels", () => ({ listLabels: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const listTasksMock = vi.mocked(listTasks);
const listLabelsMock = vi.mocked(listLabels);
const createMock = vi.mocked(createTask);

function task(
  id: string,
  status: TaskStatus,
  position: number,
  priority: Priority = "media",
  labels: string[] = [],
): Task {
  return {
    id,
    title: `Tarea ${id}`,
    description: null,
    status,
    priority,
    dueDate: null,
    labels,
    position,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

// 7 tareas pendientes (2 de prioridad alta) + 1 en hecho.
const TASKS: Task[] = [
  ...Array.from({ length: 7 }, (_, i) =>
    task(
      `p${i}`,
      "pendiente",
      i,
      i < 2 ? "alta" : "baja",
      i === 0 ? ["bug"] : [],
    ),
  ),
  task("h0", "hecho", 0, "baja", ["front"]),
];

beforeEach(() => {
  listTasksMock.mockReset();
  listLabelsMock.mockReset();
  createMock.mockReset();
  vi.mocked(toast.info).mockReset();
  listTasksMock.mockResolvedValue(TASKS);
  listLabelsMock.mockResolvedValue(["bug", "front"]);
});

function renderPage() {
  const client = makeTestClient();
  render(<BoardPage />, { wrapper: wrapperFor(client) });
  return { client, user: userEvent.setup() };
}

async function pickPriority(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole("button", { name: "Prioridad" }));
  await user.click(await screen.findByRole("checkbox", { name }));
  await user.keyboard("{Escape}");
}

describe("BoardPage — filtros integrados", () => {
  it('contadores: "7" sin filtros y "2 de 7" con filtros (RN-13)', async () => {
    const { user } = renderPage();
    expect(await screen.findByTestId("count-pendiente")).toHaveTextContent(
      /^7$/,
    );
    await pickPriority(user, "Alta");
    await waitFor(() =>
      expect(screen.getByTestId("count-pendiente")).toHaveTextContent("2 de 7"),
    );
    expect(screen.getByTestId("count-hecho")).toHaveTextContent("0 de 1");
  });

  it("con filtros activos el arrastre se deshabilita y se informa el motivo (D1, RN-14)", async () => {
    const { user } = renderPage();
    await screen.findByTestId("board");
    expect(
      screen.queryByText("Limpiá los filtros para mover tareas"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tarea: Tarea p0" }),
    ).not.toHaveAttribute("aria-disabled", "true");

    await pickPriority(user, "Alta");
    expect(
      await screen.findByText("Limpiá los filtros para mover tareas"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tarea: Tarea p0" }),
    ).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() =>
      expect(
        screen.queryByText("Limpiá los filtros para mover tareas"),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Tarea: Tarea p0" }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("crear, editar y eliminar siguen disponibles con filtros activos (RN-14)", async () => {
    const { user } = renderPage();
    await screen.findByTestId("board");
    await pickPriority(user, "Alta");
    expect(screen.getByRole("button", { name: /Nueva tarea/ })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Tarea: Tarea p0" }));
    expect(
      await screen.findByRole("dialog", { name: "Editar tarea" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeEnabled();
  });

  it('sin coincidencias → "Sin resultados" con acción de limpiar, distinto del tablero vacío (CA-08.7)', async () => {
    const { user } = renderPage();
    await screen.findByTestId("board");
    await user.type(screen.getByRole("searchbox"), "zzzz");
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay tareas")).not.toBeInTheDocument();

    const noResults = screen.getByText("Sin resultados").closest("div")!;
    await user.click(
      within(noResults).getByRole("button", { name: "Limpiar filtros" }),
    );
    expect(await screen.findByTestId("board")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("tablero sin tareas muestra el estado vacío, no 'Sin resultados'", async () => {
    listTasksMock.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText("Todavía no hay tareas"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sin resultados")).not.toBeInTheDocument();
  });

  it("el filtro de estado oculta las columnas no seleccionadas (D2)", async () => {
    const { user } = renderPage();
    await screen.findByTestId("board");
    expect(screen.getAllByRole("region")).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "Estado" }));
    await user.click(await screen.findByRole("checkbox", { name: "Hecho" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getAllByRole("region")).toHaveLength(1));
    expect(screen.getByRole("region", { name: "Hecho" })).toBeInTheDocument();
  });

  it("crear una tarea que no coincide con los filtros avisa que quedó oculta (CL-21)", async () => {
    createMock.mockResolvedValue(task("nuevo", "pendiente", 0, "media"));
    const { user } = renderPage();
    await screen.findByTestId("board");
    await pickPriority(user, "Alta");

    await user.click(screen.getByRole("button", { name: /Nueva tarea/ }));
    await user.type(await screen.findByLabelText("Título"), "Nuevo");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledTimes(1));
    expect(vi.mocked(toast.info).mock.calls[0][0]).toMatch(
      /oculta por los filtros/,
    );
  });

  it("si la tarea creada sí coincide, no hay aviso", async () => {
    createMock.mockResolvedValue(task("nuevo", "pendiente", 0, "alta"));
    const { user } = renderPage();
    await screen.findByTestId("board");
    await pickPriority(user, "Alta");
    await user.click(screen.getByRole("button", { name: /Nueva tarea/ }));
    await user.type(await screen.findByLabelText("Título"), "Nuevo");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("una etiqueta seleccionada que deja de existir se quita del filtro (CA-08.8)", async () => {
    const { user, client } = renderPage();
    await screen.findByTestId("board");
    await user.click(screen.getByRole("button", { name: "Etiqueta" }));
    await user.click(await screen.findByRole("checkbox", { name: "bug" }));
    await user.keyboard("{Escape}");
    expect(
      await screen.findByRole("button", { name: "Limpiar filtros" }),
    ).toBeInTheDocument();

    act(() => client.setQueryData(LABELS_KEY, ["front"]));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Limpiar filtros" }),
      ).not.toBeInTheDocument(),
    );
  });
});

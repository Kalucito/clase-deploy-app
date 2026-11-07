import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Task, TaskStatus } from "@/types/task";
import { Board } from "./Board";
import { BoardColumn } from "./BoardColumn";

function make(i: number, status: TaskStatus, position: number): Task {
  return {
    id: `id-${i}`,
    title: `Tarea ${i}`,
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

describe("Board", () => {
  it("muestra siempre las 4 columnas en orden (RN-01, CA-01.1)", () => {
    render(<Board tasks={[make(1, "hecho", 0)]} />);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Pendiente",
      "En progreso",
      "En revisión",
      "Hecho",
    ]);
  });

  it("cada columna muestra su contador y sus tareas ordenadas por posición", () => {
    const tasks = [
      make(2, "pendiente", 1),
      make(1, "pendiente", 0),
      make(3, "hecho", 0),
    ];
    render(<Board tasks={tasks} />);
    expect(screen.getByTestId("count-pendiente")).toHaveTextContent("2");
    expect(screen.getByTestId("count-en_progreso")).toHaveTextContent("0");
    expect(screen.getByTestId("count-hecho")).toHaveTextContent("1");

    const pendiente = within(screen.getByRole("region", { name: "Pendiente" }));
    const cards = pendiente
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label"));
    expect(cards).toEqual(["Tarea: Tarea 1", "Tarea: Tarea 2"]);
  });

  it("tablero sin tareas muestra el estado vacío, no las columnas (CA-01.5)", () => {
    render(<Board tasks={[]} />);
    expect(screen.getByText("Todavía no hay tareas")).toBeInTheDocument();
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
  });

  it("una columna sin tareas muestra el placeholder; las otras no (CA-01.6)", () => {
    render(<Board tasks={[make(1, "pendiente", 0)]} />);
    const enProgreso = within(
      screen.getByRole("region", { name: "En progreso" }),
    );
    expect(enProgreso.getByText("Sin tareas")).toBeInTheDocument();
    const pendiente = within(screen.getByRole("region", { name: "Pendiente" }));
    expect(pendiente.queryByText("Sin tareas")).not.toBeInTheDocument();
  });

  it("con 200 tareas la columna tiene scroll interno propio", () => {
    const tasks = Array.from({ length: 200 }, (_, i) =>
      make(i, "pendiente", i),
    );
    render(<Board tasks={tasks} />);
    const region = screen.getByRole("region", { name: "Pendiente" });
    expect(within(region).getAllByRole("button")).toHaveLength(200);
    expect(screen.getByTestId("count-pendiente")).toHaveTextContent("200");
    // El contenedor de la lista scrollea (overflow-y-auto) y está acotado por la columna.
    const scroller = within(region).getAllByRole("list")[0].parentElement!;
    expect(scroller.className).toContain("overflow-y-auto");
    expect(scroller.className).toContain("min-h-0");
  });
});

describe("BoardColumn", () => {
  it("con filtros muestra 'n de total' (RN-13)", () => {
    render(
      <BoardColumn
        status="pendiente"
        title="Pendiente"
        tasks={[make(1, "pendiente", 0), make(2, "pendiente", 1)]}
        totalCount={7}
      />,
    );
    expect(screen.getByTestId("count-pendiente")).toHaveTextContent("2 de 7");
  });

  it("sin filtros el contador es solo el número", () => {
    render(
      <BoardColumn
        status="hecho"
        title="Hecho"
        tasks={[make(1, "hecho", 0)]}
        totalCount={1}
      />,
    );
    expect(screen.getByTestId("count-hecho")).toHaveTextContent(/^1$/);
  });

  it("columna sin coincidencias pero con tareas reales no muestra 'Sin tareas'", () => {
    render(
      <BoardColumn status="hecho" title="Hecho" tasks={[]} totalCount={3} />,
    );
    expect(screen.queryByText("Sin tareas")).not.toBeInTheDocument();
    expect(screen.getByTestId("count-hecho")).toHaveTextContent("0 de 3");
  });
});

describe("Board — estados (CA-01.3, 01.4, 01.5)", () => {
  const some = [make(1, "pendiente", 0)];

  it("cargando: muestra el esqueleto y nada más", () => {
    render(<Board tasks={[]} isLoading />);
    expect(
      screen.getByRole("status", { name: "Cargando tablero" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay tareas")).not.toBeInTheDocument();
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
  });

  it("error: mensaje sin detalles técnicos y 'Reintentar' invoca el callback", async () => {
    const onRetry = vi.fn();
    render(<Board tasks={[]} isError onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos cargar el tablero",
    );
    expect(screen.queryByText("Todavía no hay tareas")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("vacío: llamada a crear la primera tarea", async () => {
    const onCreateFirst = vi.fn();
    render(<Board tasks={[]} onCreateFirst={onCreateFirst} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Crear la primera tarea" }),
    );
    expect(onCreateFirst).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("con tareas en alguna columna no se considera vacío (CA-01.6)", () => {
    render(<Board tasks={some} />);
    expect(screen.queryByText("Todavía no hay tareas")).not.toBeInTheDocument();
    expect(screen.getByTestId("board")).toBeInTheDocument();
  });

  it("carga tiene prioridad sobre error y vacío", () => {
    render(<Board tasks={[]} isLoading isError />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

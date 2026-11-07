import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";

const TODAY = "2026-11-07";

function make(overrides: Partial<Task> = {}): Task {
  return {
    id: "1",
    title: "Preparar demo",
    description: null,
    status: "pendiente",
    priority: "alta",
    dueDate: null,
    labels: [],
    position: 0,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("TaskCard", () => {
  it("muestra título, prioridad, vencimiento y etiquetas (CA-01.2)", () => {
    render(
      <TaskCard
        today={TODAY}
        task={make({ dueDate: "2026-11-20", labels: ["frontend", "demo"] })}
      />,
    );
    expect(screen.getByText("Preparar demo")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText(/20 de nov/i)).toBeInTheDocument();
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("demo")).toBeInTheDocument();
  });

  it("sin fecha no muestra DueDate ni etiquetas", () => {
    render(<TaskCard today={TODAY} task={make()} />);
    expect(screen.queryByText(/vencimiento/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Etiquetas")).not.toBeInTheDocument();
  });

  it("vencida: muestra texto 'Vencida' además del color (CA-09.1)", () => {
    render(<TaskCard today={TODAY} task={make({ dueDate: "2026-11-06" })} />);
    expect(screen.getByText(/Vencida/)).toBeInTheDocument();
  });

  it("con vencimiento hoy no está vencida (CA-09.2)", () => {
    render(<TaskCard today={TODAY} task={make({ dueDate: TODAY })} />);
    expect(screen.queryByText(/Vencida/)).not.toBeInTheDocument();
  });

  it("en 'hecho' nunca está vencida (CA-09.3)", () => {
    render(
      <TaskCard
        today={TODAY}
        task={make({ dueDate: "2020-01-01", status: "hecho" })}
      />,
    );
    expect(screen.queryByText(/Vencida/)).not.toBeInTheDocument();
  });

  it.each([
    ["baja", "Baja"],
    ["media", "Media"],
    ["alta", "Alta"],
  ] as const)("prioridad %s se ve con texto", (priority, text) => {
    render(<TaskCard today={TODAY} task={make({ priority })} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("el HTML del título se muestra como texto, sin interpretarse (CL-04)", () => {
    const title = "<script>alert(1)</script><b>x</b>";
    const { container } = render(
      <TaskCard today={TODAY} task={make({ title, labels: ["<i>"] })} />,
    );
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("i")).toBeNull();
  });

  it("clic abre la tarea", async () => {
    const onOpen = vi.fn();
    const task = make();
    render(<TaskCard today={TODAY} task={task} onOpen={onOpen} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Preparar demo/ }),
    );
    expect(onOpen).toHaveBeenCalledWith(task);
  });

  it("Enter y Espacio abren la tarea (teclado)", async () => {
    const onOpen = vi.fn();
    render(<TaskCard today={TODAY} task={make()} onOpen={onOpen} />);
    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("es alcanzable por teclado y tiene etiqueta accesible", () => {
    render(<TaskCard today={TODAY} task={make()} />);
    const card = screen.getByRole("button", { name: "Tarea: Preparar demo" });
    expect(card).toHaveAttribute("tabindex", "0");
  });
});
